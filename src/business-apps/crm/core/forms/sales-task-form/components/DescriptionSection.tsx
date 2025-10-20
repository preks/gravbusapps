import React, { useState } from 'react'
import { Input } from 'antd'
import { useSalesTaskFormContext } from '../context/SalesTaskFormContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

const { TextArea } = Input
const prefixDataTestId = 'SalesTaskForm-Description'

const DescriptionSection: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false) // Start collapsed

  const { formValues, setFormValues } = useSalesTaskFormContext()

  return (
    <div className="gba:bg-white gba:rounded-xl gba:shadow-sm gba:border gba:border-gray-100 gba:overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="gba:w-full gba:px-6 gba:py-4 gba:border-b gba:border-gray-100 gba:bg-gradient-to-r gba:from-pink-200 gba:to-rose-200 gba:hover:from-pink-300 gba:hover:to-rose-300 gba:transition-colors gba:flex gba:items-center gba:justify-between gba:text-left"
        style={{
          background: 'linear-gradient(to right, #fce7f3, #fecaca)',
          transition: 'background 0.2s ease'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'linear-gradient(to right, #f9a8d4, #fb7185)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'linear-gradient(to right, #fce7f3, #fecaca)'
        }}
        data-testid={formatDataTestId(prefixDataTestId, 'Toggle')}
      >
        <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900 gba:flex gba:items-center gba:gap-2">
          <div className="gba:w-2 gba:h-2 gba:bg-pink-500 gba:rounded-full"></div>
          {getTranslationFromI18nKeyAndLabel('crm:salesTask.additionalInfo', 'Additional Information')}
        </h3>
        <span className="gba:text-gray-500 gba:text-lg">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {isExpanded && (
        <div className="gba:p-6 gba:space-y-6">
          {/* Description */}
          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
              {getTranslationFromI18nKeyAndLabel('crm:salesTask.description', 'Description')}
            </label>
            <TextArea
              data-testid={formatDataTestId(prefixDataTestId, 'DescriptionInput')}
              value={formValues.description}
              onChange={e => setFormValues({ description: e.target.value })}
              className="gba:w-full"
              rows={4}
              maxLength={500}
              placeholder={getTranslationFromI18nKeyAndLabel(
                'crm:salesTask.descriptionPlaceholder',
                'Enter task description...'
              )}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default DescriptionSection
