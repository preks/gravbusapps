/** A money amount is always paired with its currency and minor-unit precision. */
export interface Money {
  /** Amount in major units, for example 1234.56. Persisted alongside precision. */
  amount: number
  /** ISO 4217 currency code, for example "EUR". */
  currency: string
  /** Minor-unit precision, for example 2 for EUR. */
  precision: number
}
