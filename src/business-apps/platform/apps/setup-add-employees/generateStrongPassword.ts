const LOWER = 'abcdefghijklmnopqrstuvwxyz'
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const DIGITS = '0123456789'
const SYMBOLS = '!@#$%^&*-_+='
const ALL = LOWER + UPPER + DIGITS + SYMBOLS

function randomInt(maxExclusive: number): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0]! % maxExclusive
}

/**
 * Cryptographically random password with mixed character classes (suitable for admin-set initial passwords).
 */
export function generateStrongPassword(length = 18): string {
  const len = Math.max(12, Math.min(64, length))
  const required = [
    LOWER[randomInt(LOWER.length)],
    UPPER[randomInt(UPPER.length)],
    DIGITS[randomInt(DIGITS.length)],
    SYMBOLS[randomInt(SYMBOLS.length)]
  ]
  const rest: string[] = []
  for (let i = required.length; i < len; i++) {
    rest.push(ALL[randomInt(ALL.length)])
  }
  const chars = [...required, ...rest]
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    const tmp = chars[i]!
    chars[i] = chars[j]!
    chars[j] = tmp
  }
  return chars.join('')
}
