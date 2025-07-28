'use client';

import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import { Card } from '@newwork/gravity-ui-catalog';
import { Employee } from '../../hooks/useEmployeeData';
import { formatPhoneNumber } from '../../utils/formatters';
import { useGetAcademicTitles } from '../../../../hooks/useGetAcademicTitles';
import { getTranslationFromI18nKeyAndLabel } from '../../../../../../../common/utils/windowUtils';
import useEmployeePermissions, { SECTION_KEYS } from '../../hooks/useEmployeePermissions';
import AppActionButton from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { PiPencilSimple } from 'react-icons/pi';
import { UserInfoProps } from '../../../../../../../common/BusinessAppContext';

interface DetailsTabProps {
  employee: Employee;
  accessToken: string;
  employeeId?: string; // Optional employeeId override for permissions check
  userInfo?: UserInfoProps; // Current user info
  isSelfView: boolean; // Whether user is viewing their own profile
}

/**
 * Details Tab Component
 * Displays detailed personal information about the employee
 */
const DetailsTab: React.FC<DetailsTabProps> = ({ employee, accessToken, employeeId, userInfo, isSelfView }) => {
  // Remove debug log
  // Use employee ID from props or fallback to employee data
  const employeeIdForPermissions = employeeId || employee?.id;
  
  // Check permissions for sections
  const { isSectionVisible } = useEmployeePermissions(employeeIdForPermissions, accessToken);
  // Fetch academic titles from catalog
  const { titles: academicTitles, loading: loadingTitles } = useGetAcademicTitles(accessToken);
  
  // Find the academic titles that match the employee's title references
  const academicTitleName = useMemo(() => {
    if (loadingTitles) {
      return '';
    }

    if (!employee.academicTitleRef || !Array.isArray(employee.academicTitleRef) || 
        employee.academicTitleRef.length === 0 || academicTitles.length === 0) {
      // Return the raw academicTitleRef if it's a string, or join them if it's an array
      return Array.isArray(employee.academicTitleRef) 
        ? employee.academicTitleRef.join(', ') 
        : (employee.academicTitleRef || '');
    }
    
    // Find all matching titles by ID in the academicTitles array
    const matchingTitles = employee.academicTitleRef.map(titleRef => {
      const match = academicTitles.find(
        (title) => title.id === titleRef || title.id.includes(titleRef)
      );
      return match ? match.value : titleRef;
    });
    
    // Join all titles with a comma
    return matchingTitles.join(', ');
  }, [employee.academicTitleRef, academicTitles, loadingTitles]);

  const personalData = [
    {
      label: "Salutation",
      value: employee.salutation?.value || ''
    },
    {
      label: "Academic Titles",
      value: academicTitleName || ''
    },
    {
      label: "First Name",
      value: employee.firstName || ''
    },
    {
      label: "Last Name",
      value: employee.lastName || ''
    },
    {
      label: "Preferred Name",
      value: employee.preferredName || ''
    },
    {
      label: "Birth Name",
      value: employee.birthName || '',
      sectionKey: SECTION_KEYS.details.personalInfoPrivate
    },
    {
      label: "Date of Birth",
      value: employee.birthDate ? dayjs(employee.birthDate).format('MMM D, YYYY') : '',
      sectionKey: SECTION_KEYS.details.personalInfoPrivate
    },
    {
      label: "Place of Birth",
      value: employee.birthPlace?.value || '',
      sectionKey: SECTION_KEYS.details.personalInfoPrivate
    },
    {
      label: "Nationality",
      value: employee.nationality?.value || '',
      sectionKey: SECTION_KEYS.details.personalInfoPrivate
    },
    {
      label: "Gender",
      value: employee.gender?.value || '',
      sectionKey: SECTION_KEYS.details.personalInfoPrivate
    },
    {
      label: "Marital Status",
      value: employee.maritalStatus?.value || '',
      sectionKey: SECTION_KEYS.details.personalInfoPrivate
    }
  ];

  // Prepare address data
  const getAddressData = () => {
    const primaryAddress = employee.addresses?.find(addr => addr.type === 'PRIMARY');
    
    return [
      {
        label: "Postal Code",
        value: primaryAddress?.postalCode || ''
      },
      {
        label: "City",
        value: primaryAddress?.locality || ''
      },
      {
        label: "Country",
        value: primaryAddress?.country?.value || ''
      },
      {
        label: "Address Line",
        value: primaryAddress?.addressLine?.filter(line => line?.trim())?.join(', ') || ''
      }
    ];
  };

  const addressData = getAddressData();

  // Prepare bank account data
  const getBankAccountData = () => {
    const primaryBankAccount = employee.bankAccounts?.[0];
    
    return [
      {
        label: "Bank Name",
        value: primaryBankAccount?.bankName || ''
      },
      {
        label: "Account Holder",
        value: primaryBankAccount?.accountHolder || ''
      },
      {
        label: "IBAN",
        value: primaryBankAccount?.iban || ''
      }
    ];
  };

  const bankAccountData = getBankAccountData();

  // Prepare private communication data
  const getPrivateCommunication = () => {
    const communications = employee.communication || [];
    const privateComms = communications.filter(
      comm => comm.purpose === 'PRIVATE'
    );

    const privatePhone = privateComms.find(comm => comm.channel.code === 'Phone');
    const privateMobile = privateComms.find(comm => comm.channel.code === 'Mobile');
    const privateEmail = privateComms.find(comm => comm.channel.code === 'e-mail');

    return [
      {
        label: "Private Phone",
        value: privatePhone?.value ? formatPhoneNumber(privatePhone.value) : ''
      },
      {
        label: "Private Mobile",
        value: privateMobile?.value ? formatPhoneNumber(privateMobile.value) : ''
      },
      {
        label: "Private Email",
        value: privateEmail?.value || ''
      }
    ];
  };

  const privateCommunicationData = getPrivateCommunication();

  // Prepare emergency contact data
  const getEmergencyContact = () => {
    const emergencyContact = employee.relationship?.find(rel => rel.isEmergencyContact);
    
    return [
      {
        label: "Contact Name",
        value: emergencyContact ? `${emergencyContact.firstName || ''} ${emergencyContact.lastName || ''}`.trim() || '' : ''
      },
      {
        label: "Phone Number",
        value: emergencyContact?.phoneNumber ? formatPhoneNumber(emergencyContact.phoneNumber) : ''
      }
    ];
  };

  const emergencyContactData = getEmergencyContact();

  // Payroll data has been moved to EmploymentTab

  // Helper function to mask value if user doesn't have permission
  const getMaskedValue = (value: string, sectionKey: string) => {
    // Return dash for empty values regardless of permissions
    if (!value || value.trim() === '') {
      return '-';
    }
    
    // If user is viewing their own profile, always show the data
    if (isSelfView) {
      return value;
    }
    
    // Special handling for personalInfoPrivate section
    if (sectionKey === SECTION_KEYS.details.personalInfoPrivate) {
      // Mask all personalInfoPrivate fields when viewing other profiles
      return '••••••••';
    }
    
    // For other sections, check permissions
    if (sectionKey && isSectionVisible('details', sectionKey)) {
      return value;
    }
    
   // If no permission, mask the value
   return '••••••••';
  };

  // Helper function to render data items in a grid with 3 columns
  const renderDataItems = (data: Array<{label: string; value: string; sectionKey?: string}>) => (
    <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-3 gba:mt-2">
      {data.map((item) => (
        <div 
          key={`${item.label}-${item.value}`} 
          className="gba:flex gba:flex-col gba:py-1 gba:px-2 gba:hover:bg-gray-50 gba:rounded-md gba:transition-colors"
          data-testid={`details-item-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <span className="gba:text-sm gba:text-gray-500 gba:mb-0.5">{item.label}</span>
          <span className="gba:font-medium gba:text-gray-800">{item.sectionKey ? getMaskedValue(item.value, item.sectionKey) : (item.value || '-')}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="gba:details-tab gba:space-y-6" data-testid="details-tab-container">
      {/* Details Overview Headline */}
      <div className="gba:details-header" data-testid="details-header">
        <div
          className="gba:font-bold gba:text-2xl"
          data-testid="details-title"
        >
          {getTranslationFromI18nKeyAndLabel(
            "lowcoder:hr_employee.details_overview",
            "Employee Details"
          )}
        </div>
        <div
          className="gba:text-gray-500 gba:text-lg gba:mb-4"
          data-testid="details-description"
        >
          {getTranslationFromI18nKeyAndLabel(
            "lowcoder:hr_employee.details_description",
            "View employee personal information"
          )}
        </div>
      </div>

      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-6" data-testid="details-cards">
        {/* Personal Data Card - Public info is always visible, private info requires permission */}
        <Card
          variant="outlined"
          className="gba:border gba:border-gray-200 gba:shadow-md gba:hover:shadow-lg gba:transition-all"
          data-testid="details-section-personal"
        >
          <div className="gba:mb-6 gba:border-b gba:border-gray-200 gba:pb-2 gba:flex gba:justify-between gba:items-center">
            <h3 className="gba:text-xl gba:font-semibold gba:text-blue-700">Personal Data</h3>
            {isSelfView && (
              <AppActionButton 
                data-testid="personal-data-action-button"
                variant="ghost"
                contextsArray={[FlowContextName.updateEmployeePersonalData]}
                externalContextData={{
                  employeeId: employee?.id,
                }}
                prefixDataTestId="personal-data-action"
                accessToken={accessToken}
                autoExecuteSingleAction={true}
                icon={<PiPencilSimple />}
              />
            )}
          </div>
          {/* Personal data with masking already applied in the data definition */}
          {renderDataItems(personalData)}
        </Card>

        {/* Address Card - Always visible but values may be masked */}
        <Card
          variant="outlined"
          className="gba:border gba:border-gray-200 gba:shadow-md gba:hover:shadow-lg gba:transition-all"
          data-testid="details-section-address"
        >
          <div className="gba:mb-6 gba:border-b gba:border-gray-200 gba:pb-2 gba:flex gba:justify-between gba:items-center">
            <h3 className="gba:text-xl gba:font-semibold gba:text-blue-700">Address</h3>
            {isSelfView && (
              <AppActionButton 
                data-testid="address-action-button"
                variant="ghost"
                contextsArray={[FlowContextName.updateEmployeeAddress]}
                externalContextData={{
                  employeeId: employee?.id,
                }}
                prefixDataTestId="address-action"
                accessToken={accessToken}
                autoExecuteSingleAction={true}
                icon={<PiPencilSimple />}
              />
            )}
          </div>
          {renderDataItems(addressData.map(item => ({...item, sectionKey: SECTION_KEYS.details.addressPublic})))}
        </Card>

        {/* Bank Account Card - Always visible but values may be masked */}
        <Card
          variant="outlined"
          className="gba:border gba:border-gray-200 gba:shadow-md gba:hover:shadow-lg gba:transition-all"
          data-testid="details-section-bank"
        >
          <div className="gba:mb-6 gba:border-b gba:border-gray-200 gba:pb-2 gba:flex gba:justify-between gba:items-center">
            <h3 className="gba:text-xl gba:font-semibold gba:text-blue-700">Bank Account</h3>
            {isSelfView && (
              <AppActionButton 
                data-testid="bank-account-action-button"
                variant="ghost"
                contextsArray={[FlowContextName.updateEmployeeBankAccount]}
                externalContextData={{
                  employeeId: employee?.id,
                }}
                prefixDataTestId="bank-account-action"
                accessToken={accessToken}
                autoExecuteSingleAction={true}
                icon={<PiPencilSimple />}
              />
            )}
          </div>
          {renderDataItems(bankAccountData.map(item => ({...item, sectionKey: SECTION_KEYS.details.bankAccount})))}
        </Card>

        {/* Private Communication Card - Always visible but values may be masked */}
        <Card
          variant="outlined"
          className="gba:border gba:border-gray-200 gba:shadow-md gba:hover:shadow-lg gba:transition-all"
          data-testid="details-section-communication"
        >
          <div className="gba:mb-6 gba:border-b gba:border-gray-200 gba:pb-2 gba:flex gba:justify-between gba:items-center">
            <h3 className="gba:text-xl gba:font-semibold gba:text-blue-700">Private Communication</h3>
            {isSelfView && (
              <AppActionButton 
                data-testid="private-communication-action-button"
                variant="ghost"
                contextsArray={[FlowContextName.updateEmployeeCommunication]}
                externalContextData={{
                  employeeId: employee?.id,
                }}
                prefixDataTestId="private-communication-action"
                accessToken={accessToken}
                autoExecuteSingleAction={true}
                icon={<PiPencilSimple />}
              />
            )}
          </div>
          {renderDataItems(privateCommunicationData.map(item => ({...item, sectionKey: SECTION_KEYS.details.contactInfoPrivate})))}
        </Card>

        {/* Emergency Contact Card - Always visible but values may be masked */}
        <Card
          variant="outlined"
          className="gba:border gba:border-gray-200 gba:shadow-md gba:hover:shadow-lg gba:transition-all"
          data-testid="details-section-emergency"
        >
          <div className="gba:mb-6 gba:border-b gba:border-gray-200 gba:pb-2">
            <h3 className="gba:text-xl gba:font-semibold gba:text-blue-700">Emergency Contact</h3>
          </div>
          {renderDataItems(emergencyContactData.map(item => ({...item, sectionKey: SECTION_KEYS.details.relationships})))}
        </Card>

        {/* Payroll Data Card has been moved to EmploymentTab */}
      </div>
    </div>
  );
};

export default DetailsTab;
