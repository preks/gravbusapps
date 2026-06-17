import React from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Input,
  Alert
} from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel, getCatalogValue } from '@/common/utils/windowUtils'
import type { BankAccountForm, CatalogEntry } from '../types'

interface DefaultFieldsProps {
  form: BankAccountForm
  catalogCountries: CatalogEntry[]
  catalogCurrencies: CatalogEntry[]
  isUSAndNoAddress: boolean
}

const DefaultFields: React.FC<DefaultFieldsProps> = ({
  form,
  catalogCountries,
  catalogCurrencies,
  isUSAndNoAddress
}) => {
  return (
    <>
      <FormField
        control={form.control}
        name={'countryId'}
        rules={{
          required: getTranslationFromI18nKeyAndLabel(
            'lowcoder:employee_profile.details_layout.bank_account_form.country_select_error_message',
            'The Country field is required. Please select a country.'
          )
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_profile.details_layout.bank_account_form.country_select_label',
                'Country'
              )}
              <span className="gba:text-destructive"> *</span>
            </FormLabel>
            <Select
              value={field.value === null || field.value === undefined || field.value === '' ? '' : String(field.value)}
              onValueChange={v => field.onChange(v || null)}
            >
              <FormControl>
                <SelectTrigger
                  className="gba:!w-full gba:min-w-0 gba:!max-w-none"
                  data-testid="flw_changeBankAccount_country"
                >
                  <SelectValue
                    placeholder={getTranslationFromI18nKeyAndLabel(
                      'lowcoder:employee_profile.details_layout.bank_account_form.country_select_placeholder',
                      'Select Country'
                    )}
                  />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {catalogCountries.map((entry: any) => (
                  <SelectItem
                    key={entry.id}
                    value={String(entry.id)}
                    data-testid={`flw_changeBankAccount_countryOption-${entry.id}`}
                  >
                    {getCatalogValue(entry)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
            {isUSAndNoAddress ? (
              <Alert
                variant="destructive"
                className="gba:mt-2 gba:w-full gba:whitespace-nowrap"
                data-testid="flw_changeBankAccount_warningMessage"
              >
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:employee_profile.details_layout.bank_account_form.country_select_usa_alert',
                  'Please add an address to your profile first.'
                )}
              </Alert>
            ) : null}
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={'currencyId'}
        rules={{
          required: getTranslationFromI18nKeyAndLabel(
            'lowcoder:employee_profile.details_layout.bank_account_form.currency_select_error_message',
            'The Currency field is required. Please select a currency.'
          )
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_profile.details_layout.bank_account_form.currency_select_label',
                'Currency'
              )}
              <span className="gba:text-destructive"> *</span>
            </FormLabel>
            <Select
              value={field.value === null || field.value === undefined || field.value === '' ? '' : String(field.value)}
              onValueChange={v => field.onChange(v || null)}
            >
              <FormControl>
                <SelectTrigger
                  className="gba:!w-full gba:min-w-0 gba:!max-w-none"
                  data-testid="flw_changeBankAccount_currency"
                >
                  <SelectValue
                    placeholder={getTranslationFromI18nKeyAndLabel(
                      'lowcoder:employee_profile.details_layout.bank_account_form.currency_select_placeholder',
                      'Select Currency'
                    )}
                  />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {catalogCurrencies.map((entry: any) => (
                  <SelectItem
                    key={entry.id}
                    value={String(entry.id)}
                    data-testid={`flw_changeBankAccount_currencyOption-${entry.id}`}
                  >
                    {entry.code || getCatalogValue(entry)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={'bankName'}
        rules={{
          required: getTranslationFromI18nKeyAndLabel(
            'lowcoder:employee_profile.details_layout.bank_account_form.bank_name_select_error_message',
            'The Bank Name field is required. Please enter a bank name.'
          )
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_profile.details_layout.bank_account_form.bank_name_select_label',
                'Bank Name'
              )}
              <span className="gba:text-destructive"> *</span>
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:employee_profile.details_layout.bank_account_form.bank_name_select_placeholder',
                  'Enter Bank Name'
                )}
                data-testid="flw_changeBankAccount_bankName_bankName"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={'accountType'}
        rules={{
          required: getTranslationFromI18nKeyAndLabel(
            'lowcoder:employee_profile.details_layout.bank_account_form.account_type_select_error_message',
            'The Account Type field is required. Please select an account type.'
          )
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_profile.details_layout.bank_account_form.account_type_select_label',
                'Account Type'
              )}
              <span className="gba:text-destructive"> *</span>
            </FormLabel>
            <Select
              value={field.value === null || field.value === undefined || field.value === '' ? '' : String(field.value)}
              onValueChange={v => field.onChange(v || '')}
            >
              <FormControl>
                <SelectTrigger
                  className="gba:!w-full gba:min-w-0 gba:!max-w-none"
                  data-testid="flw_changeBankAccount_bankName_accountType"
                >
                  <SelectValue
                    placeholder={getTranslationFromI18nKeyAndLabel(
                      'lowcoder:employee_profile.details_layout.bank_account_form.account_type_select_placeholder',
                      'Select Account Type'
                    )}
                  />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="CHECKINGS" data-testid="flw_changeBankAccount_accountTypeOption-CHECKINGS">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:employee_profile.details_layout.bank_account_form.account_type_select_checkings_value',
                    'Checkings'
                  )}
                </SelectItem>
                <SelectItem value="SAVINGS" data-testid="flw_changeBankAccount_accountTypeOption-SAVINGS">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:employee_profile.details_layout.bank_account_form.account_type_select_savings_value',
                    'Savings'
                  )}
                </SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={'accountHolder'}
        rules={{
          required: getTranslationFromI18nKeyAndLabel(
            'lowcoder:employee_profile.details_layout.bank_account_form.account_holder_select_error_message',
            'The Account Holder field is required. Please enter an account holder.'
          )
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_profile.details_layout.bank_account_form.account_holder_select_label',
                'Account Holder'
              )}
              <span className="gba:text-destructive"> *</span>
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:employee_profile.details_layout.bank_account_form.account_holder_select_placeholder',
                  'Enter Account Holder'
                )}
                data-testid="flw_changeBankAccount_accountHolder"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}

export default DefaultFields
