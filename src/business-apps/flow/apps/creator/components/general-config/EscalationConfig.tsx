import React, { useState } from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useFlowTemplateStore } from '../../hooks/useFlowTemplateStore'
import { TimeUnit, TimingType } from '../../types/flowTemplate'

/**
 * Escalation configuration component for flow templates
 */
export const EscalationConfig: React.FC = () => {
  const { flowTemplate, updateEscalationTiming } = useFlowTemplateStore()

  // Initialize with default values if escalation is not set
  const escalationConfig = flowTemplate.escalation || {
    timing: { type: TimingType.AFTER, value: 48, unit: TimeUnit.HOURS }
  }

  const [timeValue, setTimeValue] = useState(escalationConfig.timing.value.toString())

  const handleTimeTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateEscalationTiming(e.target.value as TimingType, escalationConfig.timing.value, escalationConfig.timing.unit)
  }

  const handleTimeValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10)
    setTimeValue(e.target.value)

    if (!isNaN(value) && value > 0) {
      updateEscalationTiming(escalationConfig.timing.type, value, escalationConfig.timing.unit)
    }
  }

  const handleTimeUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateEscalationTiming(escalationConfig.timing.type, escalationConfig.timing.value, e.target.value as TimeUnit)
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-4" data-testid="escalation-config">
      <div className="gba:flex gba:items-center gba:gap-2" data-testid="escalation-header">
        <h4 className="gba:font-medium gba:text-sm gba:text-gray-700" data-testid="escalation-title">
          {getTranslationFromI18nKeyAndLabel('flow.creator.escalation', 'Escalation')}:
        </h4>

        <select
          value={escalationConfig.timing.type}
          onChange={handleTimeTypeChange}
          className="gba:border gba:border-gray-300 gba:rounded gba:px-3 gba:py-2"
          data-testid="escalation-timing-type"
        >
          <option value={TimingType.AFTER}>
            {getTranslationFromI18nKeyAndLabel('flow.creator.afterStart', 'After Start')}
          </option>
          <option value={TimingType.BEFORE}>
            {getTranslationFromI18nKeyAndLabel('flow.creator.beforeDue', 'Before Due')}
          </option>
        </select>

        <input
          type="number"
          min="1"
          value={timeValue}
          onChange={handleTimeValueChange}
          className="gba:border gba:border-gray-300 gba:rounded gba:px-3 gba:py-2 gba:w-24"
          data-testid="escalation-timing-value"
        />

        <select
          value={escalationConfig.timing.unit}
          onChange={handleTimeUnitChange}
          className="gba:border gba:border-gray-300 gba:rounded gba:px-3 gba:py-2"
          data-testid="escalation-timing-unit"
        >
          <option value={TimeUnit.HOURS}>{getTranslationFromI18nKeyAndLabel('flow.creator.hours', 'Hours')}</option>
          <option value={TimeUnit.DAYS}>{getTranslationFromI18nKeyAndLabel('flow.creator.days', 'Days')}</option>
        </select>

        <span className="gba:mx-2 gba:text-gray-600" data-testid="escalation-to-text">
          {getTranslationFromI18nKeyAndLabel('flow.creator.escalateToNext', 'escalate to next assignee')}
        </span>
      </div>
    </div>
  )
}
