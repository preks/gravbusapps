import type { UseFormReturn } from 'react-hook-form'
import {
  Button,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormSection,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { PlusIcon, TrashIcon } from '@phosphor-icons/react'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'
import {
  ContactSelect,
  type SelectOption as ContactSelectOption
} from '@/common/components/common-relations/selects/contact-select'
import { CatalogSelect } from '@/components/catalog-select'
import { EmployeeSelect } from '@/components/employee-select'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import {
  createEmptyExecutive,
  getSelectedContactId,
  LEGAL_ENTITY_EXECUTIVE_TYPE_CATALOG,
  type CompanyFormData,
  type ExecutiveFormRow
} from './companyFormTypes'

type CompanyExecutivesSectionProps = Readonly<{
  form: UseFormReturn<CompanyFormData>
  t: (key: string) => string
  dataTestId: string
  fields: Array<{ id: string }>
  employees: Employee[]
  employeesLoading: boolean
  hasMore: boolean
  contacts: ContactSelectOption[]
  contactsLoading: boolean
  contactsError: string | null
  append: (value: ExecutiveFormRow) => void
  remove: (index: number) => void
  searchEmployees: (value: string) => void
  loadMore: () => void
  searchContacts: (value: string) => void
}>

export function CompanyExecutivesSection({
  form,
  t,
  dataTestId,
  fields,
  employees,
  employeesLoading,
  hasMore,
  contacts,
  contactsLoading,
  contactsError,
  append,
  remove,
  searchEmployees,
  loadMore,
  searchContacts
}: CompanyExecutivesSectionProps) {
  return (
    <FormSection title={t('executives-section')} value="company-executives">
      <div className="gba:space-y-4">
        {fields.map((item, index) => {
          const sourceType = form.watch(`executives.${index}.sourceType`)

          return (
            <div key={item.id} className="gba:p-3 gba:border gba:rounded-md gba:space-y-3">
              <FormField
                name={`executives.${index}.sourceType`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('source-type-label')}</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={value => {
                          field.onChange(value)
                          if (value === 'employee') {
                            form.setValue(`executives.${index}.investmentContactId`, undefined)
                          } else {
                            form.setValue(`executives.${index}.employeeId`, undefined)
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('source-type-label')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">{t('source-employee')}</SelectItem>
                          <SelectItem value="investmentContact">{t('source-investment-contact')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {sourceType === 'employee' ? (
                <FormField
                  name={`executives.${index}.employeeId`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('employee-label')}</FormLabel>
                      <FormControl>
                        <EmployeeSelect
                          value={field.value || null}
                          employees={employees}
                          onValueChange={value => field.onChange(value || undefined)}
                          onSearch={searchEmployees}
                          loading={employeesLoading}
                          hasMore={hasMore}
                          onLoadMore={loadMore}
                          placeholder={t('employee-placeholder')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  name={`executives.${index}.investmentContactId`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('investment-contact-label')}</FormLabel>
                      <FormControl>
                        <ContactSelect
                          value={field.value || null}
                          onChange={value => field.onChange(getSelectedContactId(value) || undefined)}
                          contacts={contacts}
                          contactsLoading={contactsLoading}
                          contactsError={contactsError}
                          searchContacts={searchContacts}
                          showContactType={false}
                          dataTestId={formatDataTestId(dataTestId, `executive-contact-${index}`)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                name={`executives.${index}.executiveTypeRef`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('executive-type-label')}</FormLabel>
                    <FormControl>
                      <CatalogSelect
                        catalogIdentifier={LEGAL_ENTITY_EXECUTIVE_TYPE_CATALOG}
                        value={field.value || ''}
                        onValueChange={value => field.onChange(value || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="button" variant="outline" onClick={() => remove(index)}>
                <TrashIcon className="gba:w-4 gba:h-4 gba:mr-2" />
                {t('remove-executive-button')}
              </Button>
            </div>
          )
        })}

        <Button type="button" variant="outline" onClick={() => append(createEmptyExecutive())}>
          <PlusIcon className="gba:w-4 gba:h-4 gba:mr-2" />
          {t('add-executive-button')}
        </Button>
      </div>
    </FormSection>
  )
}
