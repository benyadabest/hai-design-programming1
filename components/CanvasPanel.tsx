'use client'

import { useRef, useEffect, useCallback } from 'react'
import type { RuntimeMetadata } from '@/lib/types'

const FORBIDDEN = [
  'fetch(',
  'XMLHttpRequest',
  'WebSocket',
  'import ',
  'require(',
  'document.',
  'window.location',
  'localStorage',
  'sessionStorage',
  'eval(',
  'Function(',
  'setTimeout(',
  'setInterval(',
  'innerHTML',
  'navigator.',
  'indexedDB',
]

function scanCode(code: string): string | null {
  for (const token of FORBIDDEN) {
    if (code.includes(token)) {
      return `Forbidden API detected: "${token}"`
    }
  }
  return null
}

function buildSrcdoc(p5Source: string, userCode: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0f0f0f; display: flex; align-items: center; justify-content: center; min-height: 100vh; overflow: hidden; }
  canvas { display: block; }
</style>
</head>
<body>
<script>
${p5Source}
</script>
<script>
window.onerror = function(message, source, lineno, colno, error) {
  parent.postMessage({
    type: 'p5_error',
    message: message,
    line: lineno,
    col: colno,
    stack: error ? error.stack : null
  }, '*');
  return true;
};

window.addEventListener('unhandledrejection', function(e) {
  parent.postMessage({
    type: 'p5_error',
    message: e.reason ? String(e.reason) : 'Unhandled promise rejection',
    line: 0,
    col: 0,
    stack: null
  }, '*');
});

var _frameCount = 0;
var _lastFpsTime = Date.now();
var _originalDraw = null;

// Patch p5 draw to measure FPS
var _p5Instance = null;
var _origP5 = window.p5;
if (typeof _origP5 === 'function') {
  var _OrigP5 = _origP5;
}

// Use a global draw wrapper approach
var _drawCalled = 0;
var _fpsInterval = null;

function _startFpsReporter() {
  _fpsInterval = setInterval(function() {
    if (typeof window.frameCount !== 'undefined') {
      var now = Date.now();
      parent.postMessage({
        type: 'p5_fps',
        fps: Math.round(typeof window.frameRate === 'function' ? window.frameRate() : 0),
        frameCount: window.frameCount || 0
      }, '*');
    }
  }, 1000);
}

_startFpsReporter();
</script>
<script>
try {
${userCode}
} catch(e) {
  parent.postMessage({
    type: 'p5_error',
    message: e.message || String(e),
    line: 0,
    col: 0,
    stack: e.stack || null
  }, '*');
}
</script>
</body>
</html>`
}

interface CanvasPanelProps {
  code: string | null
  onError: (msg: string) => void
  onMetadata: (meta: RuntimeMetadata) => void
}

export default function CanvasPanel({ code, onError, onMetadata }: CanvasPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const p5SourceRef = useRef<string | null>(null)
  const loadingRef = useRef(false)

  // Fetch p5 source once on mount
  useEffect(() => {
    if (p5SourceRef.current || loadingRef.current) return
    loadingRef.current = true
    fetch('https://cdn.jsdelivr.net/npm/[email protected]/lib/p5.min.js')
      .then((r) => r.text())
      .then((src) => {
        p5SourceRef.current = src
        loadingRef.current = false
      })
      .catch((e) => {
        loadingRef.current = false
        onError(`Failed to load p5.js: ${e.message}`)
      })
  }, [onError])

  // Listen for postMessages from iframe
  const handleMessage = useCallback(
    (e: MessageEvent) => {
      if (!e.data || typeof e.data !== 'object') return
      if (e.data.type === 'p5_error') {
        const msg = e.data.line
          ? `${e.data.message} (line ${e.data.line})`
          : e.data.message
        onError(msg)
      } else if (e.data.type === 'p5_fps') {
        onMetadata({ fps: e.data.fps, frameCount: e.data.frameCount, screenshot_summary: null })
      }
    },
    [onError, onMetadata]
  )

  useEffect(() => {
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleMessage])

  // Inject code when code changes
  useEffect(() => {
    if (!code || !iframeRef.current) return

    const violation = scanCode(code)
    if (violation) {
      onError(violation)
      return
    }

    const inject = () => {
      if (!p5SourceRef.current) {
        // Wait for p5 source to load
        const check = setInterval(() => {
          if (p5SourceRef.current) {
            clearInterval(check)
            if (iframeRef.current) {
              iframeRef.current.srcdoc = buildSrcdoc(p5SourceRef.current, code)
            }
          }
        }, 200)
        return
      }
      iframeRef.current!.srcdoc = buildSrcdoc(p5SourceRef.current, code)
    }

    inject()
  }, [code, onError])

  return (
    <div className="w-full flex-1 flex flex-col bg-gray-950 rounded-lg overflow-hidden relative">
      {!code && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm">
          Your sketch will appear here
        </div>
      )}
      <iframe
        ref={iframeRef}
        className="w-full flex-1 border-0"
        sandbox="allow-scripts"
        title="p5.js sketch"
      />
    </div>
  )
}
