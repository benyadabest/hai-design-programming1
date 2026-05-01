import Link from 'next/link'
import { readElicitationLog } from '@/lib/logger'
import type { ElicitationLogEntry } from '@/lib/types'

export const dynamic = 'force-dynamic'

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function Chip({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'indigo' | 'amber' | 'red' | 'emerald' | 'gray' }) {
  const tones: Record<string, string> = {
    neutral: 'bg-gray-100 text-gray-700 border-gray-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    gray: 'bg-gray-50 text-gray-500 border-gray-200',
  }
  return (
    <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full border ${tones[tone]}`}>
      {label}
    </span>
  )
}

function imageTypeTone(t: ElicitationLogEntry['image_type']): 'indigo' | 'emerald' | 'gray' {
  if (t === 'abstract') return 'indigo'
  if (t === 'real_life') return 'emerald'
  return 'gray'
}

function Section({ title, children, emptyHint }: { title: string; children: React.ReactNode; emptyHint?: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mb-1">{title}</p>
      {children || <p className="text-xs text-gray-300 italic">{emptyHint ?? '—'}</p>}
    </div>
  )
}

function Entry({ entry, index }: { entry: ElicitationLogEntry; index: number }) {
  const flagged = entry.inappropriate_content?.flagged
  return (
    <article
      className={`rounded-2xl border bg-white p-5 shadow-sm transition-all ${
        flagged ? 'border-red-200 ring-1 ring-red-100' : 'border-gray-200/80'
      }`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-[11px] font-mono text-gray-400">#{index + 1}</span>
        <span className="text-[11px] text-gray-500">{formatTimestamp(entry.timestamp)}</span>
        <span className="text-[11px] text-gray-300">·</span>
        <span className="text-[11px] font-mono text-gray-400">session: {entry.sessionId}</span>
        <div className="flex-1" />
        <Chip label={`image: ${entry.image_type}`} tone={imageTypeTone(entry.image_type)} />
        {entry.is_race_specific ? <Chip label="race-specific" tone="amber" /> : <Chip label="race-neutral" tone="gray" />}
        {flagged && <Chip label="⚑ flagged" tone="red" />}
      </div>

      {/* Prompt */}
      <div className="mb-4">
        <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mb-1">Prompt</p>
        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed bg-gray-50/60 rounded-lg px-3 py-2 border border-gray-100">
          {entry.prompt}
        </p>
      </div>

      {/* Inappropriate content box */}
      {flagged && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50/60 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wider text-red-600 font-medium mb-0.5">Inappropriate content reason</p>
          <p className="text-sm text-red-800">{entry.inappropriate_content.reason ?? '(no reason provided)'}</p>
        </div>
      )}

      {/* Emotions: prior vs this turn */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <Section title="Accumulated emotions (prior)">
          {entry.accumulated_emotions_prior.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {entry.accumulated_emotions_prior.map((e, i) => (
                <Chip key={i} label={e} tone="gray" />
              ))}
            </div>
          ) : null}
        </Section>
        <Section title="Emotions detected this prompt">
          {entry.emotions_detected_this_prompt.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {entry.emotions_detected_this_prompt.map((e, i) => (
                <Chip key={i} label={e} tone="indigo" />
              ))}
            </div>
          ) : null}
        </Section>
      </div>

      {/* Physical characteristics */}
      <div className="mb-4">
        <Section
          title="Physical characteristics (people in real-life prompts)"
          emptyHint={entry.image_type === 'real_life' ? 'No people / no descriptors yet' : 'n/a (not a real-life prompt)'}
        >
          {entry.physical_characteristics.length > 0 ? (
            <ul className="text-sm text-gray-700 space-y-0.5">
              {entry.physical_characteristics.map((c, i) => (
                <li key={i} className="before:content-['—'] before:text-gray-300 before:mr-2">
                  {c}
                </li>
              ))}
            </ul>
          ) : null}
        </Section>
      </div>

      {/* Additional characteristics */}
      <Section title="Additional characteristics">
        {entry.additional_characteristics.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {entry.additional_characteristics.map((c, i) => (
              <Chip key={i} label={c} tone="neutral" />
            ))}
          </div>
        ) : null}
      </Section>
    </article>
  )
}

export default function LogsPage() {
  const entries = readElicitationLog()
  const reversed = [...entries].reverse() // newest first

  const flaggedCount = entries.filter((e) => e.inappropriate_content?.flagged).length
  const realLifeCount = entries.filter((e) => e.image_type === 'real_life').length
  const abstractCount = entries.filter((e) => e.image_type === 'abstract').length
  const raceSpecificCount = entries.filter((e) => e.is_race_specific).length

  return (
    <div className="min-h-screen bg-[#fafafa] text-gray-800">
      {/* Header */}
      <header className="px-6 py-4 bg-white border-b border-gray-200/80 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <h1 className="text-xl font-serif tracking-tight text-gray-900">Elicitation Logs</h1>
          <span className="text-xs text-gray-400">({entries.length} {entries.length === 1 ? 'entry' : 'entries'})</span>
          <div className="flex-1" />
          <a
            href="/api/logs?format=jsonl"
            className="text-xs text-gray-500 hover:text-indigo-600 transition-colors px-3 py-1.5 rounded-lg border border-gray-200 hover:border-indigo-200 hover:bg-indigo-50"
          >
            Download .jsonl
          </a>
          <a
            href="/api/logs"
            className="text-xs text-gray-500 hover:text-indigo-600 transition-colors px-3 py-1.5 rounded-lg border border-gray-200 hover:border-indigo-200 hover:bg-indigo-50"
          >
            Raw JSON
          </a>
          <Link
            href="/"
            className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-50"
          >
            ← Back to app
          </Link>
        </div>
      </header>

      {/* Stats row */}
      <div className="max-w-5xl mx-auto px-6 pt-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="rounded-xl border border-gray-200/80 bg-white p-3">
            <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">Total prompts</p>
            <p className="text-2xl font-serif text-gray-900">{entries.length}</p>
          </div>
          <div className="rounded-xl border border-indigo-200/60 bg-indigo-50/40 p-3">
            <p className="text-[11px] uppercase tracking-wider text-indigo-500 font-medium">Abstract</p>
            <p className="text-2xl font-serif text-indigo-700">{abstractCount}</p>
          </div>
          <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/40 p-3">
            <p className="text-[11px] uppercase tracking-wider text-emerald-600 font-medium">Real-life</p>
            <p className="text-2xl font-serif text-emerald-700">{realLifeCount}</p>
          </div>
          <div className="rounded-xl border border-red-200/60 bg-red-50/40 p-3">
            <p className="text-[11px] uppercase tracking-wider text-red-500 font-medium">Flagged</p>
            <p className="text-2xl font-serif text-red-700">{flaggedCount}</p>
          </div>
        </div>
        <div className="text-xs text-gray-400 mb-6">
          {raceSpecificCount} race-specific · {entries.length - raceSpecificCount} race-neutral · sorted newest first
        </div>
      </div>

      {/* Entries */}
      <main className="max-w-5xl mx-auto px-6 pb-12">
        {reversed.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
            <p className="text-gray-500 font-serif text-lg">No entries yet</p>
            <p className="text-gray-400 text-sm mt-2">
              Send a message in the <Link href="/" className="text-indigo-500 hover:underline">main app</Link> and it will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reversed.map((entry, i) => (
              <Entry key={`${entry.timestamp}-${i}`} entry={entry} index={entries.length - 1 - i} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
