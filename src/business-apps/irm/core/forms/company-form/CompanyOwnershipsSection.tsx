import {
  Button,
  Combobox,
  FormControl,
  FormField,
  FormFieldGroup,
  FormItem,
  FormLabel,
  FormMessage,
  FormSection,
  Input
} from '@newwork/nw-design-system'
import { PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { createEmptyOwnership, type OwnershipFormRow } from './companyFormTypes'

type CompanyOwnershipsSectionProps = Readonly<{
  t: (key: string) => string
  fields: Array<{ id: string }>
  ownerCompanyOptions: Array<{ value: string; label: string }>
  ownerCompaniesLoading: boolean
  append: (value: OwnershipFormRow) => void
  remove: (index: number) => void
  onOwnerCompanySearch: (value: string) => void
}>

export function CompanyOwnershipsSection({
  t,
  fields,
  ownerCompanyOptions,
  ownerCompaniesLoading,
  append,
  remove,
  onOwnerCompanySearch
}: CompanyOwnershipsSectionProps) {
  return (
    <FormSection title={t('ownerships-section')} value="company-ownerships">
      <div className="gba:space-y-4">
        {fields.map((item, index) => (
          <div key={item.id} className="gba:space-y-4">
            <FormFieldGroup className="gba:grid gba:grid-cols-2 gba:gap-4">
              <FormField
                name={`ownerships.${index}.ownerInvestmentCompanyId`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('owner-company-label')}</FormLabel>
                    <FormControl>
                      <Combobox
                        value={field.value || ''}
                        onValueChange={value => field.onChange(value || undefined)}
                        options={ownerCompanyOptions}
                        onSearch={onOwnerCompanySearch}
                        loading={ownerCompaniesLoading}
                        placeholder={t('owner-company-placeholder')}
                        searchPlaceholder={t('owner-company-search-placeholder')}
                        emptyText={t('owner-company-empty')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name={`ownerships.${index}.percentage`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('ownership-percentage-label')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={field.value ?? ''}
                        onChange={event => {
                          const value = event.target.value
                          field.onChange(value === '' ? undefined : Number(value))
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormFieldGroup>
            <Button type="button" size="sm" variant="outline" onClick={() => remove(index)}>
              <TrashIcon className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('remove-ownership-button')}
            </Button>
          </div>
        ))}

        <Button type="button" size="sm" variant="outline" onClick={() => append(createEmptyOwnership())}>
          <PlusIcon className="gba:w-4 gba:h-4 gba:mr-2" />
          {t('add-ownership-button')}
        </Button>
        <FormField
          name="ownerships"
          render={() => (
            <FormItem>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </FormSection>
  )
}
