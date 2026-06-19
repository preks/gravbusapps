import React from 'react'
import { render } from '@testing-library/react'
import { BellIcon, FileTextIcon, SparkleIcon, UserIcon } from '@phosphor-icons/react'
import {
  getEveryAiEntityCardIconConfig,
  renderEveryAiEntityCardIcon,
  resolveEveryAiEntityCardKey
} from './everyAiEntityCardIcons'

describe('everyAiEntityCardIcons', () => {
  describe('resolveEveryAiEntityCardKey', () => {
    it('returns canonical keys unchanged', () => {
      expect(resolveEveryAiEntityCardKey('contact')).toBe('contact')
      expect(resolveEveryAiEntityCardKey('content_entry')).toBe('content_entry')
    })

    it('normalizes alias keys to canonical keys', () => {
      expect(resolveEveryAiEntityCardKey('employee_absence')).toBe('absence')
      expect(resolveEveryAiEntityCardKey('company')).toBe('account')
      expect(resolveEveryAiEntityCardKey('investment_contact')).toBe('contact')
    })

    it('returns default for unknown entity types', () => {
      expect(resolveEveryAiEntityCardKey('unknown_entity_type')).toBe('default')
    })
  })

  describe('getEveryAiEntityCardIconConfig', () => {
    it('returns different icons for contact and content_entry', () => {
      const contactConfig = getEveryAiEntityCardIconConfig('contact')
      const contentConfig = getEveryAiEntityCardIconConfig('content_entry')

      expect(contactConfig.icon).toBe(UserIcon)
      expect(contentConfig.icon).toBe(FileTextIcon)
      expect(contactConfig.icon).not.toBe(contentConfig.icon)
    })

    it('returns the same config for alias and parent keys', () => {
      const companyConfig = getEveryAiEntityCardIconConfig('company')
      const accountConfig = getEveryAiEntityCardIconConfig('account')

      expect(companyConfig.icon).toBe(accountConfig.icon)
    })

    it('returns fallback config for unknown entities without throwing', () => {
      const config = getEveryAiEntityCardIconConfig('not_a_real_entity')

      expect(config.icon).toBe(SparkleIcon)
    })
  })

  describe('renderEveryAiEntityCardIcon', () => {
    it('renders IconAvatar with entity label', () => {
      const { container } = render(
        <>
          {renderEveryAiEntityCardIcon('contact', {
            variant: 'decorative',
            label: 'contact'
          })}
        </>
      )

      expect(container.querySelector('[aria-label="contact"]')).toBeTruthy()
    })

    it('uses distinct registry icons for workflow tool variants', () => {
      const reminderConfig = getEveryAiEntityCardIconConfig('reminder')
      const blinkConfig = getEveryAiEntityCardIconConfig('blink')
      const workflowConfig = getEveryAiEntityCardIconConfig('service_workflow')

      expect(reminderConfig.icon).toBe(BellIcon)
      expect(blinkConfig.icon).not.toBe(reminderConfig.icon)
      expect(workflowConfig.icon).not.toBe(reminderConfig.icon)
    })
  })
})
