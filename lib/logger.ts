import fs from 'fs'
import path from 'path'
import type { ElicitationLogEntry } from './types'

const LOG_DIR = path.join(process.cwd(), 'logs')
const LOG_FILE = path.join(LOG_DIR, 'elicitation.jsonl')

let dirEnsured = false

function ensureDir() {
  if (dirEnsured) return
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true })
  dirEnsured = true
}

export function logElicitation(entry: ElicitationLogEntry): void {
  try {
    ensureDir()
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n', 'utf8')
  } catch (err) {
    console.error('[logger] failed to write elicitation log', err)
  }
}

export function readElicitationLog(): ElicitationLogEntry[] {
  try {
    if (!fs.existsSync(LOG_FILE)) return []
    const raw = fs.readFileSync(LOG_FILE, 'utf8')
    return raw
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as ElicitationLogEntry)
  } catch (err) {
    console.error('[logger] failed to read elicitation log', err)
    return []
  }
}
