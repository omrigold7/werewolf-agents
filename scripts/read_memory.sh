#!/usr/bin/env bash
# read_memory.sh <name>
# Reads memory/<name>.json to stdout.
# Cold-starts the file (and memory/ dir) if missing.
# Exit 0 on success, 1 on invalid name.

set -euo pipefail

VALID_NAMES=("alice" "bob" "carol" "dave" "eve" "frank" "grace" "henry" "iris" "jack")
MEMORY_DIR="$(dirname "$0")/../memory"

usage() {
  echo "Usage: $0 <player_name>" >&2
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

FILE="$MEMORY_DIR/${NAME}.json"

# Cold start: create memory/ dir if missing
mkdir -p "$MEMORY_DIR"

# Cold start: create player file if missing
if [[ ! -f "$FILE" ]]; then
  cat > "$FILE" <<EOF
{
  "player": "${NAME}",
  "version": 1,
  "strategy_log": [],
  "opponent_profiles": {}
}
EOF
fi

cat "$FILE"
