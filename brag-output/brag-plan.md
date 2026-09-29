# Brag Plan: Metropolitan Library Management System

## What is this app?
An enterprise university library catalog that connects seminal computer science treatises directly to their real-time physical campus shelf, rack, barcode, and transactional waitlist.

## The angle
In a world obsessed with ephemeral digital downloads, this system treats physical books like mission-critical physical hardware: complete with a 7-tier shelving hierarchy (`Library → Building → Floor → Section → Room → Rack → Shelf`), real-time Code128 barcode generation, and ACID circulation locks.

## Hook (first 2-3 seconds)
The question: *"What would you like to read today?"* rendered in stately academic serif, followed immediately by an authoritative terminal-clean search query typing out: `"Designing Data-Intensive Applications"`.

## Key moments (the middle)
- The editorial catalog card: cover art, ★ 4.9 rating, and an emerald floating badge: `"3 Copies on Shelf"`.
- The physical campus shelf resolver: breaking down location into `Main Library → North Wing → Floor 2 → CS Rack 4 → Shelf B`.
- Real-time barcode & QR accession tag with 1-click `"Reserve Copy for Pickup"` transactional confirmation.

## Outro / punchline
*"From distributed consensus to the exact physical shelf."*
Metropolitan Library Management System.

## User flow worth showing
Entry: Search for a seminal CS treatise in the catalog.
Key action: Open volume details to inspect physical campus shelf hierarchy and live copy status.
Result: 1-click reservation with generated Code128 barcode and verified 48-hour pickup window.

## Tone
- Preset: polished
- Creative direction: Distinguished academic library catalog meets high-performance systems engineering
- Interpretation: Restrained, sophisticated, confident pacing with warm parchment tones, crisp typography, and deliberate animation holds that respect reading time.

## Format: landscape — 1920x1080
## Duration: 20 seconds

## Visual identity (from the project)
- Background: `#faf8f5` (warm cream / parchment)
- Accent: `#d97706` (warm amber / gold)
- Text: `#1c1917` (stone-900 deep ink)
- Secondary Surface: `#ffffff` with border `#e7e5e4`
- Muted Surface: `#f4efe6`
- Success / Shelf Ready: `#15803d` (emerald-700)
- Display font: Playfair Display / Georgia / serif
- Body font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
- Strongest visual element: The cream glass card surfaces with subtle stone borders, emerald availability pills, and physical shelf breadcrumb tags.

## Share copy (draft)
From "Designing Data-Intensive Applications" to its exact physical location on Floor 2, Rack 4. Real-time shelf tracking, transactional circulation, and zero guesswork.

## Audio direction
- Role: warm bed with sparse professional accents
- Music: `happy-beats-business-moves-vol-12-by-ende-dot-app.mp3` (warm, sophisticated, 109.96 BPM)
- Music treatment: Starts at 0.0s at moderate volume (-12dB), subtle swell during shelf reveal, gentle 1.5s fade-out ending at 20.0s
- Music cue guidance: Preset cues loaded from skill assets. Key sync windows: 4.91s (card reveal), 8.74s (shelf tracking breakdown), 13.11s (barcode scan/reservation), 17.47s (punchline settle)
- Audio-reactive treatment: subtle; gentle breathing warm glow on shelf resolver cards matching musical downbeats
- SFX posture: sparse, motion-matched tactile interface clicks and soft page/card snaps
- Audio-coupled moments: tactile typing clicks during search query entry, soft snap as shelf location cards sequence in, crisp confirmation chime on reservation success
- Restraint rule: No harsh buzzers, no frantic whooshes, no synthetic EDM risers. Keep audio dignified and tactile.

## Storyboard

### Scene 1 — The Academic Hook — 3.5s (0.0s – 3.5s)
A quiet, sophisticated opening on warm parchment (`#faf8f5`).
The university library badge appears at the top: `✦ UNIVERSITY LIBRARY & CATALOG`.
Main headline fades and rises: *"What would you like to read today?"* with *"read today?"* in warm italic serif.
At 1.09s, the search bar appears. The query `"Designing Data-Intensive Applications"` types in swiftly, followed by popular subject pills (`Distributed Systems`, `Architecture`).
Sequential/interaction: yes — search query types out character-by-character from 1.09s to 2.4s.
Audio intent: Calm, welcoming academic atmosphere.
Audio-coupled idea: Soft keyboard tap SFX synchronized with typing, holding settled for 1.1s so viewer reads the title.
Music: `happy-beats-business-moves-vol-12-by-ende-dot-app.mp3` entering at 0.0s.
Transition mood: Soft crossfade → Scene 2

### Scene 2 — Curated Volume Spotlight — 5.0s (3.5s – 8.5s)
The spotlight book card glides into focus with crisp editorial elegance.
Cover art displays the classic data volume, flanked by publication metadata:
- Title: *Designing Data-Intensive Applications*
- Author: Martin Kleppmann
- Rating: ★ 4.9 (24 reviews)
- Availability Badge: `● 3 Copies on Shelf` (emerald pill)
Hover actions surface: `Quick View` and `Compare`. A simulated cursor clicks `Physical Shelf Locator`.
Sequential/interaction: yes — book card floats in, availability badge pops with subtle scale spring, cursor clicks detail button at 7.09s.
Audio intent: Sense of discovery and catalog depth.
Audio-coupled idea: Soft card drop at 3.82s, subtle pop on availability pill at 4.91s, clean interface click at 7.09s.
Transition mood: Clean upward slide → Scene 3

### Scene 3 — Physical Campus Shelf Tracking — 7.5s (8.5s – 16.0s)
The hero feature: the working physical shelf resolver.
Headline: `Physical Copies & Campus Shelf Tracking` with subtext `Trace physical volume copies to their exact campus shelf, rack, and accession number.`
A 4-step spatial hierarchy expands sequentially:
1. `Building`: Main Library (North Wing)
2. `Floor`: Level 2 — Science & Engineering
3. `Section`: CS Treatises & Distributed Systems
4. `Position`: Rack 04 • Shelf B • Call #QA76.9.D3 K54
Below, physical copy barcode `LMS-COPY-8841-B` renders with live scan line.
Action button: `Reserve Copy for Pickup` is clicked → transforms smoothly into green check: `✓ Reserved — 48h Hold Ready`.
Sequential/interaction: yes — hierarchy cards cascade in one-by-one (8.74s, 9.83s, 10.93s), followed by barcode reveal and simulated button click at 13.11s with instant success confirmation.
Audio intent: Technical precision, tactile satisfaction of real-world physical location.
Audio-coupled idea: Successive light wood/card clicks on each hierarchy step; crisp positive confirmation chime at 13.11s.
Transition mood: Elegant dissolve → Scene 4

### Scene 4 — Punchline & Outro — 4.0s (16.0s – 20.0s)
The definitive statement lands in large, balanced serif:
*"From distributed consensus to the exact physical shelf."*
Below it, the brand seal:
`METROPOLITAN LIBRARY MANAGEMENT SYSTEM`
With technical architecture hallmarks:
`Next.js 16 • Drizzle ORM • Embedded PostgreSQL • ACID Transactions`
Sequential/interaction: yes — punchline settles with subtle upward glide, architecture badges fade in sequentially, warm ambient vignette.
Audio intent: Satisfying conclusion, quiet authority.
Audio-coupled idea: Punchline settles at strong beat 17.47s; music naturally fades out to 20.0s.
Transition mood: Hold settled to 20.0s

**Music mood for this video:** Polished, warm, rhythmic, intellectual library energy.
**Audio summary:** Gentle melodic intro building into crisp rhythmic tracking beats, resolving with a warm, triumphant final chord.
