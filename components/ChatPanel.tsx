'use client'

import { useEffect, useRef, useState } from 'react'
import type { Message, AppMode } from '@/lib/types'

interface ChatPanelProps {
  messages: Message[]
  mode: AppMode
  isLoading: boolean
  onSend: (text: string) => void
  onGenerate?: () => void
  children?: React.ReactNode
}

const modePlaceholders: Partial<Record<AppMode, string>> = {
  elicitation: 'Share something you experienced…',
  concept_selection: 'Pick a concept card above…',
  running: 'Optional: describe a change — or use ★ Feedback for structured rounds of refinement…',
  debug: 'Fixing errors…',
  critique: 'Type to continue…',
}

export default function ChatPanel({ messages, mode, isLoading, onSend, onGenerate, children }: ChatPanelProps) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    onSend(text)
  }

  const placeholder = modePlaceholders[mode] ?? 'Type a message…'
  const inputDisabled = isLoading || mode === 'concept_selection'

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="text-center mt-20">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 flex items-center justify-center mx-auto mb-5 border border-indigo-100/60">
              <span className="text-2xl font-serif text-indigo-300">~</span>
            </div>
            <p className="text-gray-700 font-serif text-lg tracking-tight">Share an experience.</p>
            <p className="text-gray-400 text-[13px] mt-2 leading-relaxed">I&apos;ll shape it into generative art.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-50 to-violet-50 flex items-center justify-center mr-2.5 mt-0.5 shrink-0 border border-indigo-100/40">
                <span className="text-[11px] font-serif text-indigo-300">~</span>
              </div>
            )}
            <div
              className={`max-w-[80%] text-[13.5px] leading-[1.65] ${
                msg.role === 'user'
                  ? 'bg-indigo-500 text-white rounded-2xl rounded-br-md px-4 py-2.5 shadow-sm shadow-indigo-200/40'
                  : 'text-gray-600'
              }`}
            >
              <p className="whitespace-pre-wrap">
                {msg.content.split(/(_[^_]+_)/).map((part, j) =>
                  part.startsWith('_') && part.endsWith('_') && part.length > 2 ? (
                    <em key={j} className={`not-italic text-xs block mt-1.5 ${
                      msg.role === 'user' ? 'text-indigo-200' : 'text-gray-400'
                    }`}>{part.slice(1, -1)}</em>
                  ) : (
                    <span key={j}>{part}</span>
                  )
                )}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-50 to-violet-50 flex items-center justify-center mr-2.5 mt-0.5 shrink-0 border border-indigo-100/40">
              <span className="text-[11px] font-serif text-indigo-300">~</span>
            </div>
            <div className="flex gap-1 py-2">
              <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Concept cards slot */}
      {children}

      {/* Input */}
      <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-gray-100/80">
        <div className="flex items-end gap-2 bg-gray-50/80 rounded-2xl border border-gray-200/60 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-50 transition-all px-4 py-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            disabled={inputDisabled}
            className="flex-1 bg-transparent text-gray-800 placeholder-gray-400 text-sm outline-none disabled:opacity-50 py-1"
          />
          <div className="flex gap-1.5 shrink-0">
            <button
              type="submit"
              disabled={inputDisabled || !input.trim()}
              className="p-2 text-indigo-500 hover:text-indigo-600 disabled:text-gray-300 transition-colors rounded-xl hover:bg-indigo-50 disabled:hover:bg-transparent"
              title="Send"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
            {onGenerate && mode === 'elicitation' && messages.length >= 1 && (
              <button
                type="button"
                onClick={onGenerate}
                disabled={isLoading}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs rounded-xl transition-colors font-medium"
              >
                Generate
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
