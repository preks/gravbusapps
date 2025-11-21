import React from 'react'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Input } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { CountryCode } from 'libphonenumber-js'

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
    <div className="gba:space-y-2">
      <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">
        {getTranslationFromI18nKeyAndLabel('lowcoder:communication_form.value', 'Value')}*
      </div>
      {isPhoneType ? (
        <div className="gba:flex gba:gap-2">
          <Select
            key={`country-select-${selectedCountryCode}`}
            value={selectedCountryCode || ''}
            onValueChange={code => {
              onCountryCodeChange(code as CountryCode)
              onTouched()
            }}
          >
            <SelectTrigger className="gba:w-[200px]" data-testid="flw_changePrivateCommunication_countryCode">
              <SelectValue
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:employee_profile.details_layout.bank_account_form.country_select_placeholder',
                  'Select Country'
                )}
              />
            </SelectTrigger>
            <SelectContent>
              {countries.map(country => (
                <SelectItem key={country.code} value={country.code}>
                  {country.name} (+{country.callingCode})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:communication_form.enterValue', 'Enter Value')}
            value={phoneNumber}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              onPhoneNumberChange(e.target.value)
              onTouched()
            }}
            onBlur={onTouched}
            data-testid="flw_changePrivateCommunication_currentValue"
            className="gba:flex-1"
          />
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
