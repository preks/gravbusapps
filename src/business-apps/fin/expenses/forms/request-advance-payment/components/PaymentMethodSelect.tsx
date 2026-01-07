import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { PaymentMethod } from '../hooks/useRequestAdvancePaymentData'
import { SelectFieldProps } from '../types/FormTypes'

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
  return (
    <div className="gba:mb-4 gba:bg-gray-100" data-testid={dataTestId}>
      <label className="gba:block gba:text-xs gba:font-medium gba:text-black  gba:bg-gray-100 gba:px-3 gba:py-1 gba:rounded">
        {getTranslationFromI18nKeyAndLabel('lowcoder:initiate_advance_payment.select_payment_method', 'Payment Method')}
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
          <SelectValue
            placeholder={getTranslationFromI18nKeyAndLabel(
              'lowcoder:create_expense_request.add_request_trip_details.payment_method',
              'Select Payment Method'
            )}
          />
        </SelectTrigger>
        <SelectContent>
          {methods.map(method => (
            <SelectItem key={method.id} value={method.id}>
              {method.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default PaymentMethodSelect
