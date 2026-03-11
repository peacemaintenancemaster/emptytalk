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

## 빈말 판별 (3단계)
1단계: core를 먼저 정해라. "이 글이 무엇을 말하려는 건가?" 한 줄로 요약하되, 너무 추상적이면 안 된다. 예: "경제 발전"(X, 너무 막연) → "상생을 통한 경제 성장 주장"(O, 방향성 포함).
2단계: 원문에서 core를 직접 뒷받침하는 핵심 키워드·구절만 진심. 나머지는 전부 빈말.
3단계: 진심이 0%면 core 관련 키워드를 최소 1~2개 진심으로 남겨라 (5~15%).
같은 단어가 원문에 여러 번 나오면 처음 한 번만 진심으로 남기고 나머지 반복은 빈말 처리하라.

진심 판단법: "이 구절이 core와 직접 연결되는가?"
- 연결됨 → 진심 (예: core가 "견적서 요청"이면 "다음 주 수요일까지 견적서를 보내주시면"이 진심)
- 연결 안 됨 → 빈말 (인사·감사·인용 사례·비유·수식·당위론·포부·선언 등 전부)

빈말의 대표 유형: 인사/안부/감사/마무리, 비유·격언·속담, 수식·강조·나열, 당위론·일반론, 추상적 포부·다짐, 완곡 표현, 타사 사례 인용 및 부연·평가
대부분의 글은 빈말 80~95%다.

## 모드 (JSON만 출력, 인사·설명·마크다운 금지)

[해독]
빈말 부분을 [[ ]]로 감싸라. [[ ]] 밖 = 진심.
진심은 문장 단위가 아니라 키워드 단위로 최소한만 남겨라. 한 문장 안에서도 핵심 키워드만 [[ ]] 밖에 두고 나머지 수식어는 [[ ]] 안에 넣어라.
예: "[[그렇기에]] 상생[[을 실천하는 것은 기업의 지속 성장을 위한 가장 현명하고도 효율적인 투자라고 생각합니다.]]" — "상생"만 진심.
마침표·쉼표·공백은 인접한 [[ ]] 안에 포함시켜라.
{"ratio":0~100,"highlighted":"빈말을 [[ ]]로 감싼 원문","core":"핵심 한줄"}

[포장:N] (N=0~100)
핵심 의도를 빈말 블록들 사이에 파묻어라. 각 블록은 서로 다른 내용이어야 한다. 같은 말 반복 금지.
의도·방향성 필수 보존. 원문에 없는 새로운 요청·주제·행동을 만들어내지 마라.
예: "잘하고있어"→격려·칭찬이 본론(O), 프로젝트 의견 요청으로 바꿈(X)
예: "돈 내놔"→돈을 돌려달라(O), 돈을 지원해달라(X)
예: "기똥차네요"→감탄·칭찬이 본론(O), 도움받은 사연을 지어냄(X)
본론(G블록)은 원문의 의도를 공적 언어로 순화한 문장을 반드시 포함해야 한다. 의도가 빠지면 실패다.
순화 예시: "꺼져"→"자리를 비켜주시기를 정중히 부탁드립니다", "내놔"→"돌려주시길 요청드립니다", "빨리 해"→"신속히 처리해 주시면 감사하겠습니다"
원문에 없는 내용을 본론으로 넣지 마라. 직접적 표현만 완곡하게.
절대 규칙 — 사연·맥락·배경·상황을 지어내지 마라. "도움을 받았다", "프로젝트를 진행했다", "사정이 생겼다" 등 원문에 없는 스토리를 만들면 실패다. G블록 외의 모든 블록은 일반적인 미사여구(인사·날씨·안부·감사·기원 등)만 사용하라. 구체적 사건이나 경험을 언급하지 마라.
존댓말·격식체 필수. 반말·비속어·욕설·비하 금지. 입력에 있으면 순화.
절대 규칙 — 입력 원문을 결과에 직접 인용하지 마라. 따옴표로 감싸서 인용하거나, "~라는 표현" "~라고 하신 말씀" 같은 메타 언급도 금지. 원문이 결과 텍스트 어디에도 등장하면 안 된다. 처음부터 순화된 새 문장으로만 작성하라.
호칭 임의 지정 금지("고객님/선배님/팀장님" 등). 호칭이 필요하면 "귀하께서/귀하께/귀하는" 등 조사 붙여 사용. "귀하" 단독 사용 금지.

## 빈말 블록 메뉴 (N에 따라 아래에서 골라 조합)
A.인사: 격식 서두 인사
B.날씨/시절: 계절·날씨·시사 언급("선선한 바람이 부는 요즈음"/"세월이 유수와 같아")
C.안부: 상대 건강·안녕 기원
D.관계감사: 평소 관계·도움에 대한 감사
E.배경: 요청하게 된 배경·맥락 설명
F.양해: 부탁을 드리게 되어 송구하다는 사전 양해
G.본론: 핵심 메시지(완곡하게)
H.부연: 본론에 대한 추가 설명·이유
I.배려: 상대 사정 고려("부담 되시지 않는 선에서")
J.감사: 검토·고려해주심에 대한 감사
K.미래: 앞으로의 관계·협력 기대
L.마무리: 건강·행복·번영 기원
M.추신: 부가적인 마무리 한마디 (P.S. 표기 금지, 자연스럽게 이어붙여라)

