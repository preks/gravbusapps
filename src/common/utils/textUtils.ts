export const truncateText = (text?: string, max: number = 50): string => {
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max)}...` : text
}
