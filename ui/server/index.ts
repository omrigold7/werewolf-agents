import express, { type Request, type Response } from 'express'
import cors from 'cors'
import chokidar from 'chokidar'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '../../')
const STATE_FILE = path.join(ROOT_DIR, 'game_state.json')
const LOG_FILE = path.join(ROOT_DIR, 'game_log.jsonl')

const PORT = 3001

// ---------------------------------------------------------------------------
// Client tracking
// ---------------------------------------------------------------------------

const clients = new Set<Response>()

// Per-client byte offset for the log file (keyed by response object reference).
// We keep a single shared offset since all clients are always in sync — each
// broadcast reaches all connected clients simultaneously. If clients connect at
// different times they each get a full replay at connection time; after that
// they all advance together.
let logByteOffset = 0

// ---------------------------------------------------------------------------
// SSE helpers
// ---------------------------------------------------------------------------

function sendSSE(res: Response, event: string, data: unknown): void {
  const payload = typeof data === 'string' ? data : JSON.stringify(data)
  res.write(`event: ${event}\ndata: ${payload}\n\n`)
}

function broadcastSSE(event: string, data: unknown): void {
  for (const res of clients) {
    sendSSE(res, event, data)
  }
}

// ---------------------------------------------------------------------------
// File readers
// ---------------------------------------------------------------------------

function readGameState(): unknown {
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

/**
 * Read all complete lines from LOG_FILE starting at `fromOffset`.
 * Returns { lines: parsed objects[], newOffset: number }.
 * Handles truncation: if file is smaller than fromOffset, resets to 0.
 */
function readLogLines(fromOffset: number): { entries: unknown[]; newOffset: number } {
  let stats: fs.Stats
  try {
    stats = fs.statSync(LOG_FILE)
  } catch {
    // File doesn't exist yet
    return { entries: [], newOffset: 0 }
  }

  const fileSize = stats.size

  // Truncation detection — new game started, file was reset
  const readFrom = fileSize < fromOffset ? 0 : fromOffset

  if (fileSize === readFrom) {
    return { entries: [], newOffset: readFrom }
  }

  // Read only the new bytes
  const fd = fs.openSync(LOG_FILE, 'r')
  const buffer = Buffer.alloc(fileSize - readFrom)
  const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, readFrom)
  fs.closeSync(fd)

  const chunk = buffer.subarray(0, bytesRead).toString('utf8')

  // Split on newlines; only process complete lines (last element may be
  // an incomplete line if a write is still in progress).
  const rawLines = chunk.split('\n')

  // The last element is either '' (chunk ended with \n) or a partial line.
  // Either way we do not process it now — we only advance the offset past
  // the complete lines we consumed.
  const completeLines = rawLines.slice(0, rawLines.length - 1)

  const entries: unknown[] = []
  let consumedBytes = 0

  for (const line of completeLines) {
    const lineBytes = Buffer.byteLength(line, 'utf8') + 1 // +1 for '\n'
    const trimmed = line.trim()
    if (trimmed.length === 0) {
      consumedBytes += lineBytes
      continue
    }
    try {
      entries.push(JSON.parse(trimmed))
      consumedBytes += lineBytes
    } catch {
      // Corrupt / partial line — skip but advance past it so we don't
      // re-process on the next change event.
      consumedBytes += lineBytes
    }
  }

  return { entries, newOffset: readFrom + consumedBytes }
}

// ---------------------------------------------------------------------------
// File change handlers
// ---------------------------------------------------------------------------

function handleStateChange(): void {
  const state = readGameState()
  broadcastSSE('state', state)
}

function handleLogChange(): void {
  const prevOffset = logByteOffset
  const { entries, newOffset } = readLogLines(logByteOffset)
  // If the file was truncated (new game started externally), broadcast a
  // reset so clients clear stale entries before receiving new ones.
  if (newOffset < prevOffset) {
    broadcastSSE('reset', { ts: new Date().toISOString() })
  }
  logByteOffset = newOffset
  for (const entry of entries) {
    broadcastSSE('log', entry)
  }
}

