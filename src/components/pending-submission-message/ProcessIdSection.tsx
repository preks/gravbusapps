import React, { useState } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '@/components/_i18n'

interface ProcessIdSectionProps {
  processId: string
  dataTestId: string
}

/**
 * Collapsible section displaying the process instance ID for debugging
 */
export const ProcessIdSection: React.FC<ProcessIdSectionProps> = ({ processId, dataTestId }) => {
  const { t } = useTranslation(translations)
  const [showProcessId, setShowProcessId] = useState(false)

  return (
    <div className="gba:pt-2">
      <button
        onClick={() => setShowProcessId(!showProcessId)}
        className="gba:text-xs gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors gba:underline gba:cursor-pointer"
        data-testid={`${dataTestId}-toggle-process-id`}
        type="button"
      >
        {showProcessId ? t('pending-hide-details') : t('pending-show-details')}
      </button>

      {showProcessId && (
        <div
          className="gba:mt-2 gba:p-2 gba:bg-muted gba:rounded gba:text-xs gba:font-mono gba:text-muted-foreground gba:break-all"
          data-testid={`${dataTestId}-process-id`}
        >
          {t('pending-process-id-label')}: {processId}
        </div>
      )}
    </div>
  )
}
