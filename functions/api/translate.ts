const SYSTEM = `한국어 빈말(의례적·장식적 표현) 분석·생성 도구. JSON만 출력.

[해독]
빈말을 [[]]로 감싸라. [[]] 밖=진심. 키워드 단위로 최소한만 진심으로 남겨라.
core: 한줄요약(구체적으로). 구체적 수치·사례·근거도 빈말이다. core 키워드만 진심.
짧은 욕설·감정표현은 전체가 진심(빈말 0~10%).
{"ratio":0~100,"highlighted":"[[빈말]]진심[[빈말]]","core":"핵심요약"}

[포장:N] (N=0~100)
원문 의도를 순화하여 빈말로 포장. 격식체·존댓말 필수.
의도 방향 보존: 욕→비판방향 유지, 요청→요청 유지. 사과·화해로 바꾸지 마라.
G블록(본론)에 순화된 원문 의도 필수 포함. 사연·상황 지어내지 마라.
원문 직접 인용 금지. 호칭은 "귀하께서" 사용.
N≤30:G만,1~3문장. N=30~60:A+G+J+L,3~8문장. N=60~80:A~J,8~16문장,만연체. N≥80:A~M전부,16문장+,만연체+사자성어.
N≥60이면 문단구분(\\n\\n).
{"result":"완성 메시지"}`

const DAILY_LIMIT = 5

// ── 서버사이드 검증 함수 ──

// 포장모드: 공격적·비격식 어휘 → 격식체 치환
const POLISH_MAP: Array<[RegExp, string]> = [
  // 욕설·비속어 (긴 것부터)
  [/개새끼/g, '귀하의 행태'],
  [/씨발/g, '극히 유감스러운'],
  [/시발/g, '극히 유감스러운'],
  [/지랄/g, '무리한 처사'],
  [/병신/g, '부적절한 처사'],
  [/빡치/g, '심히 유감스럽'],
  [/ㅅㅂ/g, '유감스러운'],
  [/ㅂㅅ/g, '부적절한'],
  // 공격적 어휘
  [/도대체/g, '정확히'],
  [/어이가 없/g, '당혹스럽'],
  [/어이없/g, '당혹스럽'],
  [/미치겠/g, '난감하'],
  [/열받/g, '유감스럽'],
  [/짜증/g, '유감'],
  [/개같/g, '부당하'],
  [/황당/g, '의아'],
  [/왜그래/g, '어떠한 사유가 있으신지'],
  [/왜그러/g, '어떠한 사유가 있으신지'],
  [/뭐야/g, '무엇인지'],
  [/뭔데/g, '무엇인지'],
  // 비격식 → 격식
  [/제발/g, '부디'],
  [/나한테/g, '저에게'],
  [/나보고/g, '저에게'],
  [/나더러/g, '저에게'],
  [/니가/g, '귀하께서'],
  [/네가/g, '귀하께서'],
]

