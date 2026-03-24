import React from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Label,
  Switch,
  Input,
  DateInput,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  FileUpload,
  Combobox
} from '@newwork/nw-design-system'
import type { UseFormReturn } from 'react-hook-form'
import { parseLocalizedNumber } from '@/common/utils/numberFormatter'
import { validateTaxNumber, validateTaxId, validateSocialSecurityNumber } from './validationScope'
import type { GetMessage } from './validationScope'
import { ACCEPTED_HEALTH_INSURANCE_DOCUMENT_FILE_TYPES } from './constants'
import type { TaxInfoFormValues, TaxDetailsCatalogs, CatalogEntry } from './types'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

export interface ChangeTaxDetailsFormFieldsProps {
  form: UseFormReturn<TaxInfoFormValues>
  catalogs: TaxDetailsCatalogs
  labels: ReturnType<typeof import('./changeTaxDetailsLabels').getChangeTaxDetailsLabels>
  getMessage: GetMessage
  isEmployeeInGermany: boolean
  isEmployeeInRomania?: boolean
  employeeGender: string | null
  healthInsuranceFileList: any[]
  onHealthInsuranceFilesChange: (files: Array<{ file: File | { name: string }; id: string }>) => void
}

const catLabel = (e: CatalogEntry) => e?.translations?.[0]?.value || e?.value || ''

/**
 * Accepts:
 * - Plain numbers: 1234, 1234.56, 1234,56
 * - US grouped: 1,234.56
 * - EU grouped: 1.234,56
 */
function isValidLocalizedNumberInput(raw: string): boolean {
  const value = String(raw ?? '').trim()
  if (!value) return true

  // Tight rules:
  // - thousands groups must be 3 digits when separators are used
  // - decimal part (if present) is 1-2 digits
  // - decimal separator must match locale style for grouped forms
  const PLAIN = /^-?\d+(?:[.,]\d{1,2})?$/
  const US_GROUPED = /^-?\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?$/
  const EU_GROUPED = /^-?\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/

  if (!(PLAIN.test(value) || US_GROUPED.test(value) || EU_GROUPED.test(value))) {
    return false
  }
  const parsed = parseLocalizedNumber(value)
  return !Number.isNaN(parsed)
}

