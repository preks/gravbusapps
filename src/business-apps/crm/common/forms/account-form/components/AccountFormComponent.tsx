import React from 'react';
import { useAccountFormContext } from '../context/AccountFormContext';
import { Button, Spinner, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils';
import AccountInformationSection from './AccountInformationSection';
import CompanyInformationSection from './CompanyInformationSection';
import ContactInformationSection from './ContactInformationSection';
import AddressInformationSection from './AddressInformationSection';
import FinancialInformationSection from './FinancialInformationSection';

const prefixDataTestId = 'AccountForm';

const AccountFormComponent: React.FC = () => {
  const {
    formValues,
    onSubmit,
    onCancel,
    isLoading,
    error,
  } = useAccountFormContext();

  // Check if all mandatory fields are filled
  const isFormValid = 
    formValues.owner &&
    formValues.accountType &&
    formValues.accountStatus &&
    formValues.accountName;

  // Helper function to convert values to strings safely
  const toStringOrUndefined = (value: string): string | undefined => {
    return value && value.trim() ? value.trim() : undefined;
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      await onSubmit(formValues);
      
      // Determine if this is an update or create operation
      const isUpdate = formValues.id;
      
      // Prepare comprehensive account payload following the API structure
      const accountPayload: any = {
        sourceApp: "CRM",
        accountTypeRef: toStringOrUndefined(formValues.accountType),
        accountStatusRef: toStringOrUndefined(formValues.accountStatus),
        priorityRef: toStringOrUndefined(formValues.priority),
        accountName: toStringOrUndefined(formValues.accountName),
        parentAccountRef: toStringOrUndefined(formValues.parentAccount),
        legalFormRef: toStringOrUndefined(formValues.legalForm),
        industryRef: toStringOrUndefined(formValues.industry),
        website: toStringOrUndefined(formValues.website),
        description: toStringOrUndefined(formValues.description),
        phone: toStringOrUndefined(formValues.phone),
        email: toStringOrUndefined(formValues.email),
        fax: toStringOrUndefined(formValues.fax),
        countryRef: toStringOrUndefined(formValues.country),
        regionRef: toStringOrUndefined(formValues.region),
        addressLine: toStringOrUndefined(formValues.addressLine1) || toStringOrUndefined(formValues.address) || undefined,
        postalCode: toStringOrUndefined(formValues.postalCode),
        city: toStringOrUndefined(formValues.city),
        annualRevenue: toStringOrUndefined(formValues.annualRevenue),
        numberOfEmployeesRef: toStringOrUndefined(formValues.numberOfEmployees),
        currencyRef: toStringOrUndefined(formValues.currency),
        timeZoneRef: toStringOrUndefined(formValues.timeZone),
        foundationDate: toStringOrUndefined(formValues.foundationDate),
        tickerSymbol: toStringOrUndefined(formValues.tickerSymbol),
        sicCode: toStringOrUndefined(formValues.sicCode),
        ownerEmployee: toStringOrUndefined(formValues.owner),
        ownerOrganization: undefined, // Will be set by backend based on owner employee
      };

      // For updates, include the account ID and version
      if (isUpdate) {
        accountPayload.id = formValues.id;
        if (formValues.version !== undefined) {
          accountPayload.version = formValues.version;
        }
      }

      // Build addresses array if we have address data
      const addresses = [];
      const addressLine = toStringOrUndefined(formValues.addressLine1) || 
                         toStringOrUndefined(formValues.address) ||
                         [formValues.addressLine1, formValues.addressLine2, formValues.addressLine3, formValues.addressLine4]
                           .filter(line => toStringOrUndefined(line))
                           .join(', ') || '';

      if (addressLine || toStringOrUndefined(formValues.city) || toStringOrUndefined(formValues.postalCode)) {
        addresses.push({
          addressType: "BILLING_ADDRESS",
          addressLine: addressLine,
          postalCode: toStringOrUndefined(formValues.postalCode),
          city: toStringOrUndefined(formValues.city),
          regionRef: toStringOrUndefined(formValues.region),
          countryRef: toStringOrUndefined(formValues.country),
        });
      }

      accountPayload.addresses = addresses;

      // Initialize empty arrays for tags and communication channels
      accountPayload.tags = [];

      const payload = {
        account: accountPayload
      };
      
      // Log the payload for debugging
      console.log(`${isUpdate ? 'Updating' : 'Creating'} account with payload:`, payload);
      
      // Dispatch process continue event on successful submission
      dispatchProcessContinueEvent('pse_submit', payload);
    } catch (err) {
      console.error('Error submitting account form:', err);
    }
  };

  // Handle form cancellation
  const handleCancel = async () => {
    try {
      await onCancel();
      
      // Dispatch process continue event for cancellation (pause)
      dispatchProcessContinueEvent('pse_pause', null);
    } catch (err) {
      console.error('Error cancelling account form:', err);
    }
  };

  return (
    <div className="gba:h-full gba:flex gba:flex-col gba:max-w-md gba:mx-auto gba:p-6">
      
      <div className="gba:h-full gba:flex gba:flex-col" data-testid={formatDataTestId(prefixDataTestId, 'Form')}>
        {/* Form Fields Container - Takes up available space */}
        <div className="gba:flex-1 gba:overflow-y-auto gba:space-y-8">
          
          {/* Account Information Section */}
          <AccountInformationSection />

          {/* Company Information Section */}
          <CompanyInformationSection />

          {/* Contact Information Section */}
          <ContactInformationSection />

          {/* Address Information Section */}
          <AddressInformationSection />

          {/* Financial Information Section */}
          <FinancialInformationSection />

          {/* Error Display */}
          {error && (
            <div className="gba:bg-red-50 gba:border gba:border-red-200 gba:rounded-md gba:p-4">
              <div className="gba:text-red-800 gba:text-sm">
                {error}
              </div>
            </div>
          )}
        </div>

        {/* Submit and Cancel Buttons - Fixed at bottom */}
        <div className="gba:mt-6 gba:pt-4 gba:border-t gba:border-gray-200 gba:flex gba:gap-3">
          <Button
            variant="secondary"
            className="gba:flex-1"
            size="lg"
            onClick={handleCancel}
            data-testid={formatDataTestId(prefixDataTestId, 'CancelButton')}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            disabled={!isFormValid}
            className="gba:flex-1"
            size="lg"
            onClick={handleSubmit}
            data-testid={formatDataTestId(prefixDataTestId, 'SubmitButton')}
          >
            {isLoading && <Spinner size="sm" className="gba:mr-2" />}
            {formValues.id ? 'Update Account' : 'Create Account'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AccountFormComponent; 