// ── 시스템 프롬프트 (포장모드만 AI 사용) ──
const SYSTEM_PACKAGE = `너는 "사용자→상대방"에게 보내는 업무 메일의 대필가다. JSON만 출력.
사용자=발신인. 상대방=수신인(귀하). 너는 발신인의 감정·의도를 격식체로 대필한다.

절대 금지:
- 상대방에게 충고/조언/권고/중재/감정조절 권유 → 이건 대필이 아니라 참견이다
- "차분하게","냉정하게","이해를","감정을 표현하고자" 등 상대 행동 유도 금지
- "권장합니다","권고합니다","바라봐주시기를" 등 훈계조 금지
- 원문 직접 인용, 상황 지어내기 금지
- 사극투 금지: ~하옵니다, ~사옵니다, ~이옵니다, ~하였사온데, ~사료되옵기에 등 고어체 금지

문체:
- 현대 비즈니스 격식체 사용: ~합니다, ~드립니다, ~하겠습니다, ~사료됩니다
- 우회적·완곡한 표현으로 문장을 길게. 수식절과 부연을 활용.
- 발신인이 욕하면 → 격식체로 욕의 의도를 전달 (비난/경멸/분노를 정중한 말투로)
- 발신인이 거절하면 → 격식체로 거절을 전달
- 3~5문장, 호칭 "귀하"

예시방향:
"개새끼" → "귀하의 인품에 대하여 심대한 의문을 제기하지 않을 수 없습니다" (O)
"개새끼" → "감정을 이해하오나 차분하게 대화하시기를 권합니다" (X, 참견)

t=의도(criticize|request|reject|complain|threaten|praise|general)
{"g":"격식체 대필문","t":"의도"}`

const DAILY_LIMIT = 5

// ── 유틸리티 ──
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

