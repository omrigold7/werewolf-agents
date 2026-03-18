Start the Werewolf game.

## Step 1 — Launch the Observer UI (do this first, before anything else)

Use Bash to start the UI dev server in the background if it isn't already running,
then open the browser so the user can watch the game live:

```bash
# Start server + Vite in background (safe to run even if already running — the port bind will just fail silently)
cd /path/to/repo/ui && npm run dev > /tmp/werewolf-ui.log 2>&1 &
# Give it 2 seconds to start, then open the browser
sleep 2 && open http://localhost:5173
```

Replace `/path/to/repo` with the actual absolute path of the repo (use `pwd` to find it).
If the server is already running (port 3001 / 5173 in use) skip the npm step and just open the browser.

## Step 2 — Reset state for a fresh game

Delete any leftover state from the previous game:

```bash
rm -f game_state.json game_log.jsonl
```

## Step 3 — Run the game

Read `game_master.md` for full instructions, then initialize `game_state.json` from scratch
and run the game loop until a win condition is met.

Remember to write log entries to `game_log.jsonl` throughout the game — especially the
`game_end` entry when a winner is determined (see the Logging section in game_master.md).
