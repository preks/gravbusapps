/**
 * Emoji Utility Functions
 * Convert emoji picker data to catalog entry format
 */
import type { EmojiClickData } from 'emoji-picker-react'

// Skin tone modifiers (Fitzpatrick scale)
const SKIN_TONE_MODIFIERS = [
  { code: '1f3fb', suffix: 'LIGHT', label: 'Light' },
  { code: '1f3fc', suffix: 'MEDIUM_LIGHT', label: 'Medium Light' },
  { code: '1f3fd', suffix: 'MEDIUM', label: 'Medium' },
  { code: '1f3fe', suffix: 'MEDIUM_DARK', label: 'Medium Dark' },
  { code: '1f3ff', suffix: 'DARK', label: 'Dark' }
]

/**
 * Generate UPPER_SNAKE_CASE code from name
 * "Thumbs Up" -> "THUMBS_UP"
 * "+1" -> "+1"
 * "Heart" -> "HEART"
 */
export const generateCode = (name: string): string => {
  return name.toUpperCase().replaceAll(/\s+/g, '_')
}

/**
 * Format unified code to Unicode format
 * "1f44d" -> "U+1F44D"
 * "2764-fe0f" -> "U+2764 U+FE0F"
 */
export const formatUnicode = (unified: string): string => {
  return unified
    .split('-')
    .map(code => `U+${code.toUpperCase()}`)
    .join(' ')
}

/**
 * Generate shortcode from name
 * "Thumbs Up" -> ":thumbs_up:"
 * "+1" -> ":+1:"
 * "Heart" -> ":heart:"
 */
export const generateShortcode = (name: string): string => {
  return `:${name.toLowerCase().replaceAll(/\s+/g, '_')}:`
}

/**
 * Check if emoji supports skin tones
 */
export const supportsSkinTones = (unified: string): boolean => {
  const skinToneSupportedPrefixes = [
    '1f44', // Hand gestures (wave, thumbs, etc.)
    '1f91', // Hand gestures (fingers, handshake, etc.)
    '1f64', // Person gestures (pray, bow, etc.)
    '1f46', // People & body parts
    '1f93', // Person sports/activities
    '1f6b', // Person biking/walking
    '1f9d', // Person standing/kneeling
    '1f57', // Man/woman dancing
    '1f3c', // Sports/activities
    '270', // Finger pointing
    '261d', // Index finger
    '1f9b' // Body parts (ear, nose, leg, foot)
  ]

  const baseCode = unified.split('-')[0].toLowerCase()
  return skinToneSupportedPrefixes.some(prefix => baseCode.startsWith(prefix))
}

/**
 * Render emoji with skin tone modifier
 */
export const renderEmojiWithSkinTone = (baseUnified: string, skinToneCode: string): string => {
  return String.fromCodePoint(Number.parseInt(baseUnified, 16), Number.parseInt(skinToneCode, 16))
}

/**
 * Generate parent catalog entry (neutral emoji)
 */
export const generateParentEntry = (emojiData: EmojiClickData, displayName: string, displayOrder: number) => ({
  type: 'EMOJI',
  code: generateCode(displayName),
  parentEntryId: null,
  value: displayName,
  description: emojiData.emoji,
  additionalValue1: formatUnicode(emojiData.unifiedWithoutSkinTone),
  additionalValue2: emojiData.unifiedWithoutSkinTone,
  additionalValue3: emojiData.imageUrl || '',
  objectValue: {
    names: emojiData.names
  },
  alternativeCode: generateShortcode(emojiData.names[0] || displayName),
  displayOrder,
  translations: []
})

/**
 * Generate child catalog entries (skin tone variants)
 */
export const generateSkinToneVariants = (
  emojiData: EmojiClickData,
  displayName: string,
  baseDisplayOrder: number,
  parentId: string
) => {
  return SKIN_TONE_MODIFIERS.map((tone, index) => {
    const fullUnified = `${emojiData.unifiedWithoutSkinTone}-${tone.code}`
    const variantEmoji = renderEmojiWithSkinTone(emojiData.unifiedWithoutSkinTone, tone.code)

    return {
      type: 'EMOJI',
      code: `${generateCode(displayName)}_${tone.suffix}`,
      parentEntryId: parentId,
      value: `${displayName} (${tone.label})`,
      description: variantEmoji,
      additionalValue1: formatUnicode(fullUnified),
      additionalValue2: fullUnified, // Full code WITH skin tone!
      additionalValue3: emojiData.getImageUrl?.(0) || '', // Get image URL if available
      objectValue: {
        names: emojiData.names
      },
      alternativeCode: generateShortcode(`${displayName} ${tone.label}`),
      displayOrder: index, // Children get 0-4
      translations: []
    }
  })
}

/**
 * Map standard emoji from emoji-picker to catalog entry (without skin tones)
 */
export const mapEmojiToCatalogEntry = (emojiData: EmojiClickData, displayName: string, displayOrder: number) => ({
  type: 'EMOJI',
  code: generateCode(displayName),
  value: displayName,
  description: emojiData.emoji,
  additionalValue1: formatUnicode(emojiData.unified),
  additionalValue2: emojiData.unified,
  additionalValue3: emojiData.imageUrl || '',
  objectValue: {
    names: emojiData.names
  },
  alternativeCode: generateShortcode(emojiData.names[0] || displayName),
  displayOrder,
  translations: []
})

/**
 * Map custom emoji/image to catalog entry
 */
export const mapCustomToCatalogEntry = (
  displayName: string,
  imageUrl: string,
  displayOrder: number,
  customId?: string
) => ({
  type: 'CUSTOM',
  code: generateCode(displayName),
  value: displayName,
  description: customId || `emoji_${generateCode(displayName).toLowerCase()}`,
  additionalValue1: customId || `CUSTOM_${Date.now()}`,
  additionalValue2: '',
  additionalValue3: imageUrl,
  objectValue: {
    names: [displayName.toLowerCase()]
  },
  alternativeCode: generateShortcode(displayName),
  displayOrder,
  translations: []
})

/**
 * Validate if catalog entry is a standard emoji
 */
export const isStandardEmoji = (entry: any): boolean => {
  return entry.type === 'EMOJI'
}

/**
 * Validate if catalog entry is a custom reaction
 */
export const isCustomReaction = (entry: any): boolean => {
  return entry.type === 'CUSTOM'
}
