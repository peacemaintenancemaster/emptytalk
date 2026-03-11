// ── 시스템 프롬프트 (모드별 분리, 최소화) ──
const SYSTEM_DECODE = `한국어 빈말 분석. JSON만 출력.
빈말을 [[]]로 감싸라. [[]] 밖=진심. 키워드 단위로 최소한만 진심.
짧은 욕설·감정표현은 전체가 진심.
{"h":"[[빈말]]진심[[빈말]]"}`

const SYSTEM_PACKAGE = `원문 의도를 격식체 존댓말로 순화하여 1~3문장 작성. JSON만 출력.
방향보존: 욕→비판유지, 요청→요청유지, 불만→지적유지. 사과·화해 금지.
원문 직접 인용 금지. 사연·상황 지어내지 마라. 호칭은 "귀하" 사용.
{"g":"순화된 본론"}`

const DAILY_LIMIT = 5

// ── 유틸리티 ──
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function getToday(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

function getSeason(): 'spring' | 'summer' | 'fall' | 'winter' {
  const month = new Date(new Date().getTime() + 9 * 60 * 60 * 1000).getMonth() + 1
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'fall'
  return 'winter'
}

function detectContext(text: string): 'business' | 'formal' | 'casual' {
  if (/사장|대표|부장|과장|팀장|거래|회사|업무|보고|납기|견적|프로젝트|미팅|계약|클라이언트|고객/.test(text)) return 'business'
  if (/선배|교수|선생|스승|어르신|부모|아버지|어머니|형|누나|오빠|언니/.test(text)) return 'formal'
  return 'casual'
}

// ── 입력 정규화 ──
function normalizeInput(text: string): string {
  return text
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// ── 포장모드 템플릿 풀 ──
const BLOCK_A: Record<string, Record<string, string[]>> = {
  spring: {
    business: [
      '화창한 봄날, 귀하의 건승과 귀사의 무궁한 발전을 기원합니다.',
      '봄기운이 완연한 요즘, 업무에 노고가 많으신 줄 압니다.',
      '따스한 봄날에 인사드립니다. 늘 수고가 많으십니다.',
    ],
    formal: [
      '봄바람이 따스한 요즘, 건강히 지내고 계신지 여쭙니다.',
      '봄기운이 완연한 계절에 안부 인사 올립니다.',
      '따스한 봄날, 평안하신지 여쭙니다.',
    ],
    casual: [
      '봄기운이 완연한 요즘, 안녕하신지요.',
      '따스한 봄날에 인사드립니다.',
      '화창한 봄날, 잘 지내고 계신지요.',
    ],
  },
  summer: {
    business: [
      '무더운 여름에도 변함없이 수고하시는 귀하께 경의를 표합니다.',
      '연일 계속되는 폭염 속에서도 건승하시길 기원합니다.',
      '한여름의 더위에도 업무에 매진하시는 귀하의 노고에 감사드립니다.',
    ],
    formal: [
      '무더운 여름, 건강히 잘 지내고 계신지 여쭙니다.',
      '연일 이어지는 더위에 건강은 어떠신지요.',
      '한여름의 무더위 속에서 안녕하신지 여쭙니다.',
    ],
    casual: [
      '무더운 날씨에 안녕하신지요.',
      '여름 더위에도 건강하시길 바랍니다.',
      '더운 날이 계속되는 요즘, 인사드립니다.',
    ],
  },
  fall: {
    business: [
      '천고마비의 계절, 귀하의 건승과 귀사의 발전을 기원합니다.',
      '가을이 깊어가는 요즘, 업무에 수고가 많으십니다.',
      '선선한 가을바람이 부는 계절에 인사드립니다.',
    ],
    formal: [
      '가을이 깊어가는 요즘, 평안하시길 바랍니다.',
      '풍요로운 가을 계절에 안부 인사 올립니다.',
      '선선한 가을날, 건강히 지내고 계신지 여쭙니다.',
    ],
    casual: [
      '가을 바람이 선선한 요즘, 안녕하신지요.',
      '가을이 깊어가는 좋은 계절에 인사드립니다.',
      '선선한 가을날, 잘 지내고 계신지요.',
    ],
  },
  winter: {
    business: [
      '매서운 겨울 추위 속에서도 건승하시길 기원합니다.',
      '한 해를 마무리하는 시점에, 귀하의 노고에 깊이 감사드립니다.',
      '겨울바람이 차가운 요즘, 업무에 수고가 많으십니다.',
    ],
    formal: [
      '추운 겨울, 건강히 지내고 계신지 여쭙니다.',
      '겨울의 찬 바람 속에서 평안하시길 바랍니다.',
      '매서운 추위가 이어지는 요즘, 안부 인사 올립니다.',
    ],
    casual: [
      '추운 겨울에 안녕하신지요.',
      '겨울바람이 매서운 요즘, 인사드립니다.',
      '찬 바람이 부는 계절, 잘 지내고 계신지요.',
    ],
  },
}

const BLOCK_B = [
  '항상 보여주시는 관심과 성원에 깊이 감사드립니다.',
  '평소 귀하의 노고에 진심으로 감사드리고 있습니다.',
  '늘 베풀어주시는 배려에 감사한 마음을 전합니다.',
]

const BLOCK_C = [
  '다름이 아니오라, 한 가지 말씀드릴 것이 있어 이렇게 글을 올립니다.',
  '이에 조심스럽게 한 말씀 올리고자 합니다.',
  '송구하오나, 한 가지 말씀드릴 것이 있습니다.',
]

const BLOCK_D = [
  '본론으로 들어가 말씀드리자면,',
  '이에 대해 솔직히 말씀드리자면,',
  '간곡히 말씀드리자면,',
]

const BLOCK_H = [
  '이 점 너그러이 양해하여 주시면 감사하겠습니다.',
  '부디 넓은 마음으로 헤아려주시기를 부탁드립니다.',
  '귀하의 너그러운 이해를 구하는 바입니다.',
]

const BLOCK_I = [
  '귀하의 깊은 이해와 협조를 부탁드립니다.',
  '현명하신 귀하의 고견을 여쭙고자 하오니, 검토 부탁드립니다.',
  '귀하의 현명한 판단을 신뢰하며 회신을 기다리겠습니다.',
]

const BLOCK_J = [
  '바쁘신 중에 긴 글 읽어주셔서 감사합니다.',
  '소중한 시간 내어 읽어주셔서 진심으로 감사합니다.',
  '두서없는 글 끝까지 읽어주셔서 감사합니다.',
]

const BLOCK_K = [
  '앞으로도 좋은 관계를 이어갈 수 있기를 진심으로 바랍니다.',
  '향후에도 변함없는 교류를 이어가길 희망합니다.',
  '앞으로도 귀하와의 소중한 인연이 계속되기를 바랍니다.',
]

const BLOCK_L = [
  '감사합니다.',
  '이만 줄입니다.',
  '두서없는 글 마칩니다.',
]

const BLOCK_M: Record<string, string[]> = {
  spring: [
    '봄날의 따스함처럼 늘 건강하시고 만사형통하시길 기원합니다.',
    '아름다운 봄날에 귀하의 건강과 행복을 빕니다.',
  ],
  summer: [
    '무더운 여름 건강 유의하시고, 늘 좋은 일만 가득하시길 바랍니다.',
    '더운 날씨에 건강 조심하시고 만사형통하시길 기원합니다.',
  ],
  fall: [
    '풍요로운 가을, 귀하의 건강과 행복을 기원합니다.',
    '가을의 풍성함처럼 좋은 일만 가득하시길 바랍니다.',
  ],
  winter: [
    '추운 겨울 건강 유의하시고, 늘 평안하시길 기원합니다.',
    '겨울 추위에 건강 조심하시고, 만복이 깃드시길 바랍니다.',
  ],
}

const IDIOMS = [
  '고진감래(苦盡甘來)라 하였사온데,',
  '역지사지(易地思之)의 마음을 담아,',
  '온고지신(溫故知新)의 자세로,',
  '화이부동(和而不同)의 정신에 입각하여,',
  '지성감천(至誠感天)이라 하였으니,',
  '유비무환(有備無患)의 뜻을 새기며,',
]

// ── 포장 조립 함수 ──
function assemblePackage(gBlock: string, level: number, inputText: string): string {
  const season = getSeason()
  const ctx = detectContext(inputText)

  // G블록 후처리 (욕설 치환 등)
  gBlock = postProcessPackage(gBlock, inputText)

  if (level <= 30) {
    return gBlock
  }

  if (level <= 60) {
    const a = pick(BLOCK_A[season][ctx])
    const j = pick(BLOCK_J)
    const l = pick(BLOCK_L)
    return `${a} ${gBlock} ${j} ${l}`
  }

  if (level <= 80) {
    const a = pick(BLOCK_A[season][ctx])
    const b = pick(BLOCK_B)
    const c = pick(BLOCK_C)
    const d = pick(BLOCK_D)
    const h = pick(BLOCK_H)
    const i = pick(BLOCK_I)
    const j = pick(BLOCK_J)
    return `${a} ${b}\n\n${c} ${d}\n\n${gBlock}\n\n${h} ${i}\n\n${j}`
  }

  // N≥80: 전체 블록 + 사자성어
  const a = pick(BLOCK_A[season][ctx])
  const b = pick(BLOCK_B)
  const c = pick(BLOCK_C)
  const idiom = pick(IDIOMS)
  const d = pick(BLOCK_D)
  const h = pick(BLOCK_H)
  const i = pick(BLOCK_I)
  const j = pick(BLOCK_J)
  const k = pick(BLOCK_K)
  const l = pick(BLOCK_L)
  const m = pick(BLOCK_M[season])
  return `${a} ${b}\n\n${c} ${idiom} ${d}\n\n${gBlock}\n\n${h} ${i}\n\n${j} ${k}\n\n${m}\n\n${l}`
}

// ── 서버사이드 core 추출 ──
function extractCore(highlighted: string): string {
  const parts: string[] = []
  let pos = 0
  const regex = /\[\[(.*?)\]\]/gs
  let match
  while ((match = regex.exec(highlighted)) !== null) {
    if (match.index > pos) {
      parts.push(highlighted.slice(pos, match.index))
    }
    pos = match.index + match[0].length
  }
  if (pos < highlighted.length) {
    parts.push(highlighted.slice(pos))
  }
  const genuine = parts.join(' ')
    .replace(/[\s.,;:!?·…—\-–'"'"「」『』()（）《》<>]+/g, ' ')
    .trim()
  if (!genuine) return '전체가 빈말'
  return genuine.length > 50 ? genuine.slice(0, 50) + '…' : genuine
}

// ── 포장모드: 공격적·비격식 어휘 → 격식체 치환 ──
const POLISH_MAP: Array<[RegExp, string]> = [
  [/개새끼/g, '귀하의 행태'],
  [/씨발/g, '극히 유감스러운'],
  [/시발/g, '극히 유감스러운'],
  [/지랄/g, '무리한 처사'],
  [/병신/g, '부적절한 처사'],
  [/빡치/g, '심히 유감스럽'],
  [/ㅅㅂ/g, '유감스러운'],
  [/ㅂㅅ/g, '부적절한'],
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
  [/제발/g, '부디'],
  [/나한테/g, '저에게'],
  [/나보고/g, '저에게'],
  [/나더러/g, '저에게'],
  [/니가/g, '귀하께서'],
  [/네가/g, '귀하께서'],
]

function postProcessPackage(result: string, inputText: string): string {
  result = result.replace(/\[\[|\]\]/g, '')
  for (const [pattern, replacement] of POLISH_MAP) {
    result = result.replace(pattern, replacement)
  }
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

  // 3) core 키워드가 빈말 안에 있으면 강제로 진심으로 꺼냄
  if (core) {
    const coreWords = (core.match(/[가-힣a-zA-Z0-9]{2,}/g) || [])
      .sort((a: string, b: string) => b.length - a.length)
    for (const kw of coreWords) {
      if (seenGenuine.has(kw)) continue
      const escKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const genuineCheck = new RegExp(`\\]\\][^\\[]*${escKw}[^\\[]*\\[\\[`)
      const atStart = new RegExp(`^[^\\[]*${escKw}`)
      const atEnd = new RegExp(`${escKw}[^\\]]*$`)
      if (genuineCheck.test(raw) || atStart.test(raw) || atEnd.test(raw)) continue
      const inEmptyRegex = new RegExp(`\\[\\[([^\\]]*?)(${escKw})([^\\[]*?)\\]\\]`)
      const emptyMatch = raw.match(inEmptyRegex)
      if (emptyMatch) {
        const before = emptyMatch[1]
        const keyword = emptyMatch[2]
        const after = emptyMatch[3]
        let replacement = ''
        if (before) replacement += `[[${before}]]`
        replacement += keyword
        if (after) replacement += `[[${after}]]`
        raw = raw.replace(emptyMatch[0], replacement)
        seenGenuine.add(kw)
      }
    }
    raw = raw.replace(/\[\[\]\]/g, '')
  }

  // 4) ratio 계산 (최대 99.9%)
  const emMatch = raw.match(/\[\[(.*?)\]\]/gs)
  const emptyText = emMatch ? emMatch.map((seg: string) => seg.slice(2, -2)).join('') : ''
  const plainText = raw.replace(/\[\[|\]\]/g, '')
  let ratio = 0
  if (plainText.length > 0) {
    ratio = Math.min(99.9, Math.round((emptyText.length / plainText.length) * 1000) / 10)
  }

  return { highlighted: raw, ratio }
}

// ── 메인 핸들러 ──
interface Env {
  OPENAI_API_KEY: string
  RATE_LIMIT: KVNamespace
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const apiKey = context.env.OPENAI_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'API key not configured' }, { status: 500 })
  }

  const ip = context.request.headers.get('CF-Connecting-IP') || 'unknown'
  const today = getToday()
  const rateKey = `rate:${ip}:${today}`

  // [TEST_MODE] 테스트 중 rate limit 체크 임시 비활성화
  let used = 0
  // if (context.env.RATE_LIMIT) {
  //   const val = await context.env.RATE_LIMIT.get(rateKey)
  //   used = val ? parseInt(val, 10) : 0
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

  const rawText = body.text?.trim()
  if (!rawText) {
    return Response.json({ error: 'Text is required' }, { status: 400 })
  }
  const mode = body.mode
  const maxLen = mode === 'decode' ? 800 : 100
  if (rawText.length > maxLen) {
    return Response.json({ error: `Text too long (max ${maxLen} chars)` }, { status: 400 })
  }

  // 입력 정규화 (AI에게 보낼 텍스트)
  const text = normalizeInput(rawText)

  let level = 60
  let systemPrompt: string
  let userMsg: string
  let fewShot: Array<{ role: 'user' | 'assistant'; content: string }>

  if (mode === 'decode') {
    systemPrompt = SYSTEM_DECODE
    userMsg = text
    fewShot = [
      { role: 'user', content: '수고 많으십니다. 다름이 아니오라, 다음 주 수요일까지 견적서를 보내주시면 감사하겠습니다. 양해 부탁드립니다.' },
      { role: 'assistant', content: '{"h":"[[수고 많으십니다. 다름이 아니오라,]] 다음 주 수요일까지 견적서[[를 보내주시면 감사하겠습니다. 양해 부탁드립니다.]]"}' },
    ]
  } else if (mode === 'package') {
    level = Math.min(100, Math.max(0, Math.round(body.level ?? 60)))
    systemPrompt = SYSTEM_PACKAGE
    userMsg = text
    fewShot = [
      { role: 'user', content: '야 꺼져' },
      { role: 'assistant', content: '{"g":"이 자리에서 물러나 주시기를 정중히 부탁드립니다."}' },
    ]
  } else {
    return Response.json({ error: 'Invalid mode' }, { status: 400 })
  }

  const openaiBody = JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      ...fewShot,
      { role: 'user', content: userMsg },
    ],
    temperature: mode === 'decode' ? 0.3 : 0.7,
    max_tokens: mode === 'decode' ? 1000 : 300,
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
          lastError = '잠시만 기다려주세요. 요청이 많아 처리가 지연되고 있습니다.'
          lastStatus = 429
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
          continue
        }
        lastError = '일시적인 오류가 발생했습니다. 다시 시도해주세요.'
        lastStatus = 502
        continue
      }

      const data: any = await res.json()
      content = data.choices?.[0]?.message?.content
      if (!content) {
        lastError = '응답을 생성하지 못했습니다. 다시 시도해주세요.'
        lastStatus = 502
        continue
      }
      break
    } catch (e: any) {
      lastError = '연결이 불안정합니다. 잠시 후 다시 시도해주세요.'
      lastStatus = 502
      continue
    }
  }

  if (!content) {
    return Response.json({ error: lastError || 'AI 응답 실패' }, { status: lastStatus })
  }

  // [TEST_MODE] 테스트 중 사용횟수 차감 임시 비활성화
  const newUsed = used
  // const newUsed = used + 1
  // if (context.env.RATE_LIMIT) {
  //   await context.env.RATE_LIMIT.put(rateKey, String(newUsed), { expirationTtl: 86400 })
  // }

  try {
    const parsed = JSON.parse(content)

    if (mode === 'package') {
      // AI가 g블록만 반환 → 서버에서 템플릿 조립
      const gBlock = parsed.g || parsed.result || ''
      const result = assemblePackage(gBlock, level, rawText)
      return Response.json({ result, _used: newUsed, _limit: DAILY_LIMIT })
    }

    if (mode === 'decode') {
      // AI가 h(highlighted)만 반환 → 서버에서 core/ratio 계산
      const rawHighlighted = parsed.h || parsed.highlighted || ''
      const core = extractCore(rawHighlighted)
      const result = postProcessDecode(rawHighlighted, core)
      return Response.json({
        highlighted: result.highlighted,
        ratio: result.ratio,
        core,
        _used: newUsed,
        _limit: DAILY_LIMIT,
      })
    }

    return Response.json({ error: 'Invalid mode' }, { status: 400 })
  } catch {
    return Response.json({ error: '응답을 처리하지 못했습니다. 다시 시도해주세요.' }, { status: 502 })
  }
}
