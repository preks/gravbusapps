// Shared duration utilities for My Time features
// Parses strings like "8h", "7h 30m", "0h", "15m" into total minutes
export const parseDurationToMinutes = (text?: string): number => {
  if (!text) return 0
  let hours = 0
  let minutes = 0
  const tokens = String(text).trim().split(/\s+/)
  for (const token of tokens) {
    if (/^\d+h$/i.test(token)) {
      hours = Number.parseInt(token.slice(0, -1), 10) || 0
    } else if (/^\d+m$/i.test(token)) {
      minutes = Number.parseInt(token.slice(0, -1), 10) || 0
    }
  }
  return hours * 60 + minutes
}
