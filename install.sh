#!/bin/sh
# Installs the latest MeroAlpha Agent release into /Applications without the Gatekeeper prompt:
#   curl -fsSL https://meroalpha.com/install.sh | sh
#   curl -fsSL https://meroalpha.com/install.sh | sh -s -- path/to/MeroAlpha-Agent-macos-arm64.zip   installs a local build instead
# Gatekeeper only checks files carrying com.apple.quarantine, which browsers set and curl does not.
set -eu
[ "$(uname -s)" = Darwin ] && [ "$(uname -m)" = arm64 ] || { echo 'MeroAlpha Agent needs macOS on Apple silicon.' >&2; exit 1; }
# The public repo that hosts the app releases.
REPO=wheregmis/meroalpha
ZIP=MeroAlpha-Agent-macos-arm64.zip
APP="MeroAlpha Agent.app"
DEST=${INSTALL_DIR:-/Applications}
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

if [ -n "${1:-}" ]; then
  cp "$1" "$TMP/$ZIP"
  if [ -f "$1.sha256" ]; then cp "$1.sha256" "$TMP/$ZIP.sha256"; else (cd "$TMP" && shasum -a 256 "$ZIP" > "$ZIP.sha256"); fi
else
  for f in "$ZIP" "$ZIP.sha256"; do
    curl -fsSL -o "$TMP/$f" "https://github.com/$REPO/releases/latest/download/$f"
  done
fi
(cd "$TMP" && shasum -a 256 -c "$ZIP.sha256" >/dev/null) || { echo 'Download failed its checksum; nothing was installed.' >&2; exit 1; }

ditto -x -k "$TMP/$ZIP" "$TMP/out"
[ -d "$TMP/out/$APP" ] || { echo "The download has no $APP." >&2; exit 1; }
xattr -dr com.apple.quarantine "$TMP/out/$APP" 2>/dev/null || true
codesign --force --deep -s - "$TMP/out/$APP"

osascript -e 'quit app "MeroAlpha Agent"' 2>/dev/null || true
# Copy beside the installed app first, so a failed copy leaves the old install working.
NEW="$DEST/.$APP.new" OLD="$DEST/.$APP.old"
rm -rf "$NEW" "$OLD"
ditto "$TMP/out/$APP" "$NEW"
[ ! -e "$DEST/$APP" ] || mv "$DEST/$APP" "$OLD"
mv "$NEW" "$DEST/$APP" || { [ ! -e "$OLD" ] || mv "$OLD" "$DEST/$APP"; echo 'Install failed; the previous app was kept.' >&2; exit 1; }
rm -rf "$OLD"
echo "Installed $DEST/$APP"
[ -n "${INSTALL_DIR:-}" ] || open "$DEST/$APP"
