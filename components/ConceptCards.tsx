'use client'

import type { ConceptPackage } from '@/lib/types'

interface ConceptCardsProps {
  packages: ConceptPackage[]
  selected: ConceptPackage | null
  onSelect: (pkg: ConceptPackage) => void
  onSurpriseMe?: () => void
}

export default function ConceptCards({ packages, selected, onSelect, onSurpriseMe }: ConceptCardsProps) {
  if (!packages || packages.length === 0) return null

  return (
    <div className="px-3 py-3 border-t border-gray-100">
      <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider font-medium">Choose a concept</p>
      <div className="space-y-2">
        {packages.map((pkg) => {
          const isSelected = selected?.id === pkg.id
          return (
            <button
              key={pkg.id}
              onClick={() => onSelect(pkg)}
              className={`w-full text-left rounded-xl p-3 border transition-all shadow-sm ${
                isSelected
                  ? 'border-indigo-300 bg-indigo-50 shadow-indigo-100'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {/* Color swatches */}
                <div className="flex gap-0.5 mt-1 shrink-0">
                  {pkg.color_palette.slice(0, 4).map((color, i) => (
                    <span
                      key={i}
                      className="w-3 h-3 rounded-full border border-gray-200 shadow-sm"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-serif text-gray-800 truncate">{pkg.title}</span>
                    <span className="text-xs text-gray-400 italic shrink-0">{pkg.mood}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{pkg.description}</p>
                  <p className="text-xs text-indigo-500 mt-1 italic truncate">&ldquo;{pkg.visual_metaphor}&rdquo;</p>
                </div>
              </div>
            </button>
          )
        })}

        {/* Surprise me */}
        {onSurpriseMe && (
          <button
            onClick={onSurpriseMe}
            className="w-full text-center rounded-xl p-3 border border-dashed border-violet-300 bg-gradient-to-r from-violet-50/60 to-indigo-50/60 hover:from-violet-50 hover:to-indigo-50 hover:border-violet-400 transition-all group"
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-base group-hover:scale-110 transition-transform">🎲</span>
              <span className="text-sm font-medium text-violet-600">Surprise me</span>
            </div>
            <p className="text-xs text-violet-400 mt-0.5">I trust you — pick for me</p>
          </button>
        )}
      </div>
    </div>
  )
}
