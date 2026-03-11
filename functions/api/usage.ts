interface Env {
  RATE_LIMIT: KVNamespace
}

function getToday(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const ip = context.request.headers.get('CF-Connecting-IP') || 'unknown'
  const today = getToday()
  const rateKey = `rate:${ip}:${today}`

  let used = 0
  if (context.env.RATE_LIMIT) {
    const val = await context.env.RATE_LIMIT.get(rateKey)
    used = val ? parseInt(val, 10) : 0
  }

  return Response.json({ used, limit: 5 })
}
