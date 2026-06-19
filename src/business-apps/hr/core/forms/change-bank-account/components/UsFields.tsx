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
  Input
} from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel, getCatalogValue } from '@/common/utils/windowUtils'
import type { BankAccountForm, CatalogEntry, EmployeeAddress } from '../types'
import { normalizeBankIdentifier, normalizeDigits, validateUsRoutingNumber } from '../utils'

interface UsFieldsProps {
  form: BankAccountForm
  catalogRoutingTypes: CatalogEntry[]
  employeeAddresses: EmployeeAddress[]
  selectedEmployeeAddress: EmployeeAddress | null | undefined
  selectedCountryId?: string | null
  requiresEmployeeAddress: boolean
}

const UsFields: React.FC<UsFieldsProps> = ({
  form,
  catalogRoutingTypes,
  employeeAddresses,
  selectedEmployeeAddress,
  selectedCountryId,
  requiresEmployeeAddress
}) => {
  const accountNumberRequiredMessage = getTranslationFromI18nKeyAndLabel(
    'lowcoder:employee_profile.details_layout.bank_account_form.account_number_select_error_message',
    'The Account Number field is required. Please enter an account number.'
  )
  const routingNumberRequiredMessage = getTranslationFromI18nKeyAndLabel(
    'lowcoder:employee_profile.details_layout.bank_account_form.routing_number_select_error_message',
    'The Routing Number field is required. Please enter a routing number.'
  )
  const isUsRoutingNumber = selectedCountryId === 'Country:v1:US'

  return (
    <div className="gba:space-y-4">
      <FormField
        control={form.control as any}
        name={'routingNumberTypeId' as any}
        rules={{
          required: getTranslationFromI18nKeyAndLabel(
            'lowcoder:employee_profile.details_layout.bank_account_form.routing_number_type_select_error_message',
            'The Routing Number Type field is required. Please select a routing number type.'
          )
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_profile.details_layout.bank_account_form.routing_number_type_select_label',
                'Routing Number Type'
              )}
              <span className="gba:text-destructive"> *</span>
            </FormLabel>
            <Select
              value={field.value == null ? '' : String(field.value)}
              onValueChange={v => field.onChange(v || null)}
            >
              <FormControl>
                <SelectTrigger
                  className="gba:!w-full gba:min-w-0 gba:!max-w-none"
                  data-testid="flw_changeBankAccount_routingNumberType"
                >
                  <SelectValue
                    placeholder={getTranslationFromI18nKeyAndLabel(
                      'lowcoder:employee_profile.details_layout.bank_account_form.routing_number_type_select_placeholder',
                      'Select Routing Number Type'
                    )}
                  />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {catalogRoutingTypes.map((entry: any) => (
                  <SelectItem
                    key={entry.id}
                    value={String(entry.id)}
                    data-testid={`flw_changeBankAccount_routingNumberTypeOption-${entry.id}`}
                  >
                    {getCatalogValue(entry)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control as any}
        name={'accountNumber' as any}
        rules={{
          required: accountNumberRequiredMessage,
          validate: value => Boolean(normalizeBankIdentifier(value)) || accountNumberRequiredMessage
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_profile.details_layout.bank_account_form.account_number_select_label',
                'Account Number'
              )}
              <span className="gba:text-destructive"> *</span>
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                value={field.value ?? ''}
                onChange={event => field.onChange(normalizeBankIdentifier(event.target.value))}
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:employee_profile.details_layout.bank_account_form.account_number_select_placeholder',
                  'Enter Account Number'
                )}
                data-testid="flw_changeBankAccount_accountNumber"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control as any}
        name={'routingNumber' as any}
        rules={{
          required: routingNumberRequiredMessage,
          validate: value => {
            if (!normalizeBankIdentifier(value)) {
              return routingNumberRequiredMessage
            }

            if (!isUsRoutingNumber) {
              return true
            }

            return (
              validateUsRoutingNumber(value) ||
              getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_profile.details_layout.bank_account_form.routing_number_validation_error_message',
                'Routing Number must be a valid 9-digit ABA routing number.'
              )
            )
          }
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_profile.details_layout.bank_account_form.routing_number_select_label',
                'Routing Number'
              )}
              <span className="gba:text-destructive"> *</span>
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                value={field.value ?? ''}
                onChange={event =>
                  field.onChange(
                    isUsRoutingNumber
                      ? normalizeDigits(event.target.value)
                      : normalizeBankIdentifier(event.target.value)
                  )
                }
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:employee_profile.details_layout.bank_account_form.routing_number_select_placeholder',
                  'Enter Routing Number'
                )}
                data-testid="flw_changeBankAccount_bankName_routingNumber"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {requiresEmployeeAddress ? (
        <FormField
          control={form.control as any}
          name={'employeeAddressId' as any}
          rules={{
            required: getTranslationFromI18nKeyAndLabel(
              'lowcoder:employee_profile.details_layout.bank_account_form.address_select_error_message',
              'The Address field is required. Please select an address.'
            )
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:employee_profile.details_layout.bank_account_form.address_select_label',
                  'Address'
                )}
                <span className="gba:text-destructive"> *</span>
              </FormLabel>
              <Select
                value={field.value == null ? '' : String(field.value)}
                onValueChange={v => field.onChange(v || null)}
              >
                <FormControl>
                  <SelectTrigger
                    className="gba:!w-full gba:min-w-0 gba:!max-w-none"
                    data-testid="flw_changeBankAccount_address"
                  >
                    <SelectValue
                      placeholder={getTranslationFromI18nKeyAndLabel(
                        'lowcoder:employee_profile.details_layout.bank_account_form.address_select_placeholder',
                        'Select Address'
                      )}
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {employeeAddresses.map((entry: any) => (
                    <SelectItem
                      key={entry.id}
                      value={String(entry.id)}
                      data-testid={`flw_changeBankAccount_addressOption-${entry.id}`}
                    >
                      {entry?.type || ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
              <div
                className="gba:mt-2 gba:w-full gba:min-h-10 gba:px-3 gba:py-2 gba:rounded-md gba:bg-muted gba:text-muted-foreground gba:border gba:border-muted gba:whitespace-pre-wrap"
                data-testid="flw_changeBankAccount_addressDisplay"
              >
                {selectedEmployeeAddress
                  ? (() => {
                      const line1 =
                        `${String(selectedEmployeeAddress?.addressLine?.[0] || '')} ${String(selectedEmployeeAddress?.addressLine?.[1] || '')}`.trim()
                      const line2 =
                        `${String(selectedEmployeeAddress?.addressLine?.[2] || '')} ${String(selectedEmployeeAddress?.addressLine?.[3] || '')}`.trim()
                      const line3 =
                        `${String(selectedEmployeeAddress?.region?.alternativeCode || '')} ${String(selectedEmployeeAddress?.locality || '')} ${String(selectedEmployeeAddress?.postalCode || '')}`.trim()
                      return (
                        <>
                          {line1}
                          {line2 ? (
                            <>
                              <br />
                              {line2}
                            </>
                          ) : null}
                          <br />
                          {line3}
                        </>
                      )
                    })()
                  : getTranslationFromI18nKeyAndLabel(
                      'lowcoder:employee_profile.details_layout.bank_account_form.no_selected_address_text',
                      'No selected address'
                    )}
              </div>
            </FormItem>
          )}
        />
      ) : null}
    </div>
  )
}

export default UsFields
