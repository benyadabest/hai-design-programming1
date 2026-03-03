'use client'

import type { ConceptPackage } from '@/lib/types'

interface ConceptCardsProps {
  packages: ConceptPackage[]
  selected: ConceptPackage | null
  onSelect: (pkg: ConceptPackage) => void
}

export default function ConceptCards({ packages, selected, onSelect }: ConceptCardsProps) {
  if (!packages || packages.length === 0) return null

  return (
    <div className="px-3 py-2 border-t border-gray-800">
      <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Choose a concept</p>
      <div className="space-y-2">
        {packages.map((pkg) => {
          const isSelected = selected?.id === pkg.id
          return (
            <button
              key={pkg.id}
              onClick={() => onSelect(pkg)}
              className={`w-full text-left rounded-xl p-3 border transition-all ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-950'
                  : 'border-gray-700 bg-gray-900 hover:border-gray-600 hover:bg-gray-800'
              }`}
            >
              <div className="flex items-start gap-2">
                {/* Color swatches */}
                <div className="flex gap-0.5 mt-1 shrink-0">
                  {pkg.color_palette.slice(0, 4).map((color, i) => (
                    <span
                      key={i}
                      className="w-3 h-3 rounded-full border border-gray-700"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-100 truncate">{pkg.title}</span>
                    <span className="text-xs text-gray-500 italic shrink-0">{pkg.mood}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{pkg.description}</p>
                  <p className="text-xs text-indigo-400 mt-1 italic truncate">&ldquo;{pkg.visual_metaphor}&rdquo;</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
