'use client'

import React from 'react'
import dayjs from 'dayjs'
import { Card } from '@newwork/gravity-ui-catalog'
import { Employee } from '../../hooks/useEmployeeData'
import { formatPhoneNumberWithCountryCode, getTranslatedValue } from '../../utils/formatters'
import useEmployeePermissions, { SECTION_KEYS } from '../../hooks/useEmployeePermissions'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../../_i18n'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { ScopePermissionCheckResult } from '@/common/hooks/useScopePermissionCheck'

interface DetailsTabProps {
  employee: Employee
  accessToken: string
  employeeId?: string // Optional employeeId override for permissions check
  isSelfView: boolean // Whether user is viewing their own profile
  employeeRecordHrBackoffice: ScopePermissionCheckResult
}

/**
 * Details Tab Component
 * Displays detailed personal information about the employee
 */
const DetailsTab: React.FC<DetailsTabProps> = ({
  employee,
  accessToken,
  employeeId,
  isSelfView,
  employeeRecordHrBackoffice
}) => {
  const { t } = useTranslation(translations)
  // Remove debug log
  // Use employee ID from props or fallback to employee data
  const employeeIdForPermissions = employeeId || employee?.id

  // Check permissions for sections
  const { isSectionVisible } = useEmployeePermissions(employeeIdForPermissions, accessToken)

  const personalData = [
    {
      label: t('details-label-salutation'),
      value: employee.salutation?.translations?.[0]?.value || employee.salutation?.value || ''
    },
    {
      label: t('details-label-academic-titles'),
      value: employee.academicTitleRef || ''
    },
    {
      label: t('details-label-first-name'),
      value: employee.firstName || ''
    },
    {
      label: t('details-label-last-name'),
      value: employee.lastName || ''
    },
    {
      label: t('details-label-preferred-name'),
      value: employee.preferredName || ''
    },
    {
      label: t('details-label-birth-name'),
      value: employee.birthName || '',
      sectionKey: SECTION_KEYS.details.personalInfoPrivate
    },
    {
      label: t('details-label-date-of-birth'),
      value: employee.birthDate ? dayjs(employee.birthDate).format('MMM D, YYYY') : '',
      sectionKey: SECTION_KEYS.details.personalInfoPrivate
    },
    {
      label: t('details-label-place-of-birth'),
      value: employee.birthPlace || '',
      sectionKey: SECTION_KEYS.details.personalInfoPrivate
    },
    {
      label: t('details-label-nationality'),
      value: getTranslatedValue(employee.nationality),
      sectionKey: SECTION_KEYS.details.personalInfoPrivate
    },
    {
      label: t('details-label-gender'),
      value: getTranslatedValue(employee.gender),
      sectionKey: SECTION_KEYS.details.personalInfoPrivate
    },
    {
      label: t('details-label-marital-status'),
      value: getTranslatedValue(employee.maritalStatus),
      sectionKey: SECTION_KEYS.details.personalInfoPrivate
    }
  ]

  // Prepare address data
  const getAddressData = () => {
    const primaryAddress = employee.addresses?.find(addr => addr.type === 'PRIMARY')

    return [
      {
        label: t('details-label-postal-code'),
        value: primaryAddress?.postalCode || ''
      },
      {
        label: t('details-label-city'),
        value: primaryAddress?.locality || ''
      },
      {
        label: t('details-label-country'),
        value: primaryAddress?.country?.value || ''
      },
      {
        label: t('details-label-address-line'),
        value: primaryAddress?.addressLine?.filter(line => line?.trim())?.join(', ') || ''
      }
    ]
  }

  const addressData = getAddressData()

  // Prepare bank account data
  const getBankAccountData = () => {
    const primaryBankAccount = employee.bankAccounts?.[0]

    return [
      {
        label: t('details-label-bank-name'),
        value: primaryBankAccount?.bankName || ''
      },
      {
        label: t('details-label-account-holder'),
        value: primaryBankAccount?.accountHolder || ''
      },
      {
        label: t('details-label-iban'),
        value: primaryBankAccount?.iban || ''
      }
    ]
  }

  const bankAccountData = getBankAccountData()

  // Prepare private communication data
  const getPrivateCommunication = () => {
    // Safely extract private communication; it may be empty
    const communications = employee.communication || []
    const privateComms = communications.filter(comm => comm?.purpose === 'PRIVATE')

    // Helper: pick latest by channel code and type (Primary/Secondary)
    const lastByCodeAndType = (code: string, typeLabel: 'Primary' | 'Secondary') => {
      for (let i = privateComms.length - 1; i >= 0; i--) {
        const comm = privateComms[i]
        if (comm?.channel?.code === code && comm?.type?.value === typeLabel) {
          return comm
        }
      }
      return undefined
    }

    const primaryPhone = lastByCodeAndType('Phone', 'Primary')
    const secondaryPhone = lastByCodeAndType('Phone', 'Secondary')
    const primaryMobile = lastByCodeAndType('Mobile', 'Primary')
    const secondaryMobile = lastByCodeAndType('Mobile', 'Secondary')
    const primaryEmail = lastByCodeAndType('e-mail', 'Primary')
    const secondaryEmail = lastByCodeAndType('e-mail', 'Secondary')

    const formatOrEmpty = (val?: string) => (val && val.trim() !== '' ? val : '')

    return [
      {
        label: t('details-label-private-phone'),
        value: primaryPhone?.value ? formatPhoneNumberWithCountryCode(primaryPhone.value) : '',
        secondary: secondaryPhone?.value ? formatPhoneNumberWithCountryCode(secondaryPhone.value) : undefined
      },
      {
        label: t('details-label-private-mobile'),
        value: primaryMobile?.value ? formatPhoneNumberWithCountryCode(primaryMobile.value) : '',
        secondary: secondaryMobile?.value ? formatPhoneNumberWithCountryCode(secondaryMobile.value) : undefined
      },
      {
        label: t('details-label-private-email'),
        value: formatOrEmpty(primaryEmail?.value),
        secondary: formatOrEmpty(secondaryEmail?.value) || undefined
      }
    ]
  }

  const privateCommunicationData = getPrivateCommunication()

  // Prepare emergency contact data

  const getEmergencyContact = () => {
    const emergencyContacts = employee.relationship?.filter(rel => rel.isEmergencyContact) || []

    return emergencyContacts.map(contact => [
      {
        label: t('details-label-contact-name'),
        value: `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || ''
      },
      {
        label: t('details-label-phone-number'),
        value: contact?.phoneNumber ? formatPhoneNumberWithCountryCode(contact.phoneNumber) : ''
      }
    ])
  }

  const emergencyContactData = getEmergencyContact()

  // Payroll data has been moved to EmploymentTab

  // Helper function to mask value if user doesn't have permission
  const getMaskedValue = (value: string, sectionKey: string) => {
    // Return dash for empty values regardless of permissions
    if (!value || value.trim() === '') {
      return '-'
    }

    // If user is viewing their own profile, always show the data
    if (isSelfView) {
      return value
    }

    // If viewer belongs to backoffice groups, do not mask
    if (employeeRecordHrBackoffice.hasPermission) {
      return value
    }

    // Special handling for personalInfoPrivate section
    if (sectionKey === SECTION_KEYS.details.personalInfoPrivate) {
      // Mask all personalInfoPrivate fields when viewing other profiles
      return '••••••••'
    }

    // For other sections, check permissions
    if (sectionKey && isSectionVisible('details', sectionKey)) {
      return value
    }

    // If no permission, mask the value
    return '••••••••'
  }

  // Helper function to render data items in a grid with 3 columns
  const renderDataItems = (data: Array<{ label: string; value: string; secondary?: string; sectionKey?: string }>) => (
    <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-3 gba:mt-2">
      {data.map(item => (
        <div
          key={`${item.label}-${item.value}`}
          className="gba:flex gba:flex-col gba:py-1 gba:px-2 gba:hover:bg-muted gba:rounded-md gba:transition-colors"
          data-testid={`details-item-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <span className="gba:text-sm gba:text-muted-foreground gba:mb-0.5">{item.label}</span>
          <span className="gba:font-medium gba:text-foreground">
            {item.sectionKey ? getMaskedValue(item.value, item.sectionKey) : item.value || '-'}
          </span>
          {item.secondary ? (
            <span className="gba:font-medium gba:text-foreground gba:mt-1">
              {item.sectionKey ? getMaskedValue(item.secondary, item.sectionKey) : item.secondary}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  )

  return (
    <div className="gba:details-tab gba:space-y-6" data-testid="details-tab-container">
      {/* Details Overview Headline */}
      <div className="gba:details-header" data-testid="details-header">
        <div className="gba:font-bold gba:text-2xl" data-testid="details-title">
          {t('details-overview')}
        </div>
        <div className="gba:text-muted-foreground gba:text-lg gba:mb-4" data-testid="details-description">
          {t('details-description')}
        </div>
      </div>

      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-6" data-testid="details-cards">
        {/* Personal Data Card - Public info is always visible, private info requires permission */}
        <Card
          variant="outlined"
          className="gba:border gba:border-border gba:shadow-md gba:hover:shadow-lg gba:transition-all"
          data-testid="details-section-personal"
        >
          <div className="gba:mb-6 gba:border-b gba:border-border gba:pb-2 gba:flex gba:justify-between gba:items-center">
            <h3 className="gba:text-xl gba:font-semibold gba:text-info">{t('details-personal-data')}</h3>
            <AppAction
              variant="update-secondary"
              data-testid="personal-data-action-button"
              contexts={[
                { context: FlowContextName.updateEmployeePersonalData, contextData: { employeeId: employee?.id } }
              ]}
              prefixDataTestId="personal-data-action"
              accessToken={accessToken}
              autoExecute={true}
            />
          </div>
          {/* Personal data with masking already applied in the data definition */}
          {renderDataItems(personalData)}
        </Card>

        {/* Address Card - Always visible but values may be masked */}
        <Card
          variant="outlined"
          className="gba:border gba:border-border gba:shadow-md gba:hover:shadow-lg gba:transition-all"
          data-testid="details-section-address"
        >
          <div className="gba:mb-6 gba:border-b gba:border-border gba:pb-2 gba:flex gba:justify-between gba:items-center">
            <h3 className="gba:text-xl gba:font-semibold gba:text-info">{t('details-address')}</h3>
            <AppAction
              variant="update-secondary"
              data-testid="employee-address-action-button"
              contexts={[{ context: FlowContextName.updateEmployeeAddress, contextData: { employeeId: employee?.id } }]}
              prefixDataTestId="employee-address-action"
              accessToken={accessToken}
              autoExecute={true}
            />
          </div>
          {renderDataItems(addressData.map(item => ({ ...item, sectionKey: SECTION_KEYS.details.addressPublic })))}
        </Card>

        {/* Bank Account Card - Always visible but values may be masked */}
        <Card
          variant="outlined"
          className="gba:border gba:border-border gba:shadow-md gba:hover:shadow-lg gba:transition-all"
          data-testid="details-section-bank"
        >
          <div className="gba:mb-6 gba:border-b gba:border-border gba:pb-2 gba:flex gba:justify-between gba:items-center">
            <h3 className="gba:text-xl gba:font-semibold gba:text-info">{t('details-bank-account')}</h3>
            <AppAction
              variant="update-secondary"
              data-testid="bank-account-action-button"
              contexts={[
                { context: FlowContextName.updateEmployeeBankAccount, contextData: { employeeId: employee?.id } }
              ]}
              prefixDataTestId="bank-account-action"
              accessToken={accessToken}
              autoExecute={true}
            />
          </div>
          {renderDataItems(bankAccountData.map(item => ({ ...item, sectionKey: SECTION_KEYS.details.bankAccount })))}
        </Card>

        {/* Private Communication Card - Always visible but values may be masked */}
        <Card
          variant="outlined"
          className="gba:border gba:border-border gba:shadow-md gba:hover:shadow-lg gba:transition-all"
          data-testid="details-section-communication"
        >
          <div className="gba:mb-6 gba:border-b gba:border-border gba:pb-2 gba:flex gba:justify-between gba:items-center">
            <h3 className="gba:text-xl gba:font-semibold gba:text-info">{t('details-private-communication')}</h3>
            <AppAction
              variant="update-secondary"
              data-testid="private-communication-action-button"
              contexts={[
                { context: FlowContextName.updateEmployeeCommunication, contextData: { employeeId: employee?.id } }
              ]}
              prefixDataTestId="private-communication-action"
              accessToken={accessToken}
              autoExecute={true}
            />
          </div>
          {renderDataItems(
            privateCommunicationData.map(item => ({ ...item, sectionKey: SECTION_KEYS.details.contactInfoPrivate }))
          )}
        </Card>

        {/* Emergency Contact Card - Always visible but values may be masked */}
        <Card
          variant="outlined"
          className="gba:border gba:border-border gba:shadow-md gba:hover:shadow-lg gba:transition-all"
          data-testid="details-section-emergency"
        >
          <div className="gba:mb-6 gba:border-b gba:border-border gba:pb-2 gba:flex gba:justify-between gba:items-center">
            <h3 className="gba:text-xl gba:font-semibold gba:text-info">{t('details-emergency-contact')}</h3>
            <AppAction
              variant="update-secondary"
              data-testid="emergency-contact-action-button"
              contexts={[
                { context: FlowContextName.updateEmployeeRelationship, contextData: { employeeId: employee?.id } }
              ]}
              prefixDataTestId="emergency-contact-action"
              accessToken={accessToken}
              autoExecute={true}
            />
          </div>
          <div className="gba:flex gba:flex-col gba:gap-2">
            {emergencyContactData && emergencyContactData.length > 0 ? (
              emergencyContactData.map((items, idx) => (
                <div key={`emergency-contact-${idx}`}>
                  {renderDataItems(items.map(item => ({ ...item, sectionKey: SECTION_KEYS.details.relationships })))}
                </div>
              ))
            ) : (
              <div className="gba:text-muted-foreground gba:text-sm gba:py-4">{t('details-no-emergency-contact')}</div>
            )}
          </div>
        </Card>

        {/* Additional Attributes - moved from Summary tab */}
        {(() => {
          const props = employee?.additionalProperties || {}
          const items = Object.entries(props)
            .filter(([key]) => key !== 'imported' && key !== 'SAPNumber')
            .map(([key, value]) => ({
              label: key.charAt(0).toUpperCase() + key.slice(1),
              value: value === null || value === undefined ? '' : String(value)
            }))
          if (items.length === 0) return null
          return (
            <Card
              variant="outlined"
              className="gba:border gba:border-border gba:shadow-md gba:hover:shadow-lg gba:transition-all"
              data-testid="details-section-additional-attributes"
            >
              <div className="gba:mb-6 gba:border-b gba:border-border gba:pb-2 gba:flex gba:justify-between gba:items-center">
                <h3 className="gba:text-xl gba:font-semibold gba:text-info">{t('details-additional-attributes')}</h3>
                <AppAction
                  variant="update-secondary"
                  data-testid="additional-attributes-action-button"
                  contexts={[
                    { context: FlowContextName.employeeAdditionalProperties, contextData: { employeeId: employee?.id } }
                  ]}
                  prefixDataTestId="additional-attributes-action"
                  accessToken={accessToken}
                  autoExecute={true}
                />
              </div>
              {renderDataItems(items)}
            </Card>
          )
        })()}

        {/* Payroll Data Card has been moved to EmploymentTab */}
      </div>
    </div>
  )
}

export default DetailsTab
