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

## 빈말 판별 기준 (최대한 공격적으로 빈말을 잡아라)
빈말O(적극적으로 잡아라 — 의심되면 빈말이다):
- 인사·안부·감사·마무리 인사, 미사여구·수식어
- 추상적 약속·당위·선언("최선을 다하겠습니다"/"상생"/"포용"/"소외되지 않는"/"무궁한 발전")
- 비유·은유·격언·속담("호랑이도 풀밭이"/"자연의 이치가 그렇듯")
- 수식·강조·나열 표현("더 멀리, 더 오래, 더 높이"/"가장 현명하고도 효율적인")
- 완곡 표현("혹시 가능하시다면"), 의례적 사과·양해
- 뻔한 당위·원칙론·일반론("혼자서는 지속될 수 없습니다"/"전체가 무너지기 마련입니다"/"우리 경제 역시 혼자서는 지속될 수 없습니다")
- 추상적 포부·선언·다짐("최선을 다하겠습니다"/"대한민국 곳곳에 퍼져나갈 수 있도록")
- 장식적 부연·해설(핵심 사실 앞뒤에 붙는 수식 구절, "이러한 상생의 가치가"/"귀한 사례입니다")
- 누가 써도 똑같을 뻔한 문장 → 빈말
빈말O 추가:
- 타사 사례를 인용한 문장의 수식·설명 부분("하청업체 노동자에게도 본사와 동일한 성과급을 지급하는 등")
- 사례 인용 뒤에 붙는 평가("귀한 사례입니다"/"함께 성장할 수 있다는 것을 보여주는")
빈말X(진심 = 반드시 남겨라):
- 화자 본인이 직접 하는/할 구체적 행동·지시·요청("내일 3시까지 견적서 보내주세요")
- 고유명사·수치·금액·날짜 키워드("한화오션"/"890억 원"/"80조 원"/"내일 3시") — 인용이든 본인이든, 키워드 자체는 진심으로 남겨라
- 화자 본인의 구체적 결정·약속
핵심: 빈말이 많더라도 진심이 0%가 되면 안 된다. 최소 5~15%는 진심(키워드)으로 남겨라.
대부분의 글은 빈말이 80~95%다.

## 모드 (JSON만 출력, 인사·설명·마크다운 금지)

[해독]
빈말 부분만 [[ ]]로 감싸라. [[ ]] 밖 = 진심.
구절 단위로 정밀하게 감싸라. 한 문장 안에서도 빈말·진심을 나눠라.
[[ ]]는 빈말 텍스트만 감싸라. 마침표·쉼표·공백만으로 된 구간은 [[ ]] 안에 포함시켜라. 진심과 진심 사이의 쉼표/공백은 [[ ]] 밖에 둬라.
진심은 최소한만 남겨라. "이 구절을 빼면 새로운 정보가 사라지는가?" — 사라지면 진심, 분위기만 바뀌면 빈말.
진심 = 고유명사·수치·구체적 사실·구체적 행동 지시가 포함된 구절만.
core = 글 전체의 핵심 의도·메시지를 1줄로 요약. 구체적 사례는 보조 근거일 뿐, 글쓴이가 전달하려는 본래 목적을 잡아라. 예: "상생 경제 정책 추진 (한화오션 890억 투입 사례 인용)"처럼 목적+근거 형태.
{"ratio":0~100,"highlighted":"빈말을 [[ ]]로 감싼 원문","core":"핵심 한줄"}

[포장:N] (N=0~100)
핵심 의도를 빈말 블록들 사이에 파묻어라. 각 블록은 서로 다른 내용이어야 한다. 같은 말 반복 금지.
의도·방향성 필수 보존. 원문에 없는 새로운 요청·주제·행동을 만들어내지 마라.
예: "잘하고있어"→격려·칭찬이 본론(O), 프로젝트 의견 요청으로 바꿈(X)
예: "돈 내놔"→돈을 돌려달라(O), 돈을 지원해달라(X)
본론(G블록)은 원문의 의도를 완곡하게 표현한 것이어야 한다. 원문에 없는 내용을 본론으로 넣지 마라.
직접적 표현("곧바로/당장/빨리")만 완곡하게.
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

