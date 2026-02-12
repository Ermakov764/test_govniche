#!/bin/bash

# Script to generate PNG images from PlantUML files using online API

UMLLIB="http://www.plantuml.com/plantuml"
PNGAPI="${UMLLIB}/png"

echo "🖼️  Generating PNG images from PlantUML files..."

cd "$(dirname "$0")"

for puml_file in *.puml; do
    if [ -f "$puml_file" ]; then
        png_file="${puml_file%.puml}.png"
        echo "Processing: $puml_file -> $png_file"
        
        # Encode PlantUML content - PlantUML uses custom base64 alphabet and raw DEFLATE
        encoded=$(cat "$puml_file" | python3 -c "
import sys
import zlib
import base64

data = sys.stdin.read().encode('utf-8')
# Zlib compress
zlibbed = zlib.compress(data, 9)
# Strip zlib header (2 bytes) and checksum (4 bytes) = raw DEFLATE
raw_deflate = zlibbed[2:-4]
# Standard base64 encode
b64_encoded = base64.b64encode(raw_deflate).decode('ascii')
# PlantUML uses custom alphabet: 0-9A-Za-z-_ instead of A-Za-z0-9+/
plantuml_alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_'
base64_alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
trans = str.maketrans(base64_alphabet, plantuml_alphabet)
encoded = b64_encoded.translate(trans)
print(encoded)
" 2>/dev/null)
        
        if [ $? -eq 0 ] && [ -n "$encoded" ]; then
            # Download PNG from PlantUML server
            url="${PNGAPI}/${encoded}"
            if wget -q -O "$png_file" "$url" 2>/dev/null; then
                # Check if downloaded file is actually a PNG
                if file "$png_file" | grep -q "PNG\|image"; then
                    echo "✅ Generated: $png_file"
                else
                    echo "❌ Failed to generate valid PNG for $puml_file"
                    rm -f "$png_file"
                fi
            else
                echo "❌ Failed to download PNG for $puml_file"
            fi
        else
            echo "❌ Failed to encode $puml_file"
        fi
    fi
done

echo ""
echo "✨ Done! PNG images generated in current directory."
