import type { UseFormReturn } from 'react-hook-form'
import { useFieldArray, useWatch } from 'react-hook-form'
import {
  Button,
  FormControl,
  FormField,
  FormFieldGroup,
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
  type CompanyFormData
} from './companyFormTypes'

type CompanyExecutivesSectionProps = Readonly<{
  form: UseFormReturn<CompanyFormData>
  t: (key: string) => string
  dataTestId: string
  employees: Employee[]
  employeesLoading: boolean
  hasMore: boolean
  contacts: ContactSelectOption[]
  contactsLoading: boolean
  contactsError: string | null
  searchEmployees: (value: string) => void
  loadMore: () => void
  searchContacts: (value: string) => void
}>

export function CompanyExecutivesSection({
  form,
  t,
  dataTestId,
  employees,
  employeesLoading,
  hasMore,
  contacts,
  contactsLoading,
  contactsError,
  searchEmployees,
  loadMore,
  searchContacts
}: CompanyExecutivesSectionProps) {
  // Field-array subscription lives here (not in the parent CompanyForm) so the heavy
  // top-level form component does not re-render on RHF array/state subject pings, mirroring
  // how AccountForm keeps its field arrays inside its segments.
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'executives'
  })

  return (
    <FormSection title={t('executives-section')} value="company-executives">
      <div className="gba:space-y-4">
        {fields.map((item, index) => (
          <ExecutiveRow
            key={item.id}
            form={form}
            t={t}
            dataTestId={dataTestId}
            index={index}
            employees={employees}
            employeesLoading={employeesLoading}
            hasMore={hasMore}
            contacts={contacts}
            contactsLoading={contactsLoading}
            contactsError={contactsError}
            remove={remove}
            searchEmployees={searchEmployees}
            loadMore={loadMore}
            searchContacts={searchContacts}
          />
        ))}

        <Button type="button" size="sm" variant="outline" onClick={() => append(createEmptyExecutive())}>
          <PlusIcon className="gba:w-4 gba:h-4 gba:mr-2" />
          {t('add-executive-button')}
        </Button>
      </div>
    </FormSection>
  )
}

type ExecutiveRowProps = Readonly<{
  form: UseFormReturn<CompanyFormData>
  t: (key: string) => string
  dataTestId: string
  index: number
  employees: Employee[]
  employeesLoading: boolean
  hasMore: boolean
  contacts: ContactSelectOption[]
  contactsLoading: boolean
  contactsError: string | null
  remove: (index: number) => void
  searchEmployees: (value: string) => void
  loadMore: () => void
  searchContacts: (value: string) => void
}>

function ExecutiveRow({
  form,
  t,
  dataTestId,
  index,
  employees,
  employeesLoading,
  hasMore,
  contacts,
  contactsLoading,
  contactsError,
  remove,
  searchEmployees,
  loadMore,
  searchContacts
}: ExecutiveRowProps) {
  // Scoped subscriptions (useWatch) instead of form.watch() in render. Calling the
  // form.watch() instance method inside a useFieldArray map is a known RHF footgun that
  // can cause excessive re-renders.
  const sourceType = useWatch({ control: form.control, name: `executives.${index}.sourceType` })
  const executiveType = useWatch({ control: form.control, name: `executives.${index}.executiveTypeRef` })
  const isSourceTypeRequired = Boolean(executiveType)
  const isPersonRequired = Boolean(sourceType)

  return (
    <div className="gba:space-y-4">
      <FormFieldGroup className="gba:grid gba:grid-cols-2 gba:gap-4">
        <FormField
          control={form.control}
          name={`executives.${index}.sourceType`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('source-type-label')}
                {isSourceTypeRequired && (
                  <span aria-hidden="true" className="gba:text-destructive">
                    *
                  </span>
                )}
              </FormLabel>
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
        <FormField
          control={form.control}
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
      </FormFieldGroup>

      {sourceType === 'employee' && (
        <FormField
          control={form.control}
          name={`executives.${index}.employeeId`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('employee-label')}
                {isPersonRequired && (
                  <span aria-hidden="true" className="gba:text-destructive">
                    *
                  </span>
                )}
              </FormLabel>
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
      )}

      {sourceType === 'investmentContact' && (
        <FormField
          control={form.control}
          name={`executives.${index}.investmentContactId`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('investment-contact-label')}
                {isPersonRequired && (
                  <span aria-hidden="true" className="gba:text-destructive">
                    *
                  </span>
                )}
              </FormLabel>
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

      <Button type="button" size="sm" variant="outline" onClick={() => remove(index)}>
        <TrashIcon className="gba:w-4 gba:h-4 gba:mr-2" />
        {t('remove-executive-button')}
      </Button>
    </div>
  )
}
