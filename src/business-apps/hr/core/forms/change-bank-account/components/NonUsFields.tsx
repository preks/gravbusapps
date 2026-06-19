import React from 'react'
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Input } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { BankAccountForm } from '../types'
import { formatIbanForDisplay, normalizeBankIdentifier, validateIban } from '../utils'

interface NonUsFieldsProps {
  form: BankAccountForm
  selectedCountryId?: string | null
}

const NonUsFields: React.FC<NonUsFieldsProps> = ({ form, selectedCountryId }) => {
  return (
    <div className="gba:space-y-4">
      <FormField
        control={form.control as any}
        name={'iban' as any}
        rules={{
          required: getTranslationFromI18nKeyAndLabel(
            'lowcoder:employee_profile.details_layout.bank_account_form.iban_select_error_message',
            'The IBAN field is required. Please enter an IBAN.'
          ),
          validate: value => validateIban(value, selectedCountryId).message || true
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_profile.details_layout.bank_account_form.iban_select_label',
                'IBAN'
              )}
              <span className="gba:text-destructive"> *</span>
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                value={formatIbanForDisplay(field.value)}
                onChange={event => field.onChange(formatIbanForDisplay(event.target.value))}
                onBlur={event => {
                  field.onChange(formatIbanForDisplay(event.target.value))
                  field.onBlur()
                }}
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:employee_profile.details_layout.bank_account_form.iban_select_placeholder',
                  'Enter IBAN'
                )}
                data-testid="flw_changeBankAccount_bankName_iban"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control as any}
        name={'swift' as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel>BIC</FormLabel>
            <FormControl>
              <Input
                {...field}
                value={field.value ?? ''}
                onChange={event => field.onChange(normalizeBankIdentifier(event.target.value))}
                placeholder="Enter BIC"
                data-testid="flw_changeBankAccount_bankName_swift"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

export default NonUsFields
