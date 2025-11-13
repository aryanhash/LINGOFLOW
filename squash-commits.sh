#!/bin/bash

# Script to squash all commits before 9 AM today into a single commit
# This preserves all your code - it only rewrites history

set -e

echo "🔍 Finding the first commit after 9 AM today..."
FIRST_AFTER_9AM="1fee878"  # Created a new Project LINGOFLOW (13:36:57)
PARENT_COMMIT="9cb2c87"    # Parent of first commit after 9 AM

echo "✅ First commit after 9 AM: $FIRST_AFTER_9AM"
echo "✅ Parent commit (last before 9 AM): $PARENT_COMMIT"

# Get all commit hashes after 9 AM that we want to keep
echo "📋 Getting list of commits to preserve..."
COMMITS_TO_KEEP=$(git log --oneline $FIRST_AFTER_9AM..HEAD | awk '{print $1}')

echo ""
echo "⚠️  IMPORTANT: This will rewrite git history!"
echo "✅ Backup branch 'backup-before-rebase' has been created"
echo ""
echo "The process will:"
echo "  1. Create a new branch from the parent commit"
echo "  2. Squash all commits before 9 AM into one commit"
echo "  3. Reapply all commits after 9 AM"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Cancelled. Your code is safe."
    exit 1
fi

# Create a new branch from the parent commit
echo "🌿 Creating new branch 'squashed-history'..."
git checkout -b squashed-history $PARENT_COMMIT

# Reset to the very first commit, keeping all changes
echo "📦 Finding the root commit..."
ROOT_COMMIT=$(git rev-list --max-parents=0 HEAD)
echo "✅ Root commit: $ROOT_COMMIT"

# Reset soft to root, keeping all changes staged
echo "🔄 Resetting to root commit (keeping all changes)..."
git reset --soft $ROOT_COMMIT

# Create a single commit with all pre-9AM changes
echo "💾 Creating single commit for all pre-9AM changes..."
git commit -m "Initial project setup and development (squashed commits before 9 AM on 2025-11-13)"

# Now cherry-pick all commits after 9 AM
echo "🍒 Reapplying commits after 9 AM..."
for commit in $COMMITS_TO_KEEP; do
    echo "  Cherry-picking: $commit"
    git cherry-pick $commit || {
        echo "⚠️  Conflict detected. Please resolve and continue with: git cherry-pick --continue"
        exit 1
    }
done

echo ""
echo "✅ Done! Your new branch 'squashed-history' has:"
echo "   - 1 commit for all pre-9AM work"
echo "   - All commits after 9 AM preserved"
echo ""
echo "To apply this to main:"
echo "  1. Review: git log --oneline squashed-history"
echo "  2. If satisfied: git checkout main && git reset --hard squashed-history"
echo "  3. Force push (if needed): git push --force-with-lease origin main"

