export interface DecodeResult {
  ratio: number
  highlighted: string
  core: string
  _used?: number
  _limit?: number
}

export interface PackageResult {
  result: string
  _used?: number
  _limit?: number
}

export interface UsageInfo {
  used: number
  limit: number
}

export async function fetchUsage(): Promise<UsageInfo> {
  try {
    const res = await fetch('/api/usage')
    if (!res.ok) return { used: 0, limit: 5 }
    return res.json()
  } catch {
    return { used: 0, limit: 5 }
  }
}

export async function analyzeText(text: string): Promise<DecodeResult> {
  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'decode', text }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `오류가 발생했습니다 (${res.status})`)
  }

  return res.json()
}

export async function generatePackaged(text: string, level: number): Promise<PackageResult> {
  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'package', text, level }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `오류가 발생했습니다 (${res.status})`)
  }

  return res.json()
}
