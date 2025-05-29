'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { Employee } from '../../hooks/useEmployeeData';
import { formatPhoneNumber } from '../../utils/formatters';
import { ProfileSection } from '../ProfileSection';

interface DetailsTabProps {
  employee: Employee;
}

/**
 * Details Tab Component
 * Displays detailed personal information about the employee
 */
const DetailsTab: React.FC<DetailsTabProps> = ({ employee }) => {
  const { t } = useTranslation('lowcoder');

  // Prepare personal data
  const personalData = [
    {
      label: t('employee_profile.details_layout.personal_information_container.salutation'),
      value: employee.salutation?.value ?? ''
    },
    {
      label: t('employee_profile.details_layout.personal_information_container.academic_titles'),
      value: employee.academicTitleRef ?? ''
    },
    {
      label: t('employee_profile.details_layout.personal_information_container.first_name'),
      value: employee.firstName ?? ''
    },
    {
      label: t('employee_profile.details_layout.personal_information_container.last_name'),
      value: employee.lastName ?? ''
    },
    {
      label: t('employee_profile.details_layout.personal_information_container.preferred_name'),
      value: employee.preferredName ?? ''
    },
    {
      label: t('employee_profile.details_layout.personal_information_container.birth_name'),
      value: employee.birthName ?? ''
    },
    {
      label: t('employee_profile.details_layout.personal_information_container.date_of_birth'),
      value: employee.birthDate ? dayjs(employee.birthDate).format('MMM D, YYYY') : ''
    },
    {
      label: t('employee_profile.details_layout.personal_information_container.place_of_birth'),
      value: employee.birthPlace ?? ''
    },
    {
      label: t('employee_profile.details_layout.personal_information_container.nationality'),
      value: employee.nationality?.value ?? ''
    },
    {
      label: t('employee_profile.details_layout.personal_information_container.gender'),
      value: employee.gender?.value ?? ''
    },
    {
      label: t('employee_profile.details_layout.personal_information_container.marital_status'),
      value: employee.maritalStatus?.value ?? ''
    }
  ].filter(item => item.value);

  // Prepare address data
  const getAddressData = () => {
    const primaryAddress = employee.addresses?.find(addr => addr.type === 'PRIMARY');
    if (!primaryAddress) return [];

    return [
      {
        label: t('employee_profile.details_layout.address_container.postal_code'),
        value: primaryAddress.postalCode ?? ''
      },
      {
        label: t('employee_profile.details_layout.address_container.city'),
        value: primaryAddress.locality ?? ''
      },
      {
        label: t('employee_profile.details_layout.address_container.country'),
        value: primaryAddress.country?.value ?? ''
      },
      {
        label: t('employee_profile.details_layout.address_container.address_line'),
        value: primaryAddress.addressLine?.join(', ') ?? ''
      }
    ].filter(item => item.value);
  };

  const addressData = getAddressData();

  // Prepare bank account data
  const getBankAccountData = () => {
    const primaryBankAccount = employee.bankAccounts?.[0];
    if (!primaryBankAccount) return [];

    return [
      {
        label: t('employee_profile.details_layout.address_container.bank_name'),
        value: primaryBankAccount.bankName ?? ''
      },
      {
        label: t('employee_profile.details_layout.address_container.account_holder'),
        value: primaryBankAccount.accountHolder ?? ''
      },
      {
        label: t('employee_profile.details_layout.address_container.iban'),
        value: primaryBankAccount.iban ?? ''
      }
    ].filter(item => item.value);
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
        label: t('employee_profile.details_layout.communication_container.private_phone'),
        value: privatePhone?.value ? formatPhoneNumber(privatePhone.value) : ''
      },
      {
        label: t('employee_profile.details_layout.communication_container.private_mobile'),
        value: privateMobile?.value ? formatPhoneNumber(privateMobile.value) : ''
      },
      {
        label: t('employee_profile.details_layout.communication_container.private_email'),
        value: privateEmail?.value ?? ''
      }
    ].filter(item => item.value);
  };

  const privateCommunicationData = getPrivateCommunication();

  // Prepare emergency contact data
  const getEmergencyContact = () => {
    const emergencyContact = employee.relationship?.find(rel => rel.isEmergencyContact);
    if (!emergencyContact) return [];

    return [
      {
        label: t('employee_profile.details_layout.communication_container.contact_name'),
        value: `${emergencyContact.firstName ?? ''} ${emergencyContact.lastName ?? ''}`
      },
      {
        label: t('employee_profile.details_layout.communication_container.phone_number'),
        value: emergencyContact.phoneNumber ? formatPhoneNumber(emergencyContact.phoneNumber) : ''
      }
    ].filter(item => item.value);
  };

  const emergencyContactData = getEmergencyContact();

  // Prepare payroll data
  const getPayrollData = () => {
    const taxDetails = employee.taxDetails?.[0];
    if (!taxDetails) return [];

    return [
      {
        label: t('employee_profile.details_layout.payroll_container.tax_class'),
        value: taxDetails.taxBracketRef ?? ''
      },
      {
        label: t('employee_profile.details_layout.payroll_container.social_insurance_no'),
        value: taxDetails.socialSecurityNumber ?? ''
      },
      {
        label: t('employee_profile.details_layout.payroll_container.tax_identification_no'),
        value: taxDetails.taxIdentificationNumber ?? ''
      },
      {
        label: t('employee_profile.details_layout.payroll_container.health_insurance_provider'),
        value: taxDetails.healthInsuranceName ?? ''
      },
      {
        label: t('employee_profile.details_layout.payroll_container.confession'),
        value: taxDetails.taxableChurchAffiliationRef ?? ''
      },
      {
        label: t('employee_profile.details_layout.payroll_container.type_of_health_insurance'),
        value: taxDetails.healthInsuranceTypeRef ?? ''
      },
      {
        label: t('employee_profile.details_layout.payroll_container.child_tax_allowance'),
        value: taxDetails.childTaxAllowance?.toString() ?? ''
      }
    ].filter(item => item.value);
  };

  const payrollData = getPayrollData();

  return (
    <div className="details-tab space-y-6">
      {/* Personal Data Section */}
      <ProfileSection 
        title={t('employee_profile.summary_layout.public_profile_container.personal_data_title')}
        data={personalData}
        columns={2}
      />

      {/* Address Section */}
      {addressData.length > 0 && (
        <ProfileSection 
          title={t('employee_profile.details_layout.address_container.address_text')}
          data={addressData}
          columns={1}
        />
      )}

      {/* Bank Account Section */}
      {bankAccountData.length > 0 && (
        <ProfileSection 
          title={t('employee_profile.details_layout.address_container.bank_account_text')}
          data={bankAccountData}
          columns={1}
        />
      )}

      {/* Private Communication Section */}
      {privateCommunicationData.length > 0 && (
        <ProfileSection 
          title={t('employee_profile.details_layout.communication_container.communication_text')}
          data={privateCommunicationData}
          columns={1}
        />
      )}

      {/* Emergency Contact Section */}
      {emergencyContactData.length > 0 && (
        <ProfileSection 
          title={t('employee_profile.details_layout.communication_container.emergency_contact')}
          data={emergencyContactData}
          columns={1}
        />
      )}

      {/* Payroll Data Section */}
      {payrollData.length > 0 && (
        <ProfileSection 
          title={t('employee_profile:details.payroll.title')}
          data={payrollData}
          columns={2}
        />
      )}
    </div>
  );
};

export default DetailsTab;
