/**
 * Currency precision and rounding helpers.
 *
 * All monetary math goes through here so rounding behaviour is consistent and
 * testable across calculations, totals, FX conversion, and ledger postings.
 */
import { CURRENCY_PRECISION, DEFAULT_ROUNDING_MODE } from '../constants'
import type { RoundingMode } from '../settings/types'

export function getPrecision(currency: string, overrides?: Record<string, number>): number {
  const fromOverride = overrides?.[currency]
  if (typeof fromOverride === 'number') {
    return fromOverride
  }
  const known = CURRENCY_PRECISION[currency]
  return typeof known === 'number' ? known : 2
}

/** Round a value to the given number of decimals using the selected mode. */
export function roundTo(value: number, decimals: number, mode: RoundingMode = DEFAULT_ROUNDING_MODE): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  const factor = 10 ** decimals
  const scaled = value * factor

  switch (mode) {
    case 'DOWN':
      return Math.floor(scaled) / factor
    case 'UP':
      return Math.ceil(scaled) / factor
    case 'HALF_EVEN':
      return roundHalfEven(scaled) / factor
    case 'HALF_UP':
    default:
      return roundHalfUp(scaled) / factor
  }
}

/** Round a monetary amount to its currency's precision. */
export function roundMoney(
  value: number,
  currency: string,
  mode: RoundingMode = DEFAULT_ROUNDING_MODE,
  overrides?: Record<string, number>
): number {
  return roundTo(value, getPrecision(currency, overrides), mode)
}

/** Convert an amount from one currency to another using a direct rate. */
export function convertCurrency(
  amount: number,
  rate: number,
  toCurrency: string,
  mode: RoundingMode = DEFAULT_ROUNDING_MODE,
  overrides?: Record<string, number>
): number {
  return roundMoney(amount * rate, toCurrency, mode, overrides)
}

function roundHalfUp(scaled: number): number {
  // Sign-aware rounding with a relative epsilon so values like 1.005 and 2.675
  // (which are slightly below their exact value in IEEE-754) still round up.
  const abs = Math.abs(scaled)
  return Math.sign(scaled) * Math.round(abs * (1 + Number.EPSILON))
}

function roundHalfEven(scaled: number): number {
  const floor = Math.floor(scaled)
  const diff = scaled - floor
  if (diff > 0.5) {
    return floor + 1
  }
  if (diff < 0.5) {
    return floor
  }
  // Exactly halfway: round to the even neighbour.
  return floor % 2 === 0 ? floor : floor + 1
}
