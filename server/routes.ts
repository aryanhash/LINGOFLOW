import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import axios from "axios";
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import {
  transcriptionRequestSchema,
  chatRequestSchema,
  pdfTranslationRequestSchema,
  transcriptions,
} from "@shared/schema";
import { LingoDotDevEngine } from "lingo.dev/sdk";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { exec, spawn } from "child_process";
import { promisify } from "util";
const require = createRequire(import.meta.url);
const ytdlModule = require("@ybd-project/ytdl-core");
const { YtdlCore } = ytdlModule;
const PDFDocument = require("pdfkit");
const execAsync = promisify(exec);

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

// Initialize Gemini AI for interview guide chat
// DON'T DELETE THIS COMMENT - From blueprint:javascript_gemini
// Using gemini-2.5-flash model for fast, cost-effective responses
const geminiClient = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

// Lingo.dev SDK
const lingoDotDev = new LingoDotDevEngine({
  apiKey: process.env.LINGO_API_KEY,
});

// Helper: Normalize language codes to Lingo.dev compatible format
function normalizeLanguageCode(code: string): string {
  if (!code) return "en";
  
  // Convert to lowercase and remove region codes for simplicity
  // e.g., "en-US" -> "en", "es-ES" -> "es"
  const baseCode = code.toLowerCase().split('-')[0].split('_')[0];
  
  // Map common language codes
  const languageMap: Record<string, string> = {
    'en': 'en',
    'es': 'es',
    'fr': 'fr',
    'de': 'de',
    'pt': 'pt',
    'zh': 'zh',
    'ja': 'ja',
    'ko': 'ko',
    'ar': 'ar',
    'hi': 'hi',
    'ru': 'ru',
    'it': 'it',
    'nl': 'nl',
    'pl': 'pl',
    'tr': 'tr',
    'vi': 'vi',
    'th': 'th',
    'id': 'id',
  };
  
  return languageMap[baseCode] || 'en';
}

