# 🚀 How to Run the CLI-Based Translation Workflow

The CLI-based workflow is now **active** and ready to use!

## ✅ Current Status

- ✅ **CLI Workflow**: `.github/workflows/i18n-cli.yml` - **ACTIVE**
- ⏸️ **Main Workflow**: `.github/workflows/i18n.yml.disabled` - **DISABLED**

## 🎯 How It Works

The CLI workflow will automatically run when:
1. You push changes to `main` branch that modify:
   - `client/public/locales/en.json`
   - `i18n.json`

2. OR you manually trigger it from GitHub Actions

## 📋 Ways to Trigger the Workflow

### Method 1: Automatic Trigger (Recommended)

1. **Make a change to `en.json`:**
   ```bash
   # Edit client/public/locales/en.json
   # Add or modify any translation key
   ```

2. **Commit and push:**
   ```bash
   git add client/public/locales/en.json
   git commit -m "feat: add new translation"
   git push origin main
   ```

3. **Workflow runs automatically:**
   - Go to: `https://github.com/aryanhash/LINGOFLOW/actions`
   - You'll see "Lingo.dev Translation CI/CD (CLI Alternative)" running
   - It will create a Pull Request with all translations

### Method 2: Manual Trigger

1. **Go to GitHub Actions:**
   - Navigate to: `https://github.com/aryanhash/LINGOFLOW/actions`

2. **Select the workflow:**
   - Click on **"Lingo.dev Translation CI/CD (CLI Alternative)"** in the left sidebar

3. **Run workflow:**
   - Click the **"Run workflow"** button (top right)
   - Select branch: `main`
   - Click **"Run workflow"**

4. **Monitor progress:**
   - Click on the running workflow to see logs
   - Wait for it to complete (usually 30-60 seconds)

## 🔍 What Happens When It Runs

1. ✅ Checks out your code
2. ✅ Sets up Node.js 20
3. ✅ Runs `npx lingo.dev@latest ci --pull-request`
4. ✅ Translates all target languages (es, fr, de, hi, zh, ja, ar, pt, ru, ko)
5. ✅ Creates a Pull Request with all translations
6. ✅ PR title: "feat: update translations via @LingoDotDev"

## 📝 Review and Merge the PR

1. **Check the PR:**
   - Go to: `https://github.com/aryanhash/LINGOFLOW/pulls`
   - Find the PR created by the workflow

2. **Review changes:**
   - Check that all language files were updated
   - Verify translations look correct

3. **Merge the PR:**
   - Click **"Merge pull request"**
   - All translations are now in your main branch! ✅

## 🧪 Test It Now

Want to test it right away? Run this:

```bash
# Make a small test change
echo '  "test": {
    "newKey": "Testing CLI workflow"
  }' >> client/public/locales/en.json

# Commit and push
git add client/public/locales/en.json
git commit -m "test: trigger CLI translation workflow"
git push origin main
```

Then check: `https://github.com/aryanhash/LINGOFLOW/actions`

## 🔄 Switch Back to Main Workflow (If Needed)

If you want to use the GitHub Action workflow instead:

```bash
# Re-enable main workflow
mv .github/workflows/i18n.yml.disabled .github/workflows/i18n.yml

# Disable CLI workflow (optional)
mv .github/workflows/i18n-cli.yml .github/workflows/i18n-cli.yml.disabled

# Commit changes
git add .github/workflows/
git commit -m "chore: switch back to main workflow"
git push origin main
```

## ⚙️ Prerequisites

Make sure you have:
- ✅ `LINGODOTDEV_API_KEY` secret set in GitHub (Settings → Secrets → Actions)
- ✅ Workflow permissions enabled (Settings → Actions → General → "Read and write permissions" + "Allow GitHub Actions to create and approve pull requests")

## 🐛 Troubleshooting

### Workflow not running?
- Check that `en.json` was actually changed
- Verify the file path matches: `client/public/locales/en.json`
- Check Actions tab for any errors

### PR not being created?
- Verify `LINGODOTDEV_API_KEY` secret is set correctly
- Check workflow permissions are enabled
- Look at workflow logs for error messages

### Need help?
- Check workflow logs in Actions tab
- Visit: https://lingo.dev/support

---

**The CLI workflow is now active and ready to use!** 🎉

