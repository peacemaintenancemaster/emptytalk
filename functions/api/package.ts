const PACKAGE_SYSTEM = `당신은 "빈말 생성기"입니다. 핵심 메시지를 받아서 빈말 농도 4단계로 변환합니다.

각 단계 특성:
- 0% (직설): 핵심만. 최소한의 존댓말. 군더더기 없음.
- 30% (적당): 기본적인 인사 + 핵심 + "감사합니다" 정도.
- 60% (비즈니스): 인사 + 안부 + 핵심을 정중하게 + 양해 구함 + 마무리. 일반적인 비즈니스 메일 수준.
- 100% (풀빈말): 최대한 공손하고 장황하게. "다름이 아니오라", "혹시 업무에 큰 부담이 되지 않으신다면", "번거로운 부탁 드려 대단히 죄송합니다", "늘 건승하시길 바랍니다" 등 빈말의 향연. 실제 핵심은 전체의 20% 미만.

자연스러운 한국어 비즈니스 문체를 사용하세요. 각 단계별로 자연스럽고 현실적인 문장을 만드세요.

반드시 아래 JSON 형식으로만 응답하세요:
{
  "versions": [
    {"level": 0, "label": "직설", "text": "..."},
    {"level": 30, "label": "적당", "text": "..."},
    {"level": 60, "label": "비즈니스", "text": "..."},
    {"level": 100, "label": "풀빈말", "text": "..."}
  ]
}`

interface Env {
  GEMINI_API_KEY: string
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const apiKey = context.env.GEMINI_API_KEY
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

  if (text.length > 2000) {
    return Response.json({ error: 'Text too long (max 2000 chars)' }, { status: 400 })
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: PACKAGE_SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text }] }],
      generationConfig: {
        temperature: 0.8,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!res.ok) {
    const err: any = await res.json().catch(() => ({}))
    return Response.json(
      { error: err.error?.message || `Gemini API error (${res.status})` },
      { status: 502 }
    )
  }

  const data: any = await res.json()
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text
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
