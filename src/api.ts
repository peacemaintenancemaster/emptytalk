export interface DecodeResult {
  percentage: number
  segments: { text: string; type: 'empty' | 'genuine' }[]
  summary: string
}

export interface PackageResult {
  versions: { level: number; label: string; text: string }[]
}

const DECODE_SYSTEM = `당신은 "빈말 분석기"입니다. 한국어 텍스트를 분석하여 빈말(불필요한 인사, 형식적 표현, 과도한 공손 표현, 의미 없는 수식어)과 진심(핵심 메시지, 실제 의도, 구체적 요청/정보)을 구분합니다.

분석 원칙:
- "안녕하세요", "감사합니다", "수고하셨습니다" 등 관용적 인사는 빈말
- "다름이 아니오라", "혹시 가능하시다면", "바쁘시겠지만", "번거로우시겠지만" 등은 빈말
- "좋은 하루 되세요", "늘 건승하시길" 등 마무리 인사는 빈말
- 구체적 날짜, 이름, 요청사항, 정보는 진심
- 조건/이유/배경 설명 중 핵심적인 것은 진심, 꾸미기만 하는 것은 빈말
- 빈말 비율은 과감하게 높게 잡으세요 (재미 요소)

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

export async function analyzeText(text: string, apiKey: string): Promise<DecodeResult> {
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
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `API 오류 (${res.status})`)
  }

  const data = await res.json()
  return JSON.parse(data.choices[0].message.content)
}

export async function generatePackaged(text: string, apiKey: string): Promise<PackageResult> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: PACKAGE_SYSTEM },
        { role: 'user', content: text },
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `API 오류 (${res.status})`)
  }

  const data = await res.json()
  return JSON.parse(data.choices[0].message.content)
}
