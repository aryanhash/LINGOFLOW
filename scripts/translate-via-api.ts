import * as fs from "fs";
import * as path from "path";
import * as https from "https";

const API_KEY = process.env.LINGO_API_KEY || "";
const targetLanguages = ["es", "fr", "de", "hi", "zh", "ja", "ar", "pt", "ru", "ko"];
const localesDir = path.join(__dirname, "../client/public/locales");

async function lingoTranslate(text: string, targetLang: string): Promise<string> {
  const url = `https://api.lingo.dev/v1/localize/text`;
  
  const postData = JSON.stringify({
    text: text,
    targetLocale: targetLang,
    sourceLocale: "en"
  });

  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const result = JSON.parse(data);
            resolve(result.localizedText || text);
          } catch (e) {
            console.error(`Parse error: ${e}`);
            resolve(text);
          }
        } else {
          console.error(`API error (${res.statusCode}): ${data}`);
          resolve(text);
        }
      });
    });

    req.on('error', (error) => {
      console.error(`Request error: ${error.message}`);
      resolve(text);
    });

    req.write(postData);
    req.end();
  });
}

async function translateValue(value: any, targetLang: string, path: string = ""): Promise<any> {
  if (typeof value === "string") {
    process.stdout.write('.');
    await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
    return await lingoTranslate(value, targetLang);
  }
  
  if (Array.isArray(value)) {
    const results = [];
    for (let i = 0; i < value.length; i++) {
      results.push(await translateValue(value[i], targetLang, `${path}[${i}]`));
    }
    return results;
  }
  
  if (typeof value === "object" && value !== null) {
    const result: any = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = await translateValue(val, targetLang, path ? `${path}.${key}` : key);
    }
    return result;
  }
  
  return value;
}

async function main() {
  const enPath = path.join(localesDir, "en.json");
  const enContent = JSON.parse(fs.readFileSync(enPath, "utf-8"));
  
  console.log("🌍 Starting comprehensive locale file translation...\n");
  
  for (const lang of targetLanguages) {
    process.stdout.write(`📝 Translating to ${lang.toUpperCase()}... `);
    try {
      const translated = await translateValue(enContent, lang);
      const outputPath = path.join(localesDir, `${lang}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(translated, null, 2) + "\n");
      console.log(` ✓ Complete!`);
    } catch (error: any) {
      console.log(` ✗ Error: ${error.message}`);
    }
  }
  
  console.log("\n✨ All translations complete!");
}

main().catch(error => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
