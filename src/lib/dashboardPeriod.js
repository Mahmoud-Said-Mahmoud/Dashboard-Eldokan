const STORAGE_KEY = 'eldokan_dashboard_period'

const VALID_PERIODS = new Set([
  'today',
  '7d',
  '30d',
  'month',
  'last-month',
  'custom',
])

function isoLocalDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseIsoDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  if (
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
  ) {
    return null
  }
  date.setHours(0, 0, 0, 0)
  return date
}

function addDays(date, amount) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  next.setHours(0, 0, 0, 0)
  return next
}

function inclusiveDays(from, to) {
  const fromUtc = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())
  const toUtc = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.floor((toUtc - fromUtc) / 86400000) + 1
}

function normalize(value = {}) {
  const period = VALID_PERIODS.has(value?.period) ? value.period : '7d'
  return {
    period,
    from: period === 'custom' ? String(value?.from || '') : '',
    to: period === 'custom' ? String(value?.to || '') : '',
  }
}

export function resolveDashboardPeriod(value = {}, now = new Date()) {
  const current = normalize(value)
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  let fromDate = today
  let toDate = today

  if (current.period === '7d') {
    fromDate = addDays(today, -6)
  } else if (current.period === '30d') {
    fromDate = addDays(today, -29)
  } else if (current.period === 'month') {
    fromDate = new Date(today.getFullYear(), today.getMonth(), 1)
  } else if (current.period === 'last-month') {
    fromDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    toDate = new Date(today.getFullYear(), today.getMonth(), 0)
  } else if (current.period === 'custom') {
    const parsedFrom = parseIsoDate(current.from)
    const parsedTo = parseIsoDate(current.to)

    if (!parsedFrom || !parsedTo) {
      return {
        ...current,
        from: current.from || '',
        to: current.to || '',
        days: 0,
        valid: false,
      }
    }

    fromDate = parsedFrom
    toDate = parsedTo
    if (fromDate > toDate) {
      ;[fromDate, toDate] = [toDate, fromDate]
    }
  }

  return {
    period: current.period,
    from: isoLocalDate(fromDate),
    to: isoLocalDate(toDate),
    days: inclusiveDays(fromDate, toDate),
    valid: true,
  }
}

export function getDashboardPeriod() {
  try {
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null')
    return normalize(stored || {})
  } catch {
    return normalize({})
  }
}

export function saveDashboardPeriod(value) {
  const normalized = normalize(value)
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  } catch {
    // Session persistence is optional; the active page still keeps local state.
  }
  return normalized
}

export function dashboardPeriodApiParams(value) {
  const resolved = resolveDashboardPeriod(value)
  if (!resolved.valid) {
    return { period: resolved.period }
  }
  return {
    period: resolved.period,
    from: resolved.from,
    to: resolved.to,
  }
}

export function dashboardPeriodLabel(value, ar = false) {
  const current = normalize(value)
  const resolved = resolveDashboardPeriod(current)

  const labels = {
    today: ar ? 'اليوم' : 'Today',
    '7d': ar ? 'آخر 7 أيام' : 'Last 7 Days',
    '30d': ar ? 'آخر 30 يوم' : 'Last 30 Days',
    month: ar ? 'هذا الشهر' : 'This Month',
    'last-month': ar ? 'الشهر السابق' : 'Last Month',
    custom: ar ? 'فترة مخصصة' : 'Custom Range',
  }

  const title = labels[current.period] || labels['7d']
  if (!resolved.valid || !resolved.from || !resolved.to) return title

  return `${title} • ${resolved.days} ${ar ? 'يوم' : resolved.days === 1 ? 'day' : 'days'} • \u200E${resolved.from}\u200E → \u200E${resolved.to}\u200E`
}
