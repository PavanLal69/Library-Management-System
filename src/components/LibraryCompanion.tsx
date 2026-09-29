'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sparkles,
  X,
  BookOpen,
  ArrowRight,
  Compass,
  Key,
  Heart,
  PartyPopper,
  Volume2,
  VolumeX,
  Layers,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Minimize2,
  RefreshCw,
  ShoppingBag,
  MessageSquare,
  LifeBuoy,
  Send,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { CompanionBookInfo } from '@/lib/companion-events';
import { useCompare } from '@/features/compare/CompareContext';
import { BookCardResult } from '@/server/services/BookService';
import { BookCover } from '@/components/BookCover';
import { speakLiaVoice, stopLiaVoice, playCompanionSfx } from '@/lib/companion-voice';
import {
  LIBRARY_FAQS,
  FaqItem,
  ChatMessage,
  generateLiaResponse,
  resolvePatronProblem,
  ProblemReport,
} from '@/lib/companion-qa';

type AnimationState = 'idle' | 'walking' | 'reading' | 'encouraging' | 'celebrating' | 'sleeping';
type HubTab = 'chat' | 'faq' | 'resolve' | 'tour' | 'surprise' | 'credentials';

export function LibraryCompanion() {
  const pathname = usePathname();
  const { openCompareModal } = useCompare();

  // Position and autonomous wandering
  const [posX, setPosX] = useState(140);
  const [facingLeft, setFacingLeft] = useState(false);
  const [animState, setAnimState] = useState<AnimationState>('idle');
  const [walkFrame, setWalkFrame] = useState(0);

  // Voice & Audio synthesis state
  const [isVoiceEnabled, setIsVoiceEnabled] = useState<boolean>(true);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [mouthOpen, setMouthOpen] = useState<boolean>(false);

  // Interaction & Dialog state
  const [speechText, setSpeechText] = useState<string>('Hi there! I’m Lia, your resident librarian! Ask me any question or chat with me! 📚');
  const [speechType, setSpeechType] = useState<'normal' | 'encourage' | 'thanks'>('normal');
  const [showSpeech, setShowSpeech] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isHubOpen, setIsHubOpen] = useState(false);
  const [hubTab, setHubTab] = useState<HubTab>('chat');

  // Interactive Chatbox state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'lia',
      text: "Hello! I'm Lia, your campus resident librarian! 📚 You can ask me anything about our collection, how borrowing works, shelf and floor locations, comparing editions, or resolving any problem!",
      timestamp: 'Just now',
      suggestedAction: {
        label: 'How do I borrow books?',
        onClickPrompt: 'How do I borrow books?',
      },
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isLiaTyping, setIsLiaTyping] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Searchable FAQ state
  const [faqSearch, setFaqSearch] = useState('');
  const [faqCategory, setFaqCategory] = useState<string>('all');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('faq-borrow-limit');

  // Problem Clearance state
  const [problemCategory, setProblemCategory] = useState<string>('book_returned_still_borrowed');
  const [problemBook, setProblemBook] = useState('');
  const [problemNotes, setProblemNotes] = useState('');
  const [activeResolution, setActiveResolution] = useState<ProblemReport | null>(null);
  const [isSubmittingProblem, setIsSubmittingProblem] = useState(false);

  // Currently focused / hovered book
  const [hoveredBook, setHoveredBook] = useState<CompanionBookInfo | null>(null);
  const [recentlyAcquiredBook, setRecentlyAcquiredBook] = useState<string | null>(null);

  // Random book recommendation in hub
  const [randomBook, setRandomBook] = useState<BookCardResult | null>(null);
  const [loadingRandom, setLoadingRandom] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const targetXRef = useRef<number>(140);
  const isInteractingRef = useRef<boolean>(false);
  const isVoiceEnabledRef = useRef<boolean>(true);

  // Load voice preference from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('lms_lia_voice_enabled');
      if (stored !== null) {
        const enabled = stored === 'true';
        setIsVoiceEnabled(enabled);
        isVoiceEnabledRef.current = enabled;
      }
    } catch {
      // Ignore
    }
  }, []);

  const toggleVoice = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsVoiceEnabled((prev) => {
      const next = !prev;
      isVoiceEnabledRef.current = next;
      try {
        localStorage.setItem('lms_lia_voice_enabled', String(next));
      } catch {
        // Ignore
      }
      if (!next) {
        stopLiaVoice();
        setIsSpeaking(false);
      } else {
        playCompanionSfx('click');
        speakLiaVoice('Voice enabled! Ready to guide you through the stacks!', {
          onStart: () => setIsSpeaking(true),
          onEnd: () => setIsSpeaking(false),
        });
      }
      return next;
    });
  };

  // Mouth flapping animation while Lia is speaking
  useEffect(() => {
    if (!isSpeaking) {
      setMouthOpen(false);
      return;
    }

    const interval = setInterval(() => {
      setMouthOpen((prev) => !prev);
    }, 140);

    return () => clearInterval(interval);
  }, [isSpeaking]);

  // Autonomous wandering loop (moves on its own across the screen)
  useEffect(() => {
    if (isMinimized) return;

    // Pick a new autonomous destination every 5-9 seconds if not reacting
    const wanderInterval = setInterval(() => {
      if (isInteractingRef.current) return;

      const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
      const minX = 60;
      const maxX = Math.max(minX + 100, screenWidth - 140);
      const nextX = minX + Math.random() * (maxX - minX);

      targetXRef.current = nextX;
      setFacingLeft(nextX < posX);
      setAnimState('walking');
    }, 7000);

    return () => clearInterval(wanderInterval);
  }, [posX, isMinimized]);

  // Physics animation tick
  useEffect(() => {
    if (isMinimized) return;

    let frameId: number;
    let stepCount = 0;

    const tick = () => {
      setPosX((currentX) => {
        const target = targetXRef.current;
        const diff = target - currentX;

        if (Math.abs(diff) > 4 && animState === 'walking') {
          const step = Math.sign(diff) * Math.min(Math.abs(diff) * 0.05 + 1.2, 2.5);
          stepCount++;
          if (stepCount % 8 === 0) {
            setWalkFrame((f) => (f + 1) % 4);
          }
          return currentX + step;
        } else if (animState === 'walking' && !isInteractingRef.current) {
          // Arrived at destination: randomly read a book or idle
          setAnimState(Math.random() > 0.4 ? 'reading' : 'idle');
        }
        return currentX;
      });

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [animState, isMinimized]);

  // Display speech and synthesize voice helper
  const triggerSpeech = useCallback(
    (text: string, type: 'normal' | 'encourage' | 'thanks' = 'normal', durationMs: number = 7500) => {
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
      setSpeechText(text);
      setSpeechType(type);
      setShowSpeech(true);

      // Play mood sound effects
      if (type === 'thanks') {
        playCompanionSfx('celebrate');
      } else if (type === 'encourage') {
        playCompanionSfx('curious');
      } else {
        playCompanionSfx('talk');
      }

      // Speak aloud with Lia's natural voice if voice is enabled
      if (isVoiceEnabledRef.current) {
        speakLiaVoice(text, {
          pitch: type === 'thanks' ? 1.25 : type === 'encourage' ? 1.18 : 1.12,
          rate: type === 'thanks' ? 1.08 : 1.04,
          onStart: () => setIsSpeaking(true),
          onEnd: () => setIsSpeaking(false),
        });
      }

      speechTimeoutRef.current = setTimeout(() => {
        setShowSpeech(false);
      }, durationMs);
    },
    []
  );

  // Listen for Book Hover & Book Acquired global events
  useEffect(() => {
    const handleBookHover = (e: Event) => {
      const book = (e as CustomEvent<CompanionBookInfo>).detail;
      if (!book || !book.title) return;

      setHoveredBook(book);
      isInteractingRef.current = true;
      setAnimState('encouraging');

      // Turn towards center
      setFacingLeft(false);

      // Generate personalized encouragement to buy/borrow
      const titleLower = book.title.toLowerCase();
      let pitch = '';

      if (titleLower.includes('data-intensive') || titleLower.includes('database')) {
        pitch = `Ooh! "${book.title}"! Martin Kleppmann's masterpiece is the absolute holy grail of system design! You MUST read this one!`;
      } else if (titleLower.includes('clean code') || titleLower.includes('clean architecture')) {
        pitch = `Uncle Bob's "${book.title}"! An essential classic—reading this will elevate your engineering skills to the next level! Definitely grab it!`;
      } else if (titleLower.includes('algorithm') || titleLower.includes('clrs')) {
        pitch = `"${book.title}"! The world-famous textbook! Reserve it now before other students borrow all copies!`;
      } else if (titleLower.includes('microservices') || titleLower.includes('kubernetes')) {
        pitch = `Top recommendation! "${book.title}" will supercharge your modern infrastructure knowledge! Check it out!`;
      } else if (titleLower.includes('artificial intelligence') || titleLower.includes('deep learning')) {
        pitch = `Fascinating read! "${book.title}" covers cutting-edge AI breakthroughs. You will love having this!`;
      } else if (book.availableCopies && book.availableCopies <= 2) {
        pitch = `Quick! Only ${book.availableCopies} physical copies left on shelf of "${book.title}"! Reserve yours right away!`;
      } else if (book.averageRating && book.averageRating >= 4.7) {
        pitch = `Stellar ${book.averageRating}★ rating! Readers can't stop praising "${book.title}"! You should totally get this volume!`;
      } else {
        pitch = `Ooh, "${book.title}"! A splendid volume for your reading list. Give it a look!`;
      }

      triggerSpeech(pitch, 'encourage', 8000);

      // Reset interaction after delay
      setTimeout(() => {
        isInteractingRef.current = false;
        setAnimState('reading');
      }, 7500);
    };

    const handleBookAcquired = (e: Event) => {
      const book = (e as CustomEvent<{ title: string }>).detail;
      const title = book?.title || 'this volume';

      setRecentlyAcquiredBook(title);
      isInteractingRef.current = true;
      setAnimState('celebrating');

      // Heartfelt enthusiastic thank you!
      const thankYouMsg = `🎉 YAY! THANK YOU SO MUCH for picking up "${title}"! You made an exceptional choice—happy learning and enjoy every single page! ❤️📚`;
      triggerSpeech(thankYouMsg, 'thanks', 10000);

      setTimeout(() => {
        isInteractingRef.current = false;
        setAnimState('idle');
      }, 9500);
    };

    window.addEventListener('lms:book-hover', handleBookHover);
    window.addEventListener('lms:book-acquired', handleBookAcquired);

    return () => {
      window.removeEventListener('lms:book-hover', handleBookHover);
      window.removeEventListener('lms:book-acquired', handleBookAcquired);
    };
  }, [triggerSpeech]);

  // Occasional random chatter while wandering
  useEffect(() => {
    const idleChatter = setInterval(() => {
      if (isInteractingRef.current || showSpeech) return;

      const ambientLines = [
        'Exploring the stacks... so many magnificent computer science treatises!',
        'Hover over any book to inspect its topics and edition details!',
        'Need to compare two volumes? Click "Compare" to see them side-by-side!',
        'Don’t forget: each copy shows its exact building floor and shelf location!',
        'Click on me anytime for a guided tour or random book pick!',
      ];
      const line = ambientLines[Math.floor(Math.random() * ambientLines.length)];
      triggerSpeech(line, 'normal', 5500);
    }, 22000);

    return () => clearInterval(idleChatter);
  }, [showSpeech, triggerSpeech]);

  // Fetch surprise book in hub
  const fetchSurpriseBook = async () => {
    setLoadingRandom(true);
    try {
      const res = await fetch('/api/books?limit=30&sort=relevance');
      if (res.ok) {
        const data = await res.json();
        const list: BookCardResult[] = data.data || [];
        if (list.length > 0) {
          const pick = list[Math.floor(Math.random() * list.length)];
          setRandomBook(pick);
        }
      }
    } catch {
      // Ignore
    } finally {
      setLoadingRandom(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAccount(id);
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  // Chatbox message submission
  const handleSendChat = (customText?: string) => {
    const textToSend = (customText ?? chatInput).trim();
    if (!textToSend || isLiaTyping) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setChatInput('');
    setIsLiaTyping(true);
    playCompanionSfx('click');

    setTimeout(() => {
      const liaReply = generateLiaResponse(textToSend);
      const replyMsg: ChatMessage = {
        id: `msg-reply-${Date.now()}`,
        sender: 'lia',
        text: liaReply.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedAction: liaReply.action,
      };

      setMessages((prev) => [...prev, replyMsg]);
      setIsLiaTyping(false);
      playCompanionSfx('talk');

      if (isVoiceEnabledRef.current) {
        speakLiaVoice(liaReply.text, {
          onStart: () => setIsSpeaking(true),
          onEnd: () => setIsSpeaking(false),
        });
      }
    }, 450);
  };

  // Auto-scroll chat window when new message arrives
  useEffect(() => {
    if (hubTab === 'chat') {
      chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLiaTyping, hubTab]);

  // Handle problem clearing submission
  const handleClearProblem = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingProblem(true);
    playCompanionSfx('click');

    setTimeout(() => {
      const resolution = resolvePatronProblem(problemCategory, problemBook, problemNotes);
      setActiveResolution(resolution);
      setIsSubmittingProblem(false);
      playCompanionSfx('celebrate');

      if (isVoiceEnabledRef.current) {
        speakLiaVoice(
          `I have logged your request under ticket number ${resolution.id}! Our circulation desk will assist you right away.`,
          {
            onStart: () => setIsSpeaking(true),
            onEnd: () => setIsSpeaking(false),
          }
        );
      }
    }, 450);
  };

  // Render authentic pixel-art human librarian ("Lia")
  const renderPixelLibrarian = () => {
    const legOffset = animState === 'walking' ? (walkFrame % 2 === 0 ? 2 : -2) : 0;
    const bodyBob = animState === 'walking' ? (walkFrame % 2 === 0 ? -1 : 0) : 0;
    const isJumping = animState === 'celebrating';

    return (
      <div
        className={`relative w-16 h-20 transition-transform duration-150 select-none ${
          facingLeft ? 'scale-x-[-1]' : 'scale-x-100'
        } ${isJumping ? 'animate-bounce' : ''}`}
        style={{
          imageRendering: 'pixelated',
        }}
      >
        <svg
          viewBox="0 0 32 40"
          width="64"
          height="80"
          className="filter drop-shadow-md"
          style={{ shapeRendering: 'crispEdges' }}
        >
          {/* Hair back / ponytail */}
          <rect x="8" y="4" width="16" height="12" fill="#78350f" />
          <rect x="6" y="8" width="4" height="10" fill="#78350f" />
          <rect x="22" y="8" width="4" height="10" fill="#78350f" />
          {/* Ponytail tie */}
          <rect x="24" y="6" width="3" height="3" fill="#0284c7" />
          <rect x="26" y="8" width="3" height="7" fill="#78350f" />

          {/* Head / Face */}
          <g transform={`translate(0, ${bodyBob})`}>
            {/* Skin base */}
            <rect x="10" y="8" width="12" height="10" fill="#fed7aa" />
            <rect x="8" y="10" width="2" height="4" fill="#fed7aa" />
            <rect x="22" y="10" width="2" height="4" fill="#fed7aa" />

            {/* Auburn Bangs */}
            <rect x="10" y="6" width="12" height="4" fill="#92400e" />
            <rect x="10" y="10" width="3" height="2" fill="#92400e" />
            <rect x="19" y="10" width="3" height="2" fill="#92400e" />

            {/* Cheeks blush */}
            <rect x="10" y="14" width="2" height="1" fill="#f43f5e" opacity="0.6" />
            <rect x="20" y="14" width="2" height="1" fill="#f43f5e" opacity="0.6" />

            {/* Expressive Pixel Eyes */}
            {animState === 'celebrating' ? (
              // Happy squinting closed curves
              <>
                <rect x="12" y="12" width="3" height="1" fill="#1c1917" />
                <rect x="17" y="12" width="3" height="1" fill="#1c1917" />
                <rect x="13" y="11" width="1" height="1" fill="#1c1917" />
                <rect x="18" y="11" width="1" height="1" fill="#1c1917" />
              </>
            ) : animState === 'encouraging' ? (
              // Sparkle starry anime eyes
              <>
                <rect x="12" y="11" width="3" height="3" fill="#0284c7" />
                <rect x="17" y="11" width="3" height="3" fill="#0284c7" />
                <rect x="13" y="12" width="1" height="1" fill="#ffffff" />
                <rect x="18" y="12" width="1" height="1" fill="#ffffff" />
                {/* Gold Spectacles */}
                <rect x="11" y="10" width="5" height="4" fill="none" stroke="#ca8a04" strokeWidth="1" />
                <rect x="16" y="10" width="5" height="4" fill="none" stroke="#ca8a04" strokeWidth="1" />
                <rect x="15" y="11" width="2" height="1" fill="#ca8a04" />
              </>
            ) : animState === 'sleeping' ? (
              // Sleeping eyes
              <>
                <rect x="12" y="13" width="3" height="1" fill="#44403c" />
                <rect x="17" y="13" width="3" height="1" fill="#44403c" />
              </>
            ) : (
              // Normal inquisitive librarian eyes
              <>
                <rect x="12" y="11" width="2" height="3" fill="#1c1917" />
                <rect x="18" y="11" width="2" height="3" fill="#1c1917" />
                <rect x="13" y="11" width="1" height="1" fill="#ffffff" />
                <rect x="19" y="11" width="1" height="1" fill="#ffffff" />
                {/* Gold Spectacles */}
                <rect x="11" y="10" width="4" height="4" fill="none" stroke="#ca8a04" strokeWidth="1" />
                <rect x="17" y="10" width="4" height="4" fill="none" stroke="#ca8a04" strokeWidth="1" />
                <rect x="15" y="11" width="2" height="1" fill="#ca8a04" />
              </>
            )}

            {/* Smile / Animated Talking Mouth */}
            {isSpeaking ? (
              mouthOpen ? (
                // Open talking mouth
                <rect x="14" y="14" width="4" height="3" fill="#991b1b" />
              ) : (
                // Closed mouth
                <rect x="14" y="15" width="4" height="1" fill="#991b1b" />
              )
            ) : animState === 'celebrating' || animState === 'encouraging' ? (
              <rect x="14" y="15" width="4" height="2" fill="#e11d48" />
            ) : (
              <rect x="15" y="15" width="2" height="1" fill="#991b1b" />
            )}
          </g>

          {/* Knitted Emerald Librarian Cardigan / Torso */}
          <g transform={`translate(0, ${bodyBob})`}>
            <rect x="9" y="18" width="14" height="9" fill="#047857" />
            {/* White Collar / Shirt */}
            <polygon points="14,18 16,21 18,18" fill="#f8fafc" />
            {/* Gold Buttons */}
            <rect x="15" y="21" width="2" height="1" fill="#fde047" />
            <rect x="15" y="23" width="2" height="1" fill="#fde047" />
            <rect x="15" y="25" width="2" height="1" fill="#fde047" />

            {/* Satchel Bag Strap */}
            <line x1="10" y1="18" x2="21" y2="27" stroke="#78350f" strokeWidth="1.5" />
            {/* Satchel Pouch */}
            <rect x="19" y="24" width="4" height="4" fill="#92400e" />
          </g>

          {/* Arms / Hand Gestures */}
          {animState === 'celebrating' ? (
            // Hands raised in joyful cheer!
            <g>
              <rect x="6" y="10" width="3" height="8" fill="#047857" />
              <rect x="6" y="8" width="3" height="3" fill="#fed7aa" />
              <rect x="23" y="10" width="3" height="8" fill="#047857" />
              <rect x="23" y="8" width="3" height="3" fill="#fed7aa" />
            </g>
          ) : animState === 'encouraging' ? (
            // One hand pointing/waving toward book, other holding satchel
            <g>
              <rect x="6" y="18" width="3" height="6" fill="#047857" />
              <rect x="6" y="24" width="3" height="2" fill="#fed7aa" />
              {/* Pointing Arm raised */}
              <rect x="23" y="16" width="6" height="3" fill="#047857" />
              <rect x="29" y="16" width="3" height="3" fill="#fed7aa" />
            </g>
          ) : animState === 'reading' ? (
            // Hands holding open miniature book
            <g>
              <rect x="7" y="19" width="4" height="4" fill="#047857" />
              <rect x="21" y="19" width="4" height="4" fill="#047857" />
              {/* Miniature Open Book */}
              <rect x="11" y="22" width="10" height="6" fill="#4338ca" />
              <rect x="12" y="23" width="4" height="4" fill="#f8fafc" />
              <rect x="16" y="23" width="4" height="4" fill="#f8fafc" />
              <line x1="16" y1="22" x2="16" y2="28" stroke="#312e81" strokeWidth="1" />
            </g>
          ) : (
            // Default relaxed arms
            <g>
              <rect x="6" y="18" width="3" height="7" fill="#047857" />
              <rect x="6" y="25" width="3" height="2" fill="#fed7aa" />
              <rect x="23" y="18" width="3" height="7" fill="#047857" />
              <rect x="23" y="25" width="3" height="2" fill="#fed7aa" />
            </g>
          )}

          {/* Pleated Skirt / Trousers */}
          <rect x="10" y="27" width="12" height="5" fill="#451a03" />

          {/* Animated Pixel Legs & Leather Boots */}
          {animState === 'reading' ? (
            // Sitting posture
            <g>
              <rect x="9" y="32" width="14" height="4" fill="#78350f" />
            </g>
          ) : (
            // Walking / standing legs
            <g>
              {/* Left leg */}
              <rect x="11" y="32" width="4" height="4" fill="#fed7aa" />
              <rect x="10" y={35 + legOffset} width="5" height="3" fill="#292524" />
              {/* Right leg */}
              <rect x="17" y="32" width="4" height="4" fill="#fed7aa" />
              <rect x="17" y={35 - legOffset} width="5" height="3" fill="#292524" />
            </g>
          )}
        </svg>

        {/* Celebrating Hearts / Sparkles Particles */}
        {animState === 'celebrating' && (
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 animate-bounce pointer-events-none">
            <span className="text-base">💖</span>
            <span className="text-lg">🎉</span>
            <span className="text-base">✨</span>
          </div>
        )}

        {/* Encouraging Sparkle */}
        {animState === 'encouraging' && (
          <div className="absolute -top-3 right-0 text-amber-500 animate-spin text-sm pointer-events-none">
            ✦
          </div>
        )}
      </div>
    );
  };

  // Minimized Floating Pill
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-in fade-in duration-300">
        <button
          onClick={() => setIsMinimized(false)}
          className="group relative px-4 py-2.5 rounded-full bg-stone-900 text-white shadow-2xl hover:bg-stone-800 border-2 border-emerald-400 hover:scale-105 transition-all flex items-center gap-2.5 cursor-pointer"
          title="Open Lia the Librarian"
        >
          <span className="text-xl">👩‍🏫</span>
          <span className="text-xs font-bold">Lia (Librarian)</span>
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse ring-2 ring-white" />
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Autonomously Roaming Pixel Character Entity */}
      <div
        style={{
          position: 'fixed',
          bottom: '22px',
          left: `${posX}px`,
          zIndex: 45,
          pointerEvents: 'auto',
          transition: 'left 0.1s linear',
        }}
        className="group flex flex-col items-center"
      >
        {/* Dynamic Contextual Speech Bubble with Voice & Audio Controls */}
        {showSpeech && speechText && !isHubOpen && (
          <div
            onClick={() => setIsHubOpen(true)}
            className={`mb-2.5 max-w-[300px] p-3 rounded-2xl rounded-bl-xs border shadow-2xl backdrop-blur-md cursor-pointer transition-all animate-in slide-in-from-bottom-2 duration-300 ${
              speechType === 'thanks'
                ? 'bg-rose-50/95 border-rose-300 text-rose-900 ring-2 ring-rose-400/50'
                : speechType === 'encourage'
                ? 'bg-amber-50/95 border-amber-300 text-amber-950 ring-2 ring-amber-400/50'
                : 'bg-white/95 border-stone-200 text-stone-800 hover:border-stone-400'
            }`}
          >
            {/* Top Toolbar: Curator Title + Voice Status + Voice Actions */}
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-stone-200/60">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  Lia • Resident Curator
                </span>
                {isSpeaking && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100/90 text-emerald-800 text-[9px] font-bold animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                    Speaking
                  </span>
                )}
              </div>

              <div className="flex items-center gap-0.5">
                {/* Replay Voice button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isVoiceEnabledRef.current) {
                      toggleVoice();
                    } else {
                      speakLiaVoice(speechText, {
                        onStart: () => setIsSpeaking(true),
                        onEnd: () => setIsSpeaking(false),
                      });
                    }
                  }}
                  className="p-1 rounded-lg hover:bg-stone-200/60 text-stone-500 hover:text-stone-800 transition-colors"
                  title="Replay voice audio"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>

                {/* Voice Mute/Unmute Toggle */}
                <button
                  type="button"
                  onClick={toggleVoice}
                  className={`p-1 rounded-lg transition-colors ${
                    isVoiceEnabled
                      ? 'hover:bg-emerald-100 text-emerald-700'
                      : 'hover:bg-stone-200/60 text-stone-400'
                  }`}
                  title={isVoiceEnabled ? 'Voice is ON (click to mute)' : 'Voice is MUTED (click to enable)'}
                >
                  {isVoiceEnabled ? (
                    <Volume2 className="w-3.5 h-3.5" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-base shrink-0">
                {speechType === 'thanks' ? '🎉' : speechType === 'encourage' ? '⭐' : '💬'}
              </span>
              <p className="text-xs font-medium leading-relaxed">{speechText}</p>
            </div>

            <div className="mt-2 flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-stone-500">
              <span className="flex items-center gap-1 text-emerald-700">
                {isSpeaking ? (
                  <span className="flex items-center gap-0.5">
                    <span className="w-0.5 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-0.5 h-3 bg-emerald-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-0.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" />
                    <span className="ml-1 text-[9px] font-semibold">Voice active</span>
                  </span>
                ) : (
                  <span>Click to chat</span>
                )}
              </span>
              <span className="flex items-center gap-0.5 hover:text-stone-900">
                Lia Hub <ChevronRight className="w-2.5 h-2.5" />
              </span>
            </div>
          </div>
        )}

        {/* Character Avatar Container */}
        <div
          onClick={() => setIsHubOpen(true)}
          className="relative cursor-pointer transition-transform hover:scale-110 active:scale-95"
          title="Click to talk to Lia, hear her voice, get book advice, or take the tour!"
        >
          {renderPixelLibrarian()}

          {/* Quick Hover Tooltip */}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-stone-900/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-md pointer-events-none">
            Talk to Lia
          </div>
        </div>
      </div>

      {/* Interactive Library Guide, Chatbox, FAQ & Problem Clearing Modal */}
      {isHubOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-stone-200 bg-[#faf8f5] flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center overflow-hidden shrink-0">
                  <span className="text-2xl">👩‍🏫</span>
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-900 leading-tight">
                    Lia — Resident Campus Librarian
                  </h3>
                  <p className="text-xs text-stone-500">
                    Always wandering the stacks to answer questions, guide your study, and resolve problems
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Quick Voice Toggle Button in Header */}
                <button
                  type="button"
                  onClick={toggleVoice}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                    isVoiceEnabled
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200'
                  }`}
                  title={isVoiceEnabled ? 'Voice is enabled (click to mute)' : 'Voice is muted (click to enable)'}
                >
                  {isVoiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  <span>{isVoiceEnabled ? 'Voice ON' : 'Muted'}</span>
                </button>

                <button
                  onClick={() => {
                    setIsMinimized(true);
                    setIsHubOpen(false);
                  }}
                  className="p-1.5 rounded-xl text-stone-400 hover:text-stone-800 hover:bg-stone-200/50 transition-colors cursor-pointer"
                  title="Minimize"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsHubOpen(false)}
                  className="p-1.5 rounded-xl text-stone-400 hover:text-stone-800 hover:bg-stone-200/50 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 px-4 sm:px-6 pt-3 border-b border-stone-200 bg-stone-50/70 overflow-x-auto scrollbar-none text-xs font-semibold">
              <button
                onClick={() => setHubTab('chat')}
                className={`pb-3 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  hubTab === 'chat'
                    ? 'border-emerald-600 text-emerald-800 font-bold'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> Ask Lia (Chat)
              </button>

              <button
                onClick={() => setHubTab('faq')}
                className={`pb-3 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  hubTab === 'faq'
                    ? 'border-blue-600 text-blue-800 font-bold'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5 text-blue-600" /> FAQ Library
              </button>

              <button
                onClick={() => setHubTab('resolve')}
                className={`pb-3 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  hubTab === 'resolve'
                    ? 'border-rose-600 text-rose-800 font-bold'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <LifeBuoy className="w-3.5 h-3.5 text-rose-600" /> Clear a Problem
              </button>

              <button
                onClick={() => setHubTab('tour')}
                className={`pb-3 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  hubTab === 'tour'
                    ? 'border-stone-900 text-stone-900 font-bold'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <Compass className="w-3.5 h-3.5 text-stone-700" /> Library Tour
              </button>

              <button
                onClick={() => {
                  setHubTab('surprise');
                  if (!randomBook) fetchSurpriseBook();
                }}
                className={`pb-3 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  hubTab === 'surprise'
                    ? 'border-amber-600 text-amber-900 font-bold'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Lia’s Top Pick
              </button>

              <button
                onClick={() => setHubTab('credentials')}
                className={`pb-3 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  hubTab === 'credentials'
                    ? 'border-stone-900 text-stone-900 font-bold'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <Key className="w-3.5 h-3.5 text-stone-600" /> Demo Logins
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
              {/* TAB 1: CHATBOX WITH LIA */}
              {hubTab === 'chat' && (
                <div className="flex flex-col h-[460px]">
                  {/* Message History */}
                  <div className="flex-1 overflow-y-auto space-y-3.5 pr-1.5">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.sender === 'lia' && (
                          <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center shrink-0 text-base">
                            👩‍🏫
                          </div>
                        )}

                        <div
                          className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed ${
                            msg.sender === 'user'
                              ? 'bg-stone-900 text-white rounded-br-xs'
                              : 'bg-[#faf8f5] border border-stone-200 text-stone-800 rounded-bl-xs shadow-xs'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4 mb-1">
                            <span className="font-bold text-[10px] uppercase tracking-wider text-emerald-800">
                              {msg.sender === 'user' ? 'You' : 'Lia • Librarian'}
                            </span>
                            <div className="flex items-center gap-1.5 text-[9px] text-stone-400">
                              <span>{msg.timestamp}</span>
                              {msg.sender === 'lia' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    speakLiaVoice(msg.text, {
                                      onStart: () => setIsSpeaking(true),
                                      onEnd: () => setIsSpeaking(false),
                                    });
                                  }}
                                  className="p-0.5 rounded hover:bg-stone-200 text-stone-500 hover:text-stone-800 transition-colors"
                                  title="Read message aloud"
                                >
                                  <Volume2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          <p className="whitespace-pre-wrap">{msg.text}</p>

                          {msg.suggestedAction && (
                            <div className="mt-2.5 pt-2 border-t border-stone-200/60 flex items-center gap-2">
                              {msg.suggestedAction.url ? (
                                <Link
                                  href={msg.suggestedAction.url}
                                  onClick={() => setIsHubOpen(false)}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline"
                                >
                                  {msg.suggestedAction.label} <ArrowRight className="w-3 h-3" />
                                </Link>
                              ) : msg.suggestedAction.onClickPrompt ? (
                                <button
                                  type="button"
                                  onClick={() => handleSendChat(msg.suggestedAction?.onClickPrompt)}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                                >
                                  {msg.suggestedAction.label} <ArrowRight className="w-3 h-3" />
                                </button>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Lia Typing Indicator */}
                    {isLiaTyping && (
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center shrink-0 text-base">
                          👩‍🏫
                        </div>
                        <div className="bg-[#faf8f5] border border-stone-200 rounded-2xl rounded-bl-xs p-3 text-xs text-stone-500 flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
                          </span>
                          <span>Lia is checking library archives...</span>
                        </div>
                      </div>
                    )}
                    <div ref={chatScrollRef} />
                  </div>

                  {/* Quick question pill prompts */}
                  <div className="pt-2.5 pb-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[11px]">
                    <span className="text-stone-400 font-bold shrink-0 text-[10px] uppercase">Ask:</span>
                    {[
                      'How do I borrow books?',
                      'Where are physical shelves?',
                      'How to compare 2 books?',
                      'How are overdue fines calculated?',
                      'How do waitlists work?',
                      'Can I renew my book?',
                    ].map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => handleSendChat(prompt)}
                        className="px-2.5 py-1 rounded-full bg-stone-100 hover:bg-emerald-50 hover:text-emerald-800 border border-stone-200 text-stone-700 whitespace-nowrap transition-colors cursor-pointer text-xs"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>

                  {/* Input Box */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendChat();
                    }}
                    className="pt-2 border-t border-stone-200 flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask Lia anything (e.g. 'Where is Clean Code?', 'How to return a book')..."
                      className="flex-1 px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs text-stone-900 bg-white placeholder:text-stone-400"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim() || isLiaTyping}
                      className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send</span>
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 2: SEARCHABLE FAQ KNOWLEDGE BASE */}
              {hubTab === 'faq' && (
                <div className="space-y-4">
                  {/* Search bar & Category filters */}
                  <div className="space-y-2.5">
                    <div className="relative">
                      <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={faqSearch}
                        onChange={(e) => setFaqSearch(e.target.value)}
                        placeholder="Search answers (e.g. borrowing limits, shelf codes, payments, reservations)..."
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-300 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white placeholder:text-stone-400"
                      />
                      {faqSearch && (
                        <button
                          type="button"
                          onClick={() => setFaqSearch('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[11px]">
                      {[
                        { id: 'all', label: 'All FAQs' },
                        { id: 'borrowing', label: 'Borrowing & Renewals' },
                        { id: 'shelves', label: 'Finding Shelves' },
                        { id: 'compare', label: 'Book Comparison' },
                        { id: 'fines', label: 'Fines & Fees' },
                        { id: 'reservations', label: 'Waitlists & Holds' },
                        { id: 'accounts', label: 'Accounts & Roles' },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setFaqCategory(cat.id)}
                          className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer border ${
                            faqCategory === cat.id
                              ? 'bg-blue-600 text-white border-blue-600 font-bold'
                              : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* FAQ List */}
                  <div className="space-y-2.5">
                    {LIBRARY_FAQS
                      .filter((item) => {
                        const matchesCat = faqCategory === 'all' || item.category === faqCategory;
                        const qLower = faqSearch.toLowerCase();
                        const matchesQuery =
                          !faqSearch ||
                          item.question.toLowerCase().includes(qLower) ||
                          item.answer.toLowerCase().includes(qLower) ||
                          item.categoryLabel.toLowerCase().includes(qLower);
                        return matchesCat && matchesQuery;
                      })
                      .map((faq) => {
                        const isExpanded = expandedFaqId === faq.id;
                        return (
                          <div
                            key={faq.id}
                            className="rounded-2xl border border-stone-200 bg-[#faf8f5] overflow-hidden transition-all shadow-xs"
                          >
                            <button
                              type="button"
                              onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                              className="w-full p-3.5 text-left flex items-start justify-between gap-3 hover:bg-stone-100/50 transition-colors cursor-pointer"
                            >
                              <div className="space-y-1">
                                <span className="inline-block px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                                  {faq.categoryLabel}
                                </span>
                                <h4 className="font-serif font-bold text-stone-900 text-sm">
                                  {faq.question}
                                </h4>
                              </div>
                              <span className="p-1 rounded-lg text-stone-400 shrink-0">
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </span>
                            </button>

                            {isExpanded && (
                              <div className="px-3.5 pb-4 pt-1 border-t border-stone-200/60 bg-white/70 space-y-3">
                                <p className="text-xs text-stone-700 leading-relaxed">{faq.answer}</p>

                                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                                  {/* Hear Lia Read button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      speakLiaVoice(faq.answer, {
                                        onStart: () => setIsSpeaking(true),
                                        onEnd: () => setIsSpeaking(false),
                                      });
                                    }}
                                    className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <Volume2 className="w-3 h-3" />
                                    Hear Lia Read Answer
                                  </button>

                                  {/* Ask in Chat button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setHubTab('chat');
                                      handleSendChat(faq.question);
                                    }}
                                    className="px-2.5 py-1 rounded-xl bg-stone-100 text-stone-700 border border-stone-300 hover:bg-stone-200 font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <MessageSquare className="w-3 h-3" />
                                    Ask in Chat
                                  </button>

                                  {/* Direct Action Link if any */}
                                  {faq.actionUrl && faq.actionText && (
                                    <Link
                                      href={faq.actionUrl}
                                      onClick={() => setIsHubOpen(false)}
                                      className="px-2.5 py-1 rounded-xl bg-stone-900 text-white font-bold inline-flex items-center gap-1 hover:bg-stone-800 transition-colors ml-auto"
                                    >
                                      {faq.actionText} <ArrowRight className="w-3 h-3" />
                                    </Link>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* TAB 3: PROBLEM CLEARING & HELP DESK */}
              {hubTab === 'resolve' && (
                <div className="space-y-4">
                  {/* Diagnostic Banner */}
                  <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-rose-900 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                        <LifeBuoy className="w-3.5 h-3.5 text-rose-600" />
                        Patron Problem Clearance Desk
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                        Circulation Active
                      </span>
                    </div>
                    <h4 className="font-serif font-bold text-base text-rose-950">
                      Clear a Problem or Report an Issue
                    </h4>
                    <p className="text-xs text-rose-800/90 leading-relaxed">
                      Facing a snag with a returned book, shelf locator, fine discrepancy, or account? Lia will analyze your problem immediately and dispatch an inquiry ticket to circulation staff!
                    </p>
                  </div>

                  {/* Active Resolution Ticket Confirmation */}
                  {activeResolution ? (
                    <div className="rounded-2xl border border-emerald-300 bg-emerald-50/70 p-5 space-y-4 animate-in zoom-in-95 duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                              Problem Clearance Registered
                            </span>
                            <h5 className="font-serif font-bold text-sm text-stone-900">
                              {activeResolution.resolutionTitle}
                            </h5>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-white border border-emerald-300 text-emerald-900 font-mono text-xs font-bold shadow-xs">
                          #{activeResolution.id}
                        </span>
                      </div>

                      <p className="text-xs text-stone-700 leading-relaxed bg-white/80 p-3 rounded-xl border border-emerald-200">
                        {activeResolution.resolutionMessage}
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-stone-600 bg-emerald-100/50 p-2.5 rounded-xl">
                        <div>
                          <strong className="text-stone-800">Item Reported:</strong>{' '}
                          {activeResolution.bookTitleOrId || 'General Library Query'}
                        </div>
                        <div>
                          <strong className="text-stone-800">Time Filed:</strong> {activeResolution.timestamp}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            speakLiaVoice(activeResolution.resolutionMessage, {
                              onStart: () => setIsSpeaking(true),
                              onEnd: () => setIsSpeaking(false),
                            });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          Hear Lia Read Confirmation
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setHubTab('chat');
                            handleSendChat(`I filed ticket #${activeResolution.id} regarding: ${activeResolution.bookTitleOrId || 'my book issue'}. What happens next?`);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Ask Lia in Chat
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveResolution(null)}
                          className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold ml-auto cursor-pointer"
                        >
                          Clear Another Problem
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Problem Submission Form */
                    <form onSubmit={handleClearProblem} className="space-y-4">
                      {/* Step 1: Select Issue Type */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-stone-800 block">
                          Select the type of problem you are experiencing:
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {[
                            {
                              id: 'book_returned_still_borrowed',
                              icon: '📦',
                              title: 'Returned but Still Borrowed',
                              desc: 'Dropped in box or handed to desk, still shows on account',
                            },
                            {
                              id: 'cannot_find_shelf',
                              icon: '🔍',
                              title: 'Cannot Locate on Shelf',
                              desc: 'Floor and shelf code visited, volume not present',
                            },
                            {
                              id: 'fine_discrepancy',
                              icon: '💳',
                              title: 'Fine or Payment Balance Issue',
                              desc: 'Paid balance not clearing or unexpected fee',
                            },
                            {
                              id: 'renewal_blocked',
                              icon: '⏳',
                              title: 'Renewal Blocked by Hold',
                              desc: 'Need courtesy extension for exam or study',
                            },
                            {
                              id: 'general',
                              icon: '❓',
                              title: 'Other Inquiry / Problem',
                              desc: 'Account card barcode, study space, or general inquiry',
                            },
                          ].map((cat) => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setProblemCategory(cat.id)}
                              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                                problemCategory === cat.id
                                  ? 'border-rose-500 bg-rose-50/80 ring-2 ring-rose-400/30'
                                  : 'border-stone-200 bg-stone-50/50 hover:bg-stone-100/80'
                              }`}
                            >
                              <span className="text-lg shrink-0">{cat.icon}</span>
                              <div>
                                <span className="font-bold text-xs text-stone-900 block leading-tight">
                                  {cat.title}
                                </span>
                                <span className="text-[10px] text-stone-500 leading-normal block mt-0.5">
                                  {cat.desc}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Step 2: Book Identifier (Optional/Recommended) */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-stone-800 block">
                          Book Title, ISBN, or Barcode (Optional):
                        </label>
                        <input
                          type="text"
                          value={problemBook}
                          onChange={(e) => setProblemBook(e.target.value)}
                          placeholder="e.g. Clean Code, 978-0132350884, or BC-2026-1004"
                          className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white placeholder:text-stone-400"
                        />
                      </div>

                      {/* Step 3: Description & Context */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-stone-800 block">
                          Describe what happened:
                        </label>
                        <textarea
                          rows={3}
                          value={problemNotes}
                          onChange={(e) => setProblemNotes(e.target.value)}
                          placeholder="Provide any helpful details (e.g. 'I returned this yesterday around 4 PM at the Floor 2 return box')..."
                          className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white placeholder:text-stone-400 resize-none"
                        />
                      </div>

                      {/* Submit Button */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-stone-500">
                          Instant clearance response generated by Lia
                        </span>
                        <button
                          type="submit"
                          disabled={isSubmittingProblem}
                          className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                        >
                          <LifeBuoy className="w-3.5 h-3.5" />
                          <span>{isSubmittingProblem ? 'Processing...' : 'Clear & Submit Problem'}</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* TAB 4: GUIDED TOUR */}
              {hubTab === 'tour' && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-stone-200 bg-[#faf8f5] p-5 space-y-3 relative overflow-hidden">
                    <div className="flex items-center justify-between text-xs">
                      <span className="px-2.5 py-0.5 rounded-full bg-stone-900 text-white font-mono font-bold text-[10px]">
                        Lia’s Guided Tour
                      </span>
                      <span className="text-2xl">🏛️</span>
                    </div>

                    <h4 className="text-lg font-serif font-bold text-stone-900">
                      Welcome to Metropolitan University Library
                    </h4>

                    <p className="text-xs text-stone-600 leading-relaxed">
                      I wander through the aisles keeping an eye on our 100+ physical volumes! Whenever you hover over or examine a book, I will share insider advice on why it’s worth reading. And when you reserve a copy, I will be cheering right by your side!
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                      <div className="p-3 rounded-xl bg-white border border-stone-200">
                        <span className="font-bold text-stone-800 block mb-1">⚖️ Book Comparison</span>
                        <span className="text-stone-500 leading-normal block">
                          Compare up to 4 books side-by-side using the Compare button on cards or details.
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-stone-200">
                        <span className="font-bold text-stone-800 block mb-1">📍 Exact Shelf Stacks</span>
                        <span className="text-stone-500 leading-normal block">
                          Every physical copy shows its exact building, floor, room, and rack code!
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      <Link
                        href="/"
                        onClick={() => setIsHubOpen(false)}
                        className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        Explore Catalog Stacks <ArrowRight className="w-3.5 h-3.5" />
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          playCompanionSfx('talk');
                          speakLiaVoice(
                            "Welcome to Metropolitan University Library! I am Lia, your resident campus librarian. Feel free to explore our stacks, compare editions, or reserve copies anytime!",
                            {
                              onStart: () => setIsSpeaking(true),
                              onEnd: () => setIsSpeaking(false),
                            }
                          );
                        }}
                        className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        Hear Lia Introduce Herself
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SURPRISE RECOMMENDATION */}
              {hubTab === 'surprise' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-stone-500">
                      Lia’s personal handpicked recommendation for your study:
                    </p>
                    <button
                      onClick={fetchSurpriseBook}
                      disabled={loadingRandom}
                      className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingRandom ? 'animate-spin' : ''}`} />
                      Pick Another
                    </button>
                  </div>

                  {randomBook ? (
                    <div className="rounded-2xl border border-stone-200 p-4 bg-[#faf8f5] flex flex-col sm:flex-row items-center gap-4">
                      <div className="w-28 h-36 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shrink-0">
                        <BookCover
                          title={randomBook.title}
                          coverImageUrl={randomBook.coverImageUrl}
                          isbn={randomBook.isbn}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="space-y-2 flex-1 text-center sm:text-left">
                        <span className="text-[10px] font-semibold tracking-wider uppercase text-stone-500">
                          {randomBook.categories[0]?.name || 'Computing'}
                        </span>
                        <h4 className="font-serif font-bold text-base text-stone-900 leading-snug">
                          {randomBook.title}
                        </h4>
                        <p className="text-xs text-stone-600">
                          by {randomBook.authors.map((a) => a.name).join(', ') || 'Faculty'}
                        </p>
                        <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                          {randomBook.description}
                        </p>
                        <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                          <Link
                            href={`/books/${randomBook.id}`}
                            onClick={() => setIsHubOpen(false)}
                            className="px-3.5 py-1.5 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 inline-flex items-center gap-1.5"
                          >
                            Read / Reserve Copy <ArrowRight className="w-3.5 h-3.5" />
                          </Link>

                          <button
                            type="button"
                            onClick={() => {
                              playCompanionSfx('curious');
                              const authorText = randomBook.authors.map((a) => a.name).join(', ') || 'our faculty';
                              speakLiaVoice(
                                `I highly recommend ${randomBook.title} by ${authorText}! It is an exceptional volume for your learning journey!`,
                                {
                                  onStart: () => setIsSpeaking(true),
                                  onEnd: () => setIsSpeaking(false),
                                }
                              );
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            Hear Lia’s Review
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-xs text-stone-400">
                      Selecting an exquisite volume from the archives...
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: DEMO ACCOUNTS */}
              {hubTab === 'credentials' && (
                <div className="space-y-4">
                  <p className="text-xs text-stone-500">
                    One-click login test credentials to try borrowing, returns, or catalog administration:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        role: 'Administrator',
                        email: 'admin@example.com',
                        desc: 'System config & logs',
                        badge: 'Full RBAC',
                      },
                      {
                        role: 'Librarian',
                        email: 'librarian@example.com',
                        desc: 'Issue loans & check-in',
                        badge: 'Staff Desk',
                      },
                      {
                        role: 'Student Member',
                        email: 'member@example.com',
                        desc: 'Circulation & holds',
                        badge: 'Patron',
                      },
                    ].map((acc) => (
                      <div
                        key={acc.email}
                        className="rounded-2xl border border-stone-200 p-3.5 bg-stone-50/70 space-y-2 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-stone-900">{acc.role}</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-stone-200 text-stone-700">
                              {acc.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-500 mt-1">{acc.desc}</p>
                          <p className="text-[11px] font-mono text-stone-800 mt-2 bg-white px-2 py-1 rounded border border-stone-200 truncate">
                            {acc.email}
                          </p>
                          <p className="text-[10px] text-stone-400 mt-1">Pass: Password123!</p>
                        </div>

                        <button
                          onClick={() => copyToClipboard(acc.email, acc.email)}
                          className="mt-2 w-full py-1.5 rounded-xl border border-stone-300 hover:border-stone-800 bg-white text-stone-800 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          {copiedAccount === acc.email ? 'Copied!' : 'Copy Email'}
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Link
                      href="/login"
                      onClick={() => setIsHubOpen(false)}
                      className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      Go to Login Page <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Footer with Voice Status & Controls */}
            <div className="px-6 py-3 border-t border-stone-200 bg-stone-50 text-[11px] text-stone-500 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isVoiceEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-stone-300'}`} />
                  Lia Voice Engine: <strong className={isVoiceEnabled ? 'text-emerald-700 font-semibold' : 'text-stone-500'}>{isVoiceEnabled ? 'Active' : 'Muted'}</strong>
                </span>
                <button
                  type="button"
                  onClick={toggleVoice}
                  className="ml-2 text-stone-600 hover:text-stone-900 underline font-medium cursor-pointer"
                >
                  {isVoiceEnabled ? 'Mute Audio' : 'Unmute Audio'}
                </button>
              </div>
              <button
                onClick={() => setIsHubOpen(false)}
                className="font-semibold text-stone-800 hover:underline cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
