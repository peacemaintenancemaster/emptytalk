import { useState, useEffect, useRef, useCallback } from 'react'
import { analyzeText, generatePackaged, fetchUsage, type DecodeResult, type PackageResult } from './api'

type Mode = 'decode' | 'package'

const PRESETS = [
  { value: 10, label: '직설' },
  { value: 30, label: '적당' },
  { value: 60, label: '비즈니스' },
  { value: 100, label: '풀빈말' },
]

const THEME = {
  decode: {
    pill: '#D4451A',
    btnBg: '#D4451A',
    btnHover: '#C2410C',
  },
  package: {
    pill: '#6366F1',
    btnBg: '#6366F1',
    btnHover: '#4F46E5',
  },
}

// [[빈말]] 형식을 파싱하여 세그먼트 배열로 변환
function parseHighlighted(text: string): { text: string; empty: boolean }[] {
  // 리터럴 \n을 실제 줄바꿈으로 변환
  const cleaned = text.replace(/\\n/g, '\n')
  const segments: { text: string; empty: boolean }[] = []
  const regex = /\[\[(.*?)\]\]/gs
  let lastIndex = 0
  let match

  while ((match = regex.exec(cleaned)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: cleaned.slice(lastIndex, match.index), empty: false })
    }
    segments.push({ text: match[1], empty: true })
    lastIndex = regex.lastIndex
  }

  if (lastIndex < cleaned.length) {
    segments.push({ text: cleaned.slice(lastIndex), empty: false })
  }

  return segments
}

