// Utilities for resolving and generating distinct, high-quality book covers

// Color themes for stylized generated publisher covers
const COVER_THEMES = [
  { bg: 'linear-gradient(145deg, #1e293b, #0f172a)', border: '#334155', accent: '#38bdf8', category: 'SYSTEMS' },
  { bg: 'linear-gradient(145deg, #14532d, #052e16)', border: '#166534', accent: '#4ade80', category: 'ALGORITHMS' },
  { bg: 'linear-gradient(145deg, #7c2d12, #451a03)', border: '#9a3412', accent: '#fb923c', category: 'ARCHITECTURE' },
  { bg: 'linear-gradient(145deg, #312e81, #1e1b4b)', border: '#3730a3', accent: '#818cf8', category: 'COMPUTING' },
  { bg: 'linear-gradient(145deg, #581c87, #3b0764)', border: '#6b21a8', accent: '#c084fc', category: 'AI & ML' },
  { bg: 'linear-gradient(145deg, #831843, #500724)', border: '#9d174d', accent: '#f472b6', category: 'LANGUAGES' },
  { bg: 'linear-gradient(145deg, #134e4a, #042f2e)', border: '#115e59', accent: '#2dd4bf', category: 'NETWORKING' },
  { bg: 'linear-gradient(145deg, #0c4a6e, #082f49)', border: '#075985', accent: '#38bdf8', category: 'DATABASE' },
  { bg: 'linear-gradient(145deg, #701a75, #4a044e)', border: '#86198f', accent: '#e879f9', category: 'SECURITY' },
  { bg: 'linear-gradient(145deg, #27272a, #18181b)', border: '#3f3f46', accent: '#a1a1aa', category: 'DEVOPS' },
];

// Hash function to consistently select theme from string
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Known real book covers via OpenLibrary by ISBN
const REAL_BOOK_COVERS: Record<string, string> = {
  // Designing Data-Intensive Applications
  '9781449373320': 'https://covers.openlibrary.org/b/isbn/9781449373320-L.jpg',
  // Clean Code
  '9780132350884': 'https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg',
  // Clean Architecture
  '9780134494166': 'https://covers.openlibrary.org/b/isbn/9780134494166-L.jpg',
  // Introduction to Algorithms (CLRS)
  '9780262033848': 'https://covers.openlibrary.org/b/isbn/9780262033848-L.jpg',
  // Effective Java
  '9780134685991': 'https://covers.openlibrary.org/b/isbn/9780134685991-L.jpg',
  // Domain-Driven Design
  '9780321125217': 'https://covers.openlibrary.org/b/isbn/9780321125217-L.jpg',
  // Refactoring
  '9780134757599': 'https://covers.openlibrary.org/b/isbn/9780134757599-L.jpg',
  // Effective C++
  '9780321356680': 'https://covers.openlibrary.org/b/isbn/9780321356680-L.jpg',
  // Artificial Intelligence: A Modern Approach
  '9780136042594': 'https://covers.openlibrary.org/b/isbn/9780136042594-L.jpg',
  // Deep Learning
  '9780262035612': 'https://covers.openlibrary.org/b/isbn/9780262035612-L.jpg',
  // Building Microservices
  '9781491950357': 'https://covers.openlibrary.org/b/isbn/9781491950357-L.jpg',
  // Kubernetes: Up and Running
  '9781492043454': 'https://covers.openlibrary.org/b/isbn/9781492043454-L.jpg',
  // The Pragmatic Programmer
  '9780135957059': 'https://covers.openlibrary.org/b/isbn/9780135957059-L.jpg',
  // Structure and Interpretation of Computer Programs (SICP)
  '9780262510875': 'https://covers.openlibrary.org/b/isbn/9780262510875-L.jpg',
  // Code: The Hidden Language
  '9780735611313': 'https://covers.openlibrary.org/b/isbn/9780735611313-L.jpg',
  // Site Reliability Engineering
  '9781491929124': 'https://covers.openlibrary.org/b/isbn/9781491929124-L.jpg',
  // The Linux Programming Interface
  '9781593272203': 'https://covers.openlibrary.org/b/isbn/9781593272203-L.jpg',
  // Database Internals
  '9781492040347': 'https://covers.openlibrary.org/b/isbn/9781492040347-L.jpg',
  // Hands-On Machine Learning
  '9781492032649': 'https://covers.openlibrary.org/b/isbn/9781492032649-L.jpg',
  // Kafka: The Definitive Guide
  '9781491936160': 'https://covers.openlibrary.org/b/isbn/9781491936160-L.jpg',
  // High-Performance Browser Networking
  '9781449344764': 'https://covers.openlibrary.org/b/isbn/9781449344764-L.jpg',
  // Computer Networks
  '9780123850591': 'https://covers.openlibrary.org/b/isbn/9780123850591-L.jpg',
  // Compilers (Dragon Book)
  '9780321486813': 'https://covers.openlibrary.org/b/isbn/9780321486813-L.jpg',
  // Continuous Delivery
  '9780321601919': 'https://covers.openlibrary.org/b/isbn/9780321601919-L.jpg',
  // Enterprise Integration Patterns
  '9780321200686': 'https://covers.openlibrary.org/b/isbn/9780321200686-L.jpg',
  // Release It!
  '9781680502398': 'https://covers.openlibrary.org/b/isbn/9781680502398-L.jpg',
  // Accelerate
  '9781942788331': 'https://covers.openlibrary.org/b/isbn/9781942788331-L.jpg',
  // Operating System Concepts
  '9781119800361': 'https://covers.openlibrary.org/b/isbn/9781119800361-L.jpg',
};

