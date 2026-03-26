/**
 * Curated ink colors for typed/drawn signature SVG export.
 * Hex values are fixed for consistent rendering across viewers and print.
 */

export const DEFAULT_SIGNATURE_INK_HEX = '#000000'

export type InkFamily = 'black' | 'blue' | 'green' | 'red'
export type InkTone = 'dark' | 'medium' | 'light'

export interface SignatureInkOption {
  hex: string
  family: InkFamily
  tone: InkTone
}

const BLACK_OPTIONS: readonly SignatureInkOption[] = [
  { hex: '#000000', family: 'black', tone: 'dark' },
  { hex: '#374151', family: 'black', tone: 'medium' },
  { hex: '#6b7280', family: 'black', tone: 'light' }
]

const BLUE_OPTIONS: readonly SignatureInkOption[] = [
  { hex: '#1e3a8a', family: 'blue', tone: 'dark' },
  { hex: '#2563eb', family: 'blue', tone: 'medium' },
  { hex: '#60a5fa', family: 'blue', tone: 'light' }
]

const GREEN_OPTIONS: readonly SignatureInkOption[] = [
  { hex: '#14532d', family: 'green', tone: 'dark' },
  { hex: '#15803d', family: 'green', tone: 'medium' },
  { hex: '#22c55e', family: 'green', tone: 'light' }
]

const RED_OPTIONS: readonly SignatureInkOption[] = [
  { hex: '#7f1d1d', family: 'red', tone: 'dark' },
  { hex: '#b91c1c', family: 'red', tone: 'medium' },
  { hex: '#ef4444', family: 'red', tone: 'light' }
]

export const SIGNATURE_INK_OPTIONS: readonly SignatureInkOption[] = [
  ...BLACK_OPTIONS,
  ...BLUE_OPTIONS,
  ...GREEN_OPTIONS,
  ...RED_OPTIONS
]

export const INK_FAMILIES_ORDER: readonly InkFamily[] = ['black', 'blue', 'green', 'red']
