import { z } from "zod";
import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
} from "drizzle-orm/pg-core";

// ===== Database Tables (Drizzle ORM) =====

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Conversations table for multilingual chat
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: varchar("title"),
  primaryLanguage: varchar("primary_language").notNull(),
  secondaryLanguage: varchar("secondary_language"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat messages table
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").references(() => conversations.id, { onDelete: 'cascade' }).notNull(),
  role: varchar("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  translatedContent: text("translated_content"),
  language: varchar("language").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Transcriptions table
export const transcriptions = pgTable("transcriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  url: text("url").notNull(),
  sourceLanguage: varchar("source_language"),
  targetLanguage: varchar("target_language"),
  originalTranscription: text("original_transcription"),
  translatedTranscription: text("translated_transcription"),
  transcription: text("transcription").notNull().default(''),
  status: varchar("status", { enum: ["pending", "processing", "completed", "error"] }).notNull(),
  translationStatus: varchar("translation_status", { enum: ["idle", "processing", "completed", "error"] }).default("idle"),
  dubbingStatus: varchar("dubbing_status", { enum: ["idle", "processing", "completed", "error"] }).default("idle"),
  progress: integer("progress").notNull().default(0),
  error: text("error"),
  translationError: text("translation_error"),
  dubbingError: text("dubbing_error"),
  dubbedAudioUrl: text("dubbed_audio_url"),
  dubbedVideoUrl: text("dubbed_video_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Document translations table
export const documentTranslations = pgTable("document_translations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  fileName: varchar("file_name").notNull(),
  fileType: varchar("file_type", { enum: ["pdf", "docx"] }).notNull(),
  sourceLanguage: varchar("source_language").notNull(),
  targetLanguage: varchar("target_language").notNull(),
  status: varchar("status", { enum: ["pending", "processing", "completed", "error"] }).notNull(),
  progress: integer("progress").notNull().default(0),
  pageCount: integer("page_count").notNull().default(0),
  currentPage: integer("current_page"),
  originalFileUrl: text("original_file_url"),
  translatedFileUrl: text("translated_file_url"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ===== Zod Schemas for Validation =====

// Video Transcription Schema
export const transcriptionRequestSchema = z.object({
  url: z.string().url("Please enter a valid YouTube URL"),
});

export const transcriptionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  url: z.string(),
  sourceLanguage: z.string().optional(),
  targetLanguage: z.string().optional(),
  originalTranscription: z.string().optional(),
  translatedTranscription: z.string().optional(),
  transcription: z.string(),
  status: z.enum(["pending", "processing", "completed", "error"]),
  translationStatus: z.enum(["idle", "processing", "completed", "error"]).optional(),
  dubbingStatus: z.enum(["idle", "processing", "completed", "error"]).optional(),
  progress: z.number().min(0).max(100),
  error: z.string().optional(),
  translationError: z.string().optional(),
  dubbingError: z.string().optional(),
  dubbedAudioUrl: z.string().optional(),
  dubbedVideoUrl: z.string().optional(),
  createdAt: z.string(),
});

export type TranscriptionRequest = z.infer<typeof transcriptionRequestSchema>;
export type Transcription = z.infer<typeof transcriptionSchema>;

// Multilingual Chat Schema
export const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  translatedContent: z.string().optional(),
  language: z.string(),
  timestamp: z.string(),
});

export const chatRequestSchema = z.object({
  message: z.string().min(1, "Please enter a message"),
  language: z.string().min(1, "Please select a language"),
  conversationId: z.string().optional(),
});

export const conversationSchema = z.object({
  id: z.string(),
  messages: z.array(chatMessageSchema),
  primaryLanguage: z.string(),
  secondaryLanguage: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type Conversation = z.infer<typeof conversationSchema>;

// Document Translation Schema
export const documentTranslationRequestSchema = z.object({
  sourceLanguage: z.string().min(1, "Please select a source language"),
  targetLanguage: z.string().min(1, "Please select a target language"),
});

export const documentTranslationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  fileName: z.string(),
  fileType: z.enum(["pdf", "docx"]),
  sourceLanguage: z.string(),
  targetLanguage: z.string(),
  status: z.enum(["pending", "processing", "completed", "error"]),
  progress: z.number().min(0).max(100),
  pageCount: z.number(),
  currentPage: z.number().optional(),
  originalFileUrl: z.string().optional(),
  translatedFileUrl: z.string().optional(),
  error: z.string().optional(),
  createdAt: z.string(),
});

export type DocumentTranslationRequest = z.infer<typeof documentTranslationRequestSchema>;
export type DocumentTranslation = z.infer<typeof documentTranslationSchema>;

// Legacy exports for backward compatibility
export const pdfTranslationRequestSchema = documentTranslationRequestSchema;
export const pdfTranslationSchema = documentTranslationSchema;
export type PdfTranslationRequest = DocumentTranslationRequest;
export type PdfTranslation = DocumentTranslation;

// Language options (100+ languages supported by Lingo.dev)
export const languages = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
  { code: "bn", name: "Bengali" },
  { code: "pa", name: "Punjabi" },
  { code: "tr", name: "Turkish" },
  { code: "vi", name: "Vietnamese" },
  { code: "pl", name: "Polish" },
  { code: "uk", name: "Ukrainian" },
  { code: "nl", name: "Dutch" },
  { code: "sv", name: "Swedish" },
] as const;

export type LanguageCode = typeof languages[number]["code"];
