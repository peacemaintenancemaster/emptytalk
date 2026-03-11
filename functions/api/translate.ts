const SYSTEM = `너는 한국어 빈말(의례적·관습적·장식적 표현) 분석·생성 도구다.

## 빈말 패턴
서두: 수고 많으십니다/좋은 협업에 감사/무궁한 발전 기원/다름이 아니오라/안부 인사
요청: 혹시 가능하시다면/부담이 되지 않으신다면/번거로우시겠지만/실례가 되지 않는다면/양해 부탁/편하신 시간에
거절: 심사숙고한 끝에/부득이하게/어려울 것으로 사료/아쉽게도/다음 기회에/긍정적으로 검토하였으나
사과: 깊이 사과/심려를 끼쳐/진심으로 불편을 드린 점/재발 방지/송구스럽게도
지시: 만전을 기해/각별한 관심/철저히 이행/긴밀히 협조/일체의 차질 없도록
보고: 말씀해 주신 사항/아래와 같이 보고/추가 문의사항 있으시면 언제든
마무리: 긴 글 읽어주셔서/건승하시길/좋은 결과 있으시길/변함없는 관심 부탁
미사여구: 좋은 파트너십/소중한 의견/깊이 감사/값진 경험
완곡어미: ~할 수 있을까요/~하면 감사하겠습니다/~것으로 사료됩니다
캐주얼: ㅎㅎ/ㅋㅋ/넵/아 네/습관적 감사합니다

## 규칙
- 제거해도 핵심 의미 보존되면 빈말
- 모호하면 빈말(재미 우선)
- 진심 감정(진짜 분노·감사)은 빈말 아님

## 모드 (JSON만 출력, 인사·설명·마크다운 금지)

[해독]
{"ratio":0~100,"highlighted":"빈말을 [[ ]]로 감싼 원문","core":"핵심 한줄"}

[포장:N] (N=0~100)
{"result":"포장된 메시지"}`

const DAILY_LIMIT = 5

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

  let used = 0
  if (context.env.RATE_LIMIT) {
    const val = await context.env.RATE_LIMIT.get(rateKey)
    used = val ? parseInt(val, 10) : 0

    if (used >= DAILY_LIMIT) {
      return Response.json(
        { error: '오늘의 사용 횟수(5회)를 모두 소진했습니다. 내일 다시 이용해주세요.', used, limit: DAILY_LIMIT },
        { status: 429 }
      )
    }
  }

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
  if (text.length > 1000) {
    return Response.json({ error: 'Text too long (max 1000 chars)' }, { status: 400 })
  }

  const mode = body.mode
  let userMsg: string
  if (mode === 'decode') {
    userMsg = `[해독]\n${text}`
  } else if (mode === 'package') {
    const level = Math.min(100, Math.max(0, Math.round(body.level ?? 60)))
    userMsg = `[포장:${level}]\n${text}`
  } else {
    return Response.json({ error: 'Invalid mode' }, { status: 400 })
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: userMsg },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const err: any = await res.json().catch(() => ({}))
    return Response.json(
      { error: err.error?.message || `OpenAI API error (${res.status})` },
      { status: 502 }
    )
  }

  const data: any = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) {
    return Response.json({ error: 'Empty AI response' }, { status: 502 })
  }

  // Increment rate limit after successful response
  const newUsed = used + 1
  if (context.env.RATE_LIMIT) {
    await context.env.RATE_LIMIT.put(rateKey, String(newUsed), { expirationTtl: 86400 })
  }

  try {
    const parsed = JSON.parse(content)
    return Response.json({ ...parsed, _used: newUsed, _limit: DAILY_LIMIT })
  } catch {
    return Response.json({ error: 'Failed to parse AI response' }, { status: 502 })
  }
}
