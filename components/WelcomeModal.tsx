'use client'

import { useState, useEffect } from 'react'

interface WelcomeModalProps {
  onDismiss: () => void
}

export default function WelcomeModal({ onDismiss }: WelcomeModalProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const handleStart = () => {
    setVisible(false)
    setTimeout(onDismiss, 300)
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
        visible ? 'bg-black/40 backdrop-blur-sm' : 'bg-black/0'
      }`}
    >
      <div
        className={`bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 overflow-hidden transition-all duration-300 ${
          visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
        }`}
      >
        {/* Gradient header */}
        <div className="bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 px-8 pt-10 pb-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-5 border border-white/30">
            <span className="text-3xl">✨</span>
          </div>
          <h2 className="text-2xl font-serif text-white tracking-tight">
            Turn your story into art
          </h2>
          <p className="text-indigo-100 text-sm mt-2 leading-relaxed">
            Share an experience, and we&apos;ll transform it into a living, generative sketch.
          </p>
        </div>

        {/* Prize callout */}
        <div className="px-8 py-6">
          <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <span className="text-lg">🏆</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-800">Create something amazing</p>
              <p className="text-xs text-amber-600 mt-0.5 leading-relaxed">
                The most compelling sketches win a prize. Tell a vivid story — the richer the detail, the more striking the art.
              </p>
            </div>
          </div>

          {/* How it works */}
          <div className="mt-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-indigo-500">1</span>
              </div>
              <p className="text-sm text-gray-600">Share a memory or experience</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-indigo-500">2</span>
              </div>
              <p className="text-sm text-gray-600">Pick a visual concept that resonates</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-indigo-500">3</span>
              </div>
              <p className="text-sm text-gray-600">Watch your story come alive as generative art</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="px-8 pb-8">
          <button
            onClick={handleStart}
            className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-2xl transition-colors shadow-sm shadow-indigo-200"
          >
            Let&apos;s go
          </button>
        </div>
      </div>
    </div>
  )
}
