#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ICON_SRC="$ROOT/src/assets/iconset"
TAURI_ICONS="$ROOT/src-tauri/icons"
PUBLIC_ICON="$ROOT/public/dbvolio-icon.png"

if [[ ! -d "$ICON_SRC" ]]; then
  echo "Missing icon source: $ICON_SRC" >&2
  exit 1
fi

mkdir -p "$TAURI_ICONS" "$ROOT/public"

# Some exporters label WebP as .png; iconutil requires real PNG.
for file in "$ICON_SRC"/*.png; do
  if file "$file" | grep -q "Web/P image"; then
    echo "Converting WebP to PNG: $(basename "$file")"
    tmp="${file%.png}.converted.png"
    sips -s format png "$file" --out "$tmp" >/dev/null
    mv "$tmp" "$file"
  fi
done

TMP_ICONSET="$(mktemp -d)/AppIcon.iconset"
mkdir -p "$TMP_ICONSET"

copy_icon() {
  local src_name="$1"
  local dest_name="$2"
  cp "$ICON_SRC/$src_name" "$TMP_ICONSET/$dest_name"
}

copy_icon "16-mac.png" "icon_16x16.png"
copy_icon "32-mac.png" "icon_16x16@2x.png"
copy_icon "32-mac.png" "icon_32x32.png"
copy_icon "64-mac.png" "icon_32x32@2x.png"
copy_icon "128-mac.png" "icon_128x128.png"
copy_icon "256-mac.png" "icon_128x128@2x.png"
copy_icon "256-mac.png" "icon_256x256.png"
copy_icon "512-mac.png" "icon_256x256@2x.png"
copy_icon "512-mac.png" "icon_512x512.png"
copy_icon "1024-mac.png" "icon_512x512@2x.png"

cat > "$TMP_ICONSET/Contents.json" <<'EOF'
{
  "images": [
    {"size":"16x16","idiom":"mac","filename":"icon_16x16.png","scale":"1x"},
    {"size":"16x16","idiom":"mac","filename":"icon_16x16@2x.png","scale":"2x"},
    {"size":"32x32","idiom":"mac","filename":"icon_32x32.png","scale":"1x"},
    {"size":"32x32","idiom":"mac","filename":"icon_32x32@2x.png","scale":"2x"},
    {"size":"128x128","idiom":"mac","filename":"icon_128x128.png","scale":"1x"},
    {"size":"128x128","idiom":"mac","filename":"icon_128x128@2x.png","scale":"2x"},
    {"size":"256x256","idiom":"mac","filename":"icon_256x256.png","scale":"1x"},
    {"size":"256x256","idiom":"mac","filename":"icon_256x256@2x.png","scale":"2x"},
    {"size":"512x512","idiom":"mac","filename":"icon_512x512.png","scale":"1x"},
    {"size":"512x512","idiom":"mac","filename":"icon_512x512@2x.png","scale":"2x"}
  ],
  "info": {"version": 1, "author": "xcode"}
}
EOF

iconutil -c icns "$TMP_ICONSET" -o "$TAURI_ICONS/icon.icns"

cp "$ICON_SRC/32-mac.png" "$TAURI_ICONS/32x32.png"
cp "$ICON_SRC/128-mac.png" "$TAURI_ICONS/128x128.png"
cp "$ICON_SRC/256-mac.png" "$TAURI_ICONS/128x128@2x.png"
cp "$ICON_SRC/512-mac.png" "$TAURI_ICONS/icon.png"

# Windows / mobile / store assets from the master size.
npm run tauri -- icon "$ICON_SRC/1024-mac.png" >/dev/null

# Keep macOS assets from the iconset (tauri icon would replace them).
iconutil -c icns "$TMP_ICONSET" -o "$TAURI_ICONS/icon.icns"
cp "$ICON_SRC/32-mac.png" "$TAURI_ICONS/32x32.png"
cp "$ICON_SRC/128-mac.png" "$TAURI_ICONS/128x128.png"
cp "$ICON_SRC/256-mac.png" "$TAURI_ICONS/128x128@2x.png"
cp "$ICON_SRC/512-mac.png" "$TAURI_ICONS/icon.png"

cp "$ICON_SRC/128-mac.png" "$PUBLIC_ICON"

echo "Synced icons from src/assets/iconset -> src-tauri/icons and public/dbvolio-icon.png"
