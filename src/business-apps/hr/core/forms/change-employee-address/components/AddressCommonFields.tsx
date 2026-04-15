import React from 'react'
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Textarea, Input } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import CountryRegionFields from './CountryRegionFields'
import AddressLines from './AddressLines'
import { EmployeeDocumentUploadField } from '../../document-sync/EmployeeDocumentUploadField'

interface AddressCommonFieldsProps {
  form: any
  catalogs: { countries?: any[]; regions?: any[] }
  isDeleteMode: boolean
  isSwitchingSelection: boolean
  addressLineCount: number
  setAddressLineCount: (updater: number | ((c: number) => number)) => void
  addressLinesError: string | null
  setAddressLinesError: (msg: string | null) => void
  getValues: () => any
  documentInitialFiles: Array<{ id: string; name: string; size?: number; type?: string; url?: string }>
  isLoadingDocumentInitialFiles: boolean
  isResolvingInitialDocuments: boolean
  hasExistingDocumentHint: boolean
  hasInitialDocumentCandidates: boolean
  onDocumentFilesChange: (files: any[]) => void
}

const AddressCommonFields: React.FC<AddressCommonFieldsProps> = ({
  form,
  catalogs,
  isDeleteMode,
  isSwitchingSelection,
  addressLineCount,
  setAddressLineCount,
  addressLinesError,
  setAddressLinesError,
  getValues,
  documentInitialFiles,
  isLoadingDocumentInitialFiles,
  isResolvingInitialDocuments,
  hasExistingDocumentHint,
  hasInitialDocumentCandidates,
  onDocumentFilesChange
}) => {
  return (
    <>
      <CountryRegionFields
        control={form.control as any}
        catalogs={{ countries: catalogs?.countries || [], regions: catalogs?.regions || [] }}
        setValue={form.setValue as any}
        isDeleteMode={isDeleteMode}
        suppressValidation={isSwitchingSelection}
        suspendRegionRender={isSwitchingSelection}
      />

      <AddressLines
        control={form.control as any}
        addressLineCount={addressLineCount}
        setAddressLineCount={setAddressLineCount as any}
        addressLinesError={addressLinesError}
        setAddressLinesError={setAddressLinesError}
        getValues={getValues}
      />

      <FormField
        control={form.control as any}
        name={'postalCode' as any}
        rules={{
          validate: (v: any) => {
            const countryIdSel = form.getValues('countryId')
            const selectedCountry = (catalogs?.countries || []).find((c: any) => String(c.id) === String(countryIdSel))
            const countryVal = selectedCountry?.id
            if (!v || String(v).trim() === '') {
              return countryVal === 'Country:v1:US'
                ? getTranslationFromI18nKeyAndLabel(
                    'lowcoder:employee_profile.details_layout.address_container.postal_code_validation_message',
                    'The Postal Code field is required. Please enter a postal code.'
                  )
                : getTranslationFromI18nKeyAndLabel(
                    'lowcoder:employee_profile.details_layout.address_container.zip_code_validation_message',
                    'The ZIP Code field is required. Please enter a ZIP code.'
                  )
            }
            return true
          }
        }}
        render={({ field }) => {
          const countryId = form.watch('countryId')
          const selectedCountry = (catalogs?.countries || []).find((c: any) => String(c.id) === String(countryId))
          const isUS = selectedCountry?.id === 'Country:v1:US'
          const label = isUS
            ? getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_profile.details_layout.address_container.zip_code',
                'ZIP Code'
              )
            : getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_profile.details_layout.address_container.postal_code',
                'Postal Code'
              )
          const placeholder = `${getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.personal_information_container.enter_placeholder', 'Please Enter')} ${label}`
          return (
            <FormItem>
              <FormLabel>
                {label}
                <span className="gba:text-destructive"> *</span>
              </FormLabel>
              <FormControl>
                <Input {...field} placeholder={placeholder} data-testid="flw_changeEmployeeAddressList_postalCode" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )
        }}
      />

      <FormField
        control={form.control as any}
        name={'city' as any}
        rules={{
          required: getTranslationFromI18nKeyAndLabel(
            'lowcoder:employee_profile.details_layout.address_container.city_validation_message',
            'The City field is required. Please select a city.'
          )
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_profile.details_layout.address_container.city',
                'City'
              )}
              <span className="gba:text-destructive"> *</span>
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder={`${getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.personal_information_container.enter_placeholder', 'Please Enter')} ${getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.address_container.city', 'City')}`}
                data-testid="flw_changeEmployeeAddressList_locality"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control as any}
        name={'comment' as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="change-employee-address-comment-label">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:initiate_expense_plan.create_expense_plan.comment_text_area',
                'Comment'
              )}
            </FormLabel>
            <FormControl>
              <Textarea
                {...field}
                rows={4}
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:employee_profile.details_layout.personal_information_container.enter_placeholder',
                  'Please Enter'
                )}
                data-testid="flw_changeEmployeeAddressList_comment"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <EmployeeDocumentUploadField
        name="employeeAddressDocumentUpload"
        label={getTranslationFromI18nKeyAndLabel(
          'lowcoder:hr_absences.create_absence.upload_document',
          'Upload document'
        )}
        isLoading={isLoadingDocumentInitialFiles}
        isResolvingInitialDocuments={isResolvingInitialDocuments}
        hasExistingDocumentHint={hasExistingDocumentHint}
        hasInitialDocumentCandidates={hasInitialDocumentCandidates}
        loadingMessage={getTranslationFromI18nKeyAndLabel(
          'lowcoder:change_employee_address.loading_document',
          'Loading document...'
        )}
        initialFiles={documentInitialFiles}
        onFilesChange={onDocumentFilesChange}
        accept={'application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png,.PDF,.JPG,.JPEG,.PNG'}
        maxFiles={1}
        multiple={false}
        dataTestId="change-employee-address-upload"
      />
    </>
  )
}

export default AddressCommonFields
