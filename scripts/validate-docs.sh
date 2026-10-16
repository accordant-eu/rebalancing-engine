#!/usr/bin/env bash
# Validates the OKF structure of the docs/ directory.

set -e

DOCS_DIR="docs"
EXIT_CODE=0

echo "Running OKF validation on $DOCS_DIR..."

# 1. Check all subdirectories have an index.md
echo "Checking for index.md in all directories..."
while read -r dir; do
    if [ ! -f "$dir/index.md" ]; then
        echo "❌ Missing index.md in directory: $dir"
        EXIT_CODE=1
    fi
done < <(find "$DOCS_DIR" -type d)

# 2. Check all .md files (except index.md and log.md and TEMPLATE.md) have frontmatter and a 'type' field
echo "Checking frontmatter in concept documents..."
while read -r file; do
    # Check if file starts with '---'
    FIRST_LINE=$(head -n 1 "$file")
    if [ "$FIRST_LINE" != "---" ]; then
        echo "❌ Missing YAML frontmatter block (---) at the start of $file"
        EXIT_CODE=1
        continue
    fi
    
    # Extract frontmatter block (everything between the first two '---' lines)
    # Then grep for '^type:'
    FRONTMATTER=$(awk '/^---$/ { if(c++==1) exit } c' "$file")
    
    if ! echo "$FRONTMATTER" | grep -q "^type:"; then
        echo "❌ Missing 'type:' field in frontmatter of $file"
        EXIT_CODE=1
    fi
    if ! echo "$FRONTMATTER" | grep -q "^title:"; then
        echo "❌ Missing 'title:' field in frontmatter of $file"
        EXIT_CODE=1
    fi
    if ! echo "$FRONTMATTER" | grep -q "^description:"; then
        echo "❌ Missing 'description:' field in frontmatter of $file"
        EXIT_CODE=1
    fi
    if ! echo "$FRONTMATTER" | grep -q "^timestamp:"; then
        echo "❌ Missing 'timestamp:' field in frontmatter of $file"
        EXIT_CODE=1
    fi
done < <(find "$DOCS_DIR" -type f -name "*.md" | grep -v "index.md$" | grep -v "log.md$" | grep -v "TEMPLATE.md$")

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ OKF validation passed."
else
    echo "❌ OKF validation failed."
fi

exit $EXIT_CODE
