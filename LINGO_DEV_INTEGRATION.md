# Lingo.dev Integration Guide

This document provides comprehensive documentation for the Lingo.dev integration in LingoFlow.

## Overview

LingoFlow uses **all three Lingo.dev features** for complete AI-powered translation:

1. **JavaScript SDK** - Runtime translation for dynamic content
2. **CLI** - Static file translation for frontend localization
3. **CI/CD** - Automated translation pipeline in GitHub Actions

## 1. JavaScript SDK Integration

### Installation

```bash
npm install lingo.dev@latest
```

### Initialization

```typescript
import { LingoDotDevEngine } from "lingo.dev/sdk";

const lingoDotDev = new LingoDotDevEngine({
  apiKey: process.env.LINGO_API_KEY,
});
```

### SDK Methods

#### a) `localizeText()` - Simple String Translation

**Use Case**: Document translation (PDF/DOCX), simple text

```typescript
const translatedText = await lingoDotDev.localizeText("Hello, world!", {
  sourceLocale: "en",
  targetLocale: "es",
});
// Output: "¡Hola Mundo!"
```

**Implementation**: `server/routes.ts` → `translateText()` helper

---

#### b) `localizeObject()` - Structured Data Translation

**Use Case**: Chat messages, JSON data with context

```typescript
const messageObj = {
  role: "user",
  content: "How are you?",
};

const translated = await lingoDotDev.localizeObject(messageObj, {
  sourceLocale: "en",
  targetLocale: "fr",
});
// Output: { role: "user", content: "Comment allez-vous?" }
```

**Implementation**: 
- `server/routes.ts` → `translateChatForModel()` helper
- `server/routes.ts` → `translateChatForUser()` helper

---

#### c) `recognizeLocale()` - Language Detection

**Use Case**: Auto-detect user language when not provided

```typescript
const locale = await lingoDotDev.recognizeLocale("Bonjour le monde");
// Output: 'fr'
```

**Implementation**: `server/routes.ts` → `detectLanguage()` helper

---

#### d) `batchLocalizeText()` - Multi-Language Translation

**Use Case**: Translate to multiple languages at once (future feature)

```typescript
const translations = await lingoDotDev.batchLocalizeText("Hello, world!", {
  sourceLocale: "en",
  targetLocales: ["es", "fr", "de"],
});
// Output: ['¡Hola Mundo!', 'Bonjour le monde!', 'Hallo Welt!']
```

**Implementation**: `server/routes.ts` → `batchTranslateText()` helper (staged)

---

### Helper Functions

Located in `server/routes.ts`:

| Function | Purpose | SDK Method |
|----------|---------|------------|
| `translateText()` | Document translation | `localizeText()` |
| `detectLanguage()` | Auto-detect language | `recognizeLocale()` |
| `translateChatForModel()` | Translate user message to English | `localizeObject()` |
| `translateChatForUser()` | Translate AI response to user language | `localizeObject()` |
| `batchTranslateText()` | Multi-language batch translation | `batchLocalizeText()` |

---

## 2. CLI Integration

### Configuration File: `i18n.json`

```json
{
  "$schema": "https://lingo.dev/schema/i18n.json",
  "version": "1.10",
  "locale": {
    "source": "en",
    "targets": [
      "es", "fr", "de", "hi", "zh", 
      "ja", "ar", "pt", "ru", "ko"
    ]
  },
  "buckets": {
    "json": {
      "include": ["client/public/locales/[locale].json"],
      "exclude": []
    }
  },
  "provider": {
    "id": "lingo"
  }
}
```

### File Structure

```
project-root/
├── i18n.json                          # CLI configuration
├── i18n.lock                          # Translation state (commit to git)
└── client/public/locales/
    ├── en.json                        # Source locale (manually edit)
    ├── es.json                        # Auto-generated
    ├── fr.json                        # Auto-generated
    └── ...                            # Other locales
```

### Source Locale: `client/public/locales/en.json`

```json
{
  "app": {
    "name": "LinguaFlow",
    "tagline": "AI-Powered Multilingual Translation Platform"
  },
  "nav": {
    "home": "Home",
    "features": "Features",
    "videoTranscription": "Video Transcription"
  },
  "common": {
    "upload": "Upload",
    "download": "Download",
    "translate": "Translate"
  }
}
```

