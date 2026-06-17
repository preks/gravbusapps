export const ROUNDING_MODES = ['HALF_UP', 'HALF_EVEN', 'DOWN', 'UP'] as const
export type RoundingMode = (typeof ROUNDING_MODES)[number]

export interface CurrencySettings {
  /** ISO 4217 codes enabled for invoicing in this tenant. */
  enabledCurrencies: string[]
  /** Per-currency minor-unit precision overrides. */
  precisionByCurrency: Record<string, number>
  roundingMode: RoundingMode
}