// Helper: Translate text using Lingo.dev
async function translateText(text: string, targetLanguage: string, sourceLanguage: string = "en"): Promise<string> {
  try {
    const normalizedSource = normalizeLanguageCode(sourceLanguage);
    const normalizedTarget = normalizeLanguageCode(targetLanguage);
    
    console.log("[TRANSLATE] Translating from", normalizedSource, "to", normalizedTarget);
    
    const translatedText = await lingoDotDev.localizeText(text, {
      sourceLocale: normalizedSource,
      targetLocale: normalizedTarget,
    });
    return translatedText;
  } catch (error) {
    console.error("Lingo.dev translation error:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return text;
  }
}

// Helper: Detect language using Lingo.dev
async function detectLanguage(text: string): Promise<string> {
  try {
    const detectedLocale = await lingoDotDev.recognizeLocale(text);
    return detectedLocale;
  } catch (error) {
    console.error("Lingo.dev language detection error:", error);
    return "en"; // Default to English on error
  }
}

// Helper: Translate chat message object for AI model (to English)
async function translateChatForModel(messageContent: string, sourceLanguage: string): Promise<string> {
  if (sourceLanguage === "en") return messageContent;
  
  try {
    const messageObj = {
      role: "user",
      content: messageContent,
    };
    
    const translated = await lingoDotDev.localizeObject(messageObj, {
      sourceLocale: sourceLanguage,
      targetLocale: "en",
    });
    
    return translated.content || messageContent;
  } catch (error) {
    console.error("Lingo.dev chat translation error:", error);
    return messageContent;
  }
}

// Helper: Translate chat response for user (from English)
async function translateChatForUser(responseContent: string, targetLanguage: string): Promise<string> {
  if (targetLanguage === "en") return responseContent;
  
  try {
    const responseObj = {
      role: "assistant",
      content: responseContent,
    };
    
    const translated = await lingoDotDev.localizeObject(responseObj, {
      sourceLocale: "en",
      targetLocale: targetLanguage,
    });
    
    return translated.content || responseContent;
  } catch (error) {
    console.error("Lingo.dev chat translation error:", error);
    return responseContent;
  }
}

// Helper: Batch translate to multiple languages (for future multi-language features)
async function batchTranslateText(text: string, targetLanguages: string[], sourceLanguage: string = "en"): Promise<Record<string, string>> {
  try {
    const translations = await lingoDotDev.batchLocalizeText(text, {
      sourceLocale: sourceLanguage as any,
      targetLocales: targetLanguages as any,
    });
    
    const result: Record<string, string> = {};
    targetLanguages.forEach((lang, index) => {
      result[lang] = translations[index] || text;
    });
    
    return result;
  } catch (error) {
    console.error("Lingo.dev batch translation error:", error);
    const fallback: Record<string, string> = {};
    targetLanguages.forEach(lang => fallback[lang] = text);
    return fallback;
  }
}

// Helper: Get Deepgram voice model for language
function getDeepgramVoiceModel(languageCode: string): string {
  // Deepgram Aura-2 voices with natural, high-quality output
  const voiceMap: Record<string, string> = {
    "en": "aura-asteria-en",   // English - Female, warm & natural
    "es": "aura-2-estrella-es", // Spanish - Female (Aura-2 Early Access)
    // For other languages, use English voice (works reasonably well)
    "fr": "aura-luna-en",       // French - use English voice
    "de": "aura-luna-en",       // German - use English voice
    "it": "aura-luna-en",       // Italian - use English voice
    "pt": "aura-luna-en",       // Portuguese - use English voice
    "ru": "aura-luna-en",       // Russian - use English voice
    "hi": "aura-luna-en",       // Hindi - use English voice
    "ja": "aura-luna-en",       // Japanese - use English voice
    "ko": "aura-luna-en",       // Korean - use English voice
    "zh": "aura-luna-en",       // Chinese - use English voice
    "ar": "aura-luna-en",       // Arabic - use English voice
  };
  
  const normalized = normalizeLanguageCode(languageCode);
  return voiceMap[normalized] || voiceMap["en"];
}

// Helper: Generate audio from text using Deepgram TTS
async function generateSpeech(text: string, targetLanguage: string): Promise<Buffer> {
  try {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      throw new Error("DEEPGRAM_API_KEY is not configured in Secrets");
    }

    const voiceModel = getDeepgramVoiceModel(targetLanguage);
    
    console.log("[DEEPGRAM_TTS] Generating speech with voice model:", voiceModel);
    console.log("[DEEPGRAM_TTS] Target language:", targetLanguage);
    
    // Deepgram TTS API: https://api.deepgram.com/v1/speak?model={voice-model}&encoding=mp3
    const response = await axios.post(
      `https://api.deepgram.com/v1/speak?model=${voiceModel}&encoding=mp3`,
      {
        text: text,
      },
      {
        headers: {
          "Authorization": `Token ${apiKey}`,
          "Content-Type": "application/json",
        },
        responseType: "arraybuffer",
      }
    );
    
    if (!response.data) {
      throw new Error("No audio content generated");
    }
    
    console.log("[DEEPGRAM_TTS] Audio generated successfully");
    return Buffer.from(response.data);
  } catch (error) {
    console.error("[DEEPGRAM_TTS] Generation error:", error);
    if (axios.isAxiosError(error) && error.response) {
      console.error("[DEEPGRAM_TTS] API Error:", error.response.status, error.response.data);
      // Try to parse error message
      try {
        const errorText = Buffer.from(error.response.data).toString();
        console.error("[DEEPGRAM_TTS] Error details:", errorText);
      } catch (parseErr) {
        // Ignore parsing errors
      }
    }
    throw new Error("Failed to generate speech with Deepgram");
  }
}

