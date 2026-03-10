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
  elicitation: 'Tell me about your experience…',
  concept_selection: 'Pick a concept card above…',
  running: 'Your sketch is running!',
  debug: 'Fixing errors…',
  critique: 'Type to continue the conversation…',
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
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 text-sm mt-8">
            <p className="text-2xl mb-2">🎨</p>
            <p>Share an experience. I&apos;ll shape it into generative art.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-sm'
                  : 'bg-gray-800 text-gray-100 rounded-bl-sm'
              }`}
            >
              <p className="whitespace-pre-wrap">
                {msg.content.split(/(_[^_]+_)/).map((part, j) =>
                  part.startsWith('_') && part.endsWith('_') && part.length > 2 ? (
                    <em key={j} className="text-gray-400 not-italic text-xs block mt-1">{part.slice(1, -1)}</em>
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
            <div className="bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Concept cards slot */}
      {children}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            disabled={inputDisabled}
            className="flex-1 bg-gray-800 text-gray-100 placeholder-gray-500 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={inputDisabled || !input.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white text-sm rounded-xl transition-colors"
          >
            Send
          </button>
          {onGenerate && mode === 'elicitation' && messages.length >= 1 && (
            <button
              type="button"
              onClick={onGenerate}
              disabled={isLoading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 text-white text-sm rounded-xl transition-colors font-medium"
            >
              Generate
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