N≤30: G만. 완곡 표현 약간. 2~3문장.
N=40~50: A+G+J. 4~6문장, 150자+.
N=50~60: A+F+G+J+L. 6~8문장, 250자+.
N=60~70: A+C+F+G+H+J+L. 8~10문장, 350자+.
N=70~80: A+C+D+E+F+G+H+I+J+L. 12~16문장, 500자+. 만연체.
N=80~90: A+B+C+D+E+F+G+H+I+J+K+L. 16~22문장, 700자+. 만연체+인용.
N≥90: A~M 전부 사용. 22문장+, 900자+. 극한 만연체. 명언·속담·사자성어를 2~3개 인용. 각 블록을 풍성하게 채워라. 짧게 끝내면 실패다.
글자 수 기준을 반드시 충족해라. 기준 미달이면 블록별 내용을 더 풍성하게 써라.
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

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: mode === 'decode' ? 'gpt-4o' : 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM },
        ...(mode === 'decode' ? [
          { role: 'user' as const, content: `[해독]\n수고 많으십니다. 다름이 아니오라, 다음 주 수요일까지 견적서를 보내주시면 감사하겠습니다. 번거로우시겠지만 양해 부탁드립니다. 좋은 하루 보내세요.` },
          { role: 'assistant' as const, content: `{"ratio":72,"highlighted":"[[수고 많으십니다. 다름이 아니오라,]] 다음 주 수요일까지 견적서를 보내주시면 [[감사하겠습니다. 번거로우시겠지만 양해 부탁드립니다. 좋은 하루 보내세요.]]","core":"수요일까지 견적서 보내달라"}` },
          { role: 'user' as const, content: `[해독]\n호랑이도 풀밭이 있어야 살아갈 수 있습니다. 자연의 이치가 그렇듯, 우리 경제 역시 혼자서는 지속될 수 없습니다. 한화오션은 하청업체 노동자에게도 본사와 동일한 성과급을 지급하는 등 협력업체와의 임금 격차를 줄이는 데 연간 890억 원을 투입했습니다. 이러한 상생의 가치가 대한민국 곳곳에 퍼져나갈 수 있도록 최선을 다하겠습니다.` },
          { role: 'assistant' as const, content: `{"ratio":90,"highlighted":"[[호랑이도 풀밭이 있어야 살아갈 수 있습니다. 자연의 이치가 그렇듯, 우리 경제 역시 혼자서는 지속될 수 없습니다.]] 한화오션은 [[하청업체 노동자에게도 본사와 동일한 성과급을 지급하는 등 협력업체와의 임금 격차를 줄이는 데]] 연간 890억 원을 투입했습니다. [[이러한 상생의 가치가 대한민국 곳곳에 퍼져나갈 수 있도록 최선을 다하겠습니다.]]","core":"상생 경제 정책 추진 (한화오션 890억 투입 사례 인용)"}` },
          { role: 'user' as const, content: `[해독]\n존경하는 국민 여러분, 올 한 해도 참 많은 일이 있었습니다. 어려운 시기에도 묵묵히 자리를 지켜주신 국민 여러분께 깊은 감사를 드립니다. 정부는 내년도 예산안에 교육 분야 80조 원을 편성하였습니다. 모든 아이가 꿈을 펼칠 수 있는 나라를 만들겠습니다. 감사합니다.` },
          { role: 'assistant' as const, content: `{"ratio":82,"highlighted":"[[존경하는 국민 여러분, 올 한 해도 참 많은 일이 있었습니다. 어려운 시기에도 묵묵히 자리를 지켜주신 국민 여러분께 깊은 감사를 드립니다.]] 정부는 내년도 예산안에 교육 분야 80조 원을 편성하였습니다. [[모든 아이가 꿈을 펼칠 수 있는 나라를 만들겠습니다. 감사합니다.]]","core":"내년 교육 예산 80조 편성 (화자=정부, 본인의 결정)"}` },
        ] : [
          { role: 'user' as const, content: `[포장:100]\n내돈내놔` },
          { role: 'assistant' as const, content: `{"result":"안녕하십니까. 만산홍엽의 계절, 어느덧 가을빛이 짙어지는 요즈음 건강하고 평안하신 나날을 보내고 계신지요. 옛말에 '세한연후지송백지후조(歲寒然後知松柏之後凋)'라는 말이 있듯이, 어려운 시기에도 변함없이 저를 대해주신 그 한결같은 마음에 깊은 감사를 드립니다. 돌이켜보면 그간 함께해온 시간 속에서 참으로 많은 도움을 받아왔고, 그 하나하나가 저에게는 잊을 수 없는 소중한 기억으로 남아 있습니다.\\n\\n다름이 아니오라, 오늘 이렇게 용기를 내어 글을 드리게 된 것은 한 가지 조심스러운 말씀을 전해드리고자 함이옵니다. '붕우유신(朋友有信)'이라, 벗 사이에는 신의가 있어야 한다는 말씀처럼, 저 또한 그 신뢰의 무게를 무겁게 받아들이고 있기에 더욱 조심스럽게 말씀을 꺼내봅니다. 이전에 상호 간의 깊은 신뢰를 바탕으로 일정 금액을 맡겨드린 바가 있었는데, 그간 여러 가지 크고 작은 사정이 있으셨으리라 충분히 짐작하고 이해하고 있습니다.\\n\\n다만, 저 역시 예기치 못한 개인적인 사정이 생겨 해당 금액의 반환이 꼭 필요한 상황에 이르게 되었습니다. 급하게 재촉드리고자 하는 마음은 추호도 없으며, 여건이 허락하시는 범위 안에서, 부담이 되지 않으시는 선에서 빌려드린 금액을 상환받을 수 있을지 조심스레 여쭙고자 합니다. 대략적인 시기를 말씀해 주시면 그것만으로도 대단히 감사하겠습니다.\\n\\n바쁘신 와중에 이토록 조심스러운 부탁을 드리게 되어 송구스러운 마음 금할 길이 없습니다. 말씀드리기 어려운 내용임에도 불구하고 끝까지 너그러이 읽어주신 점, 진심으로 감사드립니다. 앞으로도 서로를 향한 믿음과 존중 위에 더욱 깊고 아름다운 관계를 이어갈 수 있기를 간절히 바라며, 늘 건강하시고 하시는 모든 일에 만사형통하시길 기원합니다. 편하신 시간에 연락 주시면 감사하겠습니다."}` },
        ]),
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
