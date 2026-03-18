#!/usr/bin/env bash
# write_memory.sh <name>
# Reads updated memory JSON from stdin and atomically writes to memory/<name>.json.
# Exit 0 on success, 1 on invalid name or bad JSON.

set -euo pipefail

VALID_NAMES=("alice" "bob" "carol" "dave" "eve" "frank" "grace" "henry" "iris" "jack")
MEMORY_DIR="$(dirname "$0")/../memory"

usage() {
  echo "Usage: echo '<json>' | $0 <player_name>" >&2
  exit 1
}

[[ $# -eq 1 ]] || usage

NAME="$1"

# Validate name against allowlist
valid=0
for n in "${VALID_NAMES[@]}"; do
  [[ "$NAME" == "$n" ]] && valid=1 && break
done

if [[ $valid -eq 0 ]]; then
  echo "Error: invalid player name '$NAME'" >&2
  exit 1
fi

# Read JSON from stdin
JSON=$(cat)

# Validate JSON using python3 (available on macOS and most Linux)
if ! echo "$JSON" | python3 -c "import sys, json; json.load(sys.stdin)" 2>/dev/null; then
  echo "Error: invalid JSON received on stdin" >&2
  exit 1
fi

mkdir -p "$MEMORY_DIR"

TMP_FILE="$MEMORY_DIR/${NAME}.json.tmp"
FINAL_FILE="$MEMORY_DIR/${NAME}.json"

# Write to temp file first, then atomically rename
echo "$JSON" > "$TMP_FILE"
mv "$TMP_FILE" "$FINAL_FILE"
