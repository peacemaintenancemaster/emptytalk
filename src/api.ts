export interface DecodeResult {
  percentage: number
  segments: { text: string; type: 'empty' | 'genuine' }[]
  summary: string
}

export interface PackageResult {
  versions: { level: number; label: string; text: string }[]
}

export async function analyzeText(text: string): Promise<DecodeResult> {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `오류가 발생했습니다 (${res.status})`)
  }

  return res.json()
}

export async function generatePackaged(text: string): Promise<PackageResult> {
  const res = await fetch('/api/package', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `오류가 발생했습니다 (${res.status})`)
  }

  return res.json()
}