// Title-based curated image collection with distinct, high-res Unsplash tech photos
const TOPIC_PHOTOS: Array<{ keywords: string[]; url: string }> = [
  {
    keywords: ['data', 'database', 'postgresql', 'redis', 'kafka', 'internals'],
    url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=85', // Server rack / data flow
  },
  {
    keywords: ['clean code', 'refactoring', 'craftsmanship', 'pearls', 'programming'],
    url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=85', // Clean code IDE setup
  },
  {
    keywords: ['architecture', 'microservices', 'domain-driven', 'enterprise', 'patterns'],
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop&q=85', // Architectural structure
  },
  {
    keywords: ['algorithm', 'clrs', 'graph', 'linear algebra', 'information theory'],
    url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop&q=85', // Mathematical geometry / algorithms
  },
  {
    keywords: ['ai', 'artificial intelligence', 'machine learning', 'deep learning', 'neural', 'transformers', 'nlp'],
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=85', // Neural abstract art
  },
  {
    keywords: ['kubernetes', 'cloud', 'sre', 'reliability', 'devops', 'continuous delivery', 'docker'],
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=85', // Planetary network / cloud infra
  },
  {
    keywords: ['security', 'cryptography', 'zero trust', 'web application security', 'countermeasures'],
    url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=85', // Binary digital security matrix
  },
  {
    keywords: ['network', 'browser', 'tcp/ip', 'http', 'distributed', 'concurrency'],
    url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600&auto=format&fit=crop&q=85', // Fiber optics network
  },
  {
    keywords: ['linux', 'unix', 'operating systems', 'kernel', 'compilers', 'hardware'],
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=85', // Microprocessor / hardware
  },
  {
    keywords: ['typescript', 'javascript', 'next.js', 'react', 'graphql', 'web', 'full-stack'],
    url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=85', // Modern syntax editor
  },
  {
    keywords: ['rust', 'go', 'java', 'c++', 'sicp', 'pragmatic'],
    url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=85', // Developer engineering laptop
  },
];

// Fallback pool of unique, distinct architectural and academic library images
const GENERAL_COVERS = [
  'https://images.unsplash.com/photo-1507842229452-44670c538a7c?w=600&auto=format&fit=crop&q=85',
  'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=600&auto=format&fit=crop&q=85',
  'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=85',
  'https://images.unsplash.com/photo-1532012164546-f432f2e37b7b?w=600&auto=format&fit=crop&q=85',
  'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=85',
  'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=600&auto=format&fit=crop&q=85',
  'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=600&auto=format&fit=crop&q=85',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&auto=format&fit=crop&q=85',
  'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=600&auto=format&fit=crop&q=85',
  'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&auto=format&fit=crop&q=85',
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&auto=format&fit=crop&q=85',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&auto=format&fit=crop&q=85',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=85',
  'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&auto=format&fit=crop&q=85',
  'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=600&auto=format&fit=crop&q=85',
  'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&auto=format&fit=crop&q=85',
];

/**
 * Resolves the optimal cover image URL for a book given its metadata
 */
