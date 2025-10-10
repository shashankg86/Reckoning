#!/bin/bash
# Script to open the development plan

HTML_FILE="$(pwd)/UNIVERSAL_POS_DEVELOPMENT_PLAN.html"

echo "📄 Opening development plan..."
echo "File: $HTML_FILE"
echo ""

# Detect OS and open appropriately
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open "$HTML_FILE"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    xdg-open "$HTML_FILE" 2>/dev/null || sensible-browser "$HTML_FILE" 2>/dev/null || firefox "$HTML_FILE"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows
    start "$HTML_FILE"
else
    echo "Please open this file in your browser:"
    echo "$HTML_FILE"
fi
