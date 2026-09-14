#!/bin/bash
# Build minified dist/ from src/. Source of truth stays in src/.
set -e
cd "$(dirname "$0")"

terser src/app.js -c -m -o dist/app.js
cleancss -o dist/styles.css src/styles.css
html-minifier-terser --collapse-whitespace --remove-comments --minify-css true --minify-js true -o dist/index.html src/index.html

# Copy static assets (favicons, images, SEO files) that minifiers skip
for asset in src/*.png src/*.ico src/*.svg src/*.webmanifest src/*.txt src/*.xml; do
  [ -e "$asset" ] && cp "$asset" dist/
done

echo "--- sizes (src vs dist) ---"
for f in app.js styles.css index.html; do
  s=$(stat -c%s "src/$f"); d=$(stat -c%s "dist/$f")
  p=$(python3 -c "print(round($d*100/$s))")
  echo "$f: $s -> $d bytes (${p}%)"
done
node --check dist/app.js && echo DIST_JS_OK
