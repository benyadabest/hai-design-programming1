'use client'

import type { TestFixture, FixtureGroup } from '@/lib/testFixtures'

interface TestModePanelProps {
  groups: FixtureGroup[]
  queued: TestFixture | null
  onQueue: (fixture: TestFixture) => void
  onClear: () => void
}

export default function TestModePanel({ groups, queued, onQueue, onClear }: TestModePanelProps) {
  return (
    <div className="bg-amber-950/50 border-b border-amber-800/60 px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
      <span className="text-amber-400 font-bold uppercase tracking-widest shrink-0 select-none">
        TEST
      </span>

      {groups.map((group) => (
        <div key={group.label} className="flex items-center gap-1">
          <span className="text-amber-700 shrink-0">{group.label}:</span>
          {group.fixtures.map((fixture) => {
            const isQueued = queued?.id === fixture.id
            const isErrorType = fixture.isError || fixture.id === 'error_timeout'
            return (
              <button
                key={fixture.id}
                onClick={() => (isQueued ? onClear() : onQueue(fixture))}
                title={fixture.description}
                className={[
                  'px-2 py-0.5 rounded border transition-colors whitespace-nowrap',
                  isQueued
                    ? 'bg-amber-400 text-gray-950 border-amber-300 font-semibold'
                    : isErrorType
                    ? 'bg-transparent text-red-400 border-red-800 hover:border-red-500 hover:text-red-200'
                    : 'bg-transparent text-amber-300 border-amber-800 hover:border-amber-500 hover:text-amber-100',
                ].join(' ')}
              >
                {fixture.label}
              </button>
            )
          })}
        </div>
      ))}

      {/* Queued indicator */}
      <div className="ml-auto flex items-center gap-2 shrink-0">
        {queued ? (
          <>
            <span className="text-amber-600">
              Next:{' '}
              <span className="text-amber-200 font-medium">{queued.label}</span>
            </span>
            <button
              onClick={onClear}
              title="Clear queued fixture"
              className="text-amber-700 hover:text-amber-300 transition-colors leading-none"
            >
              ✕
            </button>
          </>
        ) : (
          <span className="text-amber-800 italic">no fixture queued — real API will be used</span>
        )}
      </div>
    </div>
  )
}
