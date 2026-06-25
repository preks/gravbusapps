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
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { PlusIcon, TrashIcon } from '@phosphor-icons/react'
import AccountSelect, {
  type SelectOption as AccountSelectOption
} from '@/common/components/common-relations/selects/account-select/AccountSelect'
import {
  ContactSelect,
  type SelectOption as ContactSelectOption
} from '@/common/components/common-relations/selects/contact-select'
import { INVESTMENT_COMPANY_STAKEHOLDER_TYPE_CATALOG } from '@/common/data/investment/constants/investmentCatalogs'
import { CatalogSelect } from '@/components/catalog-select'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { createEmptyStakeholder, getSelectedContactId, type CompanyFormData } from './companyFormTypes'

type CompanyStakeholdersSectionProps = Readonly<{
  form: UseFormReturn<CompanyFormData>
  t: (key: string) => string
  dataTestId: string
  contacts: ContactSelectOption[]
  contactsLoading: boolean
  contactsError: string | null
  contactsHasMore: boolean
  searchContacts: (value: string) => void
  loadMoreContacts: () => void
  accounts: AccountSelectOption[]
  accountsLoading: boolean
  accountsError: string | null
  accountsHasMore: boolean
  searchAccounts: (value: string) => void
  loadMoreAccounts: () => void
}>

type StakeholderContact = NonNullable<NonNullable<CompanyFormData['stakeholders']>[number]['investmentContact']>

const toContactOption = (contact: StakeholderContact): ContactSelectOption => {
  const displayName = contact.fullName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.id
  return {
    id: contact.id,
    value: contact.id,
    label: displayName,
    name: displayName,
    pictureThumbnail: contact.pictureThumbnail || undefined,
    extraInfo: { jobPosition: contact.jobPosition, department: contact.department }
  }
}

const getSelectedAccountId = (
  value: Array<string | { id: string }> | string | { id: string } | null
): string | null => {
  if (Array.isArray(value)) {
    const firstValue = value[0]
    return typeof firstValue === 'object' ? firstValue.id : firstValue || null
  }

  if (value && typeof value === 'object') {
    return value.id
  }
  return value || null
}

const RequiredMarker = ({ visible }: Readonly<{ visible: boolean }>) =>
  visible ? (
    <span aria-hidden="true" className="gba:text-destructive">
      *
    </span>
  ) : null

export function CompanyStakeholdersSection({
  form,
  t,
  dataTestId,
  contacts,
  contactsLoading,
  contactsError,
  contactsHasMore,
  searchContacts,
  loadMoreContacts,
  accounts,
  accountsLoading,
  accountsError,
  accountsHasMore,
  searchAccounts,
  loadMoreAccounts
}: CompanyStakeholdersSectionProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'stakeholders'
  })

  return (
    <FormSection title={t('stakeholders-section')} value="company-stakeholders">
      <div className="gba:space-y-4">
        {fields.map((item, index) => (
          <StakeholderRow
            key={item.id}
            form={form}
            t={t}
            dataTestId={dataTestId}
            index={index}
            contacts={contacts}
            contactsLoading={contactsLoading}
            contactsError={contactsError}
            contactsHasMore={contactsHasMore}
            searchContacts={searchContacts}
            loadMoreContacts={loadMoreContacts}
            accounts={accounts}
            accountsLoading={accountsLoading}
            accountsError={accountsError}
            accountsHasMore={accountsHasMore}
            searchAccounts={searchAccounts}
            loadMoreAccounts={loadMoreAccounts}
            remove={remove}
          />
        ))}

        <Button type="button" size="sm" variant="outline" onClick={() => append(createEmptyStakeholder())}>
          <PlusIcon className="gba:w-4 gba:h-4 gba:mr-2" />
          {t('add-stakeholder-button')}
        </Button>
      </div>
    </FormSection>
  )
}

type StakeholderRowProps = CompanyStakeholdersSectionProps &
  Readonly<{
    index: number
    remove: (index: number) => void
  }>

