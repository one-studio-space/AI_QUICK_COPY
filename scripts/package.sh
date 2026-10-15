#!/usr/bin/env bash
# Build the zip to upload to Microsoft Edge Add-ons / Chrome Web Store.
#
#   ./scripts/package.sh        →  dist/ai-quick-copy-<version>.zip
#
# Only the files the extension needs at runtime go in the zip, with
# manifest.json at the root (the stores reject a zip with a parent folder).
set -euo pipefail

cd "$(dirname "$0")/.."

version=$(sed -n 's/^ *"version": *"\([^"]*\)".*/\1/p' manifest.json)
[ -n "$version" ] || { echo "Could not read version from manifest.json" >&2; exit 1; }

files=(
  manifest.json
  service-worker.js
  core.js settings.js markdown.js block.js content.js
  sites/chatgpt.js sites/gemini.js sites/grok.js sites/claude.js
  options.html options.css options.js
  icons/icon16.png icons/icon32.png icons/icon48.png icons/icon128.png
  LICENSE
)

for f in "${files[@]}"; do
  [ -f "$f" ] || { echo "Missing file: $f" >&2; exit 1; }
done

# Every file the manifest points to must be in the package.
for ref in $(grep -oE '"[^"]+\.(js|html|png)"' manifest.json | tr -d '"' | sort -u); do
  printf '%s\n' "${files[@]}" | grep -qx "$ref" || { echo "manifest.json references $ref but it is not packaged" >&2; exit 1; }
done

mkdir -p dist
out="dist/ai-quick-copy-$version.zip"
rm -f "$out"
zip -q -X "$out" "${files[@]}"

echo "Built $out"
unzip -l "$out"
