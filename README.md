# 🐺 Werewolf — Claude Code Multi-Agent Game

A fully autonomous Werewolf game where every player is a real Claude Code sub-agent,
orchestrated by a Game Master agent using the native `Task` tool.

Built for: **DP-662 — AI Tooling: Build a Mini Game in a Multi-Agent / Swarm Setup**

## Run

Start Claude Code from the repo root — tool permissions are pre-configured in `.claude/settings.json`:

```bash
claude
```

Then start a new game with the `/werewolf` slash command:

```
/werewolf
```

This launches the Game Master agent, automatically starts the Observer UI in the background, and opens it in your browser at `http://localhost:5173` so you can watch the game unfold in real time. New games are started exclusively via `/werewolf` — the UI is read-only.

## File Structure

```
werewolf-agents/
├── game_master.md        ← GM orchestrator system prompt
├── game_state.json       ← auto-created at runtime, persists between phases
├── game_log.jsonl        ← append-only event log consumed by the UI
├── README.md
├── .claude/
│   └── commands/
│       ├── werewolf.md      ← /werewolf slash command definition
│       └── wipe-memory.md   ← /wipe-memory slash command definition
├── prompts/
│   ├── werewolf.md       ← wolf sub-agent system prompt
│   ├── seer.md           ← seer sub-agent system prompt
│   ├── doctor.md         ← doctor sub-agent system prompt
│   ├── villager.md       ← villager sub-agent system prompt
│   └── reflection.md     ← end-of-round memory consolidation prompt
├── scripts/
│   ├── read_memory.sh    ← reads a player's memory file
│   └── write_memory.sh   ← writes a player's memory file
├── memory/               ← auto-created at runtime, one JSON file per player
└── ui/
    ├── server/           ← Express SSE server (serves state + event stream)
    └── src/              ← React + Tailwind observer UI
```

## Players & Roles

| Count | Role       | Night Ability                        |
|-------|------------|--------------------------------------|
| 2     | 🐺 Werewolf | Picks one villager to eliminate      |
| 1     | 🔮 Seer     | Learns one player's true role        |
| 1     | 💊 Doctor   | Protects one player from elimination |
| 3     | 🧑 Villager | No night action — reason and vote    |

## How It Works

The GM is a Claude Code agent with `Task`, `Read`, `Write`, and `Bash` tools.
Each round it:
1. Reads `game_state.json`
2. Spawns role-specific sub-agents via `Task` for night actions
3. Spawns all alive players as sub-agents for day discussion + voting
4. Resolves outcomes, writes updated state back to disk
5. Checks win condition and loops

Each sub-agent only receives the information its role is allowed to know —
information isolation is enforced in the GM's task construction.

## Persistent Memory

Each player maintains a memory file at `memory/<name>.json` that persists across rounds. After each phase, the GM triggers a reflection step where agents consolidate what they observed, who they suspect, and what alliances they're tracking. Memory is read at the start of each turn and written back after it ends.

To reset all player memory between games:

```
/wipe-memory
```

## Win Conditions

- **Village wins:** all werewolves eliminated
- **Wolves win:** werewolves ≥ remaining villagers