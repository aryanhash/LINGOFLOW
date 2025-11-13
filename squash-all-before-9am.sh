#!/bin/bash

# Script to squash ALL commits before 9 AM today into a single commit
# Preserves all commits after 9 AM (starting from 1fee878)

set -e

echo "🔍 Finding commits..."
FIRST_AFTER_9AM="1fee878"  # First commit after 9 AM: "Created a new Project LINGOFLOW" (13:36:57)
PARENT_OF_FIRST="9cb2c87"   # Parent of first commit after 9 AM

echo "✅ First commit to KEEP (after 9 AM): $FIRST_AFTER_9AM"
echo "✅ Last commit to SQUASH (before 9 AM): $PARENT_OF_FIRST"

# Get the root commit
ROOT_COMMIT=$(git rev-list --max-parents=0 HEAD)
echo "✅ Root commit: $ROOT_COMMIT"

# Count commits to squash
COMMITS_TO_SQUASH=$(git rev-list --count $ROOT_COMMIT..$PARENT_OF_FIRST)
echo "📊 Commits to squash: $COMMITS_TO_SQUASH"

echo ""
echo "⚠️  This will:"
echo "  1. Create a new branch 'squashed-main'"
echo "  2. Squash $COMMITS_TO_SQUASH commits into 1 commit"
echo "  3. Keep all commits after 9 AM (starting from $FIRST_AFTER_9AM)"
echo ""
echo "✅ Backup branch 'backup-before-rebase' already exists"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Cancelled. Your code is safe."
    exit 1
fi

# Create new branch from the parent of first post-9AM commit
echo "🌿 Creating branch from parent commit..."
git checkout -b squashed-main $PARENT_OF_FIRST

# Reset soft to root, keeping all changes
echo "📦 Resetting to root commit (keeping all changes)..."
git reset --soft $ROOT_COMMIT

# Show what will be committed
echo "📋 Changes to be squashed:"
git status --short | head -20
echo "... (and more)"

# Create single commit for all pre-9AM work
echo ""
echo "💾 Creating single commit for all pre-9AM work..."
git commit -m "Initial project development and features (squashed commits before 9 AM on 2025-11-13)

- Added multilingual translation support
- Implemented video transcription and dubbing
- Integrated Gemini AI for interview preparation
- Added chat functionality with language support
- Implemented video/audio download features
- Added comprehensive project features and improvements"

# Now cherry-pick all commits after 9 AM in order
echo ""
echo "🍒 Reapplying commits after 9 AM..."
# Get commits from the original branch (main) in reverse order (oldest first)
ORIGINAL_BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || echo "main")
git checkout main 2>/dev/null || true
COMMITS_AFTER_9AM=$(git log --oneline --reverse $FIRST_AFTER_9AM..HEAD | awk '{print $1}')
git checkout squashed-main

for commit in $COMMITS_AFTER_9AM; do
    echo "  Cherry-picking: $(git log --oneline -1 $commit)"
    if ! git cherry-pick $commit; then
        echo ""
        echo "⚠️  Conflict detected during cherry-pick!"
        echo "Please resolve conflicts and run: git cherry-pick --continue"
        echo "Or abort with: git cherry-pick --abort"
        exit 1
    fi
done

echo ""
echo "✅ Done! Your new branch 'squashed-main' has:"
echo "   - 1 commit for all pre-9AM work"
echo "   - All commits after 9 AM preserved in order"
echo ""
echo "📋 Review the new history:"
echo "   git log --oneline squashed-main | head -20"
echo ""
echo "To apply this to main:"
echo "   1. Review: git log --oneline squashed-main"
echo "   2. If satisfied: git checkout main && git reset --hard squashed-main"
echo "   3. Force push (if needed): git push --force-with-lease origin main"

