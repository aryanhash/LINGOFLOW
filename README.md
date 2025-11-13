# 🌍 LingoFlow - AI-Powered Multilingual Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://reactjs.org/)

**LingoFlow** is an AI-powered multilingual web application that breaks down language barriers through video transcription, document translation, and multilingual chat. Translate content across 100+ languages with AI-powered translation technology.

## ✨ Features

### 🎥 Video Transcription & Dubbing
- Transcribe YouTube videos with timestamps
- Translate transcripts to 40+ languages
- Generate AI-dubbed videos with authentic voices
- Download dubbed audio/video files

### 💬 Multilingual Chat
- Real-time AI chat assistant for interview preparation
- Automatic message translation in 20+ languages
- Conversation history management
- Global language selector for seamless translation

### 📄 Document Translation
- Upload PDF or DOCX files
- Translate to any supported language
- Download translated text files
- Secure file handling with ownership verification

---

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Git** - [Download](https://git-scm.com/)
- **PostgreSQL** (for database) - [Download](https://www.postgresql.org/download/)

### Step 1: Clone the Repository

```bash
git clone git@github.com:aryanhash/LINGOFLOW.git
cd LINGOFLOW
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages for both frontend and backend.

### Step 3: Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env  # If you have an example file
# OR create a new .env file
```

Add the following environment variables to your `.env` file:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
BASE_URL=http://localhost:5000

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/lingoflow

# Session Secret (generate a random string)
SESSION_SECRET=your-random-session-secret-here

# API Keys (Required for full functionality)
LINGODOTDEV_API_KEY=your_lingo_api_key_here
VITE_LINGO_API_KEY=your_lingo_api_key_here

# Google OAuth (Optional - for authentication)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Gemini AI (Required for chat functionality)
GEMINI_API_KEY=your_gemini_api_key_here

# Optional API Keys (for additional features)
DEEPGRAM_API_KEY=your_deepgram_key
ELEVENLABS_API_KEY=your_elevenlabs_key
TRANSCRIPT_API_KEY=your_transcript_api_key
```

### Step 4: Set Up Database

1. Create a PostgreSQL database:

```bash
createdb lingoflow
```

2. Update the `DATABASE_URL` in your `.env` file with your database credentials.

3. Push the database schema:

```bash
npm run db:push
```

### Step 5: Run the Development Server

```bash
npm run dev
```

The application will be available at:
- **Frontend & Backend**: http://localhost:5000

---

## 📚 Getting API Keys

### 1. Lingo.dev API Key (Required)

1. Sign up at [https://lingo.dev](https://lingo.dev)
2. Go to Dashboard → API Keys
3. Create a new API key
4. Copy and add to your `.env` file:
   - `LINGODOTDEV_API_KEY`
   - `VITE_LINGO_API_KEY`

### 2. Google Gemini API Key (Required for Chat)

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add to `.env` as `GEMINI_API_KEY`

### 3. Google OAuth (Optional - for Authentication)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:5000/api/auth/google/callback`
6. Copy Client ID and Secret to `.env`

---

## 🎯 Usage Guide

### Video Transcription

1. Navigate to **Video Transcription** page
2. Paste a YouTube URL
3. Click **Transcribe**
4. Wait for transcription to complete
5. Select target language and click **Translate**
6. Optionally generate dubbed video with **Generate Dubbing**

### Multilingual Chat

1. Go to **Interview Prep Session** page
2. Select your preferred language from the navbar language selector
3. Start chatting - messages automatically translate to your selected language
4. All existing messages translate when you change the language
5. Create new conversations with the **+ New Interview Prep** button

### Document Translation

1. Navigate to **PDF Translation** page
2. Upload a PDF or DOCX file
3. Select source and target languages
4. Click **Translate Document**
5. Download the translated text file when complete

---

## 📁 Project Structure

```
lingoflow/
├── client/                 # React frontend application
│   ├── public/            # Static assets and locale files
│   └── src/               # Source code
│       ├── components/    # React components
│       ├── contexts/      # React contexts (Theme, Translation)
│       ├── hooks/         # Custom React hooks
│       ├── lib/           # Utility libraries
│       └── pages/         # Page components
├── server/                # Express backend
│   ├── db.ts             # Database configuration
│   ├── routes.ts         # API routes
│   ├── storage.ts        # Database operations
│   └── index.ts          # Server entry point
├── shared/               # Shared TypeScript types
├── uploads/              # User uploaded files
├── .env                  # Environment variables (not in git)
├── package.json          # Dependencies and scripts
└── README.md            # This file
```

---

## 🛠 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (frontend + backend) |
| `npm run build` | Build for production |
| `npm start` | Run production build |
| `npm run check` | Type-check TypeScript code |
| `npm run db:push` | Push database schema changes |
| `npm run i18n` | Run translation updates |
| `npm run i18n:force` | Force update all translations |

---

## 🔧 Troubleshooting

### Port Already in Use

If port 5000 is already in use:

```bash
# Option 1: Set a different port in .env
PORT=5001

# Option 2: Kill the process using port 5000
lsof -ti:5000 | xargs kill -9
```

### Database Connection Issues

1. Ensure PostgreSQL is running:
```bash
# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql
```

2. Verify your `DATABASE_URL` in `.env`:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/lingoflow
```

### API Key Errors

- **"LINGODOTDEV_API_KEY is invalid"**: Verify your API key at [lingo.dev dashboard](https://lingo.dev)
- **"Authentication failed"**: Make sure all Lingo API key variables are set in `.env`
- **"GEMINI_API_KEY not found"**: Get your key from [Google AI Studio](https://makersuite.google.com/app/apikey)

### Translation Not Working

1. Check that `LINGODOTDEV_API_KEY` is set in your `.env` file
2. Verify the API key is valid and has credits
3. Check server logs for error messages

### File Upload Issues

- Ensure `uploads/` directory exists and is writable
- Check file size limits (default: 500MB)
- Verify file format (PDF or DOCX only)

---

## 🌐 Supported Languages

The platform supports **20+ languages** including:

- English (en)
- Spanish (es)
- French (fr)
- German (de)
- Hindi (hi)
- Chinese (zh)
- Japanese (ja)
- Arabic (ar)
- Portuguese (pt)
- Russian (ru)
- Korean (ko)
- Italian (it)
- Dutch (nl)
- Polish (pl)
- Turkish (tr)
- Vietnamese (vi)
- Thai (th)
- Indonesian (id)
- Ukrainian (uk)
- Bengali (bn)
- Punjabi (pa)

---

## 🧪 Development

### Running in Development Mode

```bash
npm run dev
```

This starts:
- Vite dev server for frontend (with hot reload)
- Express server for backend (with auto-reload)
- Both accessible at http://localhost:5000

### Building for Production

```bash
npm run build
npm start
```

### Type Checking

```bash
npm run check
```

---

## 📝 Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 5000) |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Random string for session encryption |
| `LINGO_API_KEY` | Yes | Lingo.dev API key for translations |
| `LINGODOTDEV_API_KEY` | Yes | Lingo.dev API key (CLI format) |
| `VITE_LINGO_API_KEY` | Yes | Lingo.dev API key (frontend) |
| `GEMINI_API_KEY` | Yes | Google Gemini API key for chat |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support

- **Documentation**: See [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md) for detailed technical documentation
- **Issues**: Open an issue on [GitHub](https://github.com/aryanhash/LINGOFLOW/issues)
- **Questions**: Check the troubleshooting section above

---

## 🙏 Acknowledgments

- [Lingo.dev](https://lingo.dev) for AI-powered translation
- [Google Gemini](https://deepmind.google/technologies/gemini/) for chat AI
- [Shadcn UI](https://ui.shadcn.com/) for beautiful components
- All open-source contributors

---

## 📊 Project Status

✅ **Active Development** - The project is actively maintained and updated.

**Last Updated**: 2025

---

Made with ❤️ by the LingoFlow team

