import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import type { Investment } from '@/common/data/investment/types/investmentTypes.new'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

interface InvestmentSelectProps {
  investments: Investment[]
  selectedInvestmentId?: string
  isLoading: boolean
  onValueChange: (investmentId: string) => void
  prefixDataTestId: string
}

export const InvestmentSelect: React.FC<InvestmentSelectProps> = ({
  investments,
  selectedInvestmentId,
  isLoading,
  onValueChange,
  prefixDataTestId
}) => {
  return (
    <div className="gba:space-y-2">
      <label className="gba:text-sm gba:font-medium">
        {getTranslationFromI18nKeyAndLabel('report.form.investment', 'Investment')}{' '}
        <span className="gba:text-destructive">*</span>
      </label>
      <Select
        onValueChange={onValueChange}
        value={selectedInvestmentId || ''}
        disabled={isLoading}
        data-testid={formatDataTestId(prefixDataTestId, 'InvestmentSelect')}
      >
        <SelectTrigger>
          <SelectValue
            placeholder={getTranslationFromI18nKeyAndLabel('report.form.investment.placeholder', 'Select investment')}
          />
        </SelectTrigger>
        <SelectContent>
          {investments.map(investment => (
            <SelectItem key={investment.id} value={investment.id || ''}>
              {investment.name} {investment.code && `(${investment.code})`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
