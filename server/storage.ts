import {
  users,
  conversations,
  chatMessages,
  transcriptions,
  documentTranslations,
  transcriptionTranslations,
  type User,
  type UpsertUser,
  type Transcription,
  type Conversation,
  type ChatMessage,
  type PdfTranslation,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Transcription methods
  createTranscription(data: Omit<Transcription, "id" | "createdAt"> & { userId?: string }): Promise<Transcription>;
  getTranscription(id: string): Promise<Transcription | undefined>;
  updateTranscriptionStatus(id: string, status: Transcription["status"], progress: number, transcription?: string, originalTranscription?: string, error?: string): Promise<void>;
  updateTranslationStatus(id: string, translationStatus: "idle" | "processing" | "completed" | "error", translatedTranscription?: string, translationError?: string): Promise<void>;
  updateDubbingStatus(id: string, dubbingStatus: "idle" | "processing" | "completed" | "error", dubbedAudioUrl?: string, dubbedVideoUrl?: string, dubbingError?: string): Promise<void>;

  // Chat/Conversation methods
  createConversation(primaryLanguage: string, userId?: string): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation | undefined>;
  getUserConversations(userId: string): Promise<Conversation[]>;
  addMessage(conversationId: string, message: Omit<ChatMessage, "id" | "timestamp">): Promise<void>;
  updateConversation(id: string, updates: Partial<Conversation>): Promise<void>;

  // PDF Translation methods
  createPdfTranslation(data: Omit<PdfTranslation, "id" | "createdAt"> & { userId?: string }): Promise<PdfTranslation>;
  getPdfTranslation(id: string): Promise<PdfTranslation | undefined>;
  getUserDocumentTranslations(userId: string): Promise<PdfTranslation[]>;
  updatePdfTranslationStatus(
    id: string,
    payload: {
      status: PdfTranslation["status"];
      progress: number;
      pageCount?: number;
      translatedFileUrl?: string;
      error?: string;
      reset?: {
        error?: boolean;
        translatedFileUrl?: boolean;
        pageCount?: boolean;
      };
    }
  ): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Transcription methods
  async createTranscription(data: Omit<Transcription, "id" | "createdAt"> & { userId?: string }): Promise<Transcription> {
    try {
      const [transcription] = await db
        .insert(transcriptions)
        .values({
          ...data,
          userId: data.userId || null,
        })
        .returning();

      return {
        ...transcription,
        userId: transcription.userId!,
        sourceLanguage: transcription.sourceLanguage || undefined,
        targetLanguage: transcription.targetLanguage || undefined,
        originalTranscription: transcription.originalTranscription || undefined,
        translatedTranscription: transcription.translatedTranscription || undefined,
        error: transcription.error || undefined,
        translationError: transcription.translationError || undefined,
        dubbingError: transcription.dubbingError || undefined,
        dubbedAudioUrl: transcription.dubbedAudioUrl || undefined,
        dubbedVideoUrl: transcription.dubbedVideoUrl || undefined,
        createdAt: transcription.createdAt!.toISOString(),
        translationStatus: transcription.translationStatus as "idle" | "processing" | "completed" | "error" | undefined,
        dubbingStatus: transcription.dubbingStatus as "idle" | "processing" | "completed" | "error" | undefined,
      };
    } catch (error: any) {
      console.error("[STORAGE] Error creating transcription:", error);
      // Check if it's a table doesn't exist error
      if (error.message?.includes('does not exist') || error.message?.includes('relation') || error.code === '42P01') {
        throw new Error("Database tables not found. Please run 'npm run db:push' to create the tables.");
      }
      // Check if it's a connection error
      if (error.message?.includes('connect') || error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new Error("Cannot connect to database. Please check your DATABASE_URL and ensure the database is running.");
      }
      // Check for constraint violations
      if (error.code === '23503' || error.message?.includes('foreign key')) {
        throw new Error("User not found. Please ensure you are logged in.");
      }
      throw error;
    }
  }

  async getTranscription(id: string): Promise<Transcription | undefined> {
    const [transcription] = await db.select().from(transcriptions).where(eq(transcriptions.id, id));
    if (!transcription) return undefined;

    return {
      ...transcription,
      userId: transcription.userId!,
      sourceLanguage: transcription.sourceLanguage || undefined,
      targetLanguage: transcription.targetLanguage || undefined,
      originalTranscription: transcription.originalTranscription || undefined,
      translatedTranscription: transcription.translatedTranscription || undefined,
      error: transcription.error || undefined,
      translationError: transcription.translationError || undefined,
      dubbingError: transcription.dubbingError || undefined,
      dubbedAudioUrl: transcription.dubbedAudioUrl || undefined,
      dubbedVideoUrl: transcription.dubbedVideoUrl || undefined,
      createdAt: transcription.createdAt!.toISOString(),
      translationStatus: transcription.translationStatus as "idle" | "processing" | "completed" | "error" | undefined,
      dubbingStatus: transcription.dubbingStatus as "idle" | "processing" | "completed" | "error" | undefined,
    };
  }

  async updateTranscriptionStatus(
    id: string,
    status: Transcription["status"],
    progress: number,
    transcription?: string,
    originalTranscription?: string,
    error?: string
  ): Promise<void> {
    const updates: any = { status, progress };
    if (transcription) updates.transcription = transcription;
    if (originalTranscription) updates.originalTranscription = originalTranscription;
    if (error) updates.error = error;

    await db.update(transcriptions).set(updates).where(eq(transcriptions.id, id));
  }

  async updateTranslationStatus(
    id: string,
    translationStatus: "idle" | "processing" | "completed" | "error",
    translatedTranscription?: string,
    translationError?: string
  ): Promise<void> {
    const updates: any = { translationStatus };

    // Clear error when starting or completing translation
    if (translationStatus === "processing" || translationStatus === "completed") {
      updates.translationError = null;
    }

    if (translatedTranscription) updates.translatedTranscription = translatedTranscription;
    if (translationError) updates.translationError = translationError;

    await db.update(transcriptions).set(updates).where(eq(transcriptions.id, id));
  }

  async updateDubbingStatus(
    id: string,
    dubbingStatus: "idle" | "processing" | "completed" | "error",
    dubbedAudioUrl?: string,
    dubbedVideoUrl?: string,
    dubbingError?: string
  ): Promise<void> {
    const updates: any = { dubbingStatus };

    // Clear error and stale URLs when starting dubbing
    if (dubbingStatus === "processing") {
      updates.dubbingError = null;
      updates.dubbedAudioUrl = null;
      updates.dubbedVideoUrl = null;
    }

    // Clear error when completing dubbing
    if (dubbingStatus === "completed") {
      updates.dubbingError = null;
    }

    if (dubbedAudioUrl) updates.dubbedAudioUrl = dubbedAudioUrl;
    if (dubbedVideoUrl) updates.dubbedVideoUrl = dubbedVideoUrl;
    if (dubbingError) updates.dubbingError = dubbingError;

    await db.update(transcriptions).set(updates).where(eq(transcriptions.id, id));
  }

  // Chat/Conversation methods
  async createConversation(primaryLanguage: string, userId?: string): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values({
        primaryLanguage,
        userId: userId || null,
      })
      .returning();

    return {
      id: conversation.id,
      messages: [],
      primaryLanguage: conversation.primaryLanguage,
      secondaryLanguage: conversation.secondaryLanguage || undefined,
      createdAt: conversation.createdAt!.toISOString(),
      updatedAt: conversation.updatedAt!.toISOString(),
    };
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    if (!conversation) return undefined;

    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, id))
      .orderBy(chatMessages.timestamp);

    return {
      id: conversation.id,
      messages: messages.map((msg) => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
        translatedContent: msg.translatedContent || undefined,
        language: msg.language,
        timestamp: msg.timestamp!.toISOString(),
      })),
      primaryLanguage: conversation.primaryLanguage,
      secondaryLanguage: conversation.secondaryLanguage || undefined,
      createdAt: conversation.createdAt!.toISOString(),
      updatedAt: conversation.updatedAt!.toISOString(),
    };
  }

  async getUserConversations(userId: string): Promise<Conversation[]> {
    const userConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));

    return Promise.all(
      userConversations.map(async (conv) => {
        const messages = await db
          .select()
          .from(chatMessages)
          .where(eq(chatMessages.conversationId, conv.id))
          .orderBy(chatMessages.timestamp);

        return {
          id: conv.id,
          messages: messages.map((msg) => ({
            id: msg.id,
            role: msg.role as "user" | "assistant",
            content: msg.content,
            translatedContent: msg.translatedContent || undefined,
            language: msg.language,
            timestamp: msg.timestamp!.toISOString(),
          })),
          primaryLanguage: conv.primaryLanguage,
          secondaryLanguage: conv.secondaryLanguage || undefined,
          createdAt: conv.createdAt!.toISOString(),
          updatedAt: conv.updatedAt!.toISOString(),
        };
      })
    );
  }

  async addMessage(conversationId: string, message: Omit<ChatMessage, "id" | "timestamp">): Promise<void> {
    await db.insert(chatMessages).values({
      conversationId,
      role: message.role,
      content: message.content,
      translatedContent: message.translatedContent || null,
      language: message.language,
    });

    await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, conversationId));
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<void> {
    const dbUpdates: any = { updatedAt: new Date() };
    if (updates.secondaryLanguage) dbUpdates.secondaryLanguage = updates.secondaryLanguage;
    if (updates.primaryLanguage) dbUpdates.primaryLanguage = updates.primaryLanguage;

    await db.update(conversations).set(dbUpdates).where(eq(conversations.id, id));
  }

  // PDF Translation methods
  async createPdfTranslation(data: Omit<PdfTranslation, "id" | "createdAt"> & { userId?: string }): Promise<PdfTranslation> {
    const [translation] = await db
      .insert(documentTranslations)
      .values({
        ...data,
        userId: data.userId || null,
      })
      .returning();

    return {
      ...translation,
      currentPage: translation.currentPage || undefined,
      originalFileUrl: translation.originalFileUrl || undefined,
      translatedFileUrl: translation.translatedFileUrl || undefined,
      error: translation.error || undefined,
      createdAt: translation.createdAt!.toISOString(),
    };
  }

  async getPdfTranslation(id: string): Promise<PdfTranslation | undefined> {
    const [translation] = await db.select().from(documentTranslations).where(eq(documentTranslations.id, id));
    if (!translation) return undefined;

    return {
      ...translation,
      currentPage: translation.currentPage || undefined,
      originalFileUrl: translation.originalFileUrl || undefined,
      translatedFileUrl: translation.translatedFileUrl || undefined,
      error: translation.error || undefined,
      createdAt: translation.createdAt!.toISOString(),
    };
  }

  async getUserDocumentTranslations(userId: string): Promise<PdfTranslation[]> {
    const translations = await db
      .select()
      .from(documentTranslations)
      .where(eq(documentTranslations.userId, userId))
      .orderBy(desc(documentTranslations.createdAt));

    return translations.map((translation) => ({
      ...translation,
      currentPage: translation.currentPage || undefined,
      originalFileUrl: translation.originalFileUrl || undefined,
      translatedFileUrl: translation.translatedFileUrl || undefined,
      error: translation.error || undefined,
      createdAt: translation.createdAt!.toISOString(),
    }));
  }

  async updatePdfTranslationStatus(
    id: string,
    payload: {
      status: PdfTranslation["status"];
      progress: number;
      pageCount?: number;
      translatedFileUrl?: string;
      error?: string;
      reset?: {
        error?: boolean;
        translatedFileUrl?: boolean;
        pageCount?: boolean;
      };
    }
  ): Promise<void> {
    const updates: any = { status: payload.status, progress: payload.progress };

    // Handle resets
    if (payload.reset?.error) updates.error = null;
    if (payload.reset?.translatedFileUrl) updates.translatedFileUrl = null;
    if (payload.reset?.pageCount) updates.pageCount = 0;

    // Handle updates
    if (payload.pageCount !== undefined) updates.pageCount = payload.pageCount;
    if (payload.translatedFileUrl) updates.translatedFileUrl = payload.translatedFileUrl;
    if (payload.error) updates.error = payload.error;

    // Auto-reset on status change to processing
    if (payload.status === "processing" && !payload.reset) {
      updates.error = null;
      updates.translatedFileUrl = null;
    }

    await db.update(documentTranslations).set(updates).where(eq(documentTranslations.id, id));
  }

  // Translation cache methods - optimized with single query upsert
  async saveTranslation(transcriptionId: string, language: string, translatedText: string): Promise<void> {
    // Use PostgreSQL's ON CONFLICT for efficient upsert (single query instead of SELECT + INSERT/UPDATE)
    await db
      .insert(transcriptionTranslations)
      .values({
        transcriptionId,
        language,
        translatedText,
      })
      .onConflictDoUpdate({
        target: [transcriptionTranslations.transcriptionId, transcriptionTranslations.language],
        set: {
          translatedText,
          createdAt: new Date(),
        },
      });
  }

  async getTranslation(transcriptionId: string, language: string): Promise<string | undefined> {
    const [translation] = await db
      .select()
      .from(transcriptionTranslations)
      .where(
        and(
          eq(transcriptionTranslations.transcriptionId, transcriptionId),
          eq(transcriptionTranslations.language, language)
        )
      )
      .limit(1);
    return translation?.translatedText;
  }

  async getAllTranslations(transcriptionId: string): Promise<Record<string, string>> {
    const translations = await db
      .select()
      .from(transcriptionTranslations)
      .where(eq(transcriptionTranslations.transcriptionId, transcriptionId));
    
    const result: Record<string, string> = {};
    for (const t of translations) {
      result[t.language] = t.translatedText;
    }
    return result;
  }
}

export const storage = new DatabaseStorage();
