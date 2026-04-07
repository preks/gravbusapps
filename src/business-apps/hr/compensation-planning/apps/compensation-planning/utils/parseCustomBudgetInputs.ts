export function roundMoney2(value: number): number {
  return Math.round(value * 100) / 100
}

function parseMoneyNumericFromRaw(raw: string): number {
  const normalized = raw.replace(',', '.').trim()
  if (normalized === '') {
    return 0
  }
  const parsed = Number(normalized)
  if (Number.isNaN(parsed)) {
    return 0
  }
  return roundMoney2(parsed)
}

export function parseCustomAmountInput(raw: string): number {
  return parseMoneyNumericFromRaw(raw)
}

/** Percentage points (e.g. 12.5 means 12.5% of the pool). */
export function parseCustomPercentInput(raw: string): number {
  return parseMoneyNumericFromRaw(raw)
}
