export const parseToolCodes = (toolsString?: string | null): string[] => {
  if (!toolsString) return []
  return toolsString
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .filter((v, i, a) => a.indexOf(v) === i)
}

export const formatToolCodes = (codes: string[]): string => {
  return codes
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(',')
}
