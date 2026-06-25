import type { UseFormReturn } from 'react-hook-form'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Combobox,
  FileUpload,
  FormControl,
  FormField,
  FormFieldGroup,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Switch
} from '@newwork/nw-design-system'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { EmployeeRef } from '@/common/data/employee/types/employeeBaseTypes'
import { CatalogSelect } from '@/components/catalog-select'
import { EmployeeSelect } from '@/components/employee-select'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { CURRENCY_CATALOG, type CompanyFormData } from './companyFormTypes'

type CompanyCoreFieldsProps = Readonly<{
  form: UseFormReturn<CompanyFormData>
  t: (key: string) => string
  businessAppContext: BusinessAppContextProps
  dataTestId: string
  ownerEmployee?: EmployeeRef
  groupOptions: Array<{ value: string; label: string }>
  groupsLoading: boolean
  picturePreview: string | null
  onGroupSearch: (value: string) => void
  onPictureUpload: (files: unknown[]) => void
  onRemovePicture: () => void
}>

export function CompanyCoreFields({
  form,
  t,
  businessAppContext,
  dataTestId,
  ownerEmployee,
  groupOptions,
  groupsLoading,
  picturePreview,
  onGroupSearch,
  onPictureUpload,
  onRemovePicture
}: CompanyCoreFieldsProps) {
  return (
    <>
      <FormField
        control={form.control}
        name="ownerEmployeeId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('owner-label')}</FormLabel>
            <FormControl>
              <EmployeeSelect
                value={field.value || null}
                onValueChange={(value: string | null) => field.onChange(value || '')}
                businessAppContext={businessAppContext}
                initialEmployee={ownerEmployee}
                autoSelect={form.watch('id') ? undefined : 'current-user'}
                placeholder={t('owner-placeholder')}
                data-testid={formatDataTestId(dataTestId, 'OwnerSelect')}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="investmentCompanyGroupId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('group-label')}</FormLabel>
            <FormControl>
              <Combobox
                value={field.value || ''}
                onValueChange={value => field.onChange(value || undefined)}
                options={groupOptions}
                onSearch={onGroupSearch}
                loading={groupsLoading}
                placeholder={t('group-placeholder')}
                searchPlaceholder={t('group-search-placeholder')}
                emptyText={t('group-empty')}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormFieldGroup title={t('section-core-details')} className="gba:grid gba:grid-cols-2 gba:gap-4">
        <FormField
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('name-label')}</FormLabel>
              <FormControl>
                <Input placeholder={t('name-placeholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('code-label')}</FormLabel>
              <FormControl>
                <Input placeholder={t('code-placeholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormFieldGroup>

      <FormFieldGroup className="gba:grid gba:grid-cols-2 gba:gap-4">
        <FormField
          name="commercialRegistrationNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('commercial-registration-number-label')}</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="currencyRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('currency-label')}</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier={CURRENCY_CATALOG}
                  value={field.value || ''}
                  onValueChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormFieldGroup>

      <FormFieldGroup className="gba:grid gba:grid-cols-2 gba:gap-4">
        <FormField
          name="taxIdentificationNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('tax-identification-number-label')}</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="taxNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('tax-number-label')}</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="valueAddedTaxNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('vat-number-label')}</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="accountingArea"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('accounting-area-label')}</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="ownsProperty"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('owns-property-label')}</FormLabel>
              <div className="gba:flex gba:h-10 gba:items-center">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid={formatDataTestId(dataTestId, 'OwnsPropertySwitch')}
                  />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormFieldGroup>

      <FormItem>
        <FormLabel>{t('logo-label')}</FormLabel>
        <FormControl>
          <div className="gba:space-y-3">
            {picturePreview && (
              <div className="gba:flex gba:items-center gba:gap-4">
                <Avatar className="gba:w-20 gba:h-20">
                  <AvatarImage src={picturePreview} alt={t('logo-alt')} />
                  <AvatarFallback>{(form.watch('name') || 'CO').slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <Button type="button" variant="outline" onClick={onRemovePicture}>
                  {t('remove-logo-button')}
                </Button>
              </div>
            )}
            <FileUpload multiple={false} accept="image/*" onChange={onPictureUpload} />
          </div>
        </FormControl>
      </FormItem>
    </>
  )
}
