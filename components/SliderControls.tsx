'use client'

import type { AdjustableParameter } from '@/lib/types'

interface SliderControlsProps {
  params: AdjustableParameter[]
  values: Record<string, number>
  onChange: (variable: string, value: number) => void
}

export default function SliderControls({ params, values, onChange }: SliderControlsProps) {
  if (!params || params.length === 0) return null

  return (
    <div className="p-3 border-t border-gray-200/80 bg-gray-50">
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-medium">Parameters</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {params.map((param) => {
          const val = values[param.variable] ?? param.default
          return (
            <div key={param.variable}>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs text-gray-500">{param.label}</label>
                <span className="text-xs text-gray-600 font-mono">
                  {val}
                  {param.unit ? ` ${param.unit}` : ''}
                </span>
              </div>
              <input
                type="range"
                min={param.min}
                max={param.max}
                step={param.step}
                value={val}
                onChange={(e) => onChange(param.variable, parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
