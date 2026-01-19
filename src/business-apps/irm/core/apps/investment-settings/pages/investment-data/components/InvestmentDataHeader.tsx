import React from 'react'
import { Button, Spinner } from '@newwork/nw-design-system'
import { ArrowLeftIcon, FloppyDiskIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CatalogEntryWithConfig } from '../types'

interface InvestmentDataHeaderProps extends BusinessAppContextProps {
  onBack?: () => void
  onSave: () => void
  selectedEntry: CatalogEntryWithConfig | null
  isSaving: boolean
  prefixDataTestId?: string
}

const DATA_TEST_ID = 'investment-data-header'

export const InvestmentDataHeader: React.FC<InvestmentDataHeaderProps> = ({
  onBack,
  onSave,
  selectedEntry,
  isSaving,
  prefixDataTestId
}) => {
  return (
    <div className="gba:flex gba:items-center gba:justify-between">
      <div className="gba:flex gba:items-center gba:gap-4">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-back-button`}
          >
            <ArrowLeftIcon size={20} />
          </Button>
        )}
        <div>
          <h1 className="gba:text-2xl gba:font-bold gba:m-0">Investment Data Configuration</h1>
          <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
            Configure form fields, prospect fields, and tile fields for investment groups and types
          </p>
        </div>
      </div>

      <Button
        onClick={onSave}
        disabled={!selectedEntry || isSaving}
        data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-save-button`}
      >
        {isSaving ? <Spinner size="sm" /> : <FloppyDiskIcon />}
        {isSaving ? 'Saving...' : 'Save Configuration'}
      </Button>
    </div>
  )
}
