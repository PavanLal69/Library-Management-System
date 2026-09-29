import { db, initPromise } from '../db';
import { users, roles, userRoles, sessions, members } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { hashPassword, verifyPassword, generateToken, verifyToken, generateSecureRandomToken } from '../lib/auth-utils';
import { AuditService } from './AuditService';
import { ROLE_PERMISSIONS, RoleType, PermissionCode } from '../lib/rbac';

export interface UserContext {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  roles: string[];
  permissions: PermissionCode[];
  memberProfile?: {
    id: string;
    libraryCardNumber: string;
    universityId: string | null;
    department: string | null;
    membershipStatus: string;
    maxBorrowLimit: number;
  } | null;
}

export class AuthService {
  static async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    department?: string;
    course?: string;
    yearOfStudy?: number;
    universityId?: string;
  }): Promise<{ user: UserContext; token: string }> {
    await initPromise;
    const cleanEmail = data.email.trim().toLowerCase();

    // Check existing
    const existing = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
    if (existing.length > 0) {
      throw new Error('An account with this email already exists.');
    }

    const passwordHash = await hashPassword(data.password);

    // Insert user
    const [newUser] = await db
      .insert(users)
      .values({
        email: cleanEmail,
        passwordHash,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phone: data.phone?.trim() || null,
        status: 'ACTIVE',
        isEmailVerified: true, // Auto-verified for seamless university onboarding
      })
      .returning();

    // Ensure MEMBER role exists
    let memberRole = (await db.select().from(roles).where(eq(roles.name, 'MEMBER')).limit(1))[0];
    if (!memberRole) {
      const [createdRole] = await db
        .insert(roles)
        .values({
          name: 'MEMBER',
          description: 'Library member with borrowing and reservation privileges',
        })
        .returning();
      memberRole = createdRole;
    }

    // Assign MEMBER role
    await db.insert(userRoles).values({
      userId: newUser.id,
      roleId: memberRole.id,
    });

    // Create Member record with unique library card number
    const randomCardId = Math.floor(100000 + Math.random() * 900000);
    const libraryCardNumber = `LIB-2026-${randomCardId}`;

    const [member] = await db
      .insert(members)
      .values({
        userId: newUser.id,
        libraryCardNumber,
        universityId: data.universityId || `STU-${randomCardId}`,
        department: data.department || 'General Studies',
        course: data.course || 'Undergraduate',
        yearOfStudy: data.yearOfStudy || 1,
        membershipType: 'STUDENT',
        membershipStatus: 'ACTIVE',
        maxBorrowLimit: 5,
      })
      .returning();

    // Create session
    const sessionToken = generateSecureRandomToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const [session] = await db
      .insert(sessions)
      .values({
        userId: newUser.id,
        token: sessionToken,
        expiresAt,
      })
      .returning();

    const jwtToken = generateToken({
      userId: newUser.id,
      email: newUser.email,
      sessionId: session.id,
    });

    await AuditService.log({
      actorId: newUser.id,
      actorRole: 'MEMBER',
      action: 'USER_REGISTER',
      entityType: 'USER',
      entityId: newUser.id,
      metadata: { email: cleanEmail, libraryCardNumber },
    });

    const userContext: UserContext = {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      status: newUser.status,
      roles: ['MEMBER'],
      permissions: ROLE_PERMISSIONS.MEMBER,
      memberProfile: {
        id: member.id,
        libraryCardNumber: member.libraryCardNumber,
        universityId: member.universityId,
        department: member.department,
        membershipStatus: member.membershipStatus,
        maxBorrowLimit: member.maxBorrowLimit,
      },
    };

    return { user: userContext, token: jwtToken };
  }

  static async login(
    email: string,
    plainPassword: string,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<{ user: UserContext; token: string }> {
    await initPromise;
    const cleanEmail = email.trim().toLowerCase();

    const userList = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
    if (userList.length === 0) {
      throw new Error('Invalid email or password.');
    }
    const user = userList[0];

    // Check account lockout
    if (user.lockoutUntil && new Date(user.lockoutUntil) > new Date()) {
      const waitMinutes = Math.ceil((new Date(user.lockoutUntil).getTime() - Date.now()) / (1000 * 60));
      throw new Error(`Account temporarily locked due to failed attempts. Please try again in ${waitMinutes} minutes.`);
    }

    if (user.status === 'SUSPENDED') {
      throw new Error('Your account has been suspended. Please contact the library administration.');
    }

    const isValid = await verifyPassword(plainPassword, user.passwordHash);
    if (!isValid) {
      const newAttempts = user.failedLoginAttempts + 1;
      let lockoutDate: Date | null = null;
      if (newAttempts >= 5) {
        lockoutDate = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
      }

      await db
        .update(users)
        .set({
          failedLoginAttempts: newAttempts,
          lockoutUntil: lockoutDate,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      await AuditService.log({
        actorId: user.id,
        action: 'LOGIN_FAILED',
        entityType: 'USER',
        entityId: user.id,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
        metadata: { attempts: newAttempts },
      });

      throw new Error('Invalid email or password.');
    }

    // Reset failed attempts on success
    await db
      .update(users)
      .set({
        failedLoginAttempts: 0,
        lockoutUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Get user roles
    const userRoleRows = await db
      .select({ roleName: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, user.id));

    const roleNames = userRoleRows.map((r) => r.roleName);
    if (roleNames.length === 0) {
      roleNames.push('MEMBER');
    }

    // Build permissions set
    const permissionSet = new Set<PermissionCode>();
    for (const r of roleNames) {
      const perms = ROLE_PERMISSIONS[r as RoleType];
      if (perms) {
        perms.forEach((p) => permissionSet.add(p));
      }
    }

    // Fetch member profile
    const memberRows = await db.select().from(members).where(eq(members.userId, user.id)).limit(1);
    const member = memberRows[0] || null;

    // Create session
    const sessionToken = generateSecureRandomToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const [session] = await db
      .insert(sessions)
      .values({
        userId: user.id,
        token: sessionToken,
        expiresAt,
        ipAddress: metadata?.ipAddress || null,
        userAgent: metadata?.userAgent || null,
      })
      .returning();

    const jwtToken = generateToken({
      userId: user.id,
      email: user.email,
      sessionId: session.id,
    });

    await AuditService.log({
      actorId: user.id,
      actorRole: roleNames[0],
      action: 'LOGIN_SUCCESS',
      entityType: 'USER',
      entityId: user.id,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });

    const userContext: UserContext = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      roles: roleNames,
      permissions: Array.from(permissionSet),
      memberProfile: member
        ? {
            id: member.id,
            libraryCardNumber: member.libraryCardNumber,
            universityId: member.universityId,
            department: member.department,
            membershipStatus: member.membershipStatus,
            maxBorrowLimit: member.maxBorrowLimit,
          }
        : null,
    };

    return { user: userContext, token: jwtToken };
  }

  static async validateSessionToken(token: string): Promise<UserContext | null> {
    await initPromise;
    const payload = verifyToken(token);
    if (!payload) return null;

    const sessionRows = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, payload.sessionId), eq(sessions.userId, payload.userId)))
      .limit(1);

    if (sessionRows.length === 0) return null;
    const session = sessionRows[0];
    if (new Date(session.expiresAt) < new Date()) {
      await db.delete(sessions).where(eq(sessions.id, session.id));
      return null;
    }

    const userRows = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    if (userRows.length === 0) return null;
    const user = userRows[0];

    if (user.status === 'SUSPENDED') return null;

    // Get roles
    const userRoleRows = await db
      .select({ roleName: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, user.id));

    const roleNames = userRoleRows.map((r) => r.roleName);
    if (roleNames.length === 0) {
      roleNames.push('MEMBER');
    }

    const permissionSet = new Set<PermissionCode>();
    for (const r of roleNames) {
      const perms = ROLE_PERMISSIONS[r as RoleType];
      if (perms) {
        perms.forEach((p) => permissionSet.add(p));
      }
    }

    const memberRows = await db.select().from(members).where(eq(members.userId, user.id)).limit(1);
    const member = memberRows[0] || null;

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      roles: roleNames,
      permissions: Array.from(permissionSet),
      memberProfile: member
        ? {
            id: member.id,
            libraryCardNumber: member.libraryCardNumber,
            universityId: member.universityId,
            department: member.department,
            membershipStatus: member.membershipStatus,
            maxBorrowLimit: member.maxBorrowLimit,
          }
        : null,
    };
  }

  static async logout(token: string): Promise<void> {
    await initPromise;
    const payload = verifyToken(token);
    if (payload) {
      await db.delete(sessions).where(eq(sessions.id, payload.sessionId));
      await AuditService.log({
        actorId: payload.userId,
        action: 'LOGOUT',
        entityType: 'USER',
        entityId: payload.userId,
      });
    }
  }
}
