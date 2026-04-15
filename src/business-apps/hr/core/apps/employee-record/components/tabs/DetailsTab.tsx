'use client'

import React from 'react'
import dayjs from 'dayjs'
import { Card, CardContent, useTranslation } from '@newwork/nw-design-system'
import { Employee } from '../../hooks/useEmployeeData'
import { formatPhoneNumberWithCountryCode, getTranslatedValue } from '../../utils/formatters'
import useEmployeePermissions, { SECTION_KEYS } from '../../hooks/useEmployeePermissions'
import translations from '../../_i18n'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { ScopePermissionCheckResult } from '@/common/hooks/useScopePermissionCheck'
import CommunicationCard from './components/CommunicationCard'

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
          <span className="gba:text-xs gba:text-muted-foreground gba:mb-0.5">{item.label}</span>
          <span className="gba:font-medium gba:text-sm gba:text-foreground">
            {item.sectionKey ? getMaskedValue(item.value, item.sectionKey) : item.value || '-'}
          </span>
          {item.secondary ? (
            <span className="gba:font-medium gba:text-sm gba:text-foreground gba:mt-1">
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
        <Card data-testid="details-section-personal">
          <CardContent className="gba:p-4">
            <div className="gba:mb-6 gba:border-b gba:border-border gba:pb-2 gba:flex gba:justify-between gba:items-center">
              <h3 className="gba:text-lg gba:font-semibold">{t('details-personal-data')}</h3>
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
          </CardContent>
        </Card>

        {/* Address Card - Always visible but values may be masked */}
        <Card data-testid="details-section-address">
          <CardContent className="gba:p-4">
            <div className="gba:mb-6 gba:border-b gba:border-border gba:pb-2 gba:flex gba:justify-between gba:items-center">
              <h3 className="gba:text-lg gba:font-semibold">{t('details-address')}</h3>
              <AppAction
                variant="update-secondary"
                data-testid="employee-address-action-button"
                contexts={[
                  { context: FlowContextName.updateEmployeeAddress, contextData: { employeeId: employee?.id } }
                ]}
                prefixDataTestId="employee-address-action"
                accessToken={accessToken}
                autoExecute={true}
              />
            </div>
            {renderDataItems(addressData.map(item => ({ ...item, sectionKey: SECTION_KEYS.details.addressPublic })))}
          </CardContent>
        </Card>

        {/* Bank Account Card - Always visible but values may be masked */}
        <Card data-testid="details-section-bank">
          <CardContent className="gba:p-4">
            <div className="gba:mb-6 gba:border-b gba:border-border gba:pb-2 gba:flex gba:justify-between gba:items-center">
              <h3 className="gba:text-lg gba:font-semibold">{t('details-bank-account')}</h3>
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
          </CardContent>
        </Card>

        {/* Emergency Contact Card - Always visible but values may be masked */}
        <Card data-testid="details-section-emergency">
          <CardContent className="gba:p-4">
            <div className="gba:mb-6 gba:border-b gba:border-border gba:pb-2 gba:flex gba:justify-between gba:items-center">
              <h3 className="gba:text-lg gba:font-semibold">{t('details-emergency-contact')}</h3>
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
                emergencyContactData.map(items => (
                  <div key={`emergency-contact-${items.map(item => `${item.label}-${item.value}`).join('|')}`}>
                    {renderDataItems(items.map(item => ({ ...item, sectionKey: SECTION_KEYS.details.relationships })))}
                  </div>
                ))
              ) : (
                <div className="gba:text-muted-foreground gba:text-sm gba:py-4">
                  {t('details-no-emergency-contact')}
                </div>
              )}
            </div>
          </CardContent>
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
            <Card data-testid="details-section-additional-attributes">
              <CardContent className="gba:p-4">
                <div className="gba:mb-6 gba:border-b gba:border-border gba:pb-2 gba:flex gba:justify-between gba:items-center">
                  <h3 className="gba:text-lg gba:font-semibold">{t('details-additional-attributes')}</h3>
                  <AppAction
                    variant="update-secondary"
                    data-testid="additional-attributes-action-button"
                    contexts={[
                      {
                        context: FlowContextName.employeeAdditionalProperties,
                        contextData: { employeeId: employee?.id }
                      }
                    ]}
                    prefixDataTestId="additional-attributes-action"
                    accessToken={accessToken}
                    autoExecute={true}
                  />
                </div>
                {renderDataItems(items)}
              </CardContent>
            </Card>
          )
        })()}

        <CommunicationCard
          employee={employee}
          accessToken={accessToken}
          isSelfView={isSelfView}
          employeeRecordHrBackoffice={employeeRecordHrBackoffice}
        />

        {/* Payroll Data Card has been moved to EmploymentTab */}
      </div>
    </div>
  )
}

export default DetailsTab