// Helper: Download YouTube video safely using ytdl-core
async function downloadYoutubeVideo(videoId: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    try {
      const ytdl = new YtdlCore();
      const videoStream = ytdl.download(videoUrl, {
        quality: 'highestvideo',
        filter: 'videoandaudio',
      });
      
      const writeStream = fs.createWriteStream(outputPath);
      
      // Pipe video stream directly to file
      videoStream.pipe(writeStream);
      
      videoStream.on('error', (error: Error) => {
        console.error("[YT_DOWNLOAD] ytdl error:", error);
        reject(new Error("Failed to download video"));
      });

      writeStream.on('error', (error: Error) => {
        console.error("[YT_DOWNLOAD] write error:", error);
        reject(new Error("Failed to write video file"));
      });

      writeStream.on('finish', () => {
        console.log("[YT_DOWNLOAD] Video downloaded successfully");
        resolve();
      });
    } catch (error) {
      console.error("[YT_DOWNLOAD] ytdl setup error:", error);
      reject(error);
    }
  });
}

// Helper: Merge audio with video using FFmpeg (replace entire audio track)
async function mergeAudioWithVideo(videoPath: string, audioPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Use spawn to safely pass arguments without shell interpolation
    // This command removes the original audio and replaces it with the new audio track
    const ffmpegArgs = [
      '-i', videoPath,      // Input video
      '-i', audioPath,      // Input audio
      '-c:v', 'copy',       // Copy video stream without re-encoding
      '-map', '0:v:0',      // Map video from first input
      '-map', '1:a:0',      // Map audio from second input
      '-c:a', 'aac',        // Encode audio as AAC
      '-b:a', '192k',       // Audio bitrate
      '-y',                 // Overwrite output file
      outputPath
    ];

    const ffmpeg = spawn('ffmpeg', ffmpegArgs);
    
    let errorOutput = '';
    
    ffmpeg.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    ffmpeg.on('error', (error) => {
      console.error("[FFMPEG] Spawn error:", error);
      reject(new Error("Failed to start FFmpeg process"));
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log("[FFMPEG] Video processing completed successfully");
        resolve();
      } else {
        console.error("[FFMPEG] Process exited with code:", code);
        console.error("[FFMPEG] Error output:", errorOutput);
        reject(new Error(`FFmpeg process failed with code ${code}`));
      }
    });
  });
}

