import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import {
  RadioGroup,
  RadioGroupItem,
  Label,
  WizardFormStep,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@newwork/nw-design-system';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import SearchableSelect from './SearchableSelect';
import { ConvertLeadFormData, AccountOption, ContactOption } from '../types';

interface ChoicesStepProps {
  form: UseFormReturn<ConvertLeadFormData>;
  accounts: AccountOption[];
  isLoadingAccounts: boolean;
  hasMoreAccounts: boolean;
  searchAccounts: (searchTerm: string) => void;
  loadMoreAccounts: () => void;
  contacts: ContactOption[];
  isLoadingContacts: boolean;
  hasMoreContacts: boolean;
  searchContacts: (searchTerm: string) => void;
  loadMoreContacts: () => void;
}

export const ChoicesStep: React.FC<ChoicesStepProps> = ({
  form,
  accounts,
  isLoadingAccounts,
  hasMoreAccounts,
  searchAccounts,
  loadMoreAccounts,
  contacts,
  isLoadingContacts,
  hasMoreContacts,
  searchContacts,
  loadMoreContacts,
}) => {
  return (
    <WizardFormStep>
      <div data-testid="convert-lead-choices-step">
        <div className="gba:space-y-6">
          
          {/* Account Section */}
          <div className="gba:p-4">
            <h3 className="gba:text-lg gba:font-semibold gba:mb-4">
              {getTranslationFromI18nKeyAndLabel("crm:convertLead.account", "Account")}
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
                          {getTranslationFromI18nKeyAndLabel("crm:convertLead.createNewAccount", "Create new account")}
                        </Label>
                      </div>
                      <div className="gba:flex gba:items-center gba:space-x-2">
                        <RadioGroupItem value="match" id="match-account" />
                        <Label htmlFor="match-account">
                          {getTranslationFromI18nKeyAndLabel("crm:convertLead.matchExistingAccount", "Match existing account")}
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
                      <SearchableSelect
                        label={getTranslationFromI18nKeyAndLabel("crm:convertLead.selectAccount", "Select Account")}
                        name="account-select"
                        value={field.value || ''}
                        placeholder="Search and select an account..."
                        options={accounts}
                        loading={isLoadingAccounts}
                        hasMore={hasMoreAccounts}
                        onSearch={searchAccounts}
                        onLoadMore={loadMoreAccounts}
                        onChange={(value) => {
                          const selectedAccount = accounts.find(account => account.id === value);
                          form.setValue('selectedAccountId', value);
                          form.setValue('selectedAccountName', selectedAccount?.name || '');
                        }}
                        data-testid="account-select"
                        className="gba:w-full"
                      />
                      {fieldState.error && (
                        <FormMessage>{fieldState.error.message}</FormMessage>
                      )}
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          {/* Contact Section */}
          <div className="gba:p-4">
            <h3 className="gba:text-lg gba:font-semibold gba:mb-4">
              {getTranslationFromI18nKeyAndLabel("crm:convertLead.contact", "Contact")}
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
                          {getTranslationFromI18nKeyAndLabel("crm:convertLead.createNewContact", "Create new contact")}
                        </Label>
                      </div>
                      <div className="gba:flex gba:items-center gba:space-x-2">
                        <RadioGroupItem value="match" id="match-contact" />
                        <Label htmlFor="match-contact">
                          {getTranslationFromI18nKeyAndLabel("crm:convertLead.matchExistingContact", "Match existing contact")}
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
                      <SearchableSelect
                        label={getTranslationFromI18nKeyAndLabel("crm:convertLead.selectContact", "Select Contact")}
                        name="contact-select"
                        value={field.value || ''}
                        placeholder="Search and select a contact..."
                        options={contacts}
                        loading={isLoadingContacts}
                        hasMore={hasMoreContacts}
                        onSearch={searchContacts}
                        onLoadMore={loadMoreContacts}
                        onChange={(value) => {
                          const selectedContact = contacts.find(contact => contact.id === value);
                          form.setValue('selectedContactId', value);
                          form.setValue('selectedContactName', selectedContact?.name || '');
                        }}
                        data-testid="contact-select"
                        className="gba:w-full"
                      />
                      {fieldState.error && (
                        <FormMessage>{fieldState.error.message}</FormMessage>
                      )}
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          {/* Opportunity Section */}
          <div className="gba:p-4">
            <h3 className="gba:text-lg gba:font-semibold gba:mb-4">
              {getTranslationFromI18nKeyAndLabel("crm:convertLead.opportunity", "Opportunity")}
            </h3>
            
            <FormField
              control={form.control}
              name="createOpportunity"
              render={({ field }) => (
                <FormItem>
                  <div className="gba:flex gba:items-center gba:space-x-2">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        data-testid="create-opportunity-checkbox"
                        className="gba:w-4 gba:h-4"
                      />
                    </FormControl>
                    <Label>
                      {getTranslationFromI18nKeyAndLabel("crm:convertLead.createNewOpportunity", "Create new opportunity")}
                    </Label>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </div>
    </WizardFormStep>
  );
};
