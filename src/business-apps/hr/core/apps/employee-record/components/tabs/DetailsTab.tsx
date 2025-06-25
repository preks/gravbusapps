'use client';

import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import { Card } from '@newwork/gravity-ui-catalog';
import { Employee } from '../../hooks/useEmployeeData';
import { formatPhoneNumber } from '../../utils/formatters';
import { useGetAcademicTitles } from '../../../../hooks/useGetAcademicTitles';
import { getTranslationFromI18nKeyAndLabel } from '../../../../../../../common/utils/windowUtils';

interface DetailsTabProps {
  employee: Employee;
  accessToken: string;
}

/**
 * Details Tab Component
 * Displays detailed personal information about the employee
 */
const DetailsTab: React.FC<DetailsTabProps> = ({ employee, accessToken }) => {
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

  // Prepare personal data
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
      value: employee.birthName || ''
    },
    {
      label: "Date of Birth",
      value: employee.birthDate ? dayjs(employee.birthDate).format('MMM D, YYYY') : ''
    },
    {
      label: "Place of Birth",
      value: employee.birthPlace?.value || ''
    },
    {
      label: "Nationality",
      value: employee.nationality?.value || ''
    },
    {
      label: "Gender",
      value: employee.gender?.value || ''
    },
    {
      label: "Marital Status",
      value: employee.maritalStatus?.value || ''
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

  // Prepare payroll data
  const getPayrollData = () => {
    const taxDetails = employee.taxDetails?.[0];
    
    return [
      {
        label: "Tax Class",
        value: taxDetails?.taxBracketRef || ''
      },
      {
        label: "Social Insurance No.",
        value: taxDetails?.socialSecurityNumber || ''
      },
      {
        label: "Tax Identification No.",
        value: taxDetails?.taxIdentificationNumber || ''
      },
      {
        label: "Health Insurance Provider",
        value: taxDetails?.healthInsuranceName || ''
      },
      {
        label: "Confession",
        value: taxDetails?.taxableChurchAffiliationRef || ''
      },
      {
        label: "Type of Health Insurance",
        value: taxDetails?.healthInsuranceTypeRef || ''
      },
      {
        label: "Child Tax Allowance",
        value: taxDetails?.childTaxAllowance?.toString() || ''
      }
    ];
  };

  const payrollData = getPayrollData();

  // Helper function to render data items in a grid with 3 columns
  const renderDataItems = (data: Array<{label: string; value: string}>) => (
    <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-3 gba:mt-2">
      {data.map((item) => (
        <div 
          key={`${item.label}-${item.value}`} 
          className="gba:flex gba:flex-col gba:py-1 gba:px-2 gba:hover:bg-gray-50 gba:rounded-md gba:transition-colors"
          data-testid={`details-item-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <span className="gba:text-sm gba:text-gray-500 gba:mb-0.5">{item.label}</span>
          <span className="gba:font-medium gba:text-gray-800">{item.value || '-'}</span>
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
            "Details Overview"
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

      <div className="gba:grid gba:grid-cols-1 gba:gap-6" data-testid="details-cards">
        {/* Personal Data Card */}
        <Card
          variant="outlined"
          className="gba:shadow-sm gba:hover:shadow-md gba:transition-all"
          data-testid="details-section-personal"
        >
          <div className="gba:mb-6 gba:border-b gba:border-gray-200 gba:pb-2">
            <h3 className="gba:text-xl gba:font-semibold gba:text-blue-700">Personal Data</h3>
          </div>
          {renderDataItems(personalData)}
        </Card>

        {/* Address Card */}
        <Card
          variant="outlined"
          className="gba:shadow-sm gba:hover:shadow-md gba:transition-all"
          data-testid="details-section-address"
        >
          <div className="gba:mb-6 gba:border-b gba:border-gray-200 gba:pb-2">
            <h3 className="gba:text-xl gba:font-semibold gba:text-blue-700">Address</h3>
          </div>
          {renderDataItems(addressData)}
        </Card>

        {/* Bank Account Card */}
        <Card
          variant="outlined"
          className="gba:shadow-sm gba:hover:shadow-md gba:transition-all"
          data-testid="details-section-bank"
        >
          <div className="gba:mb-6 gba:border-b gba:border-gray-200 gba:pb-2">
            <h3 className="gba:text-xl gba:font-semibold gba:text-blue-700">Bank Account</h3>
          </div>
          {renderDataItems(bankAccountData)}
        </Card>

        {/* Private Communication Card */}
        <Card
          variant="outlined"
          className="gba:shadow-sm gba:hover:shadow-md gba:transition-all"
          data-testid="details-section-communication"
        >
          <div className="gba:mb-6 gba:border-b gba:border-gray-200 gba:pb-2">
            <h3 className="gba:text-xl gba:font-semibold gba:text-blue-700">Private Communication</h3>
          </div>
          {renderDataItems(privateCommunicationData)}
        </Card>

        {/* Emergency Contact Card */}
        <Card
          variant="outlined"
          className="gba:shadow-sm gba:hover:shadow-md gba:transition-all"
          data-testid="details-section-emergency"
        >
          <div className="gba:mb-6 gba:border-b gba:border-gray-200 gba:pb-2">
            <h3 className="gba:text-xl gba:font-semibold gba:text-blue-700">Emergency Contact</h3>
          </div>
          {renderDataItems(emergencyContactData)}
        </Card>

        {/* Payroll Data Card */}
        <Card
          variant="outlined"
          className="gba:shadow-sm gba:hover:shadow-md gba:transition-all"
          data-testid="details-section-payroll"
        >
          <div className="gba:mb-6 gba:border-b gba:border-gray-200 gba:pb-2">
            <h3 className="gba:text-xl gba:font-semibold gba:text-blue-700">Payroll</h3>
          </div>
          {renderDataItems(payrollData)}
        </Card>
      </div>
    </div>
  );
};

export default DetailsTab;
