'use client';

import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import { Employee } from '../../hooks/useEmployeeData';
import { formatPhoneNumber } from '../../utils/formatters';
import { ProfileSection } from '../ProfileSection';
import { useGetAcademicTitles } from '../../../../hooks/useGetAcademicTitles';

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

  return (
    <div className="gba:details-tab gba:space-y-6">
      {/* Personal Data Section */}
      <ProfileSection 
        title="Personal Data"
        data={personalData}
        columns={2}
      />

      {/* Address Section */}
      <ProfileSection 
        title="Address"
        data={addressData}
        columns={1}
      />

      {/* Bank Account Section */}
      <ProfileSection 
        title="Bank Account"
        data={bankAccountData}
        columns={1}
      />

      {/* Private Communication Section */}
      <ProfileSection 
        title="Private Communication"
        data={privateCommunicationData}
        columns={1}
      />

      {/* Emergency Contact Section */}
      <ProfileSection 
        title="Emergency Contact"
        data={emergencyContactData}
        columns={1}
      />

      {/* Payroll Data Section */}
      <ProfileSection 
        title="Payroll"
        data={payrollData}
        columns={2}
      />
    </div>
  );
};

export default DetailsTab;
