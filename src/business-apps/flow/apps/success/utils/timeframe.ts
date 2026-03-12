export type SuccessTimeframe = 'last24h' | 'wtd' | 'mtd' | 'qtd' | 'ytd'

type TranslateFn = (key: string, args?: Record<string, unknown>) => string

export interface SuccessTimeframeOption {
  value: SuccessTimeframe
  label: string
}

export interface SuccessTimeframeDateRange {
  startDate: string
  endDate: string
}

export const DEFAULT_SUCCESS_TIMEFRAME: SuccessTimeframe = 'mtd'

export function getSuccessTimeframeOptions(
  t: TranslateFn,
  { includeLast24h = false }: { includeLast24h?: boolean } = {}
): SuccessTimeframeOption[] {
  const options: SuccessTimeframeOption[] = [
    { value: 'wtd', label: t('timeframe-wtd') },
    { value: 'mtd', label: t('timeframe-mtd') },
    { value: 'qtd', label: t('timeframe-qtd') },
    { value: 'ytd', label: t('timeframe-ytd') }
  ]

  return includeLast24h ? [{ value: 'last24h', label: t('timeframe-last24h') }, ...options] : options
}

export function getSuccessTimeframeDateRange(timeframe: SuccessTimeframe, now = new Date()): SuccessTimeframeDateRange {
  const end = new Date(now)
  const start = new Date(now)

  switch (timeframe) {
    case 'last24h':
      start.setHours(start.getHours() - 24)
      break
    case 'wtd': {
      const day = start.getDay()
      const diff = day === 0 ? 6 : day - 1
      start.setDate(start.getDate() - diff)
      start.setHours(0, 0, 0, 0)
      break
    }
    case 'mtd':
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      break
    case 'qtd': {
      const currentMonth = start.getMonth()
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3
      start.setMonth(quarterStartMonth, 1)
      start.setHours(0, 0, 0, 0)
      break
    }
    case 'ytd':
      start.setMonth(0, 1)
      start.setHours(0, 0, 0, 0)
      break
  }

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString()
  }
}