### CLI Commands

```bash
# Initialize configuration (one-time setup)
npx lingo.dev@latest init

# Translate all target locales
npx lingo.dev@latest run

# Force retranslation (ignore cache)
npx lingo.dev@latest run --force

# Translate specific locale only
npx lingo.dev@latest run --locale es

# Validate translations (CI check)
npx lingo.dev@latest run --frozen
```

### Lockfile Management

The `i18n.lock` file:
- Tracks SHA-256 checksums of source content
- Enables incremental translation (only changed keys)
- **Must be committed to git**
- Auto-updated on every `run` command

---

## 3. CI/CD Integration

### GitHub Actions Workflow: `.github/workflows/i18n.yml`

```yaml
name: Lingo.dev i18n Translation

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: write
  pull-requests: write

jobs:
  # Validate translations on PRs
  validate:
    name: Validate Translations
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Check translations are up-to-date
        run: npx lingo.dev@latest run --frozen
        env:
          LINGO_API_KEY: ${{ secrets.LINGO_API_KEY }}

  # Auto-translate on main branch
  translate:
    name: Auto-translate
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Run Lingo.dev translations
        run: npx lingo.dev@latest ci --pull-request --api-key "$LINGO_API_KEY"
        env:
          LINGO_API_KEY: ${{ secrets.LINGO_API_KEY }}
          GH_TOKEN: ${{ github.token }}
```

### Setup GitHub Secret

1. Go to repository **Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Name: `LINGO_API_KEY`
4. Value: Your API key from [Lingo.dev dashboard](https://lingo.dev)
5. Click **Add secret**

### Workflow Behavior

| Event | Job | Action |
|-------|-----|--------|
| Push to `main` | `translate` | Run CLI, create PR with translations |
| Pull request | `validate` | Check translations are up-to-date (fail if not) |

### Enable PR Creation

In repository **Settings → Actions → General**:
- ✅ Enable "Allow GitHub Actions to create and approve pull requests"

---

## Best Practices

### 1. Source Locale Management
- Only edit `en.json` manually
- Never edit generated locale files directly
- Commit `i18n.lock` to track translation state

### 2. Translation Workflow
```
1. Edit client/public/locales/en.json
2. Run: npx lingo.dev@latest run
3. Review generated translations
4. Commit en.json + i18n.lock + generated locales
5. Push to main → CI creates PR with latest translations
```

### 3. Error Handling
- All SDK helpers return safe fallbacks on error
- `detectLanguage()` defaults to "en"
- `translateText()` returns original text on failure
- `localizeObject()` returns original object on failure

### 4. Performance
- SDK uses intelligent caching
- CLI only translates changed keys (via lockfile)
- Language detection cached per conversation
- Batch translation for multi-language features

---

## Troubleshooting

### "Translations out of date" CI failure

**Cause**: Source locale changed without running CLI

**Fix**:
```bash
npx lingo.dev@latest run
git add client/public/locales/*.json i18n.lock
git commit -m "Update translations"
```

### "API key invalid" error

**Fix**: Check `LINGO_API_KEY` secret in:
1. Local: `.env` file or environment variables
2. GitHub: Repository secrets

### Merge conflicts in locale files

**Fix**:
```bash
# Accept source locale changes
git checkout --theirs client/public/locales/en.json

# Regenerate all translations
npx lingo.dev@latest run --force
```

---

## Resources

- **Lingo.dev Docs**: https://lingo.dev/en
- **SDK Reference**: https://lingo.dev/en/sdk/javascript
- **CLI Reference**: https://lingo.dev/en/cli
- **CI/CD Guide**: https://lingo.dev/en/ci/github
- **Discord Community**: https://discord.gg/lingo-dev

---

## Migration Notes

### From Simple Translation to Lingo.dev

**Before**:
```typescript
const translated = await someTranslationAPI(text, { to: "es" });
```

**After** (Lingo.dev SDK):
```typescript
const translated = await lingoDotDev.localizeText(text, {
  sourceLocale: "en",
  targetLocale: "es",
});
```

### Key Differences
- Context-aware translations (better quality)
- Automatic caching for reliability
- Language detection built-in
- Batch processing support
- Structured data translation
- CI/CD automation ready