function StakeholderRow({
  form,
  t,
  dataTestId,
  index,
  contacts,
  contactsLoading,
  contactsError,
  contactsHasMore,
  searchContacts,
  loadMoreContacts,
  accounts,
  accountsLoading,
  accountsError,
  accountsHasMore,
  searchAccounts,
  loadMoreAccounts,
  remove
}: StakeholderRowProps) {
  const sourceType = useWatch({ control: form.control, name: `stakeholders.${index}.sourceType` })
  const initialContact = useWatch({ control: form.control, name: `stakeholders.${index}.investmentContact` })
  const initialAccount = useWatch({ control: form.control, name: `stakeholders.${index}.investmentAccount` })
  const isStakeholderRequired = Boolean(sourceType)

  return (
    <div className="gba:space-y-4">
      <FormFieldGroup className="gba:grid gba:grid-cols-2 gba:gap-4">
        <FormField
          control={form.control}
          name={`stakeholders.${index}.sourceType`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('source-type-label')}</FormLabel>
              <FormControl>
                <Select
                  value={field.value}
                  onValueChange={value => {
                    field.onChange(value)
                    form.setValue(`stakeholders.${index}.investmentContactId`, undefined)
                    form.setValue(`stakeholders.${index}.investmentContact`, undefined)
                    form.setValue(`stakeholders.${index}.investmentAccountId`, undefined)
                    form.setValue(`stakeholders.${index}.investmentAccount`, undefined)
                    form.setValue(`stakeholders.${index}.name`, undefined)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('source-type-label')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="investmentContact">{t('source-investment-contact')}</SelectItem>
                    <SelectItem value="investmentAccount">{t('source-investment-account')}</SelectItem>
                    <SelectItem value="external">{t('source-external')}</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={`stakeholders.${index}.investmentCompanyStakeholderTypeRef`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('stakeholder-type-label')}</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier={INVESTMENT_COMPANY_STAKEHOLDER_TYPE_CATALOG}
                  value={field.value || ''}
                  onValueChange={value => field.onChange(value || undefined)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormFieldGroup>

      {sourceType === 'investmentContact' && (
        <FormField
          control={form.control}
          name={`stakeholders.${index}.investmentContactId`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('investment-contact-label')}
                <RequiredMarker visible={isStakeholderRequired} />
              </FormLabel>
              <FormControl>
                <ContactSelect
                  value={field.value || null}
                  onChange={value => field.onChange(getSelectedContactId(value) || undefined)}
                  contacts={
                    initialContact?.id
                      ? [
                          toContactOption(initialContact),
                          ...contacts.filter(contact => contact.id !== initialContact.id)
                        ]
                      : contacts
                  }
                  contactsLoading={contactsLoading}
                  contactsError={contactsError}
                  searchContacts={searchContacts}
                  hasMore={contactsHasMore}
                  onLoadMore={loadMoreContacts}
                  showContactType={false}
                  dataTestId={formatDataTestId(dataTestId, `stakeholder-contact-${index}`)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      {sourceType === 'investmentAccount' && (
        <FormField
          control={form.control}
          name={`stakeholders.${index}.investmentAccountId`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('investment-account-label')}
                <RequiredMarker visible={isStakeholderRequired} />
              </FormLabel>
              <FormControl>
                <AccountSelect
                  value={field.value || null}
                  onChange={value => field.onChange(getSelectedAccountId(value) || undefined)}
                  accounts={accounts}
                  accountsLoading={accountsLoading}
                  accountsError={accountsError}
                  hasMore={accountsHasMore}
                  onLoadMore={loadMoreAccounts}
                  searchAccounts={searchAccounts}
                  initialAccount={initialAccount}
                  showAccountType={false}
                  dataTestId={formatDataTestId(dataTestId, `stakeholder-account-${index}`)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      {sourceType === 'external' && (
        <FormField
          control={form.control}
          name={`stakeholders.${index}.name`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('stakeholder-name-label')}
                <RequiredMarker visible={isStakeholderRequired} />
              </FormLabel>
              <FormControl>
                <Input
                  value={field.value || ''}
                  onChange={event => field.onChange(event.target.value || undefined)}
                  placeholder={t('stakeholder-name-placeholder')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      <Button type="button" size="sm" variant="outline" onClick={() => remove(index)}>
        <TrashIcon className="gba:w-4 gba:h-4 gba:mr-2" />
        {t('remove-stakeholder-button')}
      </Button>
    </div>
  )
}
