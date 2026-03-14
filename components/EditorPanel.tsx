'use client'

import dynamic from 'next/dynamic'
import { useRef, useState, useEffect } from 'react'
import type { AppMode } from '@/lib/types'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

interface EditorPanelProps {
  code: string | null
  mode: AppMode
  isLoading: boolean
  onCodeChange: (code: string) => void
  onRun: () => void
  onRegenerate: () => void
  onGetFeedback: () => void
}

export default function EditorPanel({
  code,
  mode,
  isLoading,
  onCodeChange,
  onRun,
  onRegenerate,
  onGetFeedback,
}: EditorPanelProps) {
  const editorRef = useRef<unknown>(null)
  const [isOpen, setIsOpen] = useState(false)

  const hasCode = mode === 'running' || mode === 'debug' || mode === 'critique'

  // Auto-expand when code first arrives
  useEffect(() => {
    if (hasCode && code) setIsOpen(true)
  }, [hasCode, code])

  return (
    <div className="flex flex-col h-full">
      {/* Clickable header / dropdown toggle */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center gap-2 px-4 py-2.5 bg-gray-50/80 border-b border-gray-200/60 hover:bg-gray-100/80 transition-colors w-full text-left group"
      >
        <svg
          className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-xs text-gray-500 font-mono flex-1">sketch.js</span>
        {hasCode && (
          <span className="text-[10px] text-gray-400 group-hover:text-gray-500 transition-colors">
            {isOpen ? 'collapse' : 'expand'}
          </span>
        )}

        {/* Action buttons (stop propagation so they don't toggle) */}
        {hasCode && (
          <span className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onRun}
              disabled={isLoading}
              className="px-2.5 py-1 text-[11px] bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-md transition-colors"
            >
              Run
            </button>
            <button
              onClick={onRegenerate}
              disabled={isLoading}
              className="px-2.5 py-1 text-[11px] bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-md transition-colors"
            >
              Regen
            </button>
            <button
              onClick={onGetFeedback}
              disabled={isLoading}
              className="px-2.5 py-1 text-[11px] bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-md transition-colors"
            >
              Feedback
            </button>
          </span>
        )}
      </button>

      {/* Collapsible editor body */}
      {isOpen && (
        <div className="flex-1 relative min-h-0">
          {hasCode && code ? (
            <MonacoEditor
              height="100%"
              defaultLanguage="javascript"
              value={code}
              onChange={(val) => val !== undefined && onCodeChange(val)}
              onMount={(editor) => { editorRef.current = editor }}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 12,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                tabSize: 2,
                automaticLayout: true,
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-900 text-gray-500 text-sm">
              {isLoading ? (
                <span className="animate-pulse text-gray-400">Generating code…</span>
              ) : (
                <span className="text-gray-500">Code will appear after you pick a concept</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