## 문체 규칙
N≥70이면 만연체를 적극 사용하라:
- 명언·속담·사자성어 인용("옛말에 ~라는 말이 있듯이"/"~라는 사자성어처럼")
- 비유·은유를 섞어 문장을 길고 우아하게 늘려라
- 한 문장 안에 여러 절을 이어붙여 장문으로 만들어라
- N≥90이면 극단적으로 길어도 좋다. 각 블록을 3~5문장씩 만연하게 채워라.

N≤10: G만. 1~2문장. 최소한의 완곡.
N=10~30: G만. 2~3문장. 완곡 표현 약간.
N=30~40: A+G+J. 3~5문장.
N=40~50: A+G+J+L. 4~6문장, 150자+.
N=50~60: A+F+G+J+L. 6~8문장, 250자+.
N=60~70: A+C+F+G+H+J+L. 8~10문장, 350자+.
N=70~80: A+C+D+E+F+G+H+I+J+L. 12~16문장, 500자+. 만연체.
N=80~90: A+B+C+D+E+F+G+H+I+J+K+L. 16~22문장, 700자+. 만연체+인용.
N≥90: A~M 전부 사용. 22문장+, 900자+. 극한 만연체. 명언·속담·사자성어를 2~3개 인용. 각 블록을 3~5문장씩 풍성하게 채워라. 짧게 끝내면 실패다.
글자 수 기준을 반드시 충족해라. 기준 미달이면 블록별 내용을 더 풍성하게 써라.
N≥60이면 블록 그룹 사이에 빈 줄(\\n\\n)로 문단을 나눠라. 인사+안부 / 양해+본론+부연 / 감사+마무리 등 의미 단위로 문단 구분.
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
  const mode = body.mode
  const maxLen = mode === 'decode' ? 1000 : 100
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
    model: mode === 'decode' ? 'gpt-4o' : 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM },
      ...(mode === 'decode' ? [
          { role: 'user' as const, content: `[해독]\n수고 많으십니다. 다름이 아니오라, 다음 주 수요일까지 견적서를 보내주시면 감사하겠습니다. 번거로우시겠지만 양해 부탁드립니다. 좋은 하루 보내세요.` },
          { role: 'assistant' as const, content: `{"ratio":85,"highlighted":"[[수고 많으십니다. 다름이 아니오라,]] 다음 주 수요일까지 견적서[[를 보내주시면 감사하겠습니다. 번거로우시겠지만 양해 부탁드립니다. 좋은 하루 보내세요.]]","core":"수요일까지 견적서 요청"}` },
          { role: 'user' as const, content: `[해독]\n호랑이도 풀밭이 있어야 살아갈 수 있습니다. 자연의 이치가 그렇듯, 우리 경제 역시 혼자서는 지속될 수 없습니다. 한화오션은 하청업체 노동자에게도 본사와 동일한 성과급을 지급하는 등 협력업체와의 임금 격차를 줄이는 데 연간 890억 원을 투입했습니다. 이러한 상생의 가치가 대한민국 곳곳에 퍼져나갈 수 있도록 최선을 다하겠습니다.` },
          { role: 'assistant' as const, content: `{"ratio":93,"highlighted":"[[호랑이도 풀밭이 있어야 살아갈 수 있습니다. 자연의 이치가 그렇듯, 우리 경제 역시 혼자서는 지속될 수 없습니다. 한화오션은 하청업체 노동자에게도 본사와 동일한 성과급을 지급하는 등 협력업체와의 임금 격차를 줄이는 데 연간 890억 원을 투입했습니다. 이러한]] 상생[[의 가치가 대한민국 곳곳에 퍼져나갈 수 있도록 최선을 다하겠습니다.]]","core":"상생을 통한 경제 성장 주장"}` },
          { role: 'user' as const, content: `[해독]\n존경하는 국민 여러분, 올 한 해도 참 많은 일이 있었습니다. 어려운 시기에도 묵묵히 자리를 지켜주신 국민 여러분께 깊은 감사를 드립니다. 정부는 내년도 예산안에 교육 분야 80조 원을 편성하였습니다. 모든 아이가 꿈을 펼칠 수 있는 나라를 만들겠습니다. 감사합니다.` },
          { role: 'assistant' as const, content: `{"ratio":87,"highlighted":"[[존경하는 국민 여러분, 올 한 해도 참 많은 일이 있었습니다. 어려운 시기에도 묵묵히 자리를 지켜주신 국민 여러분께 깊은 감사를 드립니다. 정부는]] 내년도 예산안에 교육 분야 80조 원을 편성[[하였습니다. 모든 아이가 꿈을 펼칠 수 있는 나라를 만들겠습니다. 감사합니다.]]","core":"교육 예산 80조 편성"}` },
        ] : [
          { role: 'user' as const, content: `[포장:100]\n내돈내놔` },
          { role: 'assistant' as const, content: `{"result":"안녕하십니까, 평소 베풀어 주시는 각별한 관심과 성의에 깊은 감사의 인사를 올립니다. 선선한 바람이 부는 요즈음, 늘 건강하시고 평안하신 나날을 보내고 계신지 안부를 여쭙습니다. 항상 변함없이 베풀어 주시는 따뜻한 마음에 깊이 감사드리며, 귀한 인연에 늘 감사하는 마음을 품고 있사옵니다.\\n\\n다름이 아니오라, 일전에 저희 사이에 논의되었던 소중한 약속과 관련하여 조심스럽게 말씀을 드리고자 실례를 무릅쓰고 연락을 드리게 되었습니다. 바쁘신 일상 속에서 이러한 말씀을 드리는 것이 송구스러운 마음이 앞서오나, 서로 간의 신뢰를 바탕으로 맺어진 정당한 절차를 원활히 마무리 짓고자 하는 간절한 바람으로 서면을 작성하게 되었습니다. 상호 간에 합의되었던 바에 따라, 해당 금액을 돌려주시기를 정중히 요청드립니다. 혹여 실례가 되지 않는다면 대략적인 시기를 말씀해 주시면 그것만으로도 대단히 감사하겠습니다.\\n\\n귀하께서도 여러 가지 제반 사정이 있으시리라 충분히 짐작되오나, 부담 되시지 않는 범위 안에서 검토해 주신다면 더할 나위 없는 큰 힘이 될 것입니다. 앞으로도 서로를 향한 믿음과 존중 위에 더욱 깊고 아름다운 관계를 이어갈 수 있기를 간절히 바라며, 늘 건강하시고 하시는 모든 일에 무궁한 발전과 평안이 깃들기를 진심으로 기원합니다. 긴 글 읽어주셔서 대단히 감사합니다."}` },
          { role: 'user' as const, content: `[포장:100]\n야 꺼져` },
          { role: 'assistant' as const, content: `{"result":"안녕하십니까, 화창한 봄빛이 세상을 환히 밝히는 아름다운 요즈음 건강하시고 평안하신 나날을 보내고 계신지 안부를 여쭙습니다. '군자지교담여수(君子之交淡如水)'라는 옛말이 있듯이, 사람과 사람 사이의 관계란 때로는 적절한 거리가 있어야 더욱 빛나는 법이라 사료됩니다. 늘 변함없이 보여주시는 성실함과 열정에 깊은 감사와 존경의 마음을 전하고자 합니다.\\n\\n다름이 아니오라, 한 가지 조심스러운 말씀을 전해드리고자 실례를 무릅쓰게 되었습니다. 여러 가지 사정을 깊이 고려한 끝에, 이 자리에서 물러나 주시기를 정중히 부탁드립니다. 급하게 재촉드리고자 하는 마음은 추호도 없으며, 귀하께서 편하신 시간에 자리를 옮겨주시면 그것만으로도 대단히 감사하겠습니다.\\n\\n바쁘신 와중에 이토록 조심스러운 부탁을 드리게 되어 송구스러운 마음 금할 길이 없사옵니다. 귀하께서 너그러이 읽어주신 점 진심으로 감사드리며, 앞으로도 서로를 향한 믿음과 존중 위에 좋은 관계를 이어갈 수 있기를 바랍니다. 늘 건강하시고 하시는 모든 일에 만사형통하시길 두 손 모아 기원합니다."}` },
        ]),
        { role: 'user', content: userMsg },
      ],
      temperature: mode === 'decode' ? 0.4 : 0.9,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    })

  // Retry logic: up to 2 attempts
  let content: string | null = null
  let lastError = ''
  for (let attempt = 0; attempt < 2; attempt++) {
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
        lastError = err.error?.message || `OpenAI API error (${res.status})`
        continue
      }

      const data: any = await res.json()
      content = data.choices?.[0]?.message?.content
      if (!content) {
        lastError = 'Empty AI response'
        continue
      }
      break
    } catch (e: any) {
      lastError = e?.message || 'Network error'
      continue
    }
  }

  if (!content) {
    return Response.json({ error: lastError || 'AI 응답 실패' }, { status: 502 })
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
    // 해독 모드 후처리
    if (parsed.highlighted && typeof parsed.highlighted === 'string') {
      let raw = parsed.highlighted

      // 1) 공백·구두점만으로 이루어진 진심 구간을 빈말로 병합
      // ]]와 [[ 사이에 공백·구두점만 있으면 빈말 안으로 흡수
      raw = raw.replace(/\]\]([\s.,;:!?·…—\-–'"'"「」『』()（）《》<>]+)\[\[/g, '$1')

      // 2) 같은 키워드가 진심으로 여러 번 나오면 첫 번째만 남기고 나머지는 빈말 처리
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
          // 원본 텍스트 그대로 매칭하여 빈말로 흡수
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

      parsed.highlighted = raw

      // ratio 계산
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
