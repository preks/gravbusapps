import React from 'react'
import { UseFormReturn } from 'react-hook-form'
import {
  RadioGroup,
  RadioGroupItem,
  Label,
  WizardFormStep,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  Checkbox
} from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  AccountSelect,
  SelectOption as AccountSelectOption
} from '@/common/components/common-relations/selects/account-select'
import {
  ContactSelect,
  SelectOption as ContactSelectOption
} from '@/common/components/common-relations/selects/contact-select'

interface LeadConvertSegmentProps {
  form: UseFormReturn<any>
  accounts: AccountSelectOption[]
  isLoadingAccounts: boolean
  searchAccounts: (searchTerm: string) => void
  contacts: ContactSelectOption[]
  isLoadingContacts: boolean
  searchContacts: (searchTerm: string) => void
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
  searchContacts
}) => {
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
            {form.watch('accountOption') === 'match' && (
              <div className="gba:mt-4">
                <FormField
                  control={form.control}
                  name="selectedAccountId"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <AccountSelect
                        value={field.value || null}
                        onChange={value => {
                          const accountId = typeof value === 'object' && value !== null ? value.id : value
                          field.onChange(accountId)
                          // Also store the account name and ownerEmployeeId for payload
                          const selectedAccount = accounts.find(acc => acc.id === accountId)
                          if (selectedAccount) {
                            form.setValue('selectedAccountName', selectedAccount.name)
                            form.setValue(
                              'selectedAccountOwnerEmployeeId',
                              selectedAccount.extraInfo?.ownerEmployee?.id || ''
                            )
                          }
                        }}
                        dataTestId="account-select"
                        error={fieldState.error?.message || null}
                        accounts={accounts}
                        accountsLoading={isLoadingAccounts}
                        accountsError={null}
                        searchAccounts={searchAccounts}
                        multiple={false}
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
            {form.watch('contactOption') === 'match' && (
              <div className="gba:mt-4">
                <FormField
                  control={form.control}
                  name="selectedContactId"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <ContactSelect
                        value={field.value ? [field.value] : []}
                        onChange={value => {
                          const contactId =
                            Array.isArray(value) && value.length > 0
                              ? typeof value[0] === 'object'
                                ? value[0].id
                                : value[0]
                              : null
                          field.onChange(contactId)
                          // Also store the contact name for display
                          const selectedContact = contacts.find(cont => cont.id === contactId)
                          if (selectedContact) {
                            form.setValue('selectedContactName', selectedContact.name)
                          }
                        }}
                        dataTestId="contact-select"
                        error={fieldState.error?.message || null}
                        contacts={contacts}
                        contactsLoading={isLoadingContacts}
                        contactsError={null}
                        searchContacts={searchContacts}
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
