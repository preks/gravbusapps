import React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import { getPaymentMethodDisplay } from '@/business-apps/fin/expenses/common/utils/advancePaymentUtils'
import { PaymentMethod } from '../hooks/useRequestAdvancePaymentData'
import { SelectFieldProps } from '../types/FormTypes'
import translations from '../_i18n'

interface PaymentMethodSelectProps extends SelectFieldProps {
  methods: PaymentMethod[]
}

const PaymentMethodSelect: React.FC<PaymentMethodSelectProps> = ({
  methods,
  value,
  onChange,
  disabled,
  'data-testid': dataTestId = 'request-advance-payment-payment-method-field'
}) => {
  const { t } = useTranslation(translations)

  return (
    <div className="gba:mb-4 gba:bg-gray-100" data-testid={dataTestId}>
      <label className="gba:block gba:text-xs gba:font-medium gba:text-black  gba:bg-gray-100 gba:px-3 gba:py-1 gba:rounded">
        {t('payment-method-label')}
        <span className="gba:text-muted-foreground"> *</span>
      </label>
      <Select
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        data-testid="request-advance-payment-payment-method-select"
      >
        <SelectTrigger
          className="gba:h-10 gba:bg-gray-100 gba:border-none"
          style={{ width: '100%', justifyContent: 'space-between' }}
        >
          <SelectValue placeholder={t('payment-method-placeholder')} />
        </SelectTrigger>
        <SelectContent>
          {methods.map(method => (
            <SelectItem key={method.id} value={method.id}>
              {getPaymentMethodDisplay(method.code, t)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default PaymentMethodSelect
