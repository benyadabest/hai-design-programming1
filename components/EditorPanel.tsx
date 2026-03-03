'use client'

import dynamic from 'next/dynamic'
import { useRef } from 'react'
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

  const hasCode = mode === 'running' || mode === 'debug' || mode === 'critique'

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 border-b border-gray-800 rounded-t-lg">
        <span className="text-xs text-gray-500 font-mono flex-1">sketch.js</span>
        {hasCode && (
          <>
            <button
              onClick={onRun}
              disabled={isLoading}
              className="px-3 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 text-white rounded transition-colors"
            >
              ▶ Run
            </button>
            <button
              onClick={onRegenerate}
              disabled={isLoading}
              className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white rounded transition-colors"
            >
              ↺ Regenerate
            </button>
            <button
              onClick={onGetFeedback}
              disabled={isLoading}
              className="px-3 py-1 text-xs bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 text-white rounded transition-colors"
            >
              ★ Feedback
            </button>
          </>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 relative">
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
          <div className="flex items-center justify-center h-full bg-gray-950 text-gray-600 text-sm rounded-b-lg">
            {isLoading ? (
              <span className="animate-pulse">Generating code…</span>
            ) : (
              'Code editor will appear after you select a concept'
            )}
          </div>
        )}
      </div>
    </div>
  )
}
