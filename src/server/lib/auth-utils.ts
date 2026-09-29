import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'lms-super-secret-production-key-2026';
const SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

export function generateToken(payload: { userId: string; email: string; sessionId: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { userId: string; email: string; sessionId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; sessionId: string };
  } catch {
    return null;
  }
}

export function generateSecureRandomToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
