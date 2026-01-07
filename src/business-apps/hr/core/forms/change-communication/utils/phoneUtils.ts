import { parseNumber, formatNumber, isValidPhoneNumber } from 'libphonenumber-js'

export const normalizePhoneNumber = (value: string, channelType: string, channels: any[]): string => {
  if (!value) return value

  const selected = channels.find(c => c.id === channelType)
  const channelValue = (selected?.value || '').toString().toLowerCase()
  const normalizedValue = channelValue.split(':').pop()?.trim() || channelValue
  const isPhone = ['phone', 'mobile', 'fax', 'pager', 'tel', 'telephone'].includes(normalizedValue)

  if (!isPhone) return value

  if (value.startsWith('+')) return value

  try {
    const parsed = parseNumber(value)
    if (parsed && 'phone' in parsed && isValidPhoneNumber(value)) {
      return formatNumber(parsed, 'E.164')
    }
  } catch {}

  return value
}
