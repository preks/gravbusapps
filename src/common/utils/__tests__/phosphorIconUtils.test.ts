import { EnvelopeIcon, LinkIcon } from '@phosphor-icons/react'
import { isValidPhosphorIconName, resolvePhosphorIconComponent } from '../phosphorIconUtils'

describe('phosphorIconUtils', () => {
  describe('isValidPhosphorIconName', () => {
    it('accepts valid Phosphor icon names', () => {
      expect(isValidPhosphorIconName('EnvelopeIcon')).toBe(true)
      expect(isValidPhosphorIconName('Phone')).toBe(true)
    })

    it('rejects non-component exports and unknown names', () => {
      expect(isValidPhosphorIconName('SSR')).toBe(false)
      expect(isValidPhosphorIconName('MailOutlined')).toBe(false)
    })
  })

  describe('resolvePhosphorIconComponent', () => {
    it('resolves catalog icon names from additionalValue3', () => {
      expect(resolvePhosphorIconComponent('EnvelopeIcon')).toBe(EnvelopeIcon)
    })

    it('uses fallback when icon name is missing or invalid', () => {
      expect(resolvePhosphorIconComponent(undefined)).toBe(LinkIcon)
      expect(resolvePhosphorIconComponent('MailOutlined')).toBe(LinkIcon)
    })
  })
})