export default function App() {
  const [mode, setMode] = useState<Mode>('decode')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [decodeResult, setDecodeResult] = useState<DecodeResult | null>(null)
  const [packageResult, setPackageResult] = useState<PackageResult | null>(null)
  const [sliderValue, setSliderValue] = useState(70)
  const [copyToast, setCopyToast] = useState(false)
  const [gaugeAnimated, setGaugeAnimated] = useState(false)
  const [used, setUsed] = useState(0)
  const [limit] = useState(5)
  const [showTerms, setShowTerms] = useState(false)
  const [termsTab, setTermsTab] = useState<'terms' | 'privacy'>('terms')

  const decodeRef = useRef<HTMLButtonElement>(null)
  const packageRef = useRef<HTMLButtonElement>(null)
  const toggleRef = useRef<HTMLDivElement>(null)

  const theme = THEME[mode]
  const remaining = Math.max(0, limit - used)

  // 페이지 로드 시 사용 횟수 가져오기
  useEffect(() => {
    fetchUsage().then(info => setUsed(info.used))
  }, [])

  // 카카오 애드핏 스크립트 로드
  useEffect(() => {
    if (document.querySelector('script[src*="ba.min.js"]')) return
    const script = document.createElement('script')
    script.src = '//t1.daumcdn.net/kas/static/ba.min.js'
    script.async = true
    document.body.appendChild(script)
  }, [])

  useEffect(() => {
    setDecodeResult(null)
    setPackageResult(null)
    setError('')
    setGaugeAnimated(false)
  }, [mode])

  useEffect(() => {
    if (decodeResult) {
      const timer = setTimeout(() => setGaugeAnimated(true), 100)
      return () => clearTimeout(timer)
    }
  }, [decodeResult])

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || remaining <= 0) return

    setLoading(true)
    setError('')
    setDecodeResult(null)
    setPackageResult(null)
    setGaugeAnimated(false)

    try {
      if (mode === 'decode') {
        const result = await analyzeText(input)
        setDecodeResult(result)
        if (result._used != null) setUsed(result._used)
      } else {
        const result = await generatePackaged(input, sliderValue)
        setPackageResult(result)
        if (result._used != null) setUsed(result._used)
      }
    } catch (e: any) {
      setError(e.message || '알 수 없는 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }, [input, mode, sliderValue, remaining])

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    setCopyToast(true)
    setTimeout(() => setCopyToast(false), 2000)
  }, [])

  const closestPreset = PRESETS.reduce((prev, curr) =>
    Math.abs(curr.value - sliderValue) < Math.abs(prev.value - sliderValue) ? curr : prev
  )

  const segments = decodeResult?.highlighted ? parseHighlighted(decodeResult.highlighted) : []

  // Toggle pill position
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 })
  useEffect(() => {
    const activeBtn = mode === 'decode' ? decodeRef.current : packageRef.current
    const container = toggleRef.current
    if (activeBtn && container) {
      const containerRect = container.getBoundingClientRect()
      const btnRect = activeBtn.getBoundingClientRect()
      setPillStyle({
        left: btnRect.left - containerRect.left,
        width: btnRect.width,
      })
    }
  }, [mode])

  return (
    <div
      className="min-h-screen flex flex-col transition-colors duration-500"
      style={{ background: mode === 'decode' ? '#F5F1EB' : '#EEF2FF' }}
    >
      {/* Header */}
      <header className="px-6 md:px-12 py-6 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <svg width="22" height="22" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 10C25 10 5 26 5 46c0 11 6 21 16 28l-4 14c-.5 1.8 1.5 3.2 3 2l16-10c4 1.5 9 2 14 2 25 0 45-16 45-36S75 10 50 10z" stroke="#1C1917" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h1 className="text-xl font-bold tracking-tight text-ink-900">
            빈말번역기
          </h1>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full transition-colors duration-500"
            style={{
              background: mode === 'decode' ? '#D4451A' : '#6366F1',
              color: '#fff',
            }}
          >
            beta
          </span>
        </div>
      </header>

      {/* Hero */}
      <div className="text-center px-6 pt-4 pb-8">
        <p className="text-2xl md:text-3xl font-bold tracking-tight mb-3 transition-colors duration-500"
          style={{ color: mode === 'decode' ? '#1C1917' : '#1E1B4B' }}
        >
          {mode === 'decode' ? '진심만 남기고, 빈말은 걸러드려요' : '진심은 그대로, 빈말은 풍성하게'}
        </p>
        <p className="text-sm max-w-md mx-auto leading-relaxed transition-colors duration-500"
          style={{ color: mode === 'decode' ? '#78716C' : '#6366F1' }}
        >
          {mode === 'decode'
            ? '메시지를 붙여넣으면 빈말을 찾아드립니다'
            : '핵심만 쓰세요. 빈말은 저희가 채워드립니다'}
        </p>
      </div>

      {/* 사용 횟수 */}
      <div className="flex justify-center items-center gap-2.5 mb-4">
        <span className="text-xs font-medium text-ink-400">오늘 사용 횟수</span>
        <div className="flex gap-1">
          {Array.from({ length: limit }, (_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full transition-colors duration-300"
              style={{
                background: i < used ? '#D6D3D1' : theme.pill,
              }}
            />
          ))}
        </div>
        <span className={`text-xs font-semibold ${remaining <= 1 ? 'text-red-500' : 'text-ink-500'}`}>
          {remaining}/{limit}
        </span>
      </div>

      {/* Mode Toggle */}
      <div className="flex justify-center mb-8">
        <div className="mode-toggle" ref={toggleRef}>
          <div
            className="mode-toggle-pill"
            style={{
              left: pillStyle.left,
              width: pillStyle.width,
              background: theme.pill,
            }}
          />
          <button
            ref={decodeRef}
            className={mode === 'decode' ? 'active' : ''}
            onClick={() => setMode('decode')}
          >
            해독 모드
          </button>
          <button
            ref={packageRef}
            className={mode === 'package' ? 'active' : ''}
            onClick={() => setMode('package')}
          >
            포장 모드
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 px-6 md:px-12 pb-16 max-w-5xl mx-auto w-full">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Input */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-ink-500 uppercase tracking-wider">
                {mode === 'decode' ? '분석할 텍스트' : '핵심 메시지'}
              </label>
              <span className={`text-xs ${input.length >= (mode === 'decode' ? 1000 : 100) ? 'text-red-500 font-semibold' : 'text-ink-400'}`}>
                {input.length}/{'\u2009'}{mode === 'decode' ? '1,000' : '100'}자
              </span>
            </div>
            <textarea
              className="input-area flex-1"
              maxLength={mode === 'decode' ? 1000 : 100}
              style={{
                borderColor: input.length >= (mode === 'decode' ? 1000 : 100) ? '#EF4444' : input ? theme.pill + '40' : undefined,
              }}
              placeholder={
                mode === 'decode'
                  ? '거래처 메일, 상사 피드백, 오랜만에 온 카톡...\n빈말이 의심되는 텍스트를 붙여넣어보세요'
                  : '"다음 주 수요일까지 견적서 주세요"\n핵심만 적어주세요'
              }
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit()
              }}
            />

            {/* 포장 모드 슬라이더 */}
            {mode === 'package' && (
              <div className="rounded-2xl border border-indigo-200 bg-white p-5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-ink-500">빈말 농도</span>
                  <span className="text-lg font-bold" style={{ color: '#6366F1' }}>
                    {sliderValue}%
                  </span>
                </div>
                <p className="text-xs text-ink-400 mb-3">
                  {sliderValue <= 20
                    ? '꽤나 직설적인 메시지가 될 거예요'
                    : sliderValue <= 40
                    ? '적당한 인삿말이 들어가겠네요'
                    : sliderValue <= 60
                    ? '무난한 비즈니스 메일 수준이에요'
                    : sliderValue <= 80
                    ? '상당히 공손한 메시지가 되겠네요'
                    : '빈말의 향연이 펼쳐집니다'}
                </p>
                <div className="density-slider-wrapper relative mb-3">
                  <div className="density-slider-track">
                    <div
                      className="density-slider-fill"
                      style={{
                        width: `calc(${((sliderValue - 10) / 90) * 100}% + ${14 - ((sliderValue - 10) / 90) * 28}px)`,
                        background: 'linear-gradient(90deg, #A5B4FC, #6366F1)',
                      }}
                    />
                  </div>
                  <input
                    type="range"
                    className="density-slider"
                    min="10"
                    max="100"
                    value={sliderValue}
                    onChange={e => setSliderValue(Number(e.target.value))}
                  />
                </div>
                <div className="flex justify-between">
                  {PRESETS.map(p => (
                    <button
                      key={p.value}
                      className={`preset-label ${sliderValue === p.value ? 'active' : ''}`}
                      style={
                        sliderValue === p.value
                          ? { background: '#6366F1' }
                          : undefined
                      }
                      onClick={() => setSliderValue(p.value)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                className="btn-primary"
                style={{
                  background: remaining <= 0 ? '#A8A29E' : theme.btnBg,
                }}
                onMouseEnter={e => {
                  if (remaining > 0) e.currentTarget.style.background = theme.btnHover
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = remaining <= 0 ? '#A8A29E' : theme.btnBg
                }}
                onClick={handleSubmit}
                disabled={loading || !input.trim() || remaining <= 0}
              >
                {loading ? (
                  <>
                    분석 중
                    <span className="loading-dots">
                      <span /><span /><span />
                    </span>
                  </>
                ) : remaining <= 0 ? (
                  '오늘 사용 횟수 소진'
                ) : (
                  <>
                    {mode === 'decode' ? '빈말 해독하기' : `빈말 ${sliderValue}% 포장하기`}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
              <span className="text-xs text-ink-400 hidden sm:inline">
                Ctrl + Enter
              </span>
            </div>
          </div>

          {/* Results */}
          <div className="flex flex-col gap-4">
            <label className="text-xs font-semibold text-ink-500 uppercase tracking-wider">
              결과
            </label>

            {error && (
              <div className="result-card border-red-200 bg-red-50 text-red-700 text-sm">
                {error}
              </div>
            )}

            {!error && !decodeResult && !packageResult && !loading && (
              <div
                className="flex-1 flex items-center justify-center text-center py-16 rounded-2xl border-2 border-dashed transition-colors duration-500"
                style={{ borderColor: mode === 'decode' ? '#E8E0D4' : '#C7D2FE' }}
              >
                <div className="text-ink-400">
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <p className="text-sm">
                    {mode === 'decode'
                      ? '이 메시지에 진심이 얼마나 들어있을까요?'
                      : '핵심만 쓰세요. 빈말은 저희가 채워드립니다.'}
                  </p>
                </div>
              </div>
            )}

            {loading && (
              <div className="flex-1 flex items-center justify-center py-16 rounded-2xl border border-cream-300 bg-white">
                <div className="text-center">
                  <div className="loading-dots mb-4 justify-center flex">
                    <span style={{ background: theme.pill }} />
                    <span style={{ background: theme.pill }} />
                    <span style={{ background: theme.pill }} />
                  </div>
                  <p className="text-sm text-ink-400">
                    {mode === 'decode' ? '빈말을 걸러내고 있습니다...' : '빈말을 채우고 있습니다...'}
                  </p>
                </div>
              </div>
            )}

            {/* Decode Result */}
            {decodeResult && !loading && (
              <div className="result-card flex flex-col gap-6">
                {/* Percentage */}
                <div>
                  <div className="flex items-end justify-between mb-2">
                    <span className="text-xs font-semibold text-ink-500">빈말 농도</span>
                    <span className="percentage-display">
                      {decodeResult.ratio}%
                    </span>
                  </div>
                  <div className="gauge-track">
                    <div
                      className="gauge-fill"
                      style={{ width: gaugeAnimated ? `${decodeResult.ratio}%` : '0%' }}
                    />
                  </div>
                  <p className="text-xs text-ink-400 mt-2">
                    {decodeResult.ratio >= 70
                      ? '빈말의 향연이었네요'
                      : decodeResult.ratio >= 40
                      ? '적당한 수준의 빈말입니다'
                      : '꽤 솔직한 메시지네요'}
                  </p>
                </div>

                {/* Highlighted Text */}
                <div>
                  <span className="text-xs font-semibold text-ink-500 block mb-3">원문 분석</span>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {segments.map((seg, i) => {
                      const isWhitespace = !seg.text.trim() || /^[\s.,;:!?·…—\-–'"'"「」『』()（）《》<>]+$/.test(seg.text.trim())
                      return (
                      <span
                        key={i}
                        className={seg.empty ? 'segment-empty' : isWhitespace ? '' : 'segment-genuine'}
                      >
                        {seg.text}
                      </span>
                      )
                    })}
                  </div>
                  <div className="flex gap-4 mt-3">
                    <span className="flex items-center gap-1.5 text-xs text-ink-400">
                      <span className="w-3 h-0.5 bg-ink-300 inline-block rounded" style={{textDecoration:'line-through'}} /> 빈말
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-ink-400">
                      <span className="w-3 h-2 rounded-sm inline-block" style={{background:'#FFF7ED', borderBottom:'2px solid #F59E0B'}} /> 진심
                    </span>
                  </div>
                </div>

                {/* Summary */}
                <div>
                  <span className="text-xs font-semibold text-ink-500 block mb-2">한 줄 요약</span>
                  <div className="summary-box">
                    <p className="text-sm font-medium text-ink-900">
                      {decodeResult.core}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    className="btn-secondary"
                    onClick={() => handleCopy(decodeResult.core)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    요약 복사
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      const shareText = `이 메시지의 빈말 농도: ${decodeResult.ratio}%\n핵심: ${decodeResult.core}\n\n빈말번역기로 분석해보세요!`
                      handleCopy(shareText)
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                    공유하기
                  </button>
                </div>
              </div>
            )}

            {/* Package Result */}
            {packageResult && !loading && (
              <div className="result-card flex flex-col gap-5" style={{ borderColor: '#C7D2FE' }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink-500">
                    빈말 {sliderValue}% 포장 결과
                  </span>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{ background: '#EEF2FF', color: '#6366F1' }}
                  >
                    {closestPreset.label}
                  </span>
                </div>
                <div className="rounded-xl px-4 py-3" style={{ background: '#F5F5F4', border: '1px solid #E7E5E4' }}>
                  <span className="text-xs text-ink-400">원문</span>
                  <p className="text-sm text-ink-700 mt-1">{input}</p>
                </div>
                <div className="rounded-2xl p-5" style={{ background: '#EEF2FF', border: '1px solid #C7D2FE' }}>
                  <p className="text-sm leading-relaxed text-ink-900 whitespace-pre-wrap">
                    {packageResult.result ?? '결과를 생성하지 못했습니다'}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-400">
                    {packageResult.result?.length ?? 0}자
                  </span>
                  <button
                    className="btn-secondary"
                    onClick={() => handleCopy(packageResult.result ?? '')}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    복사하기
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Kakao AdFit */}
      {/* PC 광고 (728x90) - wrapper로 반응형 처리 */}
      <div className="hidden md:flex justify-center py-4">
        <ins className="kakao_ad_area" style={{ display: 'none' }}
          data-ad-unit="DAN-JSgfcpw0CcJVep1O"
          data-ad-width="728"
          data-ad-height="90" />
      </div>
      {/* 모바일 광고 (320x50) - wrapper로 반응형 처리 */}
      <div className="flex md:hidden justify-center py-4">
        <ins className="kakao_ad_area" style={{ display: 'none' }}
          data-ad-unit="DAN-j9l7WVHVCzDHfdSr"
          data-ad-width="320"
          data-ad-height="50" />
      </div>

      {/* Footer */}
      <footer className="text-center py-8 px-6 flex flex-col items-center gap-3">
        <p>입력 및 출력 내용이 AI 모델 개선에 활용될 수 있습니다</p>
        <div className="flex items-center gap-2" style={{ fontSize: '0.7rem' }}>
          <button
            className="footer-link"
            onClick={() => { setShowTerms(true); setTermsTab('terms') }}
          >
            이용약관
          </button>
          <span style={{ color: '#D6D3D1' }}>&middot;</span>
          <button
            className="footer-link"
            onClick={() => { setShowTerms(true); setTermsTab('privacy') }}
          >
            개인정보처리방침
          </button>
        </div>
        <div style={{ fontSize: '0.65rem', color: '#D6D3D1', lineHeight: 1.8 }}>
          <p>하우워즈 &middot; 사업자등록번호 413-24-01458</p>
          <p>통신판매업신고 제 2023-서울강남-01292호</p>
          <p>서울특별시 금천구 디지털로10길 78, 941-77호(가산동, 가산테라타워)</p>
        </div>
      </footer>

      {/* Terms Modal */}
      {showTerms && (
        <>
          <div
            className="settings-backdrop"
            onClick={() => setShowTerms(false)}
          />
          <div className="terms-modal">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-1">
                <button
                  className="terms-tab"
                  style={termsTab === 'terms' ? { background: '#1C1917', color: '#fff' } : undefined}
                  onClick={() => setTermsTab('terms')}
                >
                  이용약관
                </button>
                <button
                  className="terms-tab"
                  style={termsTab === 'privacy' ? { background: '#1C1917', color: '#fff' } : undefined}
                  onClick={() => setTermsTab('privacy')}
                >
                  개인정보처리방침
                </button>
              </div>
              <button
                onClick={() => setShowTerms(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#78716C" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="terms-content">
              {termsTab === 'terms' ? (
                <>
                  <h3>1. 서비스 개요</h3>
                  <p>빈말번역기(이하 "서비스")는 하우워즈가 운영하는 AI 기반 한국어 텍스트 분석·생성 서비스입니다. 본 서비스는 참고용으로 제공되며, 분석 결과의 정확성을 보장하지 않습니다.</p>

                  <h3>2. 이용 제한</h3>
                  <p>서비스는 1인당 하루 5회까지 무료로 이용할 수 있습니다. 입력 텍스트는 1,000자로 제한됩니다. 이용 횟수는 매일 자정(KST) 초기화됩니다.</p>

                  <h3>3. 입력 데이터 활용</h3>
                  <p>입력된 내용은 AI 모델 개선 및 서비스 품질 향상에 활용될 수 있습니다. 개인정보, 기밀정보 등 민감한 정보의 입력을 자제해주세요.</p>

                  <h3>4. 면책 조항</h3>
                  <p>본 서비스의 분석·생성 결과는 AI가 생성한 참고 자료이며, 실제 의도나 맥락과 다를 수 있습니다. 서비스 이용으로 인해 발생하는 문제에 대해 운영자는 책임을 지지 않습니다.</p>

                  <h3>5. 금지 행위</h3>
                  <p>비정상적인 대량 요청, 자동화된 접근, 서비스 방해 행위는 금지되며, 위반 시 이용이 제한될 수 있습니다.</p>

                  <h3>6. 약관 변경</h3>
                  <p>본 약관은 사전 고지 없이 변경될 수 있으며, 서비스 이용 시 변경된 약관에 동의한 것으로 간주합니다.</p>
                </>
              ) : (
                <>
                  <h3>1. 수집하는 개인정보</h3>
                  <p>서비스 이용 시 IP 주소가 이용 횟수 제한 목적으로 수집됩니다. 이용자가 입력한 텍스트는 AI 처리를 위해 일시적으로 전송되며, 서비스 품질 개선에 활용될 수 있습니다.</p>

                  <h3>2. 개인정보 이용 목적</h3>
                  <p>수집된 정보는 서비스 제공 및 이용 제한 관리, AI 모델 개선 및 서비스 품질 향상 목적으로 이용됩니다.</p>

                  <h3>3. 보유 및 파기</h3>
                  <p>IP 기반 이용 횟수 데이터는 24시간 이내 자동 삭제됩니다. 입력 텍스트는 AI 처리 후 별도 저장하지 않습니다.</p>

                  <h3>4. 제3자 제공</h3>
                  <p>입력된 텍스트는 AI 분석을 위해 OpenAI API로 전송됩니다. 그 외 제3자에게 개인정보를 제공하지 않습니다.</p>

                  <h3>5. 이용자의 권리</h3>
                  <p>이용자는 개인정보 처리에 동의하지 않을 권리가 있으며, 동의하지 않을 경우 서비스 이용이 제한될 수 있습니다.</p>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Copy Toast */}
      <div className={`copy-toast ${copyToast ? 'visible' : ''}`}>
        복사되었습니다
      </div>
    </div>
  )
}
