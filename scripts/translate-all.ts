import { LingoDotDevEngine } from "lingo.dev/sdk";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const lingoDotDev = new LingoDotDevEngine({
  apiKey: process.env.LINGO_API_KEY || "",
});

const targetLanguages = ["es", "fr", "de", "hi", "zh", "ja", "ar", "pt", "ru", "ko"];
const localesDir = path.join(__dirname, "../client/public/locales");

async function translateValue(value: any, targetLang: string): Promise<any> {
  if (typeof value === "string") {
    try {
      return await lingoDotDev.localizeText(value, {
        sourceLocale: "en",
        targetLocale: targetLang,
      });
    } catch (error: any) {
      console.error(`Error translating "${value.substring(0, 50)}...": ${error.message}`);
      return value;
    }
  }
  
  if (Array.isArray(value)) {
    const results = [];
    for (const item of value) {
      results.push(await translateValue(item, targetLang));
    }
    return results;
  }
  
  if (typeof value === "object" && value !== null) {
    const result: any = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = await translateValue(val, targetLang);
    }
    return result;
  }
  
  return value;
}

async function main() {
  const enPath = path.join(localesDir, "en.json");
  const enContent = JSON.parse(fs.readFileSync(enPath, "utf-8"));
  
  console.log("Starting translation of comprehensive locale files...\n");
  
  for (const lang of targetLanguages) {
    console.log(`Translating to ${lang.toUpperCase()}...`);
    try {
      const translated = await translateValue(enContent, lang);
      const outputPath = path.join(localesDir, `${lang}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(translated, null, 2) + "\n");
      console.log(`✓ ${lang}.json completed\n`);
      
      // Small delay to be nice to the API
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error: any) {
      console.error(`✗ Error translating to ${lang}:`, error.message);
    }
  }
  
  console.log("✓ All translations complete!");
}

main().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});