// Helper: Fetch YouTube transcript using TranscriptAPI.com
async function fetchYoutubeTranscript(url: string): Promise<{ 
  transcriptText: string; 
  transcriptWithTimestamps: string;
  language: string;
  segments: Array<{ text: string; start: number; duration: number }>;
}> {
  try {
    const apiKey = process.env.TRANSCRIPT_API_KEY;
    if (!apiKey) {
      throw new Error("TRANSCRIPT_API_KEY is not configured");
    }

    // Extract video ID from URL if needed
    let videoId = url;
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const urlPattern = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
      const match = url.match(urlPattern);
      if (match) {
        videoId = match[1];
      }
    }

    console.log("[TRANSCRIPT_API] Fetching transcript for video:", videoId);
    
    const response = await axios.get("https://transcriptapi.com/api/v2/youtube/transcript", {
      params: {
        video_url: videoId,
        format: "json",
        include_timestamp: true,
      },
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    const data = response.data;
    
    if (!data.transcript || data.transcript.length === 0) {
      throw new Error("No captions available for this video. The video may not have subtitles or captions enabled.");
    }

    // Format transcript with timestamps (like the image shows: 00:00:00 text)
    const transcriptWithTimestamps = data.transcript.map((segment: any) => {
      const hours = Math.floor(segment.start / 3600);
      const minutes = Math.floor((segment.start % 3600) / 60);
      const seconds = Math.floor(segment.start % 60);
      const timestamp = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      return `${timestamp} ${segment.text}`;
    }).join('\n');

    // Plain text without timestamps
    const transcriptText = data.transcript.map((segment: any) => segment.text).join(' ');
    
    if (!transcriptText || transcriptText.trim().length === 0) {
      throw new Error("No captions available for this video. The video may not have subtitles or captions enabled.");
    }

    console.log("[TRANSCRIPT_API] Successfully fetched transcript, language:", data.language);
    
    return {
      transcriptText,
      transcriptWithTimestamps,
      language: data.language || "en",
      segments: data.transcript,
    };
  } catch (error) {
    console.error("[TRANSCRIPT_API] Error:", error);
    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status;
      if (status === 401) {
        throw new Error("Invalid API key. Please check your TranscriptAPI.com credentials.");
      } else if (status === 402) {
        throw new Error("No credits remaining. Please add more credits to your TranscriptAPI.com account.");
      } else if (status === 404) {
        throw new Error("Video not found or transcript unavailable.");
      } else if (status === 429) {
        throw new Error("Rate limit exceeded. Please try again in a moment.");
      }
    }
    throw new Error("Failed to fetch transcript. The video may not have captions enabled.");
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication middleware (Replit Auth)
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // POST /api/translate - General purpose translation endpoint (requires authentication)
  app.post("/api/translate", isAuthenticated, async (req, res) => {
    try {
      const { text, sourceLanguage, targetLanguage } = req.body;
      
      if (!text || !targetLanguage) {
        return res.status(400).json({ error: "Missing required fields: text and targetLanguage" });
      }
      
      const translatedText = await translateText(text, targetLanguage, sourceLanguage || "en");
      res.json({ translatedText });
    } catch (error) {
      console.error("Translation endpoint error:", error);
      res.status(500).json({ error: "Translation failed" });
    }
  });

  // Ensure uploads directory exists
  if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads", { recursive: true });
  }

  // POST /api/transcribe - Video transcription (only fetches transcript, no translation)
  app.post("/api/transcribe", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = transcriptionRequestSchema.parse(req.body);
      const { url } = validatedData;
      const userId = req.user.claims.sub;

      // Create transcription record with explicit defaults
      const transcription = await storage.createTranscription({
        url,
        transcription: "",
        status: "processing",
        progress: 0,
        translationStatus: "idle",
        sourceLanguage: undefined,
        originalTranscription: undefined,
        translatedTranscription: undefined,
        error: undefined,
        translationError: undefined,
        userId,
      });

      // Process in background
      (async () => {
        try {
          console.log("[TRANSCRIPTION] Starting transcription for:", url);
          
          // Fetch YouTube transcript using TranscriptAPI.com
          await storage.updateTranscriptionStatus(transcription.id, "processing", 50);
          console.log("[TRANSCRIPTION] Fetching captions from TranscriptAPI.com...");
          const result = await fetchYoutubeTranscript(url);
          console.log("[TRANSCRIPTION] Captions fetched, language:", result.language);

          // Store transcript with timestamps, detected language, and update status to completed
          await storage.updateTranscriptionStatus(
            transcription.id,
            "completed",
            100,
            result.transcriptWithTimestamps,
            result.transcriptWithTimestamps,  // Also store as originalTranscription
            undefined  // No error
          );
          
          // Update source language separately (need to add this to storage interface or inline update)
          await db.update(transcriptions).set({ sourceLanguage: result.language }).where(eq(transcriptions.id, transcription.id));
          
          console.log("[TRANSCRIPTION] Transcription completed successfully");
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "An error occurred during transcription";
          console.error("[TRANSCRIPTION] Error:", errorMessage);
          await storage.updateTranscriptionStatus(transcription.id, "error", 0, undefined, undefined, errorMessage);
        }
      })();

      res.json({
        id: transcription.id,
        url,
        transcription: "",
        status: "processing",
        message: "Transcription started. Please check back in a few moments.",
      });
    } catch (error) {
      console.error("Transcription endpoint error:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  // GET /api/transcribe/:id - Get transcription status
  app.get("/api/transcribe/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transcription = await storage.getTranscription(req.params.id);
      if (!transcription || transcription.userId !== userId) {
        return res.status(404).json({ error: "Transcription not found" });
      }
      // Prevent caching to ensure real-time status updates during polling
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.json(transcription);
    } catch (error) {
      res.status(500).json({ error: "Failed to get transcription" });
    }
  });

  // POST /api/transcribe/:id/translate - Translate transcript
  app.post("/api/transcribe/:id/translate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transcription = await storage.getTranscription(req.params.id);
      if (!transcription || transcription.userId !== userId) {
        return res.status(404).json({ error: "Transcription not found" });
      }

      if (transcription.status !== "completed") {
        return res.status(400).json({ error: "Transcription must be completed before translation" });
      }

      // Get target language from request body (allows changing translation language)
      const targetLanguage = req.body.targetLanguage || transcription.targetLanguage;

      // Start translation in background
      (async () => {
        try {
          console.log("[TRANSLATION] Starting translation for transcription:", transcription.id);
          await storage.updateTranslationStatus(transcription.id, "processing");

          const sourceLanguage = transcription.sourceLanguage || "en";

          // Get plain text without timestamps for translation
          const transcriptLines = transcription.transcription.split('\n');
          const textToTranslate = transcriptLines.map(line => {
            // Remove timestamp prefix (00:00:00 format)
            return line.replace(/^\d{2}:\d{2}:\d{2}\s+/, '');
          }).join(' ');

          console.log("[TRANSLATION] Translating from", sourceLanguage, "to", targetLanguage);
          
          // Translate using Lingo.dev
          const translatedText = await translateText(textToTranslate, targetLanguage, sourceLanguage);
          
          console.log("[TRANSLATION] Translation completed");
          await storage.updateTranslationStatus(transcription.id, "completed", translatedText);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "An error occurred during translation";
          console.error("[TRANSLATION] Error:", errorMessage);
          await storage.updateTranslationStatus(transcription.id, "error", undefined, errorMessage);
        }
      })();

      res.json({
        id: transcription.id,
        message: "Translation started",
        translationStatus: "processing",
      });
    } catch (error) {
      console.error("Translation endpoint error:", error);
      res.status(500).json({ error: "Failed to start translation" });
    }
  });

  // POST /api/transcribe/:id/dub - Generate dubbed video with AI voice
  app.post("/api/transcribe/:id/dub", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transcription = await storage.getTranscription(req.params.id);
      if (!transcription || transcription.userId !== userId) {
        return res.status(404).json({ error: "Transcription not found" });
      }

      if (transcription.status !== "completed") {
        return res.status(400).json({ error: "Transcription must be completed before dubbing" });
      }

      if (transcription.translationStatus !== "completed" || !transcription.translatedTranscription) {
        return res.status(400).json({ error: "Translation must be completed before dubbing" });
      }

      const targetLanguage = req.body.targetLanguage || transcription.targetLanguage || "en";

      // Start dubbing in background
      (async () => {
        try {
          console.log("[DUBBING] Starting dubbing for transcription:", transcription.id);
          await storage.updateDubbingStatus(transcription.id, "processing");

          // Extract video ID from URL (supports regular videos, shorts, and short links)
          const urlPattern = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
          const match = transcription.url.match(urlPattern);
          if (!match) {
            throw new Error("Invalid YouTube URL");
          }
          const videoId = match[1];

          // Generate audio from translated text using Deepgram TTS
          console.log("[DUBBING] Generating audio with Deepgram TTS...");
          const audioBuffer = await generateSpeech(transcription.translatedTranscription, targetLanguage);
          
          // Save audio file
          const audioPath = path.join("uploads", `dubbed_audio_${transcription.id}.mp3`);
          await fs.promises.writeFile(audioPath, audioBuffer);
          console.log("[DUBBING] Audio generated:", audioPath);

          // Download YouTube video
          console.log("[DUBBING] Downloading video...");
          const videoPath = path.join("uploads", `video_${transcription.id}.mp4`);
          await downloadYoutubeVideo(videoId, videoPath);
          console.log("[DUBBING] Video downloaded:", videoPath);

          // Merge audio with video
          console.log("[DUBBING] Merging audio with video...");
          const outputPath = path.join("uploads", `dubbed_video_${transcription.id}.mp4`);
          await mergeAudioWithVideo(videoPath, audioPath, outputPath);
          console.log("[DUBBING] Video dubbing completed:", outputPath);

          // Update transcription with file paths
          await storage.updateDubbingStatus(
            transcription.id,
            "completed",
            `/api/transcribe/${transcription.id}/download-audio`,
            `/api/transcribe/${transcription.id}/download-video`
          );

          // Clean up temporary files (keep dubbed files for download)
          try {
            if (fs.existsSync(videoPath)) await fs.promises.unlink(videoPath);
          } catch (cleanupError) {
            console.warn("[DUBBING] Cleanup warning:", cleanupError);
          }

          console.log("[DUBBING] Dubbing completed successfully");
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "An error occurred during dubbing";
          console.error("[DUBBING] Error:", errorMessage);
          await storage.updateDubbingStatus(transcription.id, "error", undefined, undefined, errorMessage);
        }
      })();

      res.json({
        id: transcription.id,
        message: "Video dubbing started. This may take several minutes.",
        dubbingStatus: "processing",
      });
    } catch (error) {
      console.error("Dubbing endpoint error:", error);
      res.status(500).json({ error: "Failed to start dubbing" });
    }
  });

  // GET /api/transcribe/:id/download-audio - Download dubbed audio
  app.get("/api/transcribe/:id/download-audio", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transcription = await storage.getTranscription(req.params.id);
      if (!transcription || transcription.userId !== userId) {
        return res.status(404).json({ error: "Transcription not found" });
      }

      const audioPath = path.join("uploads", `dubbed_audio_${transcription.id}.mp3`);
      if (!fs.existsSync(audioPath)) {
        return res.status(404).json({ error: "Dubbed audio not found" });
      }

      res.download(audioPath, `dubbed_audio_${transcription.id}.mp3`);
    } catch (error) {
      console.error("Download audio error:", error);
      res.status(500).json({ error: "Failed to download audio" });
    }
  });

  // GET /api/transcribe/:id/download-video - Download dubbed video
  app.get("/api/transcribe/:id/download-video", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transcription = await storage.getTranscription(req.params.id);
      if (!transcription || transcription.userId !== userId) {
        return res.status(404).json({ error: "Transcription not found" });
      }

      const videoPath = path.join("uploads", `dubbed_video_${transcription.id}.mp4`);
      if (!fs.existsSync(videoPath)) {
        return res.status(404).json({ error: "Dubbed video not found" });
      }

      res.download(videoPath, `dubbed_video_${transcription.id}.mp4`);
    } catch (error) {
      console.error("Download video error:", error);
      res.status(500).json({ error: "Failed to download video" });
    }
  });

  // GET /api/conversations - Get user conversations
  app.get("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getUserConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("[CONVERSATIONS] Error:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // POST /api/chat - Multilingual chat
  app.post("/api/chat", isAuthenticated, async (req: any, res) => {
    try {
      console.log("[CHAT] Received request:", { message: req.body.message, language: req.body.language });
      
      const validatedData = chatRequestSchema.parse(req.body);
      let { message, language, conversationId } = validatedData;

      // Get or create conversation
      let conversation = conversationId
        ? await storage.getConversation(conversationId)
        : null;

      // Detect language if not provided or first message in conversation
      if (!language || (conversation && !conversation.primaryLanguage)) {
        console.log("[CHAT] Detecting language...");
        language = await detectLanguage(message);
        console.log("[CHAT] Detected language:", language);
      }

      if (!conversation) {
        const userId = req.user.claims.sub;
        conversation = await storage.createConversation(language, userId);
        console.log("[CHAT] Created new conversation:", conversation.id);
      }

      // Add user message
      const userMessage = {
        id: Date.now().toString(),
        role: "user" as const,
        content: message,
        language,
        timestamp: new Date().toISOString(),
      };
      await storage.addMessage(conversation.id, userMessage);
      console.log("[CHAT] Added user message");

      // Translate user message to English for Gemini using enhanced SDK method
      const messageForAI = await translateChatForModel(message, language);
      console.log("[CHAT] Message for AI:", messageForAI);

      // Prepare conversation history for Gemini (convert to Gemini format)
      const history = conversation.messages
        .slice(-5)
        .map((msg) => ({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        }));

      // Get AI response using Gemini
      console.log("[CHAT] Calling Gemini API...");
      const systemInstruction = `You are an expert Interview Guide Assistant. Your role is to help users prepare for job interviews by:

1. **Answering Interview Questions**: Provide detailed, professional answers to common and technical interview questions across various industries and roles.
2. **Providing Examples**: Share concrete examples, scenarios, and best practices that candidates can use in their responses.
3. **Offering Feedback**: If users practice their answers, give constructive feedback on how to improve them.
4. **Behavioral Questions**: Help with STAR method (Situation, Task, Action, Result) responses for behavioral interview questions.
5. **Technical Questions**: Assist with technical interview preparation for software engineering, data science, product management, and other technical roles.
6. **Industry-Specific Guidance**: Tailor your advice based on the specific industry or role the user is interviewing for.

Always be encouraging, professional, and provide actionable advice. Format your responses clearly with examples when appropriate.`;

      const response = await geminiClient.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction: systemInstruction,
        },
        contents: [
          ...history,
          {
            role: "user",
            parts: [{ text: messageForAI }],
          },
        ],
      });

      // Extract text from Gemini response (using the SDK's .text property)
      const aiResponse = response.text || "I'm sorry, I couldn't generate a response.";
      console.log("[CHAT] Gemini response received:", aiResponse.substring(0, 100) + "...");

      // Translate AI response back to user's language using enhanced SDK method
      const translatedResponse = await translateChatForUser(aiResponse, language);

      // Add assistant message
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant" as const,
        content: translatedResponse,
        translatedContent: language !== "en" ? aiResponse : undefined,
        language,
        timestamp: new Date().toISOString(),
      };
      await storage.addMessage(conversation.id, assistantMessage);
      console.log("[CHAT] Added assistant message");

      // Get updated conversation
      const updatedConversation = await storage.getConversation(conversation.id);
      console.log("[CHAT] Sending response with", updatedConversation?.messages.length, "messages");

      res.json({
        conversationId: conversation.id,
        messages: updatedConversation?.messages || [],
      });
    } catch (error) {
      console.error("[CHAT] Error:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  // Helper function to extract text from different document types
  async function extractDocumentText(filePath: string, fileType: string): Promise<{ text: string; pageCount: number }> {
    const fileBuffer = await fs.promises.readFile(filePath);
    
    if (fileType === "pdf") {
      const pdfParseModule = await import("pdf-parse");
      const pdfParse = pdfParseModule.default ?? pdfParseModule;
      const pdfData = await pdfParse(fileBuffer);
      
      if (!pdfData.text || typeof pdfData.text !== 'string') {
        throw new Error("PDF contains no readable text");
      }
      
      return { text: pdfData.text, pageCount: pdfData.numpages || 1 };
    } else if (fileType === "docx") {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      
      if (!result || !result.value || typeof result.value !== 'string' || result.value.trim().length === 0) {
        throw new Error("DOCX contains no readable text");
      }
      
      const pageCount = Math.ceil(result.value.length / 3000);
      return { text: result.value, pageCount: Math.max(1, pageCount) };
    }
    
    throw new Error(`Unsupported file type: ${fileType}`);
  }

  // GET /api/document-translations - Get user document translations
  app.get("/api/document-translations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const translations = await storage.getUserDocumentTranslations(userId);
      res.json(translations);
    } catch (error) {
      console.error("[DOC_TRANSLATIONS] Error:", error);
      res.status(500).json({ error: "Failed to fetch document translations" });
    }
  });

  // POST /api/translate-pdf - Document translation (PDF, DOC, DOCX)
  app.post("/api/translate-pdf", isAuthenticated, upload.single("pdf"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No document file uploaded" });
      }

      const validatedData = pdfTranslationRequestSchema.parse(req.body);
      const { sourceLanguage, targetLanguage } = validatedData;

      const filePath = req.file.path;
      
      // Extract and normalize file extension (lowercase, last extension only)
      const fileName = req.file.originalname;
      const lastDotIndex = fileName.lastIndexOf('.');
      if (lastDotIndex === -1) {
        // No extension
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return res.status(400).json({ error: "File must have an extension. Please upload PDF or DOCX files only." });
      }
      
      const fileExtension = fileName.slice(lastDotIndex + 1).toLowerCase();
      
      // Validate file type explicitly (whitelist only)
      if (fileExtension !== "pdf" && fileExtension !== "docx") {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return res.status(400).json({ error: "Unsupported file type. Please upload PDF or DOCX files only." });
      }
      
      const fileType = fileExtension as "pdf" | "docx";

      console.log("[DOCUMENT_TRANSLATION] Starting translation for:", req.file.originalname, "Type:", fileType);

      // Create translation record immediately
      const userId = req.user.claims.sub;
      const translation = await storage.createPdfTranslation({
        fileName: req.file.originalname,
        fileType,
        sourceLanguage,
        targetLanguage,
        status: "processing",
        progress: 0,
        pageCount: 0,
        userId,
      });

      // Process in background
      (async () => {
        try {
          console.log("[DOCUMENT_TRANSLATION] Extracting text from document...");
          
          // Extract text based on file type
          const { text, pageCount } = await extractDocumentText(filePath, fileType);
          
          if (!text || text.trim().length === 0) {
            throw new Error("No text content found in document");
          }

          console.log("[DOCUMENT_TRANSLATION] Extracted", text.length, "characters from", pageCount, "pages");

          // Translate text
          await storage.updatePdfTranslationStatus(translation.id, {
            status: "processing",
            progress: 30,
            pageCount,
            reset: { error: true, translatedFileUrl: true }
          });
          console.log("[DOCUMENT_TRANSLATION] Translating text...");
          const translatedText = await translateText(text, targetLanguage, sourceLanguage);

          // Create new PDF with translated text
          await storage.updatePdfTranslationStatus(translation.id, {
            status: "processing",
            progress: 70
          });
          console.log("[DOCUMENT_TRANSLATION] Creating translated document...");
          const outputPath = `uploads/${translation.id}_translated.pdf`;
          const doc = new PDFDocument();
          const writeStream = fs.createWriteStream(outputPath);

          doc.pipe(writeStream);
          doc.fontSize(12).text(translatedText, {
            align: "left",
            lineGap: 5,
          });
          doc.end();

          await new Promise((resolve) => writeStream.on("finish", resolve));

          // Complete
          await storage.updatePdfTranslationStatus(translation.id, {
            status: "completed",
            progress: 100,
            pageCount,
            translatedFileUrl: `/uploads/${path.basename(outputPath)}`
          });

          console.log("[DOCUMENT_TRANSLATION] Translation completed successfully");

          // Cleanup original file
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Document translation failed";
          console.error("[DOCUMENT_TRANSLATION] Error:", errorMessage);
          await storage.updatePdfTranslationStatus(translation.id, {
            status: "error",
            progress: 0,
            error: errorMessage,
            reset: { translatedFileUrl: true }
          });
        }
      })();

      res.json({
        id: translation.id,
        status: "processing",
        message: "Document translation started.",
      });
    } catch (error) {
      console.error("[DOCUMENT_TRANSLATION] Endpoint error:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  // GET /api/translate-pdf/:id - Get PDF translation status
  app.get("/api/translate-pdf/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const translation = await storage.getPdfTranslation(req.params.id);
      if (!translation || translation.userId !== userId) {
        return res.status(404).json({ error: "Translation not found" });
      }
      res.json(translation);
    } catch (error) {
      res.status(500).json({ error: "Failed to get translation status" });
    }
  });

  // Authenticated file download endpoint
  app.get("/uploads/:filename", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const filename = req.params.filename;
      const filePath = path.join("uploads", filename);

      // Verify file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
      }

      // Extract translation ID from filename (format: translated_<id>.pdf)
      const match = filename.match(/translated_(.+)\.pdf$/);
      if (!match) {
        return res.status(403).json({ error: "Access denied" });
      }

      const translationId = match[1];
      const translation = await storage.getPdfTranslation(translationId);

      // Verify ownership
      if (!translation || translation.userId !== userId) {
        return res.status(404).json({ error: "File not found" });
      }

      // Serve the file
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.download(filePath);
    } catch (error) {
      console.error("Error serving file:", error);
      res.status(500).json({ error: "Failed to download file" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