function getToday(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

function getSeason(): 'spring' | 'summer' | 'fall' | 'winter' {
  const month = new Date(Date.now() + 9 * 60 * 60 * 1000).getMonth() + 1
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

type Intent = 'criticize' | 'request' | 'reject' | 'complain' | 'threaten' | 'praise' | 'general'

// ── 입력 정규화 ──
function normalizeInput(text: string): string {
  return text
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, '')
    .replace(/[^\S\n]+/g, ' ')  // 줄바꿈 제외한 공백만 정규화
    .replace(/\n{3,}/g, '\n\n') // 과도한 줄바꿈 축소
    .trim()
}

// ══════════════════════════════════════════
// ── 해독모드: 서버사이드 빈말 패턴 매칭 (AI 미사용) ──
// ══════════════════════════════════════════

// 빈말 구문 패턴 (긴 것부터 매칭, 마킹 후 진심은 자동으로 남음)
const EMPTY_PHRASES: RegExp[] = [
  // ── 인사/안부/마무리 (긴 패턴부터) ──
  /평안하시길\s*바랍니다\.?/g,
  /건강하시길\s*바랍니다\.?/g,
  /건승을\s*기원합니다\.?/g,
  /무궁한\s*발전을\s*(기원|빕니다|바랍니다)\.?/g,
  /만사형통하시길\s*기원합니다\.?/g,
  /만사형통하시길\s*바랍니다\.?/g,
  /좋은\s*하루\s*(되세요|보내세요|되시길)\.?/g,
  /좋은\s*(아침|저녁|밤)\s*(입니다|이에요)\.?/g,
  /긴\s*글\s*읽어주셔서\s*감사합니다\.?/g,
  /읽어주셔서\s*감사합니다\.?/g,
  /양해\s*(부탁|해\s*주시[기면])\s*(드립니다|바랍니다)\.?/g,
  /이해\s*부탁드립니다\.?/g,
  /수고\s*(많으십니다|하셨습니다|하십니다|하세요)\.?/g,
  /안녕하(십니까|세요|신지요?)\.?/g,
  /반갑습니다\.?/g,
  /바쁘(신|실)\s*(중에|텐데|와중에)/g,
  /두서없(는|이)\s*글/g,
  /송구(합니다|하오나|스럽[지게]?)/g,
  /죄송합니다\.?/g,

  // ── 감사 표현 ──
  /대단히\s*감사합니다\.?/g,
  /진심으로\s*감사(합니다|드립니다)\.?/g,
  /감사(합니다|드립니다|하겠습니다|드리[며고])\.?/g,
  /고맙습니다\.?/g,

  // ── 공손 도입/전환/마무리 ──
  /다름이\s*아니오라/g,
  /말씀\s*드리(자면|겠습니다|고자)/g,
  /조심스럽(게|지만)\s*/g,
  /실례를\s*무릅쓰고/g,
  /부탁(드립니다|합니다|올립니다)\.?/g,
  /인사\s*(드립니다|올립니다)\.?/g,
  /여쭈?어?\s*볼\s*것이/g,

  // ── 격식 마무리 ──
  /이만\s*(줄이겠습니다|글을\s*마[치칩])/g,
  /경구\.?/g,

  // ── 뉴스/기사 필러 (인용·전달 표현) ──
  /(이)?라고\s*(말했다|밝혔다|전했다|설명했다|덧붙였다|답했다|강조했다|주장했다|했다)\.?/g,
  /(이)?라며\s*/g,
  /것으로\s*(알려졌다|전해졌다|나타났다|보인다|드러났다|확인됐다|파악됐다)\.?/g,
  /에\s*따르면\s*/g,
  /관계자는?\s*/g,
  /이에\s*대해\s*/g,
  /이와\s*관련[,하해]\s*/g,
  /[그그녀][는은]\s*이어\s*/g,
  /한편[\s,]/g,
  /또한[\s,]/g,
  /아울러[\s,]/g,
  /이같이\s*/g,
  /이올러\s*/g,
  /그러면서\s*/g,
  /이어서\s*/g,

  // ── 비즈니스 상투어 ──
  /귀하의?\s*(건승|발전|노고|협조|이해|양해|검토)/g,
  /귀사의?\s*(무궁한\s*)?발전/g,
  /경의를\s*표합니다\.?/g,
  /성원에?\s*감사/g,
  /배려에?\s*감사/g,
  /관심(에|과)\s*(감사|성원)/g,
  /깊[이은]\s*감사/g,
  /너그러[이운]\s*(양해|이해)/g,
  /헤아려\s*주시/g,
  /편하실\s*때/g,
  /시간\s*(되실|내어|내주실)\s*때/g,

  // ── 격식 접속/종결 패딩 ──
  /하시면\s*감사하겠습니다\.?/g,
  /주시면\s*감사하겠습니다\.?/g,
  /주시기\s*바랍니다\.?/g,
  /하시기\s*바랍니다\.?/g,
  /바라[는며]?\s*바입니다\.?/g,
  /드리는?\s*바입니다\.?/g,
]

// 빈말로 간주하면 안 되는 단어 (욕설/감정 = 진심)
const GENUINE_OVERRIDE = /[씨시]발|개새끼|병신|지랄|빡치|ㅅㅂ|ㅂㅅ|개같|열받|짜증|미치겠|어이없|황당/

// 역방향 해독: 전체를 빈말로 시작 → 핵심 키워드만 진심으로 꺼냄
// 빈말 어근 패턴 (어근 시작 매칭 → 모든 활용형 자동 필터)
const FILLER_STEMS: RegExp[] = [
  // 격식 동사/어미 (감사드리며, 감사드립니다, 감사하겠습니다 등 전부 매칭)
  /^감사/, /^부탁/, /^인사/, /^기원/, /^축복/, /^기대/,
  /^바랍/, /^바라[는며봅]/, /^올립/, /^드립/, /^드리[며는고]/, /^여쭙/,
  /^마무리/, /^마치겠/, /^마칩/, /^줄이겠/, /^줄입/,
  // 인사/안부
  /^안녕/, /^수고/, /^건승/, /^발전/, /^건강/, /^행복/, /^평안/, /^만사/,
  // 격식 수식어
  /^소중/, /^아름다/, /^따뜻/, /^따스/, /^화창/, /^무궁/, /^너그러/, /^변함없/,
  /^진심으로/, /^깊이/, /^대단히/, /^심히/, /^매우/,
  // 격식 상투어
  /^송구/, /^죄송/, /^양해/, /^실례/, /^말씀/, /^사료/, /^하옵/,
  /^베풀/, /^배려/, /^헤아려/,
  // 계절/시간
  /^봄날/, /^봄[바빛기]/, /^여름/, /^가을/, /^겨울/, /^계절/,
  // 격식 주어/대명사
  /^귀하/, /^귀사/, /^저희/, /^우리/,
  // 접속/전환
  /^한편/, /^또한/, /^아울러/, /^그러면서/, /^이같이/, /^이어서/, /^그러나/, /^하지만/, /^그런데/,
  // 뉴스 필러
  /^관계자/, /^기자/, /^특파원/, /^보도/, /^속보/,
  // 격식 결어/조사성
  /^에서[는의]?$/, /^으로는?$/, /^대해$/, /^통해$/, /^위해$/, /^대한$/, /^관한$/,
  /^이번$/, /^그간$/, /^평소$/, /^앞으로$/, /^향후$/, /^현재$/, /^최근$/,
  // 격식 동사어미
  /^합니다/, /^입니다/, /^습니다/, /^겠습니다/, /^있습니다/, /^됩니다/,
  /^하였다/, /^하겠다/, /^했습니다/,
  /^말했다/, /^밝혔다/, /^전했다/, /^설명했다/, /^덧붙였다/, /^강조했다/, /^주장했다/,
  /^교류/, /^이어가/, /^희망/,
]

function isFillerWord(word: string): boolean {
  return FILLER_STEMS.some(pattern => pattern.test(word))
}

// 핵심 명사 추출 (빈말이 아닌 실질 키워드)
function extractKeywords(text: string): string[] {
  const words = text.match(/[가-힣]{2,}/g) || []
  const engWords = text.match(/[a-zA-Z0-9]{2,}/g) || []
  const numWords = text.match(/[0-9,]+[가-힣]+|[가-힣]+[0-9,]+[가-힣]*/g) || []

  const all = [...numWords, ...words, ...engWords]
  const meaningful = all.filter(w => {
    if (isFillerWord(w)) return false
    if (w.length < 2) return false
    if (/^(하[고는며면]|되[고는며면]|이[고는며면]|에서|으로|까지|부터|에게|한다|된다|인데)$/.test(w)) return false
    return true
  })

  const freq = new Map<string, number>()
  for (const w of meaningful) {
    freq.set(w, (freq.get(w) || 0) + 1)
  }

  const scored = [...freq.entries()]
    .map(([word, count]) => ({ word, score: count * word.length }))
    .sort((a, b) => b.score - a.score)

  return scored.map(s => s.word).slice(0, 10)
}

// 문장 분리
function splitSentences(text: string): string[] {
  // 마침표/물음표/느낌표/개행/쉼표+접속사 기준으로 분리
  return text
    .split(/(?<=[.!?。])\s*|\n+|,\s*(?=그리고|그러나|하지만|또한|아울러|한편|이에)/)
    .map(s => s.trim())
    .filter(s => s.length > 5)
}

// 빈말성 문장 판별 (높을수록 빈말)
function getFillerScore(sent: string): number {
  let penalty = 0
  // 인사/안부/감사/마무리 패턴
  if (/안녕|인사|수고|감사|부탁|건강|평안|기원|건승|발전|행복|축복|봄날|여름|가을|겨울|계절/.test(sent)) penalty += 3
  if (/감사합니다|바랍니다|드립니다|올립니다|기원합니다|빕니다/.test(sent)) penalty += 2
  if (/귀하의\s*(건승|발전|노고|협조|이해|양해)/.test(sent)) penalty += 3
  if (/귀사의/.test(sent)) penalty += 2
  // 격식 도입부/전환구
  if (/다름이\s*아니오라|말씀\s*드리|조심스럽|송구|실례|에둘러/.test(sent)) penalty += 2
  if (/사자성어|하였사온데|사료되|하옵|이옵/.test(sent)) penalty += 2
  if (/타산지석|과유불급|고진감래|역지사지|온고지신/.test(sent)) penalty += 3
  // 뉴스 필러
  if (/라고\s*(말했다|밝혔다|전했다|설명했다)|것으로\s*(알려졌다|전해졌다|나타났다)/.test(sent)) penalty += 1
  if (/관계자|에\s*따르면/.test(sent)) penalty += 1
  return penalty
}

// AI로 한 줄 요약 생성 (토큰 최소화)
async function aiSummarize(text: string, apiKey: string): Promise<string> {
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: '입력 텍스트의 핵심을 한 문장(30자 이내)으로 요약. 미사여구/인사/감사 제외. 요약문만 출력.' },
          { role: 'user', content: text.slice(0, 500) },
        ],
        temperature: 0.3,
        max_tokens: 60,
      }),
    })
    if (!res.ok) return ''
    const data: any = await res.json()
    return (data.choices?.[0]?.message?.content || '').trim()
  } catch {
    return ''
  }
}

