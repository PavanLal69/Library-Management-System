// Global event dispatcher for library companion interactions

export interface CompanionBookInfo {
  id?: string;
  title: string;
  authors?: Array<{ name: string }>;
  averageRating?: number;
  categories?: Array<{ name: string }>;
  availableCopies?: number;
}

export function notifyBookHovered(book: CompanionBookInfo) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('lms:book-hover', { detail: book }));
  }
}

export function notifyBookAcquired(book: { title: string; authors?: Array<{ name: string }> }) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('lms:book-acquired', { detail: book }));
  }
}
