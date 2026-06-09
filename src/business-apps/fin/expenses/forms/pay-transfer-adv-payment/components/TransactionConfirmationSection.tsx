import React from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Checkbox,
  Label,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../_i18n'

interface TransactionConfirmationSectionProps {
  transactionDate: string
  confirmationChecked: boolean
  onTransactionDateChange: (value: string) => void
  onConfirmationChange: (checked: boolean) => void
  prefixDataTestId?: string
}

const TransactionConfirmationSection: React.FC<TransactionConfirmationSectionProps> = ({
  transactionDate,
  confirmationChecked,
  onTransactionDateChange,
  onConfirmationChange,
  prefixDataTestId = 'transaction-confirmation'
}) => {
  const { t } = useTranslation(translations)

  return (
    <Card data-testid={`${prefixDataTestId}-card`}>
      <CardHeader>
        <CardTitle data-testid={`${prefixDataTestId}-title`}>{t('section-pickup-confirmation')}</CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-4">
        <div className="gba:space-y-2" data-testid={`${prefixDataTestId}-date-field`}>
          <Label htmlFor="transaction-date" className="gba:text-sm gba:font-medium">
            {t('label-date-of-transfer')}*
          </Label>
          <Input
            id="transaction-date"
            type="date"
            value={transactionDate}
            onChange={e => onTransactionDateChange(e.target.value)}
            data-testid={`${prefixDataTestId}-date-input`}
          />
        </div>

        <div className="gba:flex gba:items-start gba:gap-2" data-testid={`${prefixDataTestId}-checkbox-field`}>
          <Checkbox
            id="transaction-confirmation"
            checked={confirmationChecked}
            onCheckedChange={checked => onConfirmationChange(checked === true)}
            data-testid={`${prefixDataTestId}-checkbox`}
          />
          <Label htmlFor="transaction-confirmation" className="gba:text-sm gba:leading-relaxed gba:cursor-pointer">
            {t('confirmation-checkbox-message-cash')}
          </Label>
        </div>
      </CardContent>
    </Card>
  )
}

export default TransactionConfirmationSection
