// Using Lingo.dev SDK for website-wide translation
import { LingoDotDevEngine } from "lingo.dev/sdk";

// Initialize Lingo.dev SDK with API key (browser-safe)
const getApiKey = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.VITE_LINGO_API_KEY;
  }
  return "api_s7g07km8km3rq7a4ncttkb88";
};

const LINGO_API_KEY = getApiKey() || "api_s7g07km8km3rq7a4ncttkb88";

let sdkInstance: any = null;

// Initialize the SDK (browser-safe runtime translation)
export async function initializeLingoSdk() {
  if (!sdkInstance) {
    try {
      sdkInstance = new LingoDotDevEngine({ apiKey: LINGO_API_KEY });
      console.log("[LINGO_SDK] ✓ SDK initialized successfully");
    } catch (error) {
      console.error("[LINGO_SDK] ✗ SDK initialization error:", error);
    }
  }
  return sdkInstance;
}

// Translate using Lingo.dev SDK
export async function translateWithSdk(
  text: string,
  targetLocale: string,
  sourceLocale: string = "en"
): Promise<string> {
  try {
    if (sourceLocale === targetLocale || !text || text.trim().length === 0) {
      return text;
    }

    const instance = await initializeLingoSdk();
    if (!instance) {
      return text;
    }

    // Use SDK method
    if (instance.localizeText) {
      const translated = await instance.localizeText(text, {
        sourceLocale,
        targetLocale,
      });
      return translated || text;
    }

    return text;
  } catch (error) {
    console.error("[LINGO_SDK] Translation error:", error);
    return text;
  }
}

// Translate entire object recursively using Lingo.dev SDK
export async function translateObjectWithSdk(
  obj: any,
  targetLocale: string,
  sourceLocale: string = "en"
): Promise<any> {
  try {
    if (sourceLocale === targetLocale) {
      return obj;
    }

    const instance = await initializeLingoSdk();
    if (!instance) {
      return obj;
    }

    // Recursively translate all string values
    const translateValue = async (value: any): Promise<any> => {
      if (typeof value === "string" && value.trim().length > 0) {
        return await translateWithSdk(value, targetLocale, sourceLocale);
      } else if (Array.isArray(value)) {
        return await Promise.all(value.map(translateValue));
      } else if (value && typeof value === "object") {
        const result: any = {};
        for (const [key, val] of Object.entries(value)) {
          result[key] = await translateValue(val);
        }
        return result;
      }
      return value;
    };

    console.log(`[LINGO_SDK] Translating website from ${sourceLocale} to ${targetLocale}...`);
    const translated = await translateValue(obj);
    console.log(`[LINGO_SDK] ✓ Website translation completed`);
    return translated;
  } catch (error) {
    console.error("[LINGO_SDK] Object translation error:", error);
    return obj;
  }
}

