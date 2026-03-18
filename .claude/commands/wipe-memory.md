Wipe all player memory files to reset agents to a clean state.

## What this does

Deletes all JSON files in `memory/` — one per player (alice through jack).
The next game run will cold-start and rebuild memory from scratch.

**This cannot be undone.**

## Steps

1. Check if `memory/` directory exists and list files to be deleted
2. Ask for confirmation:
   ```
   This will clear memory for all players. This cannot be undone. Proceed? (y/n)
   ```
3. If confirmed (`y`):
   - Delete all `.json` files in `memory/`
   - Report each file cleared
   - Confirm: "Memory wiped. Next game will start fresh."
4. If cancelled (`n`):
   - Abort with no changes: "Wipe cancelled. No files were deleted."

## Implementation

```bash
# List files to wipe
ls memory/*.json 2>/dev/null || echo "No memory files found."

# After confirmation, delete them
rm -f memory/*.json

# Report cleared files
echo "Cleared: alice.json bob.json carol.json dave.json eve.json frank.json grace.json henry.json iris.json jack.json"
```

Only files in `memory/` are affected. No other game files are modified.
