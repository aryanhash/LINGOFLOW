# Multilingual Web App - Design Guidelines

## Design Approach
**System-Based Approach** inspired by Linear's clean aesthetics + Notion's workflow clarity + Grammarly's professional language tool interface. Prioritizing functional clarity, workflow efficiency, and modern minimalism for a productivity-focused translation platform.

## Typography System
- **Primary Font**: Inter (Google Fonts) for UI and body text
- **Monospace Font**: JetBrains Mono for code/technical content (API keys, file names)
- **Hierarchy**:
  - Hero/Page Titles: text-4xl md:text-5xl, font-semibold, tracking-tight
  - Section Headers: text-2xl md:text-3xl, font-semibold
  - Feature Titles: text-lg font-medium
  - Body Text: text-base, leading-relaxed
  - Labels/Captions: text-sm, font-medium
  - Code/Technical: text-sm, font-mono

## Layout System
**Spacing Primitives**: Tailwind units of 2, 4, 6, 8, 12, 16, 24
- Component padding: p-6 or p-8
- Section spacing: py-16 md:py-24
- Card gaps: gap-6 or gap-8
- Container max-width: max-w-7xl for main content

## Navigation & Header
- Fixed top navbar with blur backdrop (backdrop-blur-lg)
- Logo left, main nav center, language selector + profile right
- Navigation items: Home, Features (dropdown: Transcription, Dubbing, Chat, PDF), API Docs
- Height: h-16, contains all elements in max-w-7xl wrapper

## Landing Page Structure

### Hero Section (80vh)
- Split layout: 60% left content, 40% right visual
- Left: Headline (text-5xl font-bold) + subheading + dual CTA buttons (primary + secondary outline)
- Right: Animated feature showcase - rotating mockups of the 4 core features
- Trust indicator below CTAs: "Trusted by 50,000+ users worldwide" with small logos

### Features Grid (3 columns on desktop)
- 4 feature cards in 2x2 grid on desktop, stack on mobile
- Each card: Icon (Heroicons, 48px), Title, 2-line description, "Try Now →" link
- Cards have subtle border, hover lift effect

### How It Works (3-step process)
- Horizontal timeline layout (desktop), vertical stack (mobile)
- Each step: Large number (01, 02, 03), heading, description, supporting icon
- Connecting line between steps

### Feature Deep Dives (alternating layout)
- 4 sections, alternating image-text placement
- Even sections: Image left, text right
- Odd sections: Text left, image right
- Images show actual product screenshots with subtle shadow
- Text includes: Feature name, description, 3 bullet points with checkmarks

### Stats Section (4 columns)
- Large numbers (text-4xl) with labels
- "100+ Languages", "50K+ Videos Dubbed", "1M+ Translations", "99.9% Uptime"

### CTA Section
- Centered content on gradient background
- Headline + description + single prominent CTA button
- Email signup option below button

### Footer
- 4-column layout (Company, Features, Resources, Legal)
- Newsletter signup in separate row above
- Social icons + language selector at bottom
- Contact info and trust badges (payment methods, security)

## Core Feature Pages Layout

### Unified Page Structure
- Breadcrumb navigation at top
- Page title + description (max-w-3xl)
- Main workspace area with sidebar controls

### Video Transcription Page
- Split-screen: 55% video player (left), 45% transcription panel (right)
- Top controls: URL input (full-width) + Language dropdown + "Transcribe" button
- Video player: 16:9 aspect ratio, playback controls
- Transcription panel: Live updating text, timestamp markers, scrollable
- Bottom action bar: Download TXT, Download SRT buttons, share options

### AI Video Dubbing Page
- 3-panel workflow: Upload → Process → Download
- Upload zone: Drag-drop area (large, dashed border), file specs below
- Process panel: Language selectors (source/target), voice selection dropdown, "Generate Dub" button
- Progress indicator during processing (percentage + estimated time)
- Preview player: Side-by-side original vs dubbed comparison
- Export panel: Format options, quality selector, download button

### Multilingual Chat Page
- Full-height chat interface (similar to ChatGPT layout)
- Top bar: Language toggle pills (dual language display), clear chat button
- Chat area: Message bubbles (user right, AI left), auto-translation indicator under each message
- Input area: Fixed bottom, text area + language indicator + send button
- Sidebar (collapsible): Chat history, settings, language preferences

### PDF Translation Page
- Two-column layout: Upload (left), Results (right)
- Upload column: Drag-drop zone, file size/format limits, language selectors (source/target)
- Processing state: Progress bar with page count, "Translating page 3 of 45..."
- Results column: PDF preview (embedded iframe), download button, format preservation badge
- Action buttons: Download Translated PDF, Compare Side-by-Side

## Component Library

### Buttons
- Primary: Filled, rounded-lg, px-6 py-3, font-medium
- Secondary: Outline, same sizing
- Icon buttons: Square, p-3, icon centered

### Form Inputs
- Text/URL inputs: border, rounded-lg, px-4 py-3, focus ring
- Dropdowns: Custom styled select with chevron icon
- File upload: Dashed border, rounded-xl, p-12, centered icon + text

### Cards
- Standard: border, rounded-xl, p-6, subtle shadow
- Feature cards: Same + hover lift transform
- Processing cards: Include progress indicators, status badges

### Progress Indicators
- Linear progress bar: rounded-full, animated width transition
- Circular spinner for indefinite loading
- Step indicators for multi-stage workflows

### Language Selector
- Dropdown with flag icons + language names
- Search functionality for long lists
- Recently used languages at top

### Modals/Overlays
- Centered modal: max-w-2xl, rounded-xl, backdrop blur
- Close button top-right, padding p-8
- Used for settings, API key management, error messages

## Icons
Use **Heroicons** (outline style) via CDN for all interface icons:
- Upload: cloud-arrow-up
- Download: arrow-down-tray
- Language: language
- Video: video-camera
- Chat: chat-bubble-left-right
- Document: document-text
- Settings: cog-6-tooth

## Images
**Hero Section**: Animated showcase of product features rotating every 3 seconds (mockups of each feature interface)
**Feature Deep Dives**: High-quality screenshots of each feature in action, showing actual UI with sample translations

## Accessibility
- Proper heading hierarchy (h1 → h2 → h3)
- ARIA labels for all interactive elements
- Keyboard navigation support for all features
- Focus indicators on all interactive elements
- Alt text for all images
- Sufficient contrast ratios throughout

## Responsive Breakpoints
- Mobile: Stack all columns, full-width components
- Tablet (md:): 2-column grids where applicable
- Desktop (lg:): Full multi-column layouts, side-by-side feature pages