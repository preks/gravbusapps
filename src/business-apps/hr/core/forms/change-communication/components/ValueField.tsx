import React from 'react'
import { Input } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { CountryCode } from 'libphonenumber-js'
import { PhonePrefixCombobox } from '@/common/components/phone-prefix-combobox/PhonePrefixCombobox'

interface Country {
  code: CountryCode
  callingCode: string
  name: string
}

interface ValueFieldProps {
  value: string
  phoneNumber: string
  selectedCountryCode: CountryCode | ''
  isPhoneType: boolean
  countries: Country[]
  onChange: (value: string) => void
  onPhoneNumberChange: (value: string) => void
  onCountryCodeChange: (code: CountryCode) => void
  onTouched: () => void
  error?: string
  touched: boolean
}

export const ValueField: React.FC<ValueFieldProps> = ({
  value,
  phoneNumber,
  selectedCountryCode,
  isPhoneType,
  countries,
  onChange,
  onPhoneNumberChange,
  onCountryCodeChange,
  onTouched,
  error,
  touched
}) => {
  return (
    <div className="gba:w-full gba:space-y-2">
      <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">
        {getTranslationFromI18nKeyAndLabel('lowcoder:communication_form.value', 'Value')}*
      </div>
      {isPhoneType ? (
        <div className="gba:grid gba:min-w-0 gba:w-full gba:grid-cols-5 gba:items-center gba:gap-2">
          <div className="gba:col-span-2 gba:min-w-0 gba:w-full">
            <PhonePrefixCombobox
              value={selectedCountryCode || ''}
              countries={countries}
              onValueChange={code => {
                onCountryCodeChange(code)
                onTouched()
              }}
              placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:communication_form.prefix', 'Prefix')}
              selectedLabelVariant="code"
              className="gba:w-full"
              data-testid="flw_changePrivateCommunication_countryCode"
            />
          </div>
          <div className="gba:col-span-3 gba:min-w-0">
            <Input
              placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:communication_form.enterValue', 'Enter Value')}
              value={phoneNumber}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                onPhoneNumberChange(e.target.value)
                onTouched()
              }}
              onBlur={onTouched}
              data-testid="flw_changePrivateCommunication_currentValue"
              className="gba:w-full"
            />
          </div>
        </div>
      ) : (
        <Input
          placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:communication_form.enterValue', 'Enter Value')}
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          onBlur={onTouched}
          data-testid="flw_changePrivateCommunication_currentValue"
        />
      )}
      {touched && error && (
        <div className="gba:mt-1 gba:text-destructive" data-testid="flw_changePrivateCommunication_valueError">
          {error}
        </div>
      )}
    </div>
  )
}