// ---------------------------------------------------------------------------
// chokidar watcher (lazy — started when first client connects)
// ---------------------------------------------------------------------------

let watcher: ReturnType<typeof chokidar.watch> | null = null

function startWatcher(): void {
  if (watcher) return

  watcher = chokidar.watch([STATE_FILE, LOG_FILE], {
    usePolling: false,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50,
    },
    // Don't emit an add event on startup — we handle initial hydration manually
    ignoreInitial: true,
  })

  watcher.on('change', (filePath: string) => {
    if (filePath === STATE_FILE) {
      handleStateChange()
    } else if (filePath === LOG_FILE) {
      handleLogChange()
    }
  })

  console.log('[server] chokidar watcher started')
}

function stopWatcher(): void {
  if (watcher) {
    watcher.close().catch(() => {})
    watcher = null
    console.log('[server] chokidar watcher stopped (no clients)')
  }
}

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

const app = express()
app.use(cors())
app.use(express.json())

// POST /api/new-game — wipe game_state.json and game_log.jsonl, then spawn a new game
app.post('/api/new-game', (_req: Request, res: Response) => {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify({}, null, 2), 'utf8')
    fs.writeFileSync(LOG_FILE, '', 'utf8')
    // Reset the shared log offset so the next client hydration starts from 0
    logByteOffset = 0
    // Notify all connected clients so the UI resets without a page reload
    broadcastSSE('state', {})
    broadcastSSE('reset', { ts: new Date().toISOString() })

    // Spawn Claude in the background to run the game master
    const claudeProc = spawn(
      'claude',
      ['--dangerously-skip-permissions', '--print', '/werewolf'],
      {
        cwd: ROOT_DIR,
        detached: true,
        stdio: 'ignore',
        env: { ...process.env },
      }
    )
    claudeProc.unref()
    console.log('[server] spawned new game (claude pid:', claudeProc.pid, ')')

    res.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ error: 'reset_failed', message })
  }
})

// GET /api/game-state — snapshot of current state
app.get('/api/game-state', (_req: Request, res: Response) => {
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    res.json(parsed)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    const isNotFound =
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as NodeJS.ErrnoException).code === 'ENOENT'

    if (isNotFound) {
      res.json({})
    } else {
      res.status(500).json({ error: 'parse_error', message })
    }
  }
})

// GET /api/stream — SSE event stream
app.get('/api/stream', (req: Request, res: Response) => {
  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // disable nginx buffering if proxied
  res.flushHeaders()

  // Register client
  clients.add(res)
  console.log(`[server] client connected (total: ${clients.size})`)

  // Start watcher if this is the first client
  startWatcher()

  // --- Initial hydration ---

  // 0. Tell the client to clear any stale in-memory state so that a
  //    reconnect always produces a consistent view (no duplicate entries).
  sendSSE(res, 'reset', { ts: new Date().toISOString() })

  // 1. Send current game state
  const initialState = readGameState()
  sendSSE(res, 'state', initialState)

  // 2. Send all existing log lines (full replay from byte 0)
  const { entries: allEntries } = readLogLines(0)
  for (const entry of allEntries) {
    sendSSE(res, 'log', entry)
  }

  // Advance shared offset to end-of-file so incremental reads start here.
  // (If other clients are already connected the offset is already up-to-date;
  //  we take whichever is larger to avoid rewinding for existing clients.)
  try {
    const stats = fs.statSync(LOG_FILE)
    logByteOffset = Math.max(logByteOffset, stats.size)
  } catch {
    // LOG_FILE doesn't exist yet — that's fine, offset stays at 0
  }

  // Heartbeat every 30 seconds to keep the connection alive
  const heartbeat = setInterval(() => {
    res.write(':\n\n')
  }, 30_000)

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(heartbeat)
    clients.delete(res)
    console.log(`[server] client disconnected (total: ${clients.size})`)
    if (clients.size === 0) {
      stopWatcher()
    }
  })
})

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`[server] Werewolf SSE bridge listening on http://localhost:${PORT}`)
  console.log(`[server] Watching:`)
  console.log(`  state: ${STATE_FILE}`)
  console.log(`  log:   ${LOG_FILE}`)
})
