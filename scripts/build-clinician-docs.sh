#!/bin/sh
# Rebuilds the PDFs the app offers to healthcare professionals (public/soignants/) from their HTML sources in docs/.
# Needs Google Chrome and `npm install` (the Public Sans font is read from node_modules). Run from the repo root.
set -e
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
OUT="$PWD/public/soignants"
mkdir -p "$OUT"
pdf() { "$CHROME" --headless=new --no-pdf-header-footer --allow-file-access-from-files --virtual-time-budget=6000 --print-to-pdf="$OUT/$2" "$PWD/docs/$1" >/dev/null 2>&1; echo "$2"; }
pdf lire-un-rapport/index.html lire-un-rapport.fr.pdf
pdf lire-un-rapport/index.en.html lire-un-rapport.en.pdf
pdf plaquette-soignants/index.html plaquette.fr.pdf
pdf plaquette-soignants/index.en.html plaquette.en.pdf
pdf note-methodologique/index.html note-methodologique.fr.pdf
pdf note-methodologique/index.en.html note-methodologique.en.pdf
