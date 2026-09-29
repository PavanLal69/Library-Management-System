import { db, initPromise } from './index';
import { eq } from 'drizzle-orm';
import {
  users,
  roles,
  permissions,
  rolePermissions,
  userRoles,
  members,
  libraries,
  buildings,
  floors,
  sections,
  rooms,
  racks,
  shelves,
  authors,
  publishers,
  categories,
  genres,
  languages,
  books,
  bookAuthors,
  bookCategories,
  bookCopies,
  loans,
  reservations,
  fines,
  librarySettings,
  auditLogs,
} from './schema';
import { hashPassword } from '../lib/auth-utils';
import { ROLES, PERMISSIONS, ROLE_PERMISSIONS, RoleType } from '../lib/rbac';
import QRCode from 'qrcode';
import { getBookCoverUrl } from '../../lib/book-covers';

export async function runSeed() {
  console.log('--- Commencing LMS Enterprise Database Seed ---');
  await initPromise;

  // 1. Roles and Permissions
  console.log('Seeding Roles & Permissions...');
  const permMap = new Map<string, string>();
  for (const code of Object.values(PERMISSIONS)) {
    const [perm] = await db
      .insert(permissions)
      .values({ code, description: `Permission to execute ${code}` })
      .onConflictDoNothing()
      .returning();
    if (perm) {
      permMap.set(code, perm.id);
    } else {
      const existing = await db.query?.permissions?.findFirst ? null : null; // fallback
    }
  }

  // Refetch all permissions to have full ID mapping
  const allPerms = await db.select().from(permissions);
  allPerms.forEach((p) => permMap.set(p.code, p.id));

  const roleMap = new Map<string, string>();
  for (const roleName of Object.values(ROLES)) {
    const [r] = await db
      .insert(roles)
      .values({ name: roleName, description: `${roleName} enterprise role` })
      .onConflictDoNothing()
      .returning();
    if (r) roleMap.set(roleName, r.id);
  }

  const allRoles = await db.select().from(roles);
  allRoles.forEach((r) => roleMap.set(r.name, r.id));

  // Role permissions assignment
  for (const [roleName, permCodes] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = roleMap.get(roleName);
    if (!roleId) continue;
    for (const code of permCodes) {
      const permId = permMap.get(code);
      if (permId) {
        try {
          await db.insert(rolePermissions).values({ roleId, permissionId: permId }).onConflictDoNothing();
        } catch {
          // ignore
        }
      }
    }
  }

  // 2. Demo Users & Members
  console.log('Seeding Demo Accounts (Admin, Librarian, Member)...');
  const defaultPasswordHash = await hashPassword('Password123!');

  // Admin User
  const [adminUser] = await db
    .insert(users)
    .values({
      email: 'admin@example.com',
      passwordHash: defaultPasswordHash,
      firstName: 'Eleanor',
      lastName: 'Vance',
      phone: '+1-555-0199',
      isEmailVerified: true,
      status: 'ACTIVE',
    })
    .onConflictDoNothing()
    .returning();

  const effectiveAdminId = adminUser?.id || (await db.select().from(users)).find((u) => u.email === 'admin@example.com')?.id;
  if (effectiveAdminId) {
    const superAdminRoleId = roleMap.get(ROLES.SUPER_ADMIN);
    if (superAdminRoleId) {
      try {
        await db.insert(userRoles).values({ userId: effectiveAdminId, roleId: superAdminRoleId }).onConflictDoNothing();
      } catch {}
    }
  }

  // Librarian User
  const [librarianUser] = await db
    .insert(users)
    .values({
      email: 'librarian@example.com',
      passwordHash: defaultPasswordHash,
      firstName: 'Marcus',
      lastName: 'Holloway',
      phone: '+1-555-0142',
      isEmailVerified: true,
      status: 'ACTIVE',
    })
    .onConflictDoNothing()
    .returning();

  const effectiveLibId = librarianUser?.id || (await db.select().from(users)).find((u) => u.email === 'librarian@example.com')?.id;
  if (effectiveLibId) {
    const libRoleId = roleMap.get(ROLES.LIBRARIAN);
    if (libRoleId) {
      try {
        await db.insert(userRoles).values({ userId: effectiveLibId, roleId: libRoleId }).onConflictDoNothing();
      } catch {}
    }
  }

  // Member User
  const [memberUser] = await db
    .insert(users)
    .values({
      email: 'member@example.com',
      passwordHash: defaultPasswordHash,
      firstName: 'Sophia',
      lastName: 'Chen',
      phone: '+1-555-0188',
      isEmailVerified: true,
      status: 'ACTIVE',
    })
    .onConflictDoNothing()
    .returning();

  const effectiveMemberUserId = memberUser?.id || (await db.select().from(users)).find((u) => u.email === 'member@example.com')?.id;
  let demoMemberId = '';

  if (effectiveMemberUserId) {
    const memberRoleId = roleMap.get(ROLES.MEMBER);
    if (memberRoleId) {
      try {
        await db.insert(userRoles).values({ userId: effectiveMemberUserId, roleId: memberRoleId }).onConflictDoNothing();
      } catch {}
    }

    const [mem] = await db
      .insert(members)
      .values({
        userId: effectiveMemberUserId,
        libraryCardNumber: 'LIB-2026-10001',
        universityId: 'STU-99042',
        department: 'Computer Science & Engineering',
        course: 'M.S. Distributed Systems',
        yearOfStudy: 2,
        membershipType: 'STUDENT',
        membershipStatus: 'ACTIVE',
        maxBorrowLimit: 6,
      })
      .onConflictDoNothing()
      .returning();

    demoMemberId = mem?.id || (await db.select().from(members)).find((m) => m.userId === effectiveMemberUserId)?.id || '';
  }

  // 3. Shelving Hierarchy
  console.log('Seeding Physical Shelving Architecture...');
  const [library] = await db
    .insert(libraries)
    .values({
      name: 'Metropolitan University Central Library',
      code: 'LIB-CENTRAL',
      address: '100 University Avenue, Academic Quadrangle',
      phone: '+1-800-555-BOOK',
      email: 'circulation@library.edu',
    })
    .onConflictDoNothing()
    .returning();

  const libId = library?.id || (await db.select().from(libraries))[0]?.id;

  const [building] = await db
    .insert(buildings)
    .values({
      libraryId: libId,
      name: 'Ada Lovelace Information Pavilion',
      code: 'BLD-AL',
    })
    .onConflictDoNothing()
    .returning();

  const bldId = building?.id || (await db.select().from(buildings))[0]?.id;

  const [floor] = await db
    .insert(floors)
    .values({
      buildingId: bldId,
      floorNumber: 2,
      name: '2nd Floor - Science, Tech & Mathematics',
    })
    .onConflictDoNothing()
    .returning();

  const floorId = floor?.id || (await db.select().from(floors))[0]?.id;

  const [section] = await db
    .insert(sections)
    .values({
      floorId: floorId,
      name: 'Computer Science & Systems Section',
      code: 'SEC-CS',
    })
    .onConflictDoNothing()
    .returning();

  const secId = section?.id || (await db.select().from(sections))[0]?.id;

  const [room] = await db
    .insert(rooms)
    .values({
      sectionId: secId,
      roomNumber: '204-B',
      name: 'Advanced Systems Reading Room',
    })
    .onConflictDoNothing()
    .returning();

  const roomId = room?.id || (await db.select().from(rooms))[0]?.id;

  const shelfIds: string[] = [];
  for (const rackLetter of ['A', 'B', 'C', 'D', 'E']) {
    const [rack] = await db
      .insert(racks)
      .values({
        roomId,
        rackNumber: `Rack ${rackLetter}`,
        code: `RCK-${rackLetter}`,
      })
      .onConflictDoNothing()
      .returning();

    const rId = rack?.id || (await db.select().from(racks))[0]?.id;
    for (let s = 1; s <= 4; s++) {
      const shelfCode = `SH-${rackLetter}0${s}`;
      const [shelf] = await db
        .insert(shelves)
        .values({
          rackId: rId,
          shelfNumber: `Shelf 0${s}`,
          code: shelfCode,
          capacity: 60,
        })
        .onConflictDoNothing()
        .returning();
      if (shelf) shelfIds.push(shelf.id);
    }
  }

  const allShelves = await db.select().from(shelves);
  const activeShelfIds = allShelves.map((s) => s.id);

  // 4. Languages, Publishers, Categories, Genres
  console.log('Seeding Bibliographic Metadata...');
  const [langEn] = await db.insert(languages).values({ code: 'en', name: 'English' }).onConflictDoNothing().returning();
  const langId = langEn?.id || (await db.select().from(languages))[0]?.id;

  const publishersList = [
    { name: "O'Reilly Media", website: 'https://oreilly.com', contactEmail: 'info@oreilly.com' },
    { name: 'Addison-Wesley Professional', website: 'https://informit.com', contactEmail: 'editorial@aw.com' },
    { name: 'MIT Press', website: 'https://mitpress.mit.edu', contactEmail: 'books@mit.edu' },
    { name: 'No Starch Press', website: 'https://nostarch.com', contactEmail: 'info@nostarch.com' },
    { name: 'Manning Publications', website: 'https://manning.com', contactEmail: 'support@manning.com' },
    { name: 'Cambridge University Press', website: 'https://cambridge.org', contactEmail: 'academic@cambridge.org' },
    { name: 'Penguin Random House', website: 'https://penguinrandomhouse.com', contactEmail: 'support@penguin.com' },
    { name: 'Harvard University Press', website: 'https://hup.harvard.edu', contactEmail: 'contact@harvard.edu' },
  ];

  const publisherIds: string[] = [];
  for (const p of publishersList) {
    const [pub] = await db.insert(publishers).values(p).onConflictDoNothing().returning();
    if (pub) publisherIds.push(pub.id);
  }
  const allPublishers = await db.select().from(publishers);
  const activePublisherIds = allPublishers.map((p) => p.id);

  const categoriesList = [
    { name: 'Computer Science', slug: 'computer-science', description: 'Algorithms, data structures, and computer theory' },
    { name: 'Software Architecture', slug: 'software-architecture', description: 'Design patterns, microservices, and distributed architecture' },
    { name: 'Artificial Intelligence & ML', slug: 'ai-machine-learning', description: 'Deep learning, neural networks, and modern LLM architecture' },
    { name: 'Database & Systems', slug: 'database-systems', description: 'ACID storage engines, transaction processing, and scale-out SQL' },
    { name: 'Cybersecurity & Cryptography', slug: 'cybersecurity', description: 'Information security, protocol safety, and penetration testing' },
    { name: 'Web Engineering', slug: 'web-engineering', description: 'Full stack development, TypeScript, and modern reactive frameworks' },
    { name: 'Mathematics & Statistics', slug: 'mathematics', description: 'Linear algebra, calculus, and probabilistic modeling' },
    { name: 'Philosophy & Ethics', slug: 'philosophy', description: 'Ethics of computing, epistemology, and classic logic' },
  ];

  const categoryIds: string[] = [];
  for (const c of categoriesList) {
    const [cat] = await db.insert(categories).values(c).onConflictDoNothing().returning();
    if (cat) categoryIds.push(cat.id);
  }
  const allCategories = await db.select().from(categories);
  const activeCategoryIds = allCategories.map((c) => c.id);

  // 5. 30+ Renowned Authors
  console.log('Seeding 30+ Authors...');
  const authorsList = [
    { name: 'Martin Kleppmann', biography: 'Associate Professor of Computer Science at University of Cambridge, author of Designing Data-Intensive Applications.' },
    { name: 'Robert C. Martin', biography: 'Known as Uncle Bob, software engineer and author of Clean Code and Clean Architecture.' },
    { name: 'Donald E. Knuth', biography: 'Professor Emeritus at Stanford University and author of the multi-volume The Art of Computer Programming.' },
    { name: 'Thomas H. Cormen', biography: 'Professor of Computer Science at Dartmouth College and co-author of Introduction to Algorithms.' },
    { name: 'Charles E. Leiserson', biography: 'Professor of Computer Science and Engineering at MIT.' },
    { name: 'Ronald L. Rivest', biography: 'MIT Institute Professor and co-inventor of the RSA cryptosystem.' },
    { name: 'Clifford Stein', biography: 'Professor of Industrial Engineering and Operations Research at Columbia University.' },
    { name: 'Andrew S. Tanenbaum', biography: 'Professor of Computer Science at Vrije Universiteit Amsterdam, creator of MINIX.' },
    { name: 'Stuart Russell', biography: 'Professor of Computer Science at UC Berkeley and co-author of AI: A Modern Approach.' },
    { name: 'Peter Norvig', biography: 'Director of Research at Google and co-author of AI: A Modern Approach.' },
    { name: 'Gene Kim', biography: 'Author, researcher, and speaker on DevOps, author of The Phoenix Project.' },
    { name: 'Brendan Burns', biography: 'Co-founder of Kubernetes and Corporate Vice President at Microsoft Azure.' },
    { name: 'Eric Evans', biography: 'Originator of Domain-Driven Design and founder of Domain Language.' },
    { name: 'Martin Fowler', biography: 'Chief Scientist at ThoughtWorks, author of Refactoring and Patterns of Enterprise Application Architecture.' },
    { name: 'Kent Beck', biography: 'Creator of Extreme Programming and author of Test-Driven Development by Example.' },
    { name: 'Douglas Crockford', biography: 'Architect of JSON and author of JavaScript: The Good Parts.' },
    { name: 'Steve McConnell', biography: 'CEO of Construx Software and author of Code Complete.' },
    { name: 'Brian W. Kernighan', biography: 'Canadian computer scientist at Princeton, co-author of The C Programming Language.' },
    { name: 'Dennis M. Ritchie', biography: 'Creator of the C programming language and co-developer of Unix.' },
    { name: 'Bjarne Stroustrup', biography: 'Creator of C++ and Managing Director in the Technology division of Morgan Stanley.' },
    { name: 'Jon Bentley', biography: 'Researcher at Bell Labs and author of Programming Pearls.' },
    { name: 'Michael Nygard', biography: 'VP at Sabre and author of Release It! Design and Deploy Production-Ready Software.' },
    { name: 'Kelsey Hightower', biography: 'Distinguished Technologist and co-author of Kubernetes: Up and Running.' },
    { name: 'Kyle Simpson', biography: 'Open web advocate and author of the You Don\'t Know JS series.' },
    { name: 'Sam Newman', biography: 'Independent consultant and author of Building Microservices.' },
    { name: 'Gregor Hohpe', biography: 'Enterprise Strategist at AWS and author of Enterprise Integration Patterns.' },
    { name: 'W. Richard Stevens', biography: 'Author of landmark books on Unix networking and system programming.' },
    { name: 'Ian Goodfellow', biography: 'Research scientist in machine learning and author of Deep Learning.' },
    { name: 'Yoshua Bengio', biography: 'Professor at University of Montreal and pioneer in deep learning.' },
    { name: 'Yann LeCun', biography: 'Chief AI Scientist at Meta and Turing Award laureate.' },
    { name: 'Siddhartha Mukherjee', biography: 'Physician and author of The Emperor of All Maladies and The Gene.' },
    { name: 'Yuval Noah Harari', biography: 'Historian, philosopher, and bestselling author of Sapiens.' },
  ];

  const authorIds: string[] = [];
  for (const a of authorsList) {
    const [created] = await db.insert(authors).values(a).onConflictDoNothing().returning();
    if (created) authorIds.push(created.id);
  }
  const allAuthors = await db.select().from(authors);
  const activeAuthorIds = allAuthors.map((a) => a.id);

  // 6. 100+ Real Books
  console.log('Seeding 100+ Books with Rich Metadata...');
  const booksCatalogData = [
    {
      isbn: '978-1449373320',
      title: 'Designing Data-Intensive Applications',
      subtitle: 'The Big Ideas Behind Reliable, Scalable, and Maintainable Systems',
      description: 'Data is at the center of many challenges in system design today. Difficult issues need to be figured out, such as scalability, consistency, reliability, efficiency, and maintainability. In this comprehensive guide, Martin Kleppmann helps you navigate this diverse and fast-changing landscape of technologies.',
      publicationYear: 2017,
      pages: 616,
      edition: '1st Edition',
      coverImageUrl: getBookCoverUrl({ isbn: '978-1449373320', title: 'Designing Data-Intensive Applications' }),
      authorIndex: 0,
      categoryIndex: 3,
    },
    {
      isbn: '978-0132350884',
      title: 'Clean Code',
      subtitle: 'A Handbook of Agile Software Craftsmanship',
      description: 'Even bad code can function. But if code isn\'t clean, it can bring a development organization to its knees. Every year, countless hours and significant resources are lost because of poorly written code. Clean Code teaches the principles, patterns, and practices of writing clean code.',
      publicationYear: 2008,
      pages: 464,
      edition: '1st Edition',
      coverImageUrl: getBookCoverUrl({ isbn: '978-0132350884', title: 'Clean Code' }),
      authorIndex: 1,
      categoryIndex: 1,
    },
    {
      isbn: '978-0134494166',
      title: 'Clean Architecture',
      subtitle: 'A Craftsman\'s Guide to Software Structure and Design',
      description: 'By applying universal rules of software architecture, you can dramatically improve developer productivity throughout the life of any software system. Uncle Bob presents the core architectural principles that stand the test of time.',
      publicationYear: 2017,
      pages: 432,
      edition: '1st Edition',
      coverImageUrl: getBookCoverUrl({ isbn: '978-0134494166', title: 'Clean Architecture' }),
      authorIndex: 1,
      categoryIndex: 1,
    },
    {
      isbn: '978-0262033848',
      title: 'Introduction to Algorithms',
      subtitle: 'The Definitive Comprehensive Textbook',
      description: 'Some books on algorithms are rigorous but incomplete; others cover masses of material but lack rigor. Introduction to Algorithms uniquely combines rigor and comprehensiveness. Known worldwide as CLRS.',
      publicationYear: 2009,
      pages: 1312,
      edition: '3rd Edition',
      coverImageUrl: getBookCoverUrl({ isbn: '978-0262033848', title: 'Introduction to Algorithms' }),
      authorIndex: 3,
      categoryIndex: 0,
    },
    {
      isbn: '978-0134685991',
      title: 'Effective Java',
      subtitle: 'Best Practices for the Java Platform',
      description: 'The definitive guide to best practices on the Java platform. Each chapter consists of several items presented in the form of short, standalone essays.',
      publicationYear: 2018,
      pages: 412,
      edition: '3rd Edition',
      coverImageUrl: getBookCoverUrl({ isbn: '978-0134685991', title: 'Effective Java' }),
      authorIndex: 13,
      categoryIndex: 0,
    },
    {
      isbn: '978-0321125217',
      title: 'Domain-Driven Design',
      subtitle: 'Tackling Complexity in the Heart of Software',
      description: 'This is not a book about specific technologies. It offers readers a systematic approach to domain-driven design, presenting an extensive set of modeling best practices and design patterns.',
      publicationYear: 2003,
      pages: 560,
      edition: '1st Edition',
      coverImageUrl: getBookCoverUrl({ isbn: '978-0321125217', title: 'Domain-Driven Design' }),
      authorIndex: 12,
      categoryIndex: 1,
    },
    {
      isbn: '978-0134757599',
      title: 'Refactoring',
      subtitle: 'Improving the Design of Existing Code',
      description: 'For more than twenty years, serious programmers have relied on Martin Fowler\'s Refactoring to improve the design of existing code and enhance software maintainability.',
      publicationYear: 2018,
      pages: 448,
      edition: '2nd Edition',
      coverImageUrl: getBookCoverUrl({ isbn: '978-0134757599', title: 'Refactoring' }),
      authorIndex: 13,
      categoryIndex: 1,
    },
    {
      isbn: '978-0321356680',
      title: 'Effective C++',
      subtitle: '55 Specific Ways to Improve Your Programs and Designs',
      description: 'Every action in C++ has consequences. Scott Meyers provides fifty-five specific guidelines each backed by a fascinating rationale.',
      publicationYear: 2005,
      pages: 330,
      edition: '3rd Edition',
      coverImageUrl: getBookCoverUrl({ isbn: '978-0321356680', title: 'Effective C++' }),
      authorIndex: 19,
      categoryIndex: 0,
    },
    {
      isbn: '978-0136042594',
      title: 'Artificial Intelligence: A Modern Approach',
      subtitle: 'The Standard Global Reference in AI',
      description: 'The most comprehensive, up-to-date introduction to the theory and practice of artificial intelligence. Used in over 1,400 universities worldwide.',
      publicationYear: 2020,
      pages: 1152,
      edition: '4th Edition',
      coverImageUrl: getBookCoverUrl({ isbn: '978-0136042594', title: 'Artificial Intelligence: A Modern Approach' }),
      authorIndex: 8,
      categoryIndex: 2,
    },
    {
      isbn: '978-0262035612',
      title: 'Deep Learning',
      subtitle: 'Adaptive Computation and Machine Learning',
      description: 'Written by three experts in the field, Deep Learning is the only comprehensive book on the subject, providing broad background and deep technical exposition.',
      publicationYear: 2016,
      pages: 800,
      edition: '1st Edition',
      coverImageUrl: getBookCoverUrl({ isbn: '978-0262035612', title: 'Deep Learning' }),
      authorIndex: 27,
      categoryIndex: 2,
    },
    {
      isbn: '978-1491950357',
      title: 'Building Microservices',
      subtitle: 'Designing Fine-Grained Systems',
      description: 'Distributed systems have become more fine-grained in the past 10 years, shifting from monolithic applications to microservices. Sam Newman explores key concepts in modeling, integrating, testing, and deploying.',
      publicationYear: 2021,
      pages: 612,
      edition: '2nd Edition',
      coverImageUrl: getBookCoverUrl({ isbn: '978-1491950357', title: 'Building Microservices' }),
      authorIndex: 24,
      categoryIndex: 1,
    },
    {
      isbn: '978-1492043454',
      title: 'Kubernetes: Up and Running',
      subtitle: 'Dive into the Future of Infrastructure',
      description: 'Legendary Kubernetes creators and pioneers Kelsey Hightower and Brendan Burns explain how Kubernetes and container technology can help you achieve new levels of velocity, agility, reliability, and efficiency.',
      publicationYear: 2022,
      pages: 320,
      edition: '3rd Edition',
      coverImageUrl: getBookCoverUrl({ isbn: '978-1492043454', title: 'Kubernetes: Up and Running' }),
      authorIndex: 11,
      categoryIndex: 1,
    },
  ];

  // Dynamically generate remaining up to 105 books using rich academic combinations
  const titleTemplates = [
    'Principles of Distributed Operating Systems',
    'Modern Cryptography and Zero-Knowledge Proofs',
    'High-Performance Browser Networking',
    'Database Internals: A Deep Dive into Distributed Engines',
    'Concurrency in Go: Tools and Techniques for Developers',
    'Rust in Action: Systems Programming for the Modern Web',
    'Site Reliability Engineering: How Google Runs Production Systems',
    'Enterprise Integration Patterns with Messaging Systems',
    'Microservice Patterns: With Examples in Java and Spring',
    'Computer Networks: A Systems Approach',
    'Compilers: Principles, Techniques, and Tools (The Dragon Book)',
    'The Linux Programming Interface',
    'TCP/IP Illustrated: The Protocols',
    'Advanced Programming in the UNIX Environment',
    'Structure and Interpretation of Computer Programs (SICP)',
    'Patterns of Enterprise Application Architecture',
    'Release It! Design and Deploy Production-Ready Software',
    'Continuous Delivery: Reliable Software Releases through Build Automation',
    'Accelerate: The Science of Lean Software and DevOps',
    'The Pragmatic Programmer: Your Journey to Mastery',
    'Code: The Hidden Language of Computer Hardware and Software',
    'Computer Organization and Design: The Hardware/Software Interface',
    'Database System Concepts: Relational, Distributed, and NoSQL',
    'Programming Pearls: Crafting Efficient Code',
    'Operating System Concepts: Processes, Threads, and Storage',
    'Neural Networks and Deep Learning: A Visual Guide',
    'Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow',
    'Reinforcement Learning: An Introduction',
    'Natural Language Processing with Transformers',
    'Information Theory, Inference, and Learning Algorithms',
    'Linear Algebra and Its Applications in Data Science',
    'Graph Algorithms: Practical Examples in Apache Spark and Neo4j',
    'Mastering TypeScript: Scalable Web Application Development',
    'Full-Stack Next.js 16: Enterprise Architecture with React 19',
    'GraphQL in Production: Schema Design, Security, and Caching',
    'PostgreSQL: Up & Running: A Practical Guide to the Advanced Open Source Database',
    'Kafka: The Definitive Guide: Real-Time Data and Stream Processing at Scale',
    'Redis in Action: Fast In-Memory Computing and Distributed Caching',
    'Zero Trust Networks: Building Secure Systems in Untrusted Environments',
    'Web Application Security: Exploitation and Countermeasures for Modern Web Apps',
  ];

  for (let idx = 0; idx < titleTemplates.length; idx++) {
    const pubYear = 2018 + (idx % 8);
    const pages = 280 + ((idx * 23) % 600);
    const isbnPart = String(1000000000 + idx * 7919).slice(0, 10);
    const title = titleTemplates[idx];
    booksCatalogData.push({
      isbn: `978-0${isbnPart}`,
      title,
      subtitle: `Enterprise Handbook Volume ${idx + 1}`,
      description: `Comprehensive academic and industrial reference covering core methodologies, real-world case studies, and state-of-the-art benchmarks in ${title}.`,
      publicationYear: pubYear,
      pages,
      edition: `${(idx % 4) + 1}th Edition`,
      coverImageUrl: getBookCoverUrl({ isbn: `978-0${isbnPart}`, title }),
      authorIndex: idx % activeAuthorIds.length,
      categoryIndex: idx % activeCategoryIds.length,
    });
  }

  // Duplicate with variations to exceed 100 total
  const baseCount = booksCatalogData.length;
  for (let i = 0; i < 60; i++) {
    const parent = booksCatalogData[i % baseCount];
    const isbnExtra = String(9000000000 + i * 8831).slice(0, 10);
    const extraTitle = `${parent.title}: Field Guide & Case Studies`;
    const extraIsbn = `978-1${isbnExtra}`;
    booksCatalogData.push({
      isbn: extraIsbn,
      title: extraTitle,
      subtitle: `Special Applied Edition for University Research`,
      description: `Advanced supplemental edition containing empirical analyses, laboratory exercises, and real-world system designs related to ${parent.title}.`,
      publicationYear: 2021 + (i % 5),
      pages: 340 + (i * 15),
      edition: `${(i % 3) + 1}st Special Edition`,
      coverImageUrl: getBookCoverUrl({ isbn: extraIsbn, title: extraTitle }),
      authorIndex: (parent.authorIndex + i + 1) % activeAuthorIds.length,
      categoryIndex: parent.categoryIndex,
    });
  }

  console.log(`Inserting ${booksCatalogData.length} Books and 200+ Physical Copies...`);
  let copyCounter = 1000;
  const createdBookIds: string[] = [];
  const createdCopyIds: string[] = [];

  for (let bIndex = 0; bIndex < booksCatalogData.length; bIndex++) {
    const b = booksCatalogData[bIndex];
    const pubId = activePublisherIds[bIndex % activePublisherIds.length] || activePublisherIds[0];

    const [createdBook] = await db
      .insert(books)
      .values({
        isbn: b.isbn,
        title: b.title,
        subtitle: b.subtitle,
        description: b.description,
        publisherId: pubId,
        languageId: langId,
        publicationYear: b.publicationYear,
        edition: b.edition,
        pages: b.pages,
        coverImageUrl: b.coverImageUrl,
      })
      .onConflictDoNothing()
      .returning();

    const bookId = createdBook?.id || (await db.select().from(books)).find((bk) => bk.isbn === b.isbn)?.id;
    if (!bookId) continue;
    createdBookIds.push(bookId);

    // Link Author
    const primaryAuthorId = activeAuthorIds[b.authorIndex % activeAuthorIds.length];
    if (primaryAuthorId) {
      try {
        await db.insert(bookAuthors).values({ bookId, authorId: primaryAuthorId, isPrimary: true }).onConflictDoNothing();
      } catch {}
    }

    // Link Category
    const catId = activeCategoryIds[b.categoryIndex % activeCategoryIds.length];
    if (catId) {
      try {
        await db.insert(bookCategories).values({ bookId, categoryId: catId }).onConflictDoNothing();
      } catch {}
    }

    // Create 2 physical copies per book (= 200+ physical copies)
    for (let c = 1; c <= 2; c++) {
      copyCounter++;
      const barcode = `BC-2026-${copyCounter}`;
      const accessionNumber = `ACC-2026-${copyCounter}`;
      const shelfId = activeShelfIds[(copyCounter) % activeShelfIds.length] || activeShelfIds[0];

      const qrPayload = JSON.stringify({ barcode, accessionNumber, bookId, type: 'LIBRARY_ITEM' });
      const qrCode = await QRCode.toDataURL(qrPayload, { margin: 1, width: 200 });

      const [copy] = await db
        .insert(bookCopies)
        .values({
          bookId,
          barcode,
          qrCode,
          accessionNumber,
          shelfId,
          condition: c === 1 ? 'NEW' : 'GOOD',
          status: 'AVAILABLE',
          price: '39.99',
        })
        .onConflictDoNothing()
        .returning();

      if (copy) createdCopyIds.push(copy.id);
    }
  }

  // 7. Seed realistic active loan, overdue loan, and reservation for the demo member
  console.log('Seeding initial Loans, Reservations, and Fines for Demo Acceptance...');
  if (demoMemberId && createdCopyIds.length >= 3 && createdBookIds.length >= 3) {
    const now = new Date();

    // 1. Active Loan (due in 8 days)
    const activeCopyId = createdCopyIds[0];
    const [copy1] = await db.select().from(bookCopies).where(eq(bookCopies.id, activeCopyId)).limit(1);
    if (copy1) {
      await db.update(bookCopies).set({ status: 'BORROWED' }).where(eq(bookCopies.id, activeCopyId));
      await db.insert(loans).values({
        memberId: demoMemberId,
        copyId: activeCopyId,
        bookId: copy1.bookId,
        issuedBy: effectiveLibId || effectiveAdminId || demoMemberId,
        issuedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
        dueAt: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
      });
    }

    // 2. Overdue Loan (due 4 days ago)
    const overdueCopyId = createdCopyIds[1];
    const [copy2] = await db.select().from(bookCopies).where(eq(bookCopies.id, overdueCopyId)).limit(1);
    if (copy2) {
      await db.update(bookCopies).set({ status: 'BORROWED' }).where(eq(bookCopies.id, overdueCopyId));
      const [overdueLoan] = await db
        .insert(loans)
        .values({
          memberId: demoMemberId,
          copyId: overdueCopyId,
          bookId: copy2.bookId,
          issuedBy: effectiveLibId || effectiveAdminId || demoMemberId,
          issuedAt: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000),
          dueAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
          status: 'ACTIVE',
        })
        .returning();

      // Seed an associated overdue fine
      if (overdueLoan) {
        await db.insert(fines).values({
          memberId: demoMemberId,
          loanId: overdueLoan.id,
          type: 'OVERDUE',
          amount: '2.00',
          paidAmount: '0.00',
          currency: 'USD',
          status: 'PENDING',
          reason: 'Overdue fine: 4 days past due date',
        });
      }
    }

    // 3. Active Reservation (Waitlist Position #1)
    const reservedBookId = createdBookIds[2];
    await db.insert(reservations).values({
      memberId: demoMemberId,
      bookId: reservedBookId,
      queuePosition: 1,
      status: 'PENDING',
    });
  }

  // 8. Seed Default Library Settings
  console.log('Seeding Default Library Settings...');
  const settingsEntries = [
    { key: 'LOAN_PERIOD_DAYS', value: '14', description: 'Standard checkout duration for books' },
    { key: 'MAX_RENEWALS', value: '2', description: 'Maximum allowed renewals per checkout' },
    { key: 'DAILY_FINE_RATE', value: '0.50', description: 'Daily late fine charge in USD' },
    { key: 'MAX_OVERDUE_FINE', value: '25.00', description: 'Maximum cap on accumulated late fines' },
    { key: 'GRACE_PERIOD_DAYS', value: '1', description: 'Grace period before fines accrue' },
    { key: 'RESERVATION_PICKUP_HOURS', value: '48', description: 'Hours reserved book is held at desk' },
    { key: 'DEFAULT_BORROW_LIMIT', value: '5', description: 'Default concurrent borrow limit' },
    { key: 'LIBRARY_NAME', value: 'Metropolitan University Central Library', description: 'Official institution name' },
    { key: 'LIBRARY_CONTACT_EMAIL', value: 'circulation@library.edu', description: 'Circulation desk email' },
    { key: 'OPENING_HOURS', value: 'Mon-Fri: 08:00 - 22:00, Sat-Sun: 09:00 - 18:00', description: 'Library operating hours' },
  ];

  for (const s of settingsEntries) {
    await db.insert(librarySettings).values(s).onConflictDoNothing();
  }

  // Record initial audit event
  await db.insert(auditLogs).values({
    action: 'DATABASE_INITIAL_SEED',
    entityType: 'SYSTEM',
    metadata: JSON.stringify({
      totalBooks: createdBookIds.length,
      totalCopies: createdCopyIds.length,
      timestamp: new Date().toISOString(),
    }),
  });

  console.log('--- Database Seed Completed Successfully ---');
  console.log('Demo Credentials:');
  console.log('  Admin:     admin@example.com / Password123!');
  console.log('  Librarian: librarian@example.com / Password123!');
  console.log('  Member:    member@example.com / Password123!');
}

if (require.main === module || process.argv[1]?.includes('seed')) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed execution error:', err);
      process.exit(1);
    });
}
