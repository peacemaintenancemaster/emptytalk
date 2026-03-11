const SYSTEM = `너는 한국어 빈말(의례적·관습적·장식적 표현) 분석·생성 도구다.

## 빈말 패턴
서두: 수고 많으십니다/좋은 협업에 감사/무궁한 발전 기원/다름이 아니오라/안부 인사/항상 고생이 많으십니다/바쁘신 와중에 실례합니다/늘 노고에 감사드립니다
요청: 혹시 가능하시다면/부담이 되지 않으신다면/번거로우시겠지만/실례가 되지 않는다면/양해 부탁/편하신 시간에/무리가 되지 않으신다면/여건이 허락하신다면/가능하실 때/너무 급하지 않으시다면
거절: 심사숙고한 끝에/부득이하게/어려울 것으로 사료/아쉽게도/다음 기회에/긍정적으로 검토하였으나/여러 사정을 고려한 결과/현 시점에서는 다소 어려운 부분이/먼저 양해 말씀 드리며
사과: 깊이 사과/심려를 끼쳐/진심으로 불편을 드린 점/재발 방지/송구스럽게도/부족한 점이 있었던 점/미처 신경 쓰지 못한 부분
지시: 만전을 기해/각별한 관심/철저히 이행/긴밀히 협조/일체의 차질 없도록/적극적으로 추진해 주시기 바라며
보고: 말씀해 주신 사항/아래와 같이 보고/추가 문의사항 있으시면 언제든/말씀 주신 대로 검토한 결과를 공유드립니다
마무리: 긴 글 읽어주셔서/건승하시길/좋은 결과 있으시길/변함없는 관심 부탁/앞으로도 좋은 관계 이어가길/늘 건강하시고 좋은 일만 가득하시길/항상 응원하겠습니다/좋은 하루 보내세요
미사여구: 좋은 파트너십/소중한 의견/깊이 감사/값진 경험/뜻깊은 자리/의미 있는 시간/귀한 말씀/감사한 인연
완곡어미: ~할 수 있을까요/~하면 감사하겠습니다/~것으로 사료됩니다/~해주시면 큰 도움이 될 것 같습니다/~고려해 주시면 감사하겠습니다
캐주얼: ㅎㅎ/ㅋㅋ/넵/아 네/습관적 감사합니다/아이고~/에고~/아유~/덕분입니다~

## 빈말 판별 기준 (엄격 적용)
빈말O(적극적으로 잡아라):
- 인사·안부·감사·마무리 인사, 미사여구·수식어
- 추상적 약속·당위·선언("최선을 다하겠습니다"/"상생"/"포용"/"소외되지 않는"/"무궁한 발전")
- 비유·은유·격언("호랑이도 풀밭이"/"자연의 이치가 그렇듯")
- 수식·강조 표현("더 멀리, 더 오래, 더 높이"/"가장 현명하고도 효율적인")
- 완곡 표현("혹시 가능하시다면"), 의례적 사과·양해
- 뻔한 당위·원칙론("혼자서는 지속될 수 없습니다"/"전체가 무너지기 마련입니다")
빈말X(진심 = 이것만 남겨라):
- 구체적 행동·지시·요청(뭘 해달라/하겠다)
- 고유명사·수치·날짜·금액("한화오션"/"890억 원"/"내일 3시")
- 검증 가능한 사실("하청업체 노동자에게도 동일한 성과급을 지급하는")
진심은 최소한으로 남겨라. 애매하면 빈말이다.

## 모드 (JSON만 출력, 인사·설명·마크다운 금지)

[해독]
빈말 부분만 [[ ]]로 감싸라. [[ ]] 밖 = 진심.
문장 단위가 아니라 구절 단위로 정밀하게 감싸라. 한 문장 안에서도 빈말 부분과 진심 부분을 나눠라.
예: "[[수고 많으십니다. 다름이 아니오라,]] 회의를 내일 3시로 변경합니다. [[양해 부탁드립니다.]]"
예: "[[호랑이도 풀밭이 있어야 살아갈 수 있습니다. 자연의 이치가 그렇듯,]] 우리 경제 역시 혼자서는 지속될 수 없습니다."에서 "우리 경제 역시 혼자서는 지속될 수 없습니다"는 핵심 주장이므로 진심.
진심은 "이 부분이 없으면 메시지 의미가 달라지는가?"로 판단. 달라지면 진심, 없어도 같으면 빈말.
{"ratio":0~100,"highlighted":"빈말을 [[ ]]로 감싼 원문","core":"핵심 한줄"}

[포장:N] (N=0~100)
핵심 의도를 빈말 속에 파묻어라. N이 높을수록 진심은 최대한 간접적·완곡하게 숨기고, 빈말이 압도적으로 많아야 한다.
핵심 원칙:
- 핵심 메시지의 의도·방향성은 반드시 보존. "돈 내놔"→"돈을 돌려달라"(O), "돈을 지원해달라"(X). 요청·항의·독촉·거절 등 원래 의도를 왜곡하지 마라.
- 진심(본론)은 에둘러 표현하되 의미는 정확히. "곧바로", "당장", "빨리" 같은 직접적 표현만 완곡하게 바꿔라.
- N이 높을수록 본론 도달까지 빈말을 더 많이 쌓고, 본론 자체도 2~3겹 완곡하게 감싸라.
- 한자어 관용구·격식 어휘 적극 활용(무궁한 발전/건승/사료/고견/심려/제고/송구 등).
매번 다른 패턴 조합. 같은 서두·마무리 반복 금지.
출력은 반드시 존댓말·격식체. 반말·비속어·욕설·비하·멸칭 절대 금지. 입력에 있으면 정중하게 순화.
상대 호칭은 임의로 정하지 마라("고객님", "선배님", "팀장님" 등 관계 추측 금지). 호칭 없이 쓰거나, 최대한 중립적으로("귀하" 정도만 허용).
N≤30: 완곡 표현 약간. 3~4문장.
N=40~60: 서두 인사+양해+완곡 요청+감사+마무리. 비즈니스 톤. 5~8문장, 150자 이상.
N=70~80: 격식 서두+안부+배경 설명+양해+에둘러 본론+부연+감사+마무리 덕담. 8~12문장, 250자 이상.
N≥90: 최대한 길게 늘려라. 화려한 격식 서두+시절 인사+상대 안부·건강 기원+근황 언급+관계에 대한 감사+배경 맥락 장황하게+양해 구하기+본론을 3겹 완곡 표현으로+부가 설명+재차 양해+깊은 감사+마무리 덕담+건강·번영 기원+추신까지. 15문장 이상, 500자 이상.
[[ ]] 마크업 절대 사용 금지.
{"result":"빈말이 추가된 완성 메시지"}`

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
      temperature: mode === 'decode' ? 0.4 : 0.9,
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
  // [TEST_MODE] 테스트 중 사용횟수 차감 임시 비활성화
  const newUsed = used
  // const newUsed = used + 1
  // if (context.env.RATE_LIMIT) {
  //   await context.env.RATE_LIMIT.put(rateKey, String(newUsed), { expirationTtl: 86400 })
  // }

  try {
    const parsed = JSON.parse(content)
    // 포장 모드에서 [[ ]] 마크업이 남아있으면 강제 제거
    if (parsed.result && typeof parsed.result === 'string') {
      parsed.result = parsed.result.replace(/\[\[|\]\]/g, '')
    }
    // 해독 모드: AI의 ratio를 신뢰하지 않고 [[ ]] 기반으로 직접 계산
    if (parsed.highlighted && typeof parsed.highlighted === 'string') {
      const raw = parsed.highlighted
      const emptyMatch = raw.match(/\[\[(.*?)\]\]/gs)
      const emptyText = emptyMatch ? emptyMatch.map((m: string) => m.slice(2, -2)).join('') : ''
      const plainText = raw.replace(/\[\[|\]\]/g, '')
      if (plainText.length > 0) {
        parsed.ratio = Math.round((emptyText.length / plainText.length) * 100)
      }
    }
    return Response.json({ ...parsed, _used: newUsed, _limit: DAILY_LIMIT })
  } catch {
    return Response.json({ error: 'Failed to parse AI response' }, { status: 502 })
  }
}
