export const generateCorrelationId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `cid_${Math.random().toString(36).slice(2, 10)}`
}
