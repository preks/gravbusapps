import React from 'react'
import { UseFormReturn, useWatch } from 'react-hook-form'
import {
  RadioGroup,
  RadioGroupItem,
  Label,
  WizardFormStep,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  Checkbox,
  Skeleton
} from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { SelectOption as AccountSelectOption } from '@/common/components/common-relations/selects/account-select'
import { SelectOption as ContactSelectOption } from '@/common/components/common-relations/selects/contact-select'
import EntitySelect from '@/common/components/common-relations/selects/reference-select/EntitySelect'

interface LeadConvertSegmentProps {
  form: UseFormReturn<any>
  accounts: AccountSelectOption[]
  isLoadingAccounts: boolean
  searchAccounts: (searchTerm: string) => void
  contacts: ContactSelectOption[]
  isLoadingContacts: boolean
  searchContacts: (searchTerm: string) => void
  loading?: boolean
}

/**
 * LeadConvertSegment - Choice Step for Lead Conversion
 * Context-agnostic component used by both CRM and IRM
 * Allows user to choose between creating new or matching existing Account/Contact
 */
export const LeadConvertSegment: React.FC<LeadConvertSegmentProps> = ({
  form,
  accounts,
  isLoadingAccounts,
  searchAccounts,
  contacts,
  isLoadingContacts,
  searchContacts,
  loading = false
}) => {
  // Use useWatch instead of form.watch() to prevent re-render loops
  const accountOption = useWatch({ control: form.control, name: 'accountOption' })
  const contactOption = useWatch({ control: form.control, name: 'contactOption' })
  const accountEntityOptions = React.useMemo(
    () =>
      accounts.map(account => ({
        id: account.id,
        name: account.name,
        type: 'account',
        subtitle: account.extraInfo?.website || account.extraInfo?.email || account.extraInfo?.phone || undefined,
        pictureThumbnail: account.pictureThumbnail
      })),
    [accounts]
  )
  const contactEntityOptions = React.useMemo(
    () =>
      contacts.map(contact => ({
        id: contact.id,
        name: contact.name,
        type: 'contact',
        subtitle:
          contact.extraInfo?.jobPosition || contact.extraInfo?.department || contact.extraInfo?.email || undefined,
        pictureThumbnail: contact.pictureThumbnail
      })),
    [contacts]
  )

  // Show skeleton while loading
  if (loading) {
    return (
      <WizardFormStep>
        <div data-testid="lead-convert-segment-loading" className="gba:space-y-6">
          <div className="gba:space-y-4">
            <Skeleton className="gba:h-8 gba:w-48" />
            <Skeleton className="gba:h-4 gba:w-64" />
            <div className="gba:space-y-3 gba:mt-6">
              <Skeleton className="gba:h-10 gba:w-full" />
              <Skeleton className="gba:h-10 gba:w-full" />
              <Skeleton className="gba:h-10 gba:w-3/4" />
              <Skeleton className="gba:h-10 gba:w-full" />
              <Skeleton className="gba:h-10 gba:w-2/3" />
            </div>
          </div>
        </div>
      </WizardFormStep>
    )
  }

  return (
    <WizardFormStep>
      <div data-testid="lead-convert-segment">
        <div className="gba:space-y-6">
          {/* Account Section */}
          <div className="gba:p-4">
            <h3 className="gba:text-lg gba:font-semibold gba:mb-4">
              {getTranslationFromI18nKeyAndLabel('common:account', 'Account')}
            </h3>

            <FormField
              control={form.control}
              name="accountOption"
              render={({ field }) => (
                <FormItem className="gba:mb-4">
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="gba:space-y-2"
                      data-testid="account-option-radio"
                    >
                      <div className="gba:flex gba:items-center gba:space-x-2">
                        <RadioGroupItem value="create" id="create-account" />
                        <Label htmlFor="create-account">
                          {getTranslationFromI18nKeyAndLabel('common:createNewAccount', 'Create new account')}
                        </Label>
                      </div>
                      <div className="gba:flex gba:items-center gba:space-x-2">
                        <RadioGroupItem value="match" id="match-account" />
                        <Label htmlFor="match-account">
                          {getTranslationFromI18nKeyAndLabel('common:matchExistingAccount', 'Match existing account')}
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Show account selector when matching existing */}
            {accountOption === 'match' && (
              <div className="gba:mt-4">
                <FormField
                  control={form.control}
                  name="selectedAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <EntitySelect
                        value={field.value || null}
                        entities={accountEntityOptions}
                        onValueChange={(accountId: string | null = '') => {
                          field.onChange(accountId ?? '')
                          const selectedAccount = accounts.find(acc => acc.id === (accountId ?? ''))
                          if (selectedAccount) {
                            form.setValue('selectedAccountName', selectedAccount.name)
                          }
                        }}
                        onSearch={searchAccounts}
                        loading={isLoadingAccounts}
                        placeholder={getTranslationFromI18nKeyAndLabel(
                          'common:searchAndSelectAccount',
                          'Search and select account...'
                        )}
                        searchPlaceholder={getTranslationFromI18nKeyAndLabel(
                          'common:typeToSearch',
                          'Type to search...'
                        )}
                        data-testid="account-select"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          {/* Contact Section */}
          <div className="gba:p-4">
            <h3 className="gba:text-lg gba:font-semibold gba:mb-4">
              {getTranslationFromI18nKeyAndLabel('common:contact', 'Contact')}
            </h3>

            <FormField
              control={form.control}
              name="contactOption"
              render={({ field }) => (
                <FormItem className="gba:mb-4">
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="gba:space-y-2"
                      data-testid="contact-option-radio"
                    >
                      <div className="gba:flex gba:items-center gba:space-x-2">
                        <RadioGroupItem value="create" id="create-contact" />
                        <Label htmlFor="create-contact">
                          {getTranslationFromI18nKeyAndLabel('common:createNewContact', 'Create new contact')}
                        </Label>
                      </div>
                      <div className="gba:flex gba:items-center gba:space-x-2">
                        <RadioGroupItem value="match" id="match-contact" />
                        <Label htmlFor="match-contact">
                          {getTranslationFromI18nKeyAndLabel('common:matchExistingContact', 'Match existing contact')}
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Show contact selector when matching existing */}
            {contactOption === 'match' && (
              <div className="gba:mt-4">
                <FormField
                  control={form.control}
                  name="selectedContactId"
                  render={({ field }) => (
                    <FormItem>
                      <EntitySelect
                        value={field.value || null}
                        entities={contactEntityOptions}
                        onValueChange={(contactId: string | null = '') => {
                          field.onChange(contactId ?? '')
                          const selectedContact = contacts.find(cont => cont.id === (contactId ?? ''))
                          if (selectedContact) {
                            form.setValue('selectedContactName', selectedContact.name)
                          }
                        }}
                        onSearch={searchContacts}
                        loading={isLoadingContacts}
                        placeholder={getTranslationFromI18nKeyAndLabel(
                          'common:searchAndSelectContact',
                          'Search and select contact...'
                        )}
                        searchPlaceholder={getTranslationFromI18nKeyAndLabel(
                          'common:typeToSearch',
                          'Type to search...'
                        )}
                        data-testid="contact-select"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          {/* Create Opportunity Checkbox */}
          <div className="gba:p-4">
            <FormField
              control={form.control}
              name="createOpportunity"
              render={({ field }) => (
                <FormItem className="gba:flex gba:items-center gba:space-x-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      id="create-opportunity-checkbox"
                      data-testid="create-opportunity-checkbox"
                    />
                  </FormControl>
                  <Label
                    htmlFor="create-opportunity-checkbox"
                    className="gba:text-sm gba:font-medium gba:cursor-pointer"
                  >
                    {getTranslationFromI18nKeyAndLabel('common:createOpportunity', 'Create Opportunity')}
                  </Label>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </div>
    </WizardFormStep>
  )
}

export default LeadConvertSegment
