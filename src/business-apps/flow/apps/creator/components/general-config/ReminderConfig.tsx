import React, { useState } from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useFlowTemplateStore } from '../../hooks/useFlowTemplateStore'
import { TimeUnit, TimingType } from '../../types/flowTemplate'

/**
 * Reminder configuration component for flow templates
 */
export const ReminderConfig: React.FC = () => {
  const { flowTemplate, updateReminderTiming } = useFlowTemplateStore()

  // Initialize with default values if reminder is not set
  const reminderConfig = flowTemplate.reminder || {
    timing: { type: TimingType.BEFORE, value: 24, unit: TimeUnit.HOURS }
  }

  const [timeValue, setTimeValue] = useState(reminderConfig.timing.value.toString())

  const handleTimeTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateReminderTiming(e.target.value as TimingType, reminderConfig.timing.value, reminderConfig.timing.unit)
  }

  const handleTimeValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10)
    setTimeValue(e.target.value)

    if (!isNaN(value) && value > 0) {
      updateReminderTiming(reminderConfig.timing.type, value, reminderConfig.timing.unit)
    }
  }

  const handleTimeUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateReminderTiming(reminderConfig.timing.type, reminderConfig.timing.value, e.target.value as TimeUnit)
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-4" data-testid="reminder-config">
      <div className="gba:flex gba:items-center gba:gap-2" data-testid="reminder-header">
        <h4 className="gba:font-medium gba:text-sm gba:text-gray-700" data-testid="reminder-title">
          {getTranslationFromI18nKeyAndLabel('flow.creator.reminder', 'Reminder')}:
        </h4>

        <select
          value={reminderConfig.timing.type}
          onChange={handleTimeTypeChange}
          className="gba:border gba:border-gray-300 gba:rounded gba:px-3 gba:py-2"
          data-testid="reminder-timing-type"
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
          data-testid="reminder-timing-value"
        />

        <select
          value={reminderConfig.timing.unit}
          onChange={handleTimeUnitChange}
          className="gba:border gba:border-gray-300 gba:rounded gba:px-3 gba:py-2"
          data-testid="reminder-timing-unit"
        >
          <option value={TimeUnit.HOURS}>{getTranslationFromI18nKeyAndLabel('flow.creator.hours', 'Hours')}</option>
          <option value={TimeUnit.DAYS}>{getTranslationFromI18nKeyAndLabel('flow.creator.days', 'Days')}</option>
        </select>
      </div>
    </div>
  )
}