export function getBookCoverUrl(book: {
  isbn?: string | null;
  title?: string | null;
  coverImageUrl?: string | null;
}): string {
  const cleanIsbn = book.isbn ? book.isbn.replace(/[^0-9X]/gi, '') : '';

  // 1. Check direct verified mapping
  if (cleanIsbn && REAL_BOOK_COVERS[cleanIsbn]) {
    return REAL_BOOK_COVERS[cleanIsbn];
  }

  // 2. If valid custom cover provided and NOT a broken placeholder template
  if (
    book.coverImageUrl &&
    book.coverImageUrl.startsWith('http') &&
    !book.coverImageUrl.includes('photo-1500000000000') &&
    !book.coverImageUrl.includes('photo-1505000000')
  ) {
    return book.coverImageUrl;
  }

  // 3. For any valid 10- or 13-digit ISBN, OpenLibrary offers real high-res covers
  if (cleanIsbn.length === 10 || cleanIsbn.length === 13) {
    // If it's a real publishing ISBN (starts with standard prefix)
    if (cleanIsbn.startsWith('9780') || cleanIsbn.startsWith('9781') || cleanIsbn.startsWith('0')) {
      return `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`;
    }
  }

  // 4. Match based on keywords in title
  const titleLower = (book.title || '').toLowerCase();
  for (const topic of TOPIC_PHOTOS) {
    if (topic.keywords.some((kw) => titleLower.includes(kw))) {
      return topic.url;
    }
  }

  // 5. Consistently pick a unique photo from general pool based on title hash
  const hash = hashString(book.title || cleanIsbn || 'book');
  return GENERAL_COVERS[hash % GENERAL_COVERS.length];
}

/**
 * Generates an SVG Data URI for an authentic-looking publisher book cover
 */
export function generateSvgCoverDataUri(
  title: string,
  authorName: string = 'Academic Press',
  category: string = 'Computer Science'
): string {
  const hash = hashString(title);
  const theme = COVER_THEMES[hash % COVER_THEMES.length];
  
  // Wrap title neatly into lines
  const words = title.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length > 18) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine += (currentLine ? ' ' : '') + word;
    }
  }
  if (currentLine) lines.push(currentLine.trim());
  const displayLines = lines.slice(0, 3); // Max 3 lines

  const titleSvgText = displayLines
    .map(
      (line, i) =>
        `<text x="36" y="${160 + i * 28}" fill="#ffffff" font-family="Georgia, serif" font-size="20" font-weight="bold">${escapeXml(line)}</text>`
    )
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" width="100%" height="100%">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#1e293b"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
      <linearGradient id="spine" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#000000" stop-opacity="0.5"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0.05"/>
      </linearGradient>
    </defs>
    <!-- Background Plate -->
    <rect width="300" height="400" fill="${theme.border}"/>
    <rect x="8" y="8" width="284" height="384" rx="4" fill="#0f172a"/>
    
    <!-- Spine Lighting Effect -->
    <rect x="8" y="8" width="24" height="384" fill="url(#spine)"/>
    
    <!-- Header / Category Pill -->
    <rect x="36" y="44" width="${Math.min(220, category.length * 10 + 24)}" height="22" rx="4" fill="${theme.accent}" fill-opacity="0.15" stroke="${theme.accent}" stroke-width="1"/>
    <text x="46" y="59" fill="${theme.accent}" font-family="system-ui, sans-serif" font-size="10" font-weight="700" letter-spacing="1">${escapeXml(category.toUpperCase())}</text>

    <!-- Distinctive Geometric Monogram -->
    <circle cx="240" cy="55" r="14" fill="${theme.accent}" fill-opacity="0.2"/>
    <text x="235" y="60" fill="${theme.accent}" font-family="Georgia, serif" font-size="12" font-weight="bold">◈</text>

    <!-- Title Lines -->
    ${titleSvgText}

    <!-- Author & Publisher Section -->
    <line x1="36" y1="300" x2="264" y2="300" stroke="${theme.accent}" stroke-width="1.5" stroke-opacity="0.6"/>
    <text x="36" y="328" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="11" font-weight="600" text-transform="uppercase" letter-spacing="1">AUTHOR</text>
    <text x="36" y="348" fill="#e2e8f0" font-family="system-ui, sans-serif" font-size="13" font-weight="500">${escapeXml(authorName)}</text>

    <!-- Bottom Emblem -->
    <text x="36" y="376" fill="#64748b" font-family="system-ui, sans-serif" font-size="9" letter-spacing="1">METROPOLITAN LIBRARY PRESS</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
