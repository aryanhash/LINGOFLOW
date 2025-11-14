# 🚀 Lingo.dev CI/CD Setup Guide

This guide will help you set up automatic translation updates using Lingo.dev's CI/CD integration.

## ✅ Quick Setup (5 minutes)

### Step 1: Get Your Lingo.dev API Key

1. Go to https://lingo.dev
2. Sign up or log in
3. Navigate to **Dashboard** → **API Keys**
4. Click **"Create API Key"**
5. Copy the API key (starts with `api_` or `lingo_`)

### Step 2: Add GitHub Secret

1. Go to your GitHub repository: `https://github.com/aryanhash/LINGOFLOW`
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Name: `LINGODOTDEV_API_KEY`
5. Value: Paste your Lingo.dev API key
6. Click **"Add secret"**

### Step 3: Enable Workflow Permissions

1. In GitHub repository, go to **Settings** → **Actions** → **General**
2. Scroll to **"Workflow permissions"**
3. Enable: ✅ **"Read and write permissions"**
4. Enable: ✅ **"Allow GitHub Actions to create and approve pull requests"**
5. Click **"Save"**

### Step 4: Test the Workflow

1. Make a small change to `client/public/locales/en.json`:
   ```json
   {
     "test": "This is a test"
   }
   ```

2. Commit and push to `main` branch:
   ```bash
   git add client/public/locales/en.json
   git commit -m "test: add test translation"
   git push origin main
   ```

3. Check GitHub Actions:
   - Go to **Actions** tab in your repository
   - You should see "Lingo.dev Translation CI/CD" workflow running
   - It will create a Pull Request with all translations updated

4. Review and merge the PR:
   - The PR will contain updated translation files for all target languages
   - Review the changes
   - Merge the PR to apply translations

## 📋 How It Works

### Automatic Translation Flow

```
1. You edit client/public/locales/en.json
2. Commit and push to main branch
3. GitHub Actions triggers automatically
4. Lingo.dev translates to all target languages:
   - es (Spanish)
   - fr (French)
   - de (German)
   - hi (Hindi)
   - zh (Chinese)
   - ja (Japanese)
   - ar (Arabic)
   - pt (Portuguese)
   - ru (Russian)
   - ko (Korean)
5. Creates Pull Request with translations
6. You review and merge
7. All languages are now synchronized! ✅
```

### Manual Trigger

You can also manually trigger translations:

1. Go to **Actions** tab
2. Select **"Lingo.dev Translation CI/CD"** workflow
3. Click **"Run workflow"** button
4. Select branch (usually `main`)
5. Click **"Run workflow"**

## 🔧 Configuration

### Current Configuration (`i18n.json`)

```json
{
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
      "include": [
        "client/public/locales/[locale].json"
      ],
      "exclude": []
    }
  }
}
```

### Adding More Languages

To add more languages, edit `i18n.json`:

```json
{
  "locale": {
    "source": "en",
    "targets": [
      "es", "fr", "de", "hi", "zh",
      "ja", "ar", "pt", "ru", "ko",
      "it", "nl", "pl", "tr", "vi"  // Add more here
    ]
  }
}
```

Then run:
```bash
npx lingo.dev@latest i18n
```

## 🐛 Troubleshooting

### Issue: Workflow not running

**Solution:**
- Check that `LINGODOTDEV_API_KEY` secret is set correctly
- Verify workflow file exists at `.github/workflows/i18n.yml`
- Check Actions tab for error messages

### Issue: "Permission denied" error

**Solution:**
- Go to Settings → Actions → General
- Enable "Read and write permissions"
- Enable "Allow GitHub Actions to create and approve pull requests"

### Issue: Translations not updating

**Solution:**
- Verify API key is valid at https://lingo.dev
- Check that `en.json` file was actually changed
- Look at workflow logs in Actions tab

### Issue: PR not being created / "Requires authentication" error (401)

**Error Message:**
```
RequestError [HttpError]: Requires authentication - https://docs.github.com/rest
status: 401
```

**Solution:**
1. **Verify workflow permissions:**
   - Go to Settings → Actions → General
   - Enable "Read and write permissions"
   - Enable "Allow GitHub Actions to create and approve pull requests"
   - Click "Save"

2. **Check workflow file:**
   - Ensure the workflow includes `github-token: ${{ secrets.GITHUB_TOKEN }}` in the Lingo.dev action
   - The workflow should have `permissions: contents: write` and `pull-requests: write`

3. **If still failing:**
   - The workflow file should already have the fix (check `.github/workflows/i18n.yml`)
   - Re-run the workflow from the Actions tab
   - The `GITHUB_TOKEN` is automatically provided by GitHub Actions, no need to create it manually

## 📝 Workflow File Location

The workflow is located at:
```
.github/workflows/i18n.yml
```

## 🎯 Benefits

✅ **Automatic**: Translations update automatically when you change English text  
✅ **Fast**: Translations complete in 30-60 seconds  
✅ **Safe**: Creates PR for review before merging  
✅ **Consistent**: All languages stay synchronized  
✅ **No Manual Work**: No need to manually translate or update files  

## 📚 Additional Resources

- Lingo.dev Documentation: https://docs.lingo.dev
- GitHub Actions Docs: https://docs.github.com/en/actions
- Lingo.dev Dashboard: https://lingo.dev/dashboard

---

**Need Help?** Check the workflow logs in the Actions tab or visit https://lingo.dev/support


