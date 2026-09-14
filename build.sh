#!/bin/bash
# Build minified dist/ from src/. Source of truth stays in src/.
set -e
cd /opt/data/scripts/2fa-web
export PATH=$PATH:/home/hermes/.hermes/home/.npm-global/bin

terser src/app.js -c -m -o dist/app.js
cleancss -o dist/styles.css src/styles.css
html-minifier-terser --collapse-whitespace --remove-comments --minify-css true --minify-js true -o dist/index.html src/index.html

echo "--- sizes (src vs dist) ---"
for f in app.js styles.css index.html; do
  s=$(stat -c%s "src/$f"); d=$(stat -c%s "dist/$f")
  p=$(python3 -c "print(round($d*100/$s))")
  echo "$f: $s -> $d bytes (${p}%)"
done
node --check dist/app.js && echo DIST_JS_OK
