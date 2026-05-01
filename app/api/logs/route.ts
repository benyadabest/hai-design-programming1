import { NextResponse } from 'next/server'
import { readElicitationLog } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const format = url.searchParams.get('format')
  const entries = readElicitationLog()

  if (format === 'jsonl') {
    const body = entries.map((e) => JSON.stringify(e)).join('\n') + (entries.length ? '\n' : '')
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Content-Disposition': 'attachment; filename="elicitation.jsonl"',
      },
    })
  }

  return NextResponse.json({ count: entries.length, entries })
}