export const ChangeTaxDetailsFormFields: React.FC<ChangeTaxDetailsFormFieldsProps> = ({
  form,
  catalogs,
  labels: L,
  getMessage,
  isEmployeeInGermany,
  isEmployeeInRomania = false,
  employeeGender,
  healthInsuranceFileList,
  onHealthInsuranceFilesChange
}) => {
  const placeholderEnter = L.placeholderEnter
  const placeholderSelect = L.placeholderSelect

  return (
    <div className="gba:flex-1 gba:space-y-4">
      {!isEmployeeInGermany && (
        <FormField
          control={form.control as any}
          name={'taxNumber' as any}
          rules={{
            validate: (v: string) => validateTaxNumber(v, isEmployeeInGermany, getMessage)
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel data-testid="change-tax-details-tax-number-label">{L.taxNumber}</FormLabel>
              <FormControl>
                <Input {...field} placeholder={placeholderEnter} data-testid="flw_changeTaxDetails_taxNumber" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={form.control as any}
        name={'taxBracketRef' as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="change-tax-details-tax-bracket-label">{L.taxBracket}</FormLabel>
            <FormControl>
              <Select value={field.value || ''} onValueChange={val => field.onChange(val || null)}>
                <SelectTrigger
                  className="gba:block gba:!w-full gba:min-w-0 gba:!max-w-none"
                  data-testid="flw_changeTaxDetails_taxBracket"
                >
                  <SelectValue placeholder={placeholderSelect} />
                </SelectTrigger>
                <SelectContent>
                  {catalogs.taxBracket.map(entry => (
                    <SelectItem key={entry.id} value={String(entry.id)}>
                      {catLabel(entry)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control as any}
        name={'healthInsuranceName' as any}
        rules={{ required: L.requiredHealthInsurance }}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="change-tax-details-health-insurance-label">
              {L.healthInsurance} <span className="gba:text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                onChange={e => {
                  field.onChange(e)
                  void form.trigger('healthInsuranceName')
                }}
                placeholder={placeholderEnter}
                data-testid="flw_changeTaxDetails_healthInsuranceName"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control as any}
        name={'healthInsuranceTypeRef' as any}
        rules={{ required: L.requiredHealthInsuranceType }}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="change-tax-details-health-insurance-type-label">
              {L.healthInsuranceType} <span className="gba:text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <Select
                value={field.value || ''}
                onValueChange={val => {
                  field.onChange(val || null)
                  void form.trigger('healthInsuranceTypeRef')
                }}
              >
                <SelectTrigger
                  className="gba:block gba:!w-full gba:min-w-0 gba:!max-w-none"
                  data-testid="flw_changeTaxDetails_healthInsuranceType"
                >
                  <SelectValue placeholder={placeholderSelect} />
                </SelectTrigger>
                <SelectContent>
                  {catalogs.healthInsuranceType.map(entry => (
                    <SelectItem key={entry.id} value={String(entry.id)}>
                      {catLabel(entry)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {form.watch('healthInsuranceTypeRef') && (
        <div className="gba:flex gba:items-center gba:justify-between">
          <Label>{L.uploadNewHealthInsuranceDocument}</Label>
          <Switch
            checked={form.watch('uploadNewHealthInsuranceDocument')}
            onCheckedChange={(val: boolean) =>
              form.setValue('uploadNewHealthInsuranceDocument', Boolean(val), { shouldDirty: true, shouldTouch: true })
            }
            data-testid="flw_changeTaxDetails_uploadNewHealthInsuranceDocument"
          />
        </div>
      )}

      {form.watch('healthInsuranceTypeRef') && form.watch('uploadNewHealthInsuranceDocument') && (
        <div className="gba:space-y-4" data-testid="change-tax-details-health-insurance-document-section">
          <FormField
            name="healthInsuranceDocumentUpload"
            render={() => (
              <FormItem>
                <FormLabel data-testid="change-tax-details-health-insurance-document-upload-label">
                  {L.healthInsuranceDocumentUpload}
                </FormLabel>
                <FormControl>
                  <div data-testid="flw_changeTaxDetails_healthInsuranceDocument_uploadFile">
                    <FileUpload
                      multiple={false}
                      maxFiles={1}
                      accept={ACCEPTED_HEALTH_INSURANCE_DOCUMENT_FILE_TYPES}
                      layout="list"
                      preview="icon"
                      onChange={onHealthInsuranceFilesChange as any}
                    />
                  </div>
                </FormControl>
              </FormItem>
            )}
          />
          {healthInsuranceFileList.length > 0 && (
            <>
              <FormField
                control={form.control as any}
                name={'healthInsuranceDocumentTypeId' as any}
                rules={{
                  validate: (value: string | null) => {
                    if (!form.getValues('uploadNewHealthInsuranceDocument')) return true
                    return value && String(value).trim() ? true : L.requiredDocumentType
                  }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid="change-tax-details-health-insurance-document-type-label">
                      {L.documentType}
                      {form.watch('uploadNewHealthInsuranceDocument') && (
                        <span className="gba:text-destructive">*</span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Combobox
                        className="gba:w-full"
                        options={(catalogs.documentType || []).map((ty: CatalogEntry) => ({
                          value: String(ty.id),
                          label: ty?.translations?.[0]?.value ?? ty?.value ?? ''
                        }))}
                        value={field.value || ''}
                        onValueChange={val => field.onChange(val || null)}
                        placeholder={placeholderSelect}
                        data-testid="flw_changeTaxDetails_healthInsuranceDocumentType"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control as any}
                name={'healthInsuranceDocumentValidTo' as any}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid="change-tax-details-health-insurance-document-valid-to-label">
                      {L.validTo}
                    </FormLabel>
                    <FormControl>
                      <div data-testid="flw_changeTaxDetails_healthInsuranceDocumentValidTo">
                        <DateInput
                          type="date"
                          value={(field.value as string) || ''}
                          onChange={value => field.onChange(typeof value === 'string' ? value : '')}
                          placeholder={placeholderSelect}
                          className="gba:w-full"
                          {...({ locale: getCurrentActiveUserLocale() } as any)}
                          captionLayout="dropdown"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
        </div>
      )}

      <FormField
        control={form.control as any}
        name={'taxIdentificationNumber' as any}
        rules={{
          required: L.requiredTaxId,
          validate: (v: string) => validateTaxId(v, isEmployeeInGermany, getMessage)
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="change-tax-details-tax-id-label">
              {L.taxIdNumber} <span className="gba:text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder={placeholderEnter}
                data-testid="flw_changeTaxDetails_taxIdentificationNumber"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control as any}
        name={'taxableChurchAffiliationRef' as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="change-tax-details-church-affiliation-label">{L.churchAffiliation}</FormLabel>
            <FormControl>
              <Select value={field.value || ''} onValueChange={val => field.onChange(val || null)}>
                <SelectTrigger
                  className="gba:block gba:!w-full gba:min-w-0 gba:!max-w-none"
                  data-testid="flw_changeTaxDetails_taxableChurchAffiliation"
                >
                  <SelectValue placeholder={placeholderSelect} />
                </SelectTrigger>
                <SelectContent>
                  {(catalogs.churchAffiliation || []).map(entry => (
                    <SelectItem key={entry.id} value={String(entry.id)}>
                      {catLabel(entry)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control as any}
        name={'socialSecurityNumber' as any}
        rules={{
          required: L.requiredSSN,
          validate: (v: string) =>
            validateSocialSecurityNumber(v, isEmployeeInGermany, employeeGender, getMessage, isEmployeeInRomania)
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="change-tax-details-ssn-label">
              {L.socialSecurityNumber} <span className="gba:text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                onChange={e => {
                  field.onChange(e)
                  void form.trigger('socialSecurityNumber')
                }}
                placeholder={placeholderEnter}
                data-testid="flw_changeTaxDetails_socialSecurityNumber"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control as any}
        name={'childTaxAllowance' as any}
        rules={{
          validate: (v: string) => (isValidLocalizedNumberInput(v) ? true : L.invalidLocalizedNumber)
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="change-tax-details-child-tax-allowance-label">{L.childTaxAllowance}</FormLabel>
            <FormControl>
              <Input {...field} placeholder={placeholderEnter} data-testid="flw_changeTaxDetails_childTaxAllowance" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {isEmployeeInGermany && (
        <>
          <div className="gba:flex gba:items-center gba:justify-between">
            <Label>{L.requestAtTaxOffice}</Label>
            <Switch
              checked={form.watch('requestAtTaxOffice')}
              onCheckedChange={(val: boolean) =>
                form.setValue('requestAtTaxOffice', Boolean(val), { shouldDirty: true, shouldTouch: true })
              }
              data-testid="flw_changeTaxDetails_requestAtTaxOffice"
            />
          </div>
          {form.watch('requestAtTaxOffice') && (
            <>
              <FormField
                control={form.control as any}
                name={'employeeTaxOffice' as any}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid="change-tax-details-employee-tax-office-label">
                      {L.employeeTaxOffice}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={placeholderEnter}
                        data-testid="flw_changeTaxDetails_employeeTaxOffice"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control as any}
                name={'individualFreeAmount' as any}
                rules={{
                  validate: (v: string) => (isValidLocalizedNumberInput(v) ? true : L.invalidLocalizedNumber)
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid="change-tax-details-individual-free-amount-label">
                      {L.individualFreeAmount}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={placeholderEnter}
                        data-testid="flw_changeTaxDetails_individualFreeAmount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}
