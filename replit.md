# LingoFlow - Multilingual Web Application

### Overview
LingoFlow is an AI-powered multilingual translation platform designed to break down language barriers. It offers three core functionalities: real-time **video transcription** with translation from YouTube URLs, an **AI-powered multilingual chat** with automatic translation, and **document translation** for various formats (PDF, DOCX) while preserving original formatting. The project aims to provide a seamless and efficient translation experience across different media, leveraging advanced AI and a robust technology stack to deliver high-quality, user-friendly, and secure services.

### User Preferences
I prefer detailed explanations. Do not make changes to the folder `Z`. Do not make changes to the file `Y`. Ask before making major changes.

### System Architecture

#### UI/UX Decisions
-   **Design System**: Clean, minimalist design using Shadcn UI components with custom theming.
-   **Color Scheme**: Primary blue (`#3B82F6`).
-   **Typography**: Inter for UI elements, JetBrains Mono for code/technical text.
-   **Layout**: Max-width 7xl container, responsive grid layouts.
-   **Theming**: Dark/light mode toggle with theme persistence using `ThemeProvider`.

#### Technical Implementations
-   **Frontend**: React with TypeScript, Wouter for routing, TanStack Query for data fetching, Tailwind CSS for styling.
-   **Backend**: Express.js with TypeScript for API endpoints.
-   **Authentication**: Replit Auth (OIDC) integrated with session management and secure handling of user sessions. All API endpoints require authentication and resource-level authorization (ownership verification).
-   **Database**: PostgreSQL (Neon) managed with Drizzle ORM for schema definition and interactions.
-   **Storage**: Custom `DatabaseStorage` class for PostgreSQL operations.
-   **Media Processing**: `pdf-parse` for PDF text extraction and `mammoth` for DOCX parsing.
-   **Internationalization**: Lingo.dev CLI for static file translation with `i18n.json` configuration and automated CI/CD integration for translation updates.
-   **Security**: Comprehensive error handling, secure file downloads with ownership checks, and robust validation for file uploads (extension normalization, whitelisting).

#### Feature Specifications
-   **Video Transcription & Dubbing**: Integrates with TranscriptAPI.com for YouTube transcription (including Shorts support), offers a two-box UI (original and translated text), manual translation trigger, language code normalization, background processing, download options (TXT/SRT), and AI-powered video dubbing using Deepgram Aura TTS with automatic audio-video merging via FFmpeg. Dubbed videos automatically download when generation completes.
-   **Interview Guide Chat**: An AI-powered interview preparation assistant with multilingual support. Features a modern chat interface with conversation history sidebar, "New Interview Prep" functionality, and specialized GPT-4o-mini model trained to help with behavioral, technical, and industry-specific interview questions. Provides STAR method guidance, example answers, and constructive feedback in any language with automatic translation.
-   **Document Translation**: Supports PDF and DOCX uploads, hardened file validation, explicit empty content detection, object-based storage lifecycle, and authenticated download of translated documents.

#### System Design Choices
-   **Modular Structure**: Clear separation between `client`, `server`, and `shared` directories.
-   **Data Validation**: Zod validation schemas for all API requests ensuring data integrity.
-   **API Design**: RESTful API endpoints, all secured with authentication middleware and resource ownership checks.
-   **Error Handling**: Consistent error handling across features, providing user-friendly messages and secure logging.

### External Dependencies

-   **AI Services**:
    -   **Lingo.dev SDK**: Used for dynamic translation (runtime `localizeText()`, `localizeObject()`, `recognizeLocale()`, and `batchLocalizeText()`) and static i18n via CLI and CI/CD.
    -   **Google Gemini 2.5 Flash**: Powers the Interview Guide Chat with specialized system prompts for interview preparation, behavioral questions (STAR method), technical interviews, and industry-specific guidance. Uses the @google/genai SDK for fast, cost-effective AI responses.
    -   **TranscriptAPI.com**: For YouTube video transcription.
    -   **Deepgram Aura TTS**: Enterprise-grade text-to-speech API for video dubbing with sub-200ms latency and 40+ natural voices.
-   **Database**: PostgreSQL (specifically Neon for cloud deployment).
-   **Authentication**: Replit Auth (OIDC).
-   **Frontend Libraries**: React, Wouter, TanStack Query, Shadcn UI, Tailwind CSS.
-   **Backend Libraries**: Express.js, Drizzle ORM.
-   **File Processing Libraries**: `pdf-parse`, `mammoth`.