async function serverDecode(text: string, apiKey: string): Promise<{ highlighted: string, ratio: number, core: string }> {
  // 짧은 욕설/감정 표현은 전체가 진심
  if (text.length <= 30 && GENUINE_OVERRIDE.test(text)) {
    return { highlighted: text, ratio: 0, core: text }
  }

  // 1) 핵심 키워드 추출 (서버사이드)
  const keywords = extractKeywords(text)

  // 2) AI로 한 줄 요약 생성
  let core = await aiSummarize(text, apiKey)
  if (!core) {
    // AI 실패 시 폴백: 상위 키워드 조합
    const topKw = keywords.slice(0, 4)
    core = topKw.length >= 2 ? `${topKw.join(', ')} 관련 내용` : text.slice(0, 40)
  }

  // 3) 요약문의 키워드 + 원본 키워드를 합쳐서 마킹 대상 결정
  const coreWords = (core.match(/[가-힣]{2,}|[a-zA-Z0-9]{2,}/g) || []).filter(w => !isFillerWord(w) && w.length >= 2)
  const coreKeywords = keywords.filter(kw => core.includes(kw))
  const extraFromCore = coreWords.filter(w => !keywords.includes(w)).slice(0, 3)
  const extraKeywords = keywords.filter(kw => !core.includes(kw)).slice(0, 4)
  const allMarkers = [...new Set([...coreKeywords, ...extraFromCore, ...extraKeywords])]

  // 4) 전체를 빈말([[]])로 감싸기
  let highlighted = `[[${text}]]`

  // 5) 핵심 키워드를 진심으로 꺼내기 (긴 키워드부터)
  const sortedKw = [...allMarkers].sort((a, b) => b.length - a.length)
  const rescued = new Set<string>()

  for (const kw of sortedKw) {
    if (rescued.has(kw)) continue
    const esc = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // 빈말 영역 안에서 키워드 등장을 찾아서 꺼냄 (최대 2회)
    for (let i = 0; i < 2; i++) {
      const inEmpty = new RegExp(`\\[\\[([^\\]]*?)(${esc})([^\\[]*?)\\]\\]`)
      const match = highlighted.match(inEmpty)
      if (match) {
        let rep = ''
        if (match[1]) rep += `[[${match[1]}]]`
        rep += match[2]
        if (match[3]) rep += `[[${match[3]}]]`
        highlighted = highlighted.replace(match[0], rep)
      } else break
    }
    rescued.add(kw)
  }

  // 6) 빈 [[ ]] 제거
  highlighted = highlighted.replace(/\[\[\]\]/g, '')

  // 7) 인접한 [[ ]] 병합 (공백/구두점만 있는 진심 구간을 빈말로 흡수)
  highlighted = highlighted.replace(/\]\]([\s.,;:!?·…—\-–'"'"「」『』()（）《》<>]+)\[\[/g, '$1')
  highlighted = highlighted.replace(/\[\[\]\]/g, '')

  // 8) ratio 계산
  const emMatch = highlighted.match(/\[\[(.*?)\]\]/gs)
  const emptyLen = emMatch ? emMatch.reduce((sum, seg) => sum + seg.length - 4, 0) : 0
  const plainLen = highlighted.replace(/\[\[|\]\]/g, '').length
  let ratio = 0
  if (plainLen > 0) {
    ratio = Math.min(99.9, Math.round((emptyLen / plainLen) * 1000) / 10)
  }

  return { highlighted, ratio, core }
}

// ══════════════════════════════════════════
// ── 포장모드 템플릿 풀 (의도별 + 계절/문맥별) ──
// ══════════════════════════════════════════

// ── A블록: 인사 (계절 × 문맥) ──
const BLOCK_A: Record<string, Record<string, string[]>> = {
  spring: {
    business: [
      '일교차가 큰 요즘, 업무에 노고가 많으신 줄 압니다.',
      '미세먼지가 잦은 요즘이지만, 늘 수고가 많으십니다.',
      '날씨가 제법 풀린 요즘, 귀하의 건승을 기원합니다.',
      '아침저녁으로 쌀쌀한 환절기에 인사드립니다.',
      '바쁜 상반기 시작에 업무 보시느라 고생이 많으십니다.',
      '날이 좋아진 요즘, 귀사의 발전을 기원하며 인사드립니다.',
      '비 소식이 잦은 요즘, 늘 애써주시는 귀하께 인사 전합니다.',
      '꽃가루가 날리는 요즘이지만, 건강 유의하시며 늘 좋은 일만 있으시길 바랍니다.',
    ],
    formal: [
      '일교차가 큰 요즘, 건강히 지내고 계신지 여쭙니다.',
      '날씨가 부쩍 따뜻해진 요즘, 안부 인사 올립니다.',
      '미세먼지가 걱정되는 요즘이지만, 별고 없으시길 바랍니다.',
      '환절기라 일교차가 심한데, 건강은 어떠신지요.',
      '이따금 비가 내리는 요즘, 잘 지내고 계신지 여쭙니다.',
      '바깥 공기가 한결 부드러워진 요즘입니다.',
    ],
    casual: [
      '날씨가 좋아진 요즘, 안녕하신지요.',
      '일교차가 커서 감기 조심하셔야 할 요즘입니다.',
      '미세먼지가 심한 요즘인데, 잘 지내고 계신지요.',
      '비 온 뒤 날이 개어 기분 좋은 요즘입니다.',
      '환절기에 건강 잘 챙기고 계신지요.',
      '밖에 나서면 공기가 한결 달라진 요즘입니다.',
    ],
  },
  summer: {
    business: [
      '연일 폭염주의보가 이어지는 요즘, 수고가 많으십니다.',
      '습도가 높아 더위가 한층 체감되는 요즘, 업무에 노고가 많으십니다.',
      '장마철 궂은 날씨에도 불구하고 늘 수고가 많으십니다.',
      '열대야가 이어지는 요즘, 귀하의 건승을 기원합니다.',
      '냉방과 외부 기온 차이가 큰 요즘, 건강 유의하시길 바랍니다.',
      '체감 온도가 40도에 육박하는 요즘, 업무 보시느라 고생이 많으십니다.',
      '게릴라성 소나기가 잦은 요즘, 늘 애써주시는 귀하께 인사드립니다.',
      '무더위와 습기가 기승인 요즘이지만, 귀사의 발전을 기원합니다.',
    ],
    formal: [
      '무더위에 건강은 어떠신지요.',
      '열대야가 계속되는 요즘, 잠은 잘 주무시는지 여쭙니다.',
      '습한 날씨가 이어지는 요즘, 별고 없으시길 바랍니다.',
      '에어컨 바람과 바깥 더위 사이에서 건강 조심하고 계신지요.',
      '장마가 길어지는 요즘, 안부 인사 올립니다.',
      '뜨거운 햇볕이 내리쬐는 요즘, 건강히 지내고 계신지 여쭙니다.',
    ],
    casual: [
      '정말 덥네요. 안녕하신지요.',
      '습한 날씨가 계속인데, 잘 지내고 계신지요.',
      '밤에도 더워서 잠이 안 오는 요즘입니다.',
      '장마가 시작된 건지 비가 잦은 요즘입니다.',
      '아이스커피가 간절한 요즘, 인사드립니다.',
      '올여름은 유난히 습한 것 같습니다.',
    ],
  },
  fall: {
    business: [
      '아침저녁으로 제법 쌀쌀해진 요즘, 업무에 수고가 많으십니다.',
      '하반기 마무리에 바쁘실 텐데, 늘 수고가 많으십니다.',
      '일교차가 10도 이상 벌어지는 요즘, 건강 유의하시길 바랍니다.',
      '선선한 바람이 반가운 요즘, 귀사의 발전을 기원합니다.',
      '날이 짧아지기 시작한 요즘, 업무 보시느라 고생이 많으십니다.',
      '미세먼지 없이 맑은 날이 이어지는 요즘, 인사드립니다.',
      '건조한 날씨에 건강 유의하시길 바라며 인사드립니다.',
      '첫 서리 소식이 들려올 무렵, 귀하의 건승을 기원합니다.',
    ],
    formal: [
      '부쩍 선선해진 날씨에, 건강히 지내고 계신지 여쭙니다.',
      '일교차가 커진 요즘, 건강은 어떠신지요.',
      '아침에 입김이 나올 정도로 쌀쌀해졌는데, 별고 없으시길 바랍니다.',
      '건조한 날씨가 이어지는 요즘, 안부 인사 올립니다.',
      '해가 짧아져 퇴근길이 어두워진 요즘, 안녕하신지요.',
      '환절기라 감기 조심하셔야 할 때인데, 잘 지내고 계신지 여쭙니다.',
    ],
    casual: [
      '날씨가 부쩍 선선해진 요즘, 안녕하신지요.',
      '아침에 좀 쌀쌀해서 겉옷을 챙기게 되는 요즘입니다.',
      '일교차가 커서 뭘 입어야 할지 고민되는 요즘입니다.',
      '하늘이 높고 맑은 요즘, 잘 지내고 계신지요.',
      '건조한 날씨에 보습제가 필수인 요즘입니다.',
      '해가 눈에 띄게 짧아진 요즘, 안부 전합니다.',
    ],
  },
  winter: {
    business: [
      '한파가 몰아치는 요즘, 업무에 수고가 많으십니다.',
      '영하의 날씨가 이어지는 요즘, 귀하의 건승을 기원합니다.',
      '빙판길 사고 소식이 잦은 요즘, 출퇴근길 조심하시길 바랍니다.',
      '난방비 걱정이 커지는 요즘, 업무 보시느라 고생이 많으십니다.',
      '한 해를 마무리하는 시점에, 귀하의 노고에 감사드립니다.',
      '눈 소식이 잦은 요즘, 늘 수고가 많으십니다.',
      '건조하고 추운 날씨가 이어지는 요즘, 귀사의 발전을 기원합니다.',
      '연말연시 바쁘실 텐데, 인사드립니다.',
    ],
    formal: [
      '추위가 매서운 요즘, 건강히 지내고 계신지 여쭙니다.',
      '빙판길이 걱정되는 요즘, 별고 없으시길 바랍니다.',
      '건조한 겨울 날씨에 건강은 어떠신지요.',
      '아침 출근길 체감온도가 영하 10도를 넘나드는 요즘, 안부 여쭙니다.',
      '바람이 칼같은 요즘, 잘 지내고 계신지 여쭙니다.',
      '올겨울은 유독 눈이 많은데, 건강 잘 챙기고 계신지요.',
    ],
    casual: [
      '정말 추운 요즘, 안녕하신지요.',
      '아침에 밖에 나서면 숨이 막힐 정도로 추운 요즘입니다.',
      '빙판길 조심하셔야 할 요즘, 잘 지내고 계신지요.',
      '핫초코가 생각나는 요즘, 안부 전합니다.',
      '손이 시려서 장갑 없이는 못 다니는 요즘입니다.',
      '겨울비가 내리는 요즘, 인사드립니다.',
    ],
  },
}

// ── B블록: 감사/관계 언급 (의도별) ──
const BLOCK_B: Record<string, string[]> = {
  criticize: [
    '그간 귀하께서 보여주신 노력에 대해서는 충분히 인지하고 있습니다.',
    '평소 귀하의 역량을 높이 평가하고 있음을 먼저 말씀드립니다.',
    '귀하와의 관계를 소중히 여기기에 솔직한 말씀을 드리고자 합니다.',
    '귀하의 평소 행보에 대해 존중하는 마음은 변함이 없습니다.',
    '늘 보여주시는 성실함에 감사드리며, 그렇기에 더욱 아쉬운 마음을 전합니다.',
  ],
  request: [
    '항상 보여주시는 관심과 협조에 깊이 감사드립니다.',
    '평소 귀하의 도움 덕분에 많은 일이 순조롭게 진행되고 있습니다.',
    '귀하의 전문성과 역량을 깊이 신뢰하고 있음을 말씀드립니다.',
    '늘 성심성의껏 응해주시는 귀하께 감사한 마음을 전합니다.',
    '귀하의 헌신적인 노력에 항상 감사하고 있습니다.',
  ],
  reject: [
    '귀하의 제안에 대해 깊이 고민해보았음을 먼저 말씀드립니다.',
    '말씀하신 내용을 충분히 검토하였으며, 그 취지에 대해 공감합니다.',
    '귀하께서 보내주신 관심과 제안에 진심으로 감사드립니다.',
    '제안해주신 사항에 대해 여러 차례 숙고하였음을 알려드립니다.',
    '귀하의 의견을 경청하였으며, 진지하게 고려하였습니다.',
  ],
  complain: [
    '그동안 귀하를 신뢰하며 좋은 관계를 유지해왔기에 더욱 말씀드리는 바입니다.',
    '평소 귀하에 대한 신뢰가 깊었기에 이번 일에 더 큰 아쉬움을 느낍니다.',
    '귀하와의 관계를 소중히 여기기에, 솔직한 심경을 전하고자 합니다.',
    '오랜 신뢰 관계에 기반하여, 진솔한 말씀을 올리고자 합니다.',
    '귀하를 높이 평가해왔기에, 이번 일은 더욱 아쉬운 마음입니다.',
  ],
  threaten: [
    '그간의 관계를 고려하여 먼저 대화로 풀어보고자 합니다.',
    '상황의 심각성을 감안하여, 진중하게 말씀드리고자 합니다.',
    '귀하와의 관계를 존중하기에, 공식적인 절차에 앞서 먼저 연락드립니다.',
    '사안의 중대함을 인지하시리라 믿으며, 말씀 올립니다.',
    '원만한 해결을 바라는 마음에서 먼저 말씀드립니다.',
  ],
  praise: [
    '평소 귀하의 탁월한 역량에 깊은 감명을 받아왔습니다.',
    '귀하의 꾸준한 노력과 성과를 늘 존경스럽게 바라보고 있습니다.',
    '귀하와 함께할 수 있어 늘 감사하고 영광스럽게 생각합니다.',
    '늘 최선을 다하시는 귀하의 모습에 깊은 감동을 받고 있습니다.',
    '귀하의 존재 자체가 주변에 큰 힘이 되고 있음을 알려드립니다.',
  ],
  general: [
    '항상 보여주시는 관심과 성원에 깊이 감사드립니다.',
    '평소 귀하의 노고에 진심으로 감사드리고 있습니다.',
    '늘 베풀어주시는 배려에 감사한 마음을 전합니다.',
    '귀하와의 인연을 소중히 여기며, 감사 인사를 올립니다.',
    '항상 신경 써주시는 귀하께 먼저 감사의 말씀을 전합니다.',
  ],
}

// ── C블록: 본론 도입 (의도별) ──
const BLOCK_C: Record<string, string[]> = {
  criticize: [
    '다름이 아니오라, 한 가지 말씀드리지 않을 수 없는 사안이 있어 글을 올립니다.',
    '직접 말씀드리기 조심스러우나, 반드시 짚고 넘어가야 할 부분이 있습니다.',
    '귀하께 솔직히 말씀드려야 할 것이 있어 이렇게 글을 올립니다.',
    '에둘러 말씀드리기보다는, 명확히 전달드리는 것이 옳다고 판단하였습니다.',
    '말씀드리기 어려운 부분이나, 귀하를 위해 숨기지 않고 전하고자 합니다.',
    '솔직한 의견을 전하는 것이 귀하에 대한 예의라 생각하여 말씀 올립니다.',
  ],
  request: [
    '다름이 아니오라, 한 가지 부탁드릴 것이 있어 이렇게 글을 올립니다.',
    '송구하오나, 귀하의 도움이 필요한 사안이 있어 연락드립니다.',
    '실례를 무릅쓰고 한 가지 여쭈어볼 것이 있습니다.',
    '귀하의 고견을 구하고자 조심스럽게 말씀 올립니다.',
    '바쁘신 줄 알지만, 한 가지 협조를 구하고자 합니다.',
    '귀찮으시겠지만, 한 가지 도움을 청하고자 합니다.',
  ],
  reject: [
    '숙고 끝에 조심스럽게 말씀드릴 것이 있습니다.',
    '여러 사정을 고려한 끝에 결론을 내리게 되어 알려드립니다.',
    '많은 고민 끝에 말씀드리게 되었으며, 부디 양해 부탁드립니다.',
    '신중히 검토한 결과를 말씀드리고자 합니다.',
    '결정을 내리기까지 적지 않은 고심이 있었음을 전합니다.',
    '쉽지 않은 결정이었으나, 솔직히 말씀드리고자 합니다.',
  ],
  complain: [
    '다름이 아니오라, 최근 겪은 일에 대해 말씀드리지 않을 수 없습니다.',
    '불편한 말씀을 드리게 되어 송구하오나, 반드시 전해야 할 사안이 있습니다.',
    '망설임 끝에 용기를 내어 말씀드립니다.',
    '더 이상 묵과하기 어려운 사안이 있어 글을 올립니다.',
    '고심 끝에 솔직한 심경을 전하기로 하였습니다.',
    '귀하께 직접 말씀드리는 것이 도리라 생각하여 글을 올립니다.',
  ],
  threaten: [
    '사안의 중대성을 감안하여, 공식적으로 말씀드리고자 합니다.',
    '원만한 해결을 위해 먼저 말씀드리지만, 사안의 심각성을 전달드립니다.',
    '부득이하게 말씀드리게 된 점 양해 부탁드리며, 다음 사항을 전달드립니다.',
    '더 이상 지체할 수 없는 상황이기에 분명히 말씀드립니다.',
    '정중하게 말씀드리나, 그 무게만큼은 충분히 전달되었으면 합니다.',
    '최후의 수단에 앞서, 한 번 더 말씀 올리는 바입니다.',
  ],
  praise: [
    '다름이 아니오라, 기쁜 마음으로 한 말씀 전하고자 합니다.',
    '이번 기회에 감사의 마음을 직접 전하고 싶어 글을 올립니다.',
    '평소에 미처 전하지 못한 마음을 이 자리를 빌려 전합니다.',
    '진심을 담아 한 말씀 올리고 싶어 펜을 들었습니다.',
    '감사와 존경의 마음을 담아 글을 올립니다.',
    '마음속 깊이 간직해온 감사의 말씀을 전합니다.',
  ],
  general: [
    '다름이 아니오라, 한 가지 말씀드릴 것이 있어 이렇게 글을 올립니다.',
    '이에 조심스럽게 한 말씀 올리고자 합니다.',
    '송구하오나, 한 가지 말씀드릴 것이 있습니다.',
    '간략하게 한 말씀 전하고자 글을 올립니다.',
    '조심스럽지만 한 가지 말씀 올리고자 합니다.',
    '말씀드릴 사안이 있어 이렇게 연락드립니다.',
  ],
}

// ── D블록: 본론 전환구 (의도별) ──
const BLOCK_D: Record<string, string[]> = {
  criticize: [
    '솔직히 말씀드리자면,',
    '직언을 드리자면,',
    '단도직입적으로 말씀드리자면,',
    '가감 없이 말씀드리자면,',
    '있는 그대로 말씀드리자면,',
  ],
  request: [
    '본론으로 들어가 말씀드리자면,',
    '말씀드리고자 하는 바는 다음과 같습니다.',
    '간곡히 말씀드리자면,',
    '부탁드리고자 하는 바는,',
    '조심스럽게 요청드리자면,',
  ],
  reject: [
    '결론부터 말씀드리자면,',
    '심사숙고한 끝에 말씀드리자면,',
    '진솔하게 말씀드리자면,',
    '조심스럽지만 분명히 말씀드리자면,',
    '여러 사정을 고려한 결론은,',
  ],
  complain: [
    '본론을 말씀드리자면,',
    '구체적으로 말씀드리자면,',
    '핵심을 말씀드리자면,',
    '있었던 일을 말씀드리자면,',
    '솔직한 심경을 말씀드리자면,',
  ],
  threaten: [
    '핵심 사안을 말씀드리자면,',
    '분명히 말씀드리자면,',
    '정확히 말씀드리자면,',
    '명확히 전달드리자면,',
    '엄중히 말씀드리자면,',
  ],
  praise: [
    '진심을 담아 말씀드리자면,',
    '감히 말씀드리자면,',
    '마음을 담아 전하자면,',
    '감사한 마음으로 말씀드리자면,',
    '존경의 마음을 담아 말씀드리자면,',
  ],
  general: [
    '본론으로 들어가 말씀드리자면,',
    '이에 대해 말씀드리자면,',
    '간곡히 말씀드리자면,',
    '핵심을 말씀드리자면,',
    '요점을 말씀드리자면,',
  ],
}

// ── H블록: 부연/양해 (의도별) ──
const BLOCK_H: Record<string, string[]> = {
  criticize: [
    '이 같은 말씀을 드리는 것이 결코 쉬운 결정이 아니었음을 알아주셨으면 합니다.',
    '비판을 위한 비판이 아닌, 개선을 바라는 진심에서 드리는 말씀입니다.',
    '귀하의 기분을 상하게 할 의도는 전혀 없었음을 분명히 말씀드립니다.',
    '이 말씀이 무례하게 들리셨다면, 그것은 제 의도와 다름을 알아주십시오.',
    '쓴소리일 수 있으나, 귀하를 아끼는 마음에서 드리는 진심입니다.',
    '말씀드리기 어려운 내용이었으나, 귀하라면 이해해주시리라 믿습니다.',
  ],
  request: [
    '바쁘신 중에 부탁드려 대단히 송구합니다.',
    '무리한 요청임을 알고 있으나, 귀하만이 가능한 일이기에 부탁드립니다.',
    '가능하신 범위 내에서 검토해주시면 대단히 감사하겠습니다.',
    '시간이 허락하시는 선에서 도움 주시면 큰 힘이 될 것입니다.',
    '염치없는 부탁이지만, 귀하의 너그러운 이해를 구합니다.',
    '귀하의 여건이 허락하신다면, 검토 부탁드립니다.',
  ],
  reject: [
    '이런 결정을 내리게 되어 진심으로 유감스럽게 생각합니다.',
    '귀하의 기대에 부응하지 못하는 점 깊이 사죄드립니다.',
    '제가 처한 상황을 헤아려주시면 감사하겠습니다.',
    '부득이한 사정이 있음을 너그러이 양해 부탁드립니다.',
    '마음과 달리 이런 답변을 드리게 되어 안타깝습니다.',
    '향후 기회가 된다면, 반드시 보답드리고 싶은 마음입니다.',
  ],
  complain: [
    '이 점 너그러이 양해하여 주시되, 개선을 부탁드립니다.',
    '소중한 관계이기에 묵과하지 않고 말씀드리는 것임을 이해해주십시오.',
    '불만을 토로하는 것이 아니라, 상황 개선을 바라는 진심입니다.',
    '귀하께서 이 상황을 인지하시고 조치해주시리라 기대합니다.',
    '이 같은 일이 반복되지 않기를 진심으로 바라는 마음입니다.',
    '상호 간의 신뢰를 위해 솔직히 말씀드리는 바입니다.',
  ],
  threaten: [
    '원만한 해결을 진심으로 바라고 있으나, 상황이 개선되지 않을 경우 불가피한 조치를 취할 수밖에 없음을 알려드립니다.',
    '귀하의 현명한 판단을 기대하며, 사안의 심각성을 다시 한번 강조드립니다.',
    '이 이상의 상황 악화는 양측 모두에게 바람직하지 않음을 분명히 말씀드립니다.',
    '대화를 통한 해결을 우선하고자 하오나, 한계가 있음을 알려드립니다.',
    '적절한 조치가 없을 경우, 정당한 절차를 통해 권리를 행사할 수밖에 없습니다.',
  ],
  praise: [
    '이러한 감사의 마음을 이 짧은 글에 다 담지 못함이 아쉬울 따름입니다.',
    '제가 드리는 칭찬이 귀하의 노력에 비하면 매우 부족함을 알고 있습니다.',
    '말로는 다 표현할 수 없는 감사와 존경의 마음입니다.',
    '귀하의 업적은 마땅히 더 높이 평가받아야 한다고 생각합니다.',
    '이 작은 감사의 표현이 귀하께 조금이나마 힘이 되었으면 합니다.',
  ],
  general: [
    '이 점 너그러이 양해하여 주시면 감사하겠습니다.',
    '부디 넓은 마음으로 헤아려주시기를 부탁드립니다.',
    '귀하의 너그러운 이해를 구하는 바입니다.',
    '사정을 살펴주시면 감사하겠습니다.',
    '부족한 점이 있다면 너그러이 양해 부탁드립니다.',
    '여러모로 불편을 드린 점 양해 부탁드립니다.',
  ],
}

// ── I블록: 기대/요청 (의도별) ──
const BLOCK_I: Record<string, string[]> = {
  criticize: [
    '향후 이러한 부분이 개선되기를 진심으로 기대합니다.',
    '귀하의 현명한 판단으로 상황이 나아지리라 믿습니다.',
    '이번 일을 계기로 더 좋은 방향으로 나아가시길 바랍니다.',
    '귀하라면 충분히 개선할 수 있으리라 신뢰합니다.',
    '재발 방지를 위한 귀하의 노력을 기대합니다.',
  ],
  request: [
    '귀하의 긍정적인 검토를 부탁드립니다.',
    '가능하시다면 회신 주시면 대단히 감사하겠습니다.',
    '귀하의 도움이 큰 힘이 될 것입니다.',
    '바쁘시겠지만, 시간 되실 때 확인 부탁드립니다.',
    '편하실 때 말씀 주시면 감사하겠습니다.',
  ],
  reject: [
    '이번 건과 별개로, 앞으로도 좋은 관계를 유지하고 싶습니다.',
    '비록 이번에는 어렵지만, 다음 기회에 꼭 함께하고 싶습니다.',
    '귀하의 깊은 이해를 부탁드립니다.',
    '향후 상황이 달라진다면, 다시 한번 논의할 수 있기를 바랍니다.',
    '이해해주시리라 믿으며, 양해를 구합니다.',
  ],
  complain: [
    '조속한 시일 내에 상황이 개선되기를 바랍니다.',
    '이 문제에 대한 귀하의 성의 있는 조치를 기대합니다.',
    '원만한 해결을 위한 귀하의 협조를 부탁드립니다.',
    '향후 동일한 상황이 반복되지 않기를 진심으로 바랍니다.',
    '귀하의 신속한 대응을 기대합니다.',
  ],
  threaten: [
    '기한 내에 적절한 조치가 이루어지기를 강력히 요청합니다.',
    '귀하의 즉각적인 대응을 기대합니다.',
    '상황의 심각성을 인지하시고, 조속한 조치를 취해주시기 바랍니다.',
    '현명하신 귀하의 판단을 기대합니다.',
    '원만한 해결을 위한 귀하의 결단을 촉구합니다.',
  ],
  praise: [
    '앞으로도 귀하의 멋진 행보를 응원하겠습니다.',
    '귀하의 앞날에 더 큰 성취가 있기를 진심으로 기원합니다.',
    '앞으로도 지금처럼 빛나시길 바랍니다.',
    '귀하의 끊임없는 발전을 기대하며 응원 보냅니다.',
    '앞날에 무궁한 영광이 함께하시길 바랍니다.',
  ],
  general: [
    '귀하의 깊은 이해와 협조를 부탁드립니다.',
    '귀하의 현명한 판단을 신뢰하며 회신을 기다리겠습니다.',
    '편하실 때 말씀 주시면 감사하겠습니다.',
    '검토 후 회신 부탁드립니다.',
    '귀하의 고견을 기다리겠습니다.',
  ],
}

// ── J블록: 마무리 (의도별) ──
const BLOCK_J: Record<string, string[]> = {
  criticize: [
    '불편한 말씀을 드려 대단히 송구합니다.',
    '이 같은 말씀을 드리게 되어 안타까운 마음입니다.',
    '직언이 무례하지 않았기를 바랍니다.',
    '쓴소리였으나, 진심에서 나온 말씀임을 알아주십시오.',
    '험한 말씀 드린 점 양해 부탁드리며, 진심은 변함없습니다.',
  ],
  request: [
    '바쁘신 중에 번거로운 부탁 드려 죄송합니다.',
    '소중한 시간 내어 읽어주셔서 진심으로 감사합니다.',
    '귀한 시간 빼앗아 송구한 마음입니다.',
    '염치없는 부탁이었으나, 귀하라면 이해해주시리라 믿습니다.',
    '번거로움을 드려 송구하며, 긍정적인 답변을 기대합니다.',
  ],
  reject: [
    '기대에 부응하지 못해 진심으로 죄송합니다.',
    '부족한 답변이었을지 모르나, 솔직한 마음을 전해드렸습니다.',
    '아쉬운 소식을 전하게 되어 마음이 무겁습니다.',
    '이런 말씀을 드리게 되어 정말 유감입니다.',
    '죄송한 마음을 거듭 전합니다.',
  ],
  complain: [
    '불편한 말씀 드려 송구합니다만, 꼭 전해야 할 사안이었습니다.',
    '두서없는 글이었으나, 귀하께서 이해해주시리라 믿습니다.',
    '솔직한 심경을 전하게 되어 마음이 편치 않습니다.',
    '불만을 쏟아낸 것이 아니라, 개선을 바라는 진심임을 알아주십시오.',
    '말씀드리기 어려운 내용이었으나, 참지 않는 것이 서로를 위함이라 생각했습니다.',
  ],
  threaten: [
    '원치 않는 말씀을 드리게 되어 유감입니다.',
    '이 같은 서신을 보내게 된 상황 자체가 유감스럽습니다.',
    '엄중한 말씀을 드려 송구하오나, 불가피한 사안이었습니다.',
    '대화를 통한 원만한 해결을 진심으로 희망합니다.',
    '귀하의 신속한 판단이 모두에게 이로울 것입니다.',
  ],
  praise: [
    '부족한 글로 마음을 다 전하지 못하는 점이 아쉽습니다.',
    '귀한 분께 이런 글이라도 전할 수 있어 기쁩니다.',
    '소중한 시간 내어 읽어주셔서 진심으로 감사합니다.',
    '감사의 마음을 이 짧은 글에 다 담지 못해 아쉽습니다.',
    '제 진심이 조금이나마 전해졌기를 바랍니다.',
  ],
  general: [
    '바쁘신 중에 긴 글 읽어주셔서 감사합니다.',
    '소중한 시간 내어 읽어주셔서 진심으로 감사합니다.',
    '두서없는 글 끝까지 읽어주셔서 감사합니다.',
    '긴 글 읽어주신 귀하의 인내에 감사드립니다.',
    '부족한 글이나마 귀하께 잘 전달되었기를 바랍니다.',
  ],
}

// ── K블록: 관계 유지 (의도별) ──
const BLOCK_K: Record<string, string[]> = {
  criticize: [
    '이번 일로 인해 귀하와의 관계가 흔들리지 않기를 진심으로 바랍니다.',
    '쓴소리를 드렸으나, 귀하에 대한 존경심에는 변함이 없습니다.',
    '앞으로도 솔직하게 소통할 수 있는 관계이기를 바랍니다.',
    '서로의 발전을 위해 허심탄회하게 대화할 수 있는 사이이길 바랍니다.',
  ],
  request: [
    '앞으로도 좋은 관계를 이어갈 수 있기를 진심으로 바랍니다.',
    '귀하의 도움에 반드시 보답할 수 있도록 노력하겠습니다.',
    '향후에도 변함없는 교류를 이어가길 희망합니다.',
    '늘 감사한 마음으로 귀하와의 인연을 소중히 하겠습니다.',
  ],
  reject: [
    '이번 건과 무관하게, 귀하와의 소중한 인연은 계속 이어가고 싶습니다.',
    '향후 더 좋은 기회로 함께할 수 있기를 기대합니다.',
    '비록 이번에는 어려웠으나, 귀하에 대한 존경에는 변함이 없습니다.',
    '앞으로도 귀하와 좋은 관계를 유지하길 진심으로 바랍니다.',
  ],
  complain: [
    '이번 일이 오히려 관계를 더 단단하게 만드는 계기가 되기를 바랍니다.',
    '솔직한 소통이 서로의 신뢰를 더 깊게 만들어줄 것이라 믿습니다.',
    '앞으로도 귀하와 건강한 관계를 유지하고 싶습니다.',
    '이 일을 잘 해결하여 더 좋은 관계로 나아가길 바랍니다.',
  ],
  threaten: [
    '원만한 합의를 통해 상호 간의 관계가 유지되기를 바랍니다.',
    '현명한 해결을 통해 양측 모두 만족스러운 결과를 얻길 희망합니다.',
    '대화를 통한 해결이 가장 바람직한 방향임을 다시 한번 강조합니다.',
  ],
  praise: [
    '앞으로도 귀하와 함께할 수 있어 영광입니다.',
    '귀하와의 소중한 인연이 오래도록 이어지기를 진심으로 바랍니다.',
    '앞으로도 귀하의 곁에서 응원하는 사람이 되겠습니다.',
    '이 인연을 오래도록 소중히 간직하겠습니다.',
  ],
  general: [
    '앞으로도 좋은 관계를 이어갈 수 있기를 진심으로 바랍니다.',
    '향후에도 변함없는 교류를 이어가길 희망합니다.',
    '앞으로도 귀하와의 소중한 인연이 계속되기를 바랍니다.',
    '서로에게 힘이 되는 관계이길 바랍니다.',
  ],
}

// ── L블록: 맺음 ──
const BLOCK_L = [
  '감사합니다.',
  '이만 줄입니다.',
  '두서없는 글 마칩니다.',
  '부족한 글 마무리하겠습니다.',
  '짧은 글 이만 마치겠습니다.',
  '이만 글을 줄이겠습니다.',
]

// ── M블록: 건강기원 (계절별) ──
const BLOCK_M: Record<string, string[]> = {
  spring: [
    '봄날의 따스함처럼 늘 건강하시고 만사형통하시길 기원합니다.',
    '아름다운 봄날에 귀하의 건강과 행복을 빕니다.',
    '봄꽃처럼 환한 미소가 늘 함께하시길 바랍니다.',
    '따뜻한 봄날, 귀하의 앞길에 좋은 일만 가득하길 기원합니다.',
  ],
  summer: [
    '무더운 여름 건강 유의하시고, 늘 좋은 일만 가득하시길 바랍니다.',
    '더운 날씨에 건강 조심하시고 만사형통하시길 기원합니다.',
    '시원한 여름 보내시고, 하시는 일마다 순탄하시길 빕니다.',
    '올여름도 건강히 보내시고, 뜻하시는 바 모두 이루시길 바랍니다.',
  ],
  fall: [
    '풍요로운 가을, 귀하의 건강과 행복을 기원합니다.',
    '가을의 풍성함처럼 좋은 일만 가득하시길 바랍니다.',
    '결실의 계절에 귀하에게도 풍성한 열매가 맺히길 기원합니다.',
    '가을의 정취와 함께 평안한 나날이 이어지시길 빕니다.',
  ],
  winter: [
    '추운 겨울 건강 유의하시고, 늘 평안하시길 기원합니다.',
    '겨울 추위에 건강 조심하시고, 만복이 깃드시길 바랍니다.',
    '따뜻한 겨울 보내시고, 새해에는 더 좋은 일만 가득하시길 빕니다.',
    '겨울의 끝자락에서 새로운 봄을 맞이하시길 기원합니다.',
  ],
}

// ── 사자성어 (의도별) ──
const IDIOMS: Record<string, string[]> = {
  criticize: [
    '타산지석(他山之石)이라 하였사온데,',
    '과유불급(過猶不及)이라는 말씀처럼,',
    '견토지쟁(犬兎之爭)을 경계하며,',
    '자승자박(自繩自縛)에 빠지지 않기를 바라며,',
    '교각살우(矯角殺牛)의 우를 범하지 않기 위해,',
  ],
  request: [
    '백지장도 맞들면 낫다(百紙一張)는 말씀처럼,',
    '지성감천(至誠感天)이라 하였으니,',
    '동병상련(同病相憐)의 마음으로,',
    '일거양득(一擧兩得)의 기회가 되기를 바라며,',
    '상부상조(相扶相助)의 정신을 담아,',
  ],
  reject: [
    '사필귀정(事必歸正)이라 하였사온데,',
    '각인각색(各人各色)이라 하였으니,',
    '진퇴양난(進退兩難)의 상황이었사온데,',
    '부득이(不得已)한 사정이 있사옵기에,',
    '백척간두(百尺竿頭)의 심정으로,',
  ],
  complain: [
    '충언역이(忠言逆耳)라 하였으나,',
    '침소봉대(針小棒大)가 아님을 밝히며,',
    '적반하장(賊反荷杖)이 되지 않기를 바라며,',
    '유야무야(有耶無耶)로 넘어갈 수 없는 사안이기에,',
    '고언지신(苦言之信)의 마음을 담아,',
  ],
  threaten: [
    '파부침주(破釜沈舟)의 각오로,',
    '배수진(背水陣)을 치는 심정으로,',
    '인과응보(因果應報)라는 말씀이 있듯이,',
    '사면초가(四面楚歌)의 상황에 이르기 전에,',
    '호사다마(好事多魔)를 경계하며,',
  ],
  praise: [
    '출류배萃(出類拔萃)라는 말이 귀하를 위해 있는 듯합니다.',
    '금상첨화(錦上添花)라 하였으니,',
    '백문불여일견(百聞不如一見)이라,',
    '군계일학(群鷄一鶴)이라는 표현이 떠오릅니다.',
    '대기만성(大器晩成)이라 하였사온데,',
  ],
  general: [
    '고진감래(苦盡甘來)라 하였사온데,',
    '역지사지(易地思之)의 마음을 담아,',
    '온고지신(溫故知新)의 자세로,',
    '유비무환(有備無患)의 뜻을 새기며,',
    '화이부동(和而不同)의 정신에 입각하여,',
    '지성감천(至誠感天)이라 하였으니,',
  ],
}

// ══════════════════════════════════════════
// ── 포장 조립 함수 ──
// ══════════════════════════════════════════
function assemblePackage(gBlock: string, level: number, inputText: string, intent: Intent): string {
  const season = getSeason()
  const ctx = detectContext(inputText)

  // G블록 후처리 (욕설 치환 등)
  gBlock = postProcessPackage(gBlock, inputText)

  if (level <= 30) {
    return gBlock
  }

  const t = intent
  if (level <= 60) {
    const a = pick(BLOCK_A[season][ctx])
    const j = pick(BLOCK_J[t])
    const l = pick(BLOCK_L)
    return `${a} ${gBlock} ${j} ${l}`
  }

  if (level <= 80) {
    const a = pick(BLOCK_A[season][ctx])
    const b = pick(BLOCK_B[t])
    const c = pick(BLOCK_C[t])
    const d = pick(BLOCK_D[t])
    const h = pick(BLOCK_H[t])
    const i = pick(BLOCK_I[t])
    const j = pick(BLOCK_J[t])
    return `${a} ${b}\n\n${c} ${d}\n\n${gBlock}\n\n${h} ${i}\n\n${j}`
  }

  // N≥80: 전체 블록 + 사자성어
  const a = pick(BLOCK_A[season][ctx])
  const b = pick(BLOCK_B[t])
  const c = pick(BLOCK_C[t])
  const idiom = pick(IDIOMS[t])
  const d = pick(BLOCK_D[t])
  const h = pick(BLOCK_H[t])
  const i = pick(BLOCK_I[t])
  const j = pick(BLOCK_J[t])
  const k = pick(BLOCK_K[t])
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
  raw = raw.replace(/\]\](\s+)/g, '$1]]')
  raw = raw.replace(/(\s+)\[\[/g, '[[$1')
  raw = raw.replace(/\]\]([\s.,;:!?·…—\-–'"'"「」『』()（）《》<>]+)\[\[/g, '$1')

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

  const text = normalizeInput(rawText)

  // ── 해독모드: AI 미사용, 서버사이드 패턴매칭 ──
  if (mode === 'decode') {
    const result = await serverDecode(text, apiKey)
    const newUsed = used
    return Response.json({
      highlighted: result.highlighted,
      ratio: result.ratio,
      core: result.core,
      _used: newUsed,
      _limit: DAILY_LIMIT,
    })
  }

  // ── 포장모드: AI 사용 (G블록만) ──
  if (mode !== 'package') {
    return Response.json({ error: 'Invalid mode' }, { status: 400 })
  }

  const level = Math.min(100, Math.max(0, Math.round(body.level ?? 60)))

  const openaiBody = JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PACKAGE },
      { role: 'user', content: '야 꺼져' },
      { role: 'assistant', content: '{"g":"귀하께서 이 자리에서 조속히 퇴거하여 주시기를 간곡히 요청드립니다. 귀하의 존재가 현 상황에 더 이상 부합하지 않는 것으로 판단되며, 자진하여 자리를 정리해 주시는 것이 마땅하리라 사료됩니다.","t":"reject"}' },
      { role: 'user', content: '이 개씨발놈아' },
      { role: 'assistant', content: '{"g":"귀하의 인품과 품성에 대하여 심대한 의문을 제기하지 않을 수 없으며, 귀하께서 그간 보여주신 행태는 도저히 용납할 수 없는 수준이라 사료됩니다. 귀하와 같은 분이 존재한다는 사실 자체가 심히 개탄스럽다는 점을 분명히 말씀드립니다.","t":"criticize"}' },
      { role: 'user', content: text },
    ],
    temperature: 0.7,
    max_tokens: 500,
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
    const gBlock = parsed.g || parsed.result || ''
    const rawIntent = (parsed.t || 'general') as string
    const validIntents: Intent[] = ['criticize', 'request', 'reject', 'complain', 'threaten', 'praise', 'general']
    const intent: Intent = validIntents.includes(rawIntent as Intent) ? rawIntent as Intent : 'general'
    const result = assemblePackage(gBlock, level, rawText, intent)
    return Response.json({ result, _used: newUsed, _limit: DAILY_LIMIT })
  } catch {
    return Response.json({ error: '응답을 처리하지 못했습니다. 다시 시도해주세요.' }, { status: 502 })
  }
}