function postProcessPackage(result: string, inputText: string): string {
  // 1) [[ ]] 마크업 제거
  result = result.replace(/\[\[|\]\]/g, '')
  // 2) 공격적·비격식 어휘 치환
  for (const [pattern, replacement] of POLISH_MAP) {
    result = result.replace(pattern, replacement)
  }
  // 3) 원문 그대로 노출 방지 (입력이 결과에 포함되면 제거)
  if (inputText.length >= 2 && result.includes(inputText)) {
    result = result.replace(new RegExp(inputText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '')
  }
  return result
}

function postProcessDecode(raw: string, core: string | undefined): { highlighted: string, ratio: number } {
  // 0) 진심 구간 앞뒤 공백을 빈말 쪽으로 흡수
  raw = raw.replace(/\]\](\s+)/g, '$1]]')
  raw = raw.replace(/(\s+)\[\[/g, '[[$1')

  // 1) 공백·구두점만으로 이루어진 진심 구간을 빈말로 병합
  raw = raw.replace(/\]\]([\s.,;:!?·…—\-–'"'"「」『』()（）《》<>]+)\[\[/g, '$1')

  // 2) 같은 키워드가 진심으로 여러 번 → 첫 번째만 유지
  const genuineParts: Array<{original: string, normalized: string}> = []
  const genuineRegex = /\]\]([^[]+)\[\[/g
  const startMatch = raw.match(/^([^[]+)\[\[/)
  if (startMatch) genuineParts.push({ original: startMatch[1], normalized: startMatch[1].replace(/[\s.,;:!?·…—\-–'"'"「」『』()（）《》<>]/g, '') })
  let m: RegExpExecArray | null
  while ((m = genuineRegex.exec(raw)) !== null) {
    genuineParts.push({ original: m[1], normalized: m[1].replace(/[\s.,;:!?·…—\-–'"'"「」『』()（）《》<>]/g, '') })
  }
  const endMatch = raw.match(/\]\]([^[]+)$/)
  if (endMatch) genuineParts.push({ original: endMatch[1], normalized: endMatch[1].replace(/[\s.,;:!?·…—\-–'"'"「」『』()（）《》<>]/g, '') })

  const seenGenuine = new Set<string>()
  for (const part of genuineParts) {
    if (part.normalized.length >= 2 && seenGenuine.has(part.normalized)) {
      raw = raw.replace(`]]${part.original}[[`, part.original)
      if (raw.startsWith(part.original + '[[')) {
        raw = '[[' + part.original + raw.slice(part.original.length)
      }
      if (raw.endsWith(']]' + part.original)) {
        raw = raw.slice(0, -part.original.length) + part.original + ']]'
      }
    }
    if (part.normalized.length >= 2) seenGenuine.add(part.normalized)
  }

  // 3) core 키워드가 빈말 안에 있으면 강제로 진심으로 꺼냄 (이미 진심인 키워드는 스킵)
  if (core) {
    const coreWords = (core.match(/[가-힣a-zA-Z0-9]{2,}/g) || [])
      .sort((a: string, b: string) => b.length - a.length)
    for (const kw of coreWords) {
      // 이미 진심으로 마킹된 키워드면 스킵
      if (seenGenuine.has(kw)) continue
      const escKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      // 이미 진심 영역(]] ~ [[)에 존재하는지 체크
      const genuineCheck = new RegExp(`\\]\\][^\\[]*${escKw}[^\\[]*\\[\\[`)
      const atStart = new RegExp(`^[^\\[]*${escKw}`)
      const atEnd = new RegExp(`${escKw}[^\\]]*$`)
      if (genuineCheck.test(raw) || atStart.test(raw) || atEnd.test(raw)) continue
      // 빈말 영역 안에서 키워드 첫 등장을 찾아서 꺼냄
      const inEmptyRegex = new RegExp(`\\[\\[([^\\]]*?)(${escKw})([^\\[]*?)\\]\\]`)
      const match = raw.match(inEmptyRegex)
      if (match) {
        const before = match[1]
        const keyword = match[2]
        const after = match[3]
        let replacement = ''
        if (before) replacement += `[[${before}]]`
        replacement += keyword
        if (after) replacement += `[[${after}]]`
        raw = raw.replace(match[0], replacement)
        seenGenuine.add(kw)
      }
    }
    raw = raw.replace(/\[\[\]\]/g, '')
  }

  // 4) ratio 계산 (최대 99.9%)
  const emptyMatch = raw.match(/\[\[(.*?)\]\]/gs)
  const emptyText = emptyMatch ? emptyMatch.map((seg: string) => seg.slice(2, -2)).join('') : ''
  const plainText = raw.replace(/\[\[|\]\]/g, '')
  let ratio = 0
  if (plainText.length > 0) {
    ratio = Math.min(99.9, Math.round((emptyText.length / plainText.length) * 1000) / 10)
  }

  return { highlighted: raw, ratio }
}

interface Env {
  OPENAI_API_KEY: string
  RATE_LIMIT: KVNamespace
}

function getToday(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const apiKey = context.env.OPENAI_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'API key not configured' }, { status: 500 })
  }

  // Rate limiting by IP
  const ip = context.request.headers.get('CF-Connecting-IP') || 'unknown'
  const today = getToday()
  const rateKey = `rate:${ip}:${today}`

  // [TEST_MODE] 테스트 중 rate limit 체크 임시 비활성화
  let used = 0
  // if (context.env.RATE_LIMIT) {
  //   const val = await context.env.RATE_LIMIT.get(rateKey)
  //   used = val ? parseInt(val, 10) : 0
  //
  //   if (used >= DAILY_LIMIT) {
  //     return Response.json(
  //       { error: '오늘의 사용 횟수(5회)를 모두 소진했습니다. 내일 다시 이용해주세요.', used, limit: DAILY_LIMIT },
  //       { status: 429 }
  //     )
  //   }
  // }

  let body: { mode?: string; text?: string; level?: number }
  try {
    body = await context.request.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const text = body.text?.trim()
  if (!text) {
    return Response.json({ error: 'Text is required' }, { status: 400 })
  }
  const mode = body.mode
  const maxLen = mode === 'decode' ? 800 : 100
  if (text.length > maxLen) {
    return Response.json({ error: `Text too long (max ${maxLen} chars)` }, { status: 400 })
  }
  let userMsg: string
  if (mode === 'decode') {
    userMsg = `[해독]\n${text}`
  } else if (mode === 'package') {
    const level = Math.min(100, Math.max(0, Math.round(body.level ?? 60)))
    userMsg = `[포장:${level}]\n${text}`
  } else {
    return Response.json({ error: 'Invalid mode' }, { status: 400 })
  }

  const openaiBody = JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM },
      ...(mode === 'decode' ? [
          { role: 'user' as const, content: `[해독]\n수고 많으십니다. 다름이 아니오라, 다음 주 수요일까지 견적서를 보내주시면 감사하겠습니다. 양해 부탁드립니다.` },
          { role: 'assistant' as const, content: `{"ratio":85,"highlighted":"[[수고 많으십니다. 다름이 아니오라,]] 다음 주 수요일까지 견적서[[를 보내주시면 감사하겠습니다. 양해 부탁드립니다.]]","core":"수요일까지 견적서 요청"}` },
        ] : [
          { role: 'user' as const, content: `[포장:100]\n야 꺼져` },
          { role: 'assistant' as const, content: `{"result":"안녕하십니까, 평소 보여주시는 성원에 감사드립니다.\\n\\n다름이 아니오라, 여러 사정을 고려한 끝에 이 자리에서 물러나 주시기를 정중히 부탁드립니다.\\n\\n긴 글 읽어주셔서 감사드리며, 늘 건강하시고 만사형통하시길 기원합니다."}` },
        ]),
        { role: 'user', content: userMsg },
      ],
      temperature: mode === 'decode' ? 0.3 : 0.9,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    })

  // Retry logic: up to 3 attempts
  let content: string | null = null
  let lastError = ''
  let lastStatus = 502
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: openaiBody,
      })

      if (!res.ok) {
        const err: any = await res.json().catch(() => ({}))
        const status = res.status
        if (status === 429) {
          lastError = '서버가 바쁩니다. 잠시 후 다시 시도해주세요.'
          lastStatus = 429
          // rate limit일 때 잠시 대기 후 재시도
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
          continue
        }
        lastError = err.error?.message || `AI 서비스 오류 (${status})`
        lastStatus = 502
        continue
      }

      const data: any = await res.json()
      content = data.choices?.[0]?.message?.content
      if (!content) {
        lastError = 'AI 응답이 비어있습니다. 다시 시도해주세요.'
        lastStatus = 502
        continue
      }
      break
    } catch (e: any) {
      lastError = '네트워크 오류가 발생했습니다. 다시 시도해주세요.'
      lastStatus = 502
      continue
    }
  }

  if (!content) {
    return Response.json({ error: lastError || 'AI 응답 실패' }, { status: lastStatus })
  }

  // Increment rate limit after successful response
  // [TEST_MODE] 테스트 중 사용횟수 차감 임시 비활성화
  const newUsed = used
  // const newUsed = used + 1
  // if (context.env.RATE_LIMIT) {
  //   await context.env.RATE_LIMIT.put(rateKey, String(newUsed), { expirationTtl: 86400 })
  // }

  try {
    const parsed = JSON.parse(content)
    // 포장 모드 후처리
    if (parsed.result && typeof parsed.result === 'string') {
      parsed.result = postProcessPackage(parsed.result, text)
    }
    // 해독 모드 후처리
    if (parsed.highlighted && typeof parsed.highlighted === 'string') {
      const result = postProcessDecode(parsed.highlighted, parsed.core)
      parsed.highlighted = result.highlighted
      parsed.ratio = result.ratio
    }
    return Response.json({ ...parsed, _used: newUsed, _limit: DAILY_LIMIT })
  } catch {
    return Response.json({ error: 'Failed to parse AI response' }, { status: 502 })
  }
}
