#!/usr/bin/env bash
# Validates the OKF structure of the docs/ directory.

set -e

DOCS_DIR="docs"
EXIT_CODE=0

echo "Running OKF validation on $DOCS_DIR..."

# 1. Check all subdirectories have an index.md
echo "Checking for index.md in all directories..."
find "$DOCS_DIR" -type d | while read dir; do
    if [ ! -f "$dir/index.md" ]; then
        echo "❌ Missing index.md in directory: $dir"
        EXIT_CODE=1
    fi
done

# 2. Check all .md files (except index.md and log.md and TEMPLATE.md) have frontmatter and a 'type' field
echo "Checking frontmatter in concept documents..."
find "$DOCS_DIR" -type f -name "*.md" | grep -v "index.md$" | grep -v "log.md$" | grep -v "TEMPLATE.md$" | while read file; do
    
    # Check if file starts with '---'
    FIRST_LINE=$(head -n 1 "$file")
    if [ "$FIRST_LINE" != "---" ]; then
        echo "❌ Missing YAML frontmatter block (---) at the start of $file"
        EXIT_CODE=1
        continue
    fi
    
    # Extract frontmatter block (everything between the first two '---' lines)
    # Then grep for '^type:'
    # awk '/^---$/ { if(c++==1) exit } c' "$file" gets lines inside the frontmatter
    FRONTMATTER=$(awk '/^---$/ { if(c++==1) exit } c' "$file")
    
    if ! echo "$FRONTMATTER" | grep -q "^type:"; then
        echo "❌ Missing 'type:' field in frontmatter of $file"
        EXIT_CODE=1
    fi
done

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ OKF validation passed."
else
    echo "❌ OKF validation failed."
fi

exit $EXIT_CODE
