const DECODE_SYSTEM = `당신은 "빈말 분석기"입니다. 한국어 텍스트를 분석하여 빈말(불필요한 인사, 형식적 표현, 과도한 공손 표현, 의미 없는 수식어)과 진심(핵심 메시지, 실제 의도, 구체적 요청/정보)을 구분합니다.

분석 원칙:
- "안녕하세요", "감사합니다", "수고하셨습니다" 등 관용적 인사는 빈말
- "다름이 아니오라", "혹시 가능하시다면", "바쁘시겠지만", "번거로우시겠지만" 등은 빈말
- "좋은 하루 되세요", "늘 건승하시길" 등 마무리 인사는 빈말
- 구체적 날짜, 이름, 요청사항, 정보는 진심
- 조건/이유/배경 설명 중 핵심적인 것은 진심, 꾸미기만 하는 것은 빈말
- 빈말 비율은 과감하게 높게 잡으세요 (재미 요소)
- 반드시 genuine 세그먼트도 포함해야 합니다. 아무리 빈말이 많아도 핵심 메시지(날짜, 이름, 요청, 정보 등)는 genuine으로 분류하세요.
- percentage는 전체 텍스트 중 empty 세그먼트 글자수 비율입니다.

반드시 아래 JSON 형식으로만 응답하세요:
{
  "percentage": 73,
  "segments": [
    {"text": "안녕하세요, ", "type": "empty"},
    {"text": "수요일까지 견적서 보내주세요", "type": "genuine"},
    {"text": ". 감사합니다.", "type": "empty"}
  ],
  "summary": "수요일까지 견적서 요청"
}`

interface Env {
  OPENAI_API_KEY: string
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const apiKey = context.env.OPENAI_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'API key not configured' }, { status: 500 })
  }

  let body: { text?: string }
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

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: DECODE_SYSTEM },
        { role: 'user', content: text },
      ],
      temperature: 0.7,
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

  try {
    const parsed = JSON.parse(content)
    return Response.json(parsed)
  } catch {
    return Response.json({ error: 'Failed to parse AI response' }, { status: 502 })
  }
}
