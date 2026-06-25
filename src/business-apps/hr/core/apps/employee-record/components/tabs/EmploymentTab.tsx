'use client'

import React from 'react'
import dayjs from 'dayjs'
import {
  Button,
  Card,
  CardContent,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { WarningIcon } from '@phosphor-icons/react'
import { Employee } from '../../hooks/useEmployeeData'
import { AppAction } from '@/components/app-action/AppAction'
import translations from '../../_i18n'
import { FlowContextName, type FlowItemReduced } from '@/common/types/FlowRegistryTypes'
import { useFlowRegistryClient } from '@/common/network/flows/useFlowRegistryClient'
import { startProcess } from '@/common/utils/start-process'
import { UserInfoProps } from '../../../../../../../common/BusinessAppContext'
import { formatDate, formatNumberFunction, getCatalogValue } from '../../../../../../../common/utils/windowUtils'
import { parseLocalizedNumber } from '../../../../../../../common/utils/numberFormatter'
import { useHealthInsuranceTypeCatalog } from '../../hooks/useHealthInsuranceTypeCatalog'
import { useTaxBracketCatalog } from '../../hooks/useTaxBracketCatalog'
import { useTaxableChurchAffiliationCatalog } from '../../hooks/useTaxableChurchAffiliationCatalog'
import { useEmploymentRegionLabel } from '../../hooks/useEmploymentRegionLabel'
import {
  useExitReasonCategoryCatalog,
  useExitReasonCatalog
} from '../../../../forms/employee-termination/hooks/useExitReasonCatalogs'
import useEmployeePermissions, { SECTION_KEYS } from '../../hooks/useEmployeePermissions'
import { ScopePermissionCheckResult } from '@/common/hooks/useScopePermissionCheck'

interface EmploymentTabProps {
  employee: Employee
  accessToken: string
  employeeId?: string // Optional employeeId override for permissions check
  userInfo?: UserInfoProps // Current user info
  isSelfView: boolean
  employeeRecordHrBackoffice: ScopePermissionCheckResult
  /** When true, show the Change Tax Details edit button (HR role only). */
  showChangeTaxDetailsButton?: boolean
}

/**
 * Employment Tab Component
 * Displays employment-related information about the employee
 */
const EmploymentTab: React.FC<EmploymentTabProps> = ({
  employee,
  accessToken,
  employeeId,
  isSelfView,
  employeeRecordHrBackoffice,
  showChangeTaxDetailsButton = false
}) => {
  const { t } = useTranslation(translations)
  const employeeIdForPermissions = employeeId || employee?.id
  const { isSectionVisible } = useEmployeePermissions(employeeIdForPermissions, accessToken)
  const flowRegistryClient = useFlowRegistryClient(accessToken)
  const [terminateActionLoading, setTerminateActionLoading] = React.useState(false)
  const [selectedWorkingConditionIndex, setSelectedWorkingConditionIndex] = React.useState(0)
  const [selectedWorkingHoursIndex, setSelectedWorkingHoursIndex] = React.useState(0)
  const workingConditions = React.useMemo(() => {
    return [...(employee.workingCondition || [])].sort((a, b) => {
      const firstDate = dayjs(a.activeFrom || a.hireDate)
      const secondDate = dayjs(b.activeFrom || b.hireDate)

      if (!firstDate.isValid() && !secondDate.isValid()) {
        return 0
      }

      if (!firstDate.isValid()) {
        return 1
      }

      if (!secondDate.isValid()) {
        return -1
      }

      return firstDate.valueOf() - secondDate.valueOf()
    })
  }, [employee.workingCondition])
  const activeWorkingConditionIndex = React.useMemo(() => {
    const today = dayjs().startOf('day')
    const activeIndex = workingConditions.findIndex(condition => {
      if (!condition.activeFrom) {
        return false
      }

      const activeFrom = dayjs(condition.activeFrom).startOf('day')
      const activeTo = condition.activeTo ? dayjs(condition.activeTo).startOf('day') : null

      if (!activeFrom.isValid()) {
        return false
      }

      const startsTodayOrEarlier = !today.isBefore(activeFrom, 'day')
      const endsTodayOrLater = !activeTo?.isValid() || !today.isAfter(activeTo, 'day')

      return startsTodayOrEarlier && endsTodayOrLater
    })

    return Math.max(activeIndex, 0)
  }, [workingConditions])
  const selectedWorkingConditionSafeIndex = Math.max(
    0,
    Math.min(selectedWorkingConditionIndex, workingConditions.length - 1)
  )
  const workingCondition = workingConditions[selectedWorkingConditionSafeIndex]
  const activeWorkingCondition = workingConditions[activeWorkingConditionIndex]
  const hasMultipleWorkingConditions = workingConditions.length > 1
  const isFirstWorkingCondition = selectedWorkingConditionSafeIndex <= 0
  const isLastWorkingCondition = selectedWorkingConditionSafeIndex >= workingConditions.length - 1
  const workingHoursEntries = React.useMemo(() => {
    return [...(employee.workingHours || [])].sort((a, b) => {
      const firstDate = dayjs(a.activeFrom)
      const secondDate = dayjs(b.activeFrom)

      if (!firstDate.isValid() && !secondDate.isValid()) {
        return 0
      }

      if (!firstDate.isValid()) {
        return 1
      }

      if (!secondDate.isValid()) {
        return -1
      }

      return firstDate.valueOf() - secondDate.valueOf()
    })
  }, [employee.workingHours])
  const activeWorkingHoursIndex = React.useMemo(() => {
    const today = dayjs().startOf('day')
    const activeIndex = workingHoursEntries.findIndex(workingHours => {
      if (!workingHours.activeFrom) {
        return false
      }

      const activeFrom = dayjs(workingHours.activeFrom).startOf('day')
      const activeTo = workingHours.activeTo ? dayjs(workingHours.activeTo).startOf('day') : null

      if (!activeFrom.isValid()) {
        return false
      }

      const startsTodayOrEarlier = !today.isBefore(activeFrom, 'day')
      const endsTodayOrLater = !activeTo?.isValid() || !today.isAfter(activeTo, 'day')

      return startsTodayOrEarlier && endsTodayOrLater
    })

    return Math.max(activeIndex, 0)
  }, [workingHoursEntries])
  const selectedWorkingHoursSafeIndex = Math.max(0, Math.min(selectedWorkingHoursIndex, workingHoursEntries.length - 1))
  const workingHours = workingHoursEntries[selectedWorkingHoursSafeIndex]
  const hasMultipleWorkingHours = workingHoursEntries.length > 1
  const isFirstWorkingHours = selectedWorkingHoursSafeIndex <= 0
  const isLastWorkingHours = selectedWorkingHoursSafeIndex >= workingHoursEntries.length - 1
  const workingHoursMissingRequiredInput = React.useMemo(() => {
    if (!workingHours?.id) {
      return false
    }

    const activeFrom = workingHours.activeFrom ? dayjs(workingHours.activeFrom).startOf('day') : null
    return !activeFrom?.isValid()
  }, [workingHours?.activeFrom, workingHours?.id])
  const employmentPeriodIsNotContinuous = React.useMemo(() => {
    const currentCondition = workingConditions[selectedWorkingConditionSafeIndex]
    const previousCondition = workingConditions[selectedWorkingConditionSafeIndex - 1]
    const nextCondition = workingConditions[selectedWorkingConditionSafeIndex + 1]
    const currentStart = currentCondition?.activeFrom ? dayjs(currentCondition.activeFrom).startOf('day') : null
    const currentEnd = currentCondition?.activeTo ? dayjs(currentCondition.activeTo).startOf('day') : null

    if (previousCondition?.activeTo && currentStart?.isValid()) {
      const previousEnd = dayjs(previousCondition.activeTo).startOf('day')
      if (previousEnd.isValid() && !previousEnd.add(1, 'day').isSame(currentStart, 'day')) {
        return true
      }
    }

    if (nextCondition?.activeFrom && currentEnd?.isValid()) {
      const nextStart = dayjs(nextCondition.activeFrom).startOf('day')
      if (nextStart.isValid() && !currentEnd.add(1, 'day').isSame(nextStart, 'day')) {
        return true
      }
    }

    return false
  }, [selectedWorkingConditionSafeIndex, workingConditions])
  const workingHoursPeriodIsNotContinuous = React.useMemo(() => {
    const currentWorkingHours = workingHoursEntries[selectedWorkingHoursSafeIndex]
    const previousWorkingHours = workingHoursEntries[selectedWorkingHoursSafeIndex - 1]
    const nextWorkingHours = workingHoursEntries[selectedWorkingHoursSafeIndex + 1]
    const currentStart = currentWorkingHours?.activeFrom ? dayjs(currentWorkingHours.activeFrom).startOf('day') : null
    const currentEnd = currentWorkingHours?.activeTo ? dayjs(currentWorkingHours.activeTo).startOf('day') : null

    if (previousWorkingHours?.activeTo && currentStart?.isValid()) {
      const previousEnd = dayjs(previousWorkingHours.activeTo).startOf('day')
      if (previousEnd.isValid() && !previousEnd.add(1, 'day').isSame(currentStart, 'day')) {
        return true
      }
    }

    if (nextWorkingHours?.activeFrom && currentEnd?.isValid()) {
      const nextStart = dayjs(nextWorkingHours.activeFrom).startOf('day')
      if (nextStart.isValid() && !currentEnd.add(1, 'day').isSame(nextStart, 'day')) {
        return true
      }
    }

    return false
  }, [selectedWorkingHoursSafeIndex, workingHoursEntries])

  React.useEffect(() => {
    setSelectedWorkingConditionIndex(activeWorkingConditionIndex)
  }, [activeWorkingConditionIndex, employee.id, workingConditions.length])

  React.useEffect(() => {
    setSelectedWorkingHoursIndex(activeWorkingHoursIndex)
  }, [activeWorkingHoursIndex, employee.id, workingHoursEntries.length])

  const primaryAddress = employee.addresses?.find(addr => addr.type === 'PRIMARY')
  const addressCountryId = primaryAddress?.country?.id ?? ''
  const regionLabelLinkedToAddress = useEmploymentRegionLabel(
    accessToken,
    workingCondition?.regionRef,
    addressCountryId || undefined
  )
  // Fetch health insurance type catalog for health insurance type mapping
  const { getHealthInsuranceTypeValueById, loading: loadingHealthInsuranceTypes } =
    useHealthInsuranceTypeCatalog(accessToken)
  // Fetch tax bracket catalog for tax bracket mapping
  const { getTaxBracketValueById, loading: loadingTaxBrackets } = useTaxBracketCatalog(accessToken)
  // Fetch taxable church affiliation catalog for translated church affiliation mapping
  const { getTaxableChurchAffiliationValueById, loading: loadingTaxableChurchAffiliation } =
    useTaxableChurchAffiliationCatalog(accessToken)
  // Fetch exit reason catalogs for employment period section
  const { options: exitReasonCategoryOptions } = useExitReasonCategoryCatalog(accessToken)
  const { options: exitReasonOptions } = useExitReasonCatalog(accessToken)
  // Prepare organizational data
  const organizationalData = [
    {
      label: t('employment-label-employee-id'),
      value: employee.code || ''
    },
    {
      label: t('employment-label-company'),
      value: employee.employeePosition?.company?.name || ''
    },
    {
      label: t('employment-label-job-position'),
      value: employee.employeePosition?.jobPosition?.name || ''
    },
    {
      label: t('employment-label-location'),
      value: employee.employeePosition?.siteLocation?.name || ''
    },
    {
      label: t('employment-label-organizational-unit'),
      value: employee.employeePosition?.organizationalUnit?.name || ''
    },
    {
      label: t('employment-label-workspace'),
      value: employee.workspace || ''
    },
    {
      label: t('employment-label-management-level'),
      value: ''
    },
    {
      label: t('employment-label-cost-center'),
      value: employee.employeePosition?.costCenter?.name || ''
    }
  ]

  const hireDate = React.useMemo(() => {
    const hireDateCandidates = [workingCondition?.hireDate, ...workingConditions.map(condition => condition?.hireDate)]

    return hireDateCandidates.find(candidate => candidate && dayjs(candidate).isValid()) || ''
  }, [workingCondition?.hireDate, workingConditions])

  const exitWorkingCondition = React.useMemo(() => {
    const exitDateCandidates = [workingCondition, ...workingConditions]

    return exitDateCandidates.find(condition => condition?.exitDate && dayjs(condition.exitDate).isValid())
  }, [workingCondition, workingConditions])

  const getEmploymentPeriodData = () => {
    const data: Array<{ label: string; value: string }> = [
      {
        label: t('employment-label-hire-date'),
        value: hireDate ? formatDate(hireDate, 'date.medium') || '' : ''
      },
      {
        label: t('employment-label-exit-date'),
        value: exitWorkingCondition?.exitDate ? formatDate(exitWorkingCondition.exitDate, 'date.medium') || '' : ''
      }
    ]

    if (exitWorkingCondition?.exitDate) {
      const categoryLabel =
        exitReasonCategoryOptions.find(opt => opt.value === exitWorkingCondition.exitReasonCategoryRef)?.label ||
        exitWorkingCondition.exitReasonCategoryRef ||
        ''
      const reasonLabel =
        exitReasonOptions.find(opt => opt.value === exitWorkingCondition.exitReasonRef)?.label ||
        exitWorkingCondition.exitReasonRef ||
        ''
      data.push(
        {
          label: t('employment-label-exit-reason-category'),
          value: categoryLabel
        },
        {
          label: t('employment-label-exit-reason'),
          value: reasonLabel
        }
      )
    }

    return data
  }

  const employmentPeriodData = getEmploymentPeriodData()

  const findTerminateEmployeeFlow = (flowItems: FlowItemReduced[]): FlowItemReduced | undefined =>
    flowItems.find(flowItem => {
      const processName = flowItem.processName?.toLowerCase() ?? ''
      const flowName = flowItem.flowName?.toLowerCase() ?? ''
      return processName === 'terminateemployee' || flowName.includes('terminate employee')
    })

  const handleOpenTerminateEmployeeFlow = async () => {
    if (!employee?.id || terminateActionLoading) return

    setTerminateActionLoading(true)
    try {
      const mainContexts = await flowRegistryClient.getMainContextData({
        contextNames: [FlowContextName.employeeEntity]
      })
      const employeeContextDataName =
        mainContexts?.contextData?.find(context => context.contextName === FlowContextName.employeeEntity)
          ?.mainContextDataName ?? 'employeeId'
      const externalContextData = {
        employeeId: employee.id,
        managerId: employee.employeePosition?.supervisor?.id,
        organizationalUnitId: employee.employeePosition?.organizationalUnitId
      }
      const response = await flowRegistryClient.getPermissionFlowItemsV2({
        contexts: [
          {
            contextName: FlowContextName.employeeEntity,
            mainContextDataId:
              externalContextData[employeeContextDataName as keyof typeof externalContextData] ?? employee.id
          }
        ]
      })
      const terminateFlow = findTerminateEmployeeFlow(response?.flowItems ?? [])

      if (!terminateFlow) {
        throw new Error(t('employment-terminate-action-unavailable'))
      }

      startProcess({
        processName: terminateFlow.processName,
        domain: terminateFlow.domain,
        payload: externalContextData,
        builderType: terminateFlow.builderType?.toUpperCase() === 'NATIVE_SCREEN' ? 'NATIVE_SCREEN' : undefined,
        targetDesktop: terminateFlow.targetDesktop,
        targetMobile: terminateFlow.targetMobile
      })
    } catch (err) {
      console.error('Failed to open terminate employee flow:', err)
    } finally {
      setTerminateActionLoading(false)
    }
  }

  const getWorkingConditionsData = () => {
    const regionDisplay = regionLabelLinkedToAddress || ''

    return [
      {
        label: t('employment-label-employment-type'),
        value: getCatalogValue(workingCondition?.employmentType) || ''
      },
      {
        label: t('employment-label-employment-start-date'),
        value: workingCondition?.activeFrom ? formatDate(workingCondition.activeFrom, 'date.medium') || '' : ''
      },
      {
        label: t('employment-label-employment-end-date'),
        value: workingCondition?.activeTo ? formatDate(workingCondition.activeTo, 'date.medium') || '' : ''
      },
      {
        label: t('employment-label-contract-type'),
        value: getCatalogValue(workingCondition?.contractType) || ''
      },
      {
        label: t('employment-label-probation-end-date'),
        value: workingCondition?.probationEnd ? formatDate(workingCondition.probationEnd, 'date.medium') || '' : ''
      },
      {
        label: t('employment-label-remote'),
        value: getCatalogValue(workingCondition?.remote) || ''
      },
      {
        label: t('employment-label-region'),
        value: regionDisplay || '-'
      }
    ]
  }

  const workingConditionsData = getWorkingConditionsData()

  // Prepare working hours data
  const getWorkingHoursData = () => {
    // Compute weekly hours by summing daily hours if missing
    const computedWeeklyHours = (() => {
      const days = [
        workingHours?.mondayHours,
        workingHours?.tuesdayHours,
        workingHours?.wednesdayHours,
        workingHours?.thursdayHours,
        workingHours?.fridayHours,
        workingHours?.saturdayHours,
        workingHours?.sundayHours
      ]
      return days.reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0)
    })()

    // Compute weekly days as count of days with hours > 0
    const computedWeeklyDays = (() => {
      const days = [
        workingHours?.mondayHours,
        workingHours?.tuesdayHours,
        workingHours?.wednesdayHours,
        workingHours?.thursdayHours,
        workingHours?.fridayHours,
        workingHours?.saturdayHours,
        workingHours?.sundayHours
      ]
      return days.reduce((count, val) => count + (typeof val === 'number' && val > 0 ? 1 : 0), 0)
    })()

    return [
      {
        label: t('employment-label-employment-start-date'),
        value: workingHours?.activeFrom ? formatDate(workingHours.activeFrom, 'date.medium') || '' : ''
      },
      {
        label: t('employment-label-employment-end-date'),
        value: workingHours?.activeTo ? formatDate(workingHours.activeTo, 'date.medium') || '' : ''
      },
      {
        label: t('employment-label-weekly-hours'),
        value: computedWeeklyHours.toString() || ''
      },
      {
        label: t('employment-label-fte'),
        value:
          workingHours?.fullTimeEquivalent !== undefined && workingHours?.fullTimeEquivalent !== null
            ? workingHours.fullTimeEquivalent.toString()
            : ''
      },
      {
        label: t('employment-label-days-per-week'),
        value: computedWeeklyDays.toString() || ''
      }
    ]
  }

  const workingHoursData = getWorkingHoursData()

  const getBankAccountData = () => {
    const primaryBankAccount = employee.bankAccounts?.[0]

    return [
      {
        label: t('employment-label-bank-name'),
        value: primaryBankAccount?.bankName || ''
      },
      {
        label: t('employment-label-account-holder'),
        value: primaryBankAccount?.accountHolder || ''
      },
      {
        label: t('details-label-iban'),
        value: primaryBankAccount?.iban || '',
        fullWidth: true
      }
    ]
  }

  const bankAccountData = getBankAccountData()

  // Employee country from working condition region (parentEntry = country)
  const employeeCountryCode = activeWorkingCondition?.region?.parentEntry?.code ?? null
  const isEmployeeInGermany = employeeCountryCode != null && String(employeeCountryCode).trim().toUpperCase() === 'DE'

  // Prepare tax information data (combined from both tabs)
  const getTaxInformationData = () => {
    const taxDetails = employee.taxDetails?.[0] || {}
    const additionalProps = taxDetails.additionalProperties ?? {}
    const requestAtTaxOffice = additionalProps.requestAtTaxOffice === true

    const rows: Array<{ label: string; value: string }> = []

    if (!isEmployeeInGermany) {
      rows.push({
        label: t('employment-label-tax-number'),
        value: taxDetails.taxNumber || ''
      })
    }

    rows.push(
      {
        label: t('employment-label-tax-identification-number'),
        value: taxDetails.taxIdentificationNumber || ''
      },
      {
        label: t('employment-label-social-security-number'),
        value: taxDetails.socialSecurityNumber || ''
      },
      {
        label: t('employment-label-tax-bracket'),
        value: loadingTaxBrackets ? t('common-loading') : getTaxBracketValueById(taxDetails.taxBracketRef || '')
      },
      {
        label: t('employment-label-church-affiliation'),
        value: loadingTaxableChurchAffiliation
          ? t('common-loading')
          : getTaxableChurchAffiliationValueById(taxDetails.taxableChurchAffiliationRef || '')
      },
      {
        label: t('employment-label-child-tax-allowance'),
        value:
          taxDetails.childTaxAllowance !== undefined && taxDetails.childTaxAllowance !== null
            ? formatNumberFunction(taxDetails.childTaxAllowance.toString())
            : ''
      },
      {
        label: t('employment-label-health-insurance'),
        value: taxDetails.healthInsuranceName || ''
      },
      {
        label: t('employment-label-type-of-health-insurance'),
        value: loadingHealthInsuranceTypes
          ? t('common-loading')
          : getHealthInsuranceTypeValueById(taxDetails.healthInsuranceTypeRef || '')
      },
      {
        label: t('employment-label-last-updated'),
        value:
          taxDetails.updatedAt != null && taxDetails.updatedAt !== ''
            ? (formatDate(taxDetails.updatedAt, 'datetime.short') ?? '')
            : ''
      }
    )

    if (isEmployeeInGermany) {
      rows.push({
        label: t('employment-label-request-at-office'),
        value: requestAtTaxOffice ? t('common-yes') : t('common-no')
      })

      if (requestAtTaxOffice) {
        rows.push({
          label: t('employment-label-employee-tax-office'),
          value: String(additionalProps.employeeTaxOffice ?? '')
        })
        rows.push({
          label: t('employment-label-individual-free-amount'),
          value: (() => {
            const raw = String(additionalProps.individualFreeAmount ?? '').trim()
            if (!raw) return ''
            const parsed = parseLocalizedNumber(raw)
            return Number.isNaN(parsed) ? raw : formatNumberFunction(parsed)
          })()
        })
      }
    }

    return rows
  }

  const taxInformationData = getTaxInformationData()

  const getMaskedValue = (value: string, sectionKey?: string) => {
    if (!value || value.trim() === '') {
      return '-'
    }

    if (isSelfView || employeeRecordHrBackoffice.hasPermission) {
      return value
    }

    if (sectionKey && isSectionVisible('details', sectionKey)) {
      return value
    }

    return '••••••••'
  }

  // Helper function to render data items in a grid with 3 columns
  const renderDataItems = (data: Array<{ label: string; value: string; sectionKey?: string; fullWidth?: boolean }>) => (
    <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-3 gba:mt-2">
      {data.map(item => {
        const displayValue = item.sectionKey ? getMaskedValue(item.value, item.sectionKey) : item.value || '-'
        const containerClassName = `gba:flex gba:flex-col gba:py-1 gba:px-2 gba:hover:bg-muted gba:rounded-md gba:transition-colors gba:min-w-0 ${
          item.fullWidth ? 'gba:md:col-span-3' : ''
        }`
        const valueClassName = `gba:font-medium gba:text-sm gba:text-foreground gba:block ${
          item.fullWidth ? 'gba:break-all' : 'gba:truncate'
        }`

        return (
          <div
            key={`${item.label}-${item.value}`}
            className={containerClassName}
            data-testid={`employment-item-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <span
              className="gba:text-xs gba:text-muted-foreground gba:mb-0.5 gba:truncate gba:block"
              title={item.label}
            >
              {item.label}
            </span>
            <span className={valueClassName} title={item.fullWidth ? undefined : displayValue}>
              {displayValue}
            </span>
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="gba:employment-tab gba:space-y-6" data-testid="employment-tab-container">
      {/* Employment Overview Headline */}
      <div className="gba:employment-header" data-testid="employment-header">
        <div className="gba:font-bold gba:text-2xl" data-testid="employment-title">
          {t('employment-overview')}
        </div>
        <div className="gba:text-muted-foreground gba:text-lg gba:mb-4" data-testid="employment-description">
          {t('employment-description')}
        </div>
      </div>

      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-6" data-testid="employment-cards">
        {/* Row 1: Employment Profile (left) | Employment Period (right) */}
        <Card data-testid="employment-section-profile" className="gba:h-full">
          <CardContent className="gba:p-4 gba:h-full">
            <div className="gba:mb-6 gba:border-b gba:border-border gba:pb-2">
              <h3 className="gba:text-lg gba:font-semibold">{t('employment-profile')}</h3>
            </div>
            {renderDataItems(organizationalData)}
          </CardContent>
        </Card>

        <Card data-testid="employment-section-period" className="gba:h-full">
          <CardContent className="gba:p-4 gba:h-full">
            <div className="gba:mb-6 gba:border-b gba:border-border gba:pb-2 gba:flex gba:justify-between gba:items-center">
              <h3 className="gba:text-lg gba:font-semibold">{t('employment-period')}</h3>
              {employeeRecordHrBackoffice.hasPermission && (
                <AppAction
                  variant="update-secondary"
                  data-testid="employee-termination-action-button"
                  customActions={[
                    {
                      key: 'terminate-employee',
                      label: t('employment-terminate-action'),
                      onClick: () => {
                        void handleOpenTerminateEmployeeFlow()
                      }
                    }
                  ]}
                  prefixDataTestId="employee-termination-action"
                  accessToken={accessToken}
                  disabled={terminateActionLoading}
                  ariaLabel={t('employment-terminate-action')}
                />
              )}
            </div>
            {renderDataItems(employmentPeriodData)}
          </CardContent>
        </Card>

        {/* Row 2: Working Conditions (left) | Working Hours (right) */}
        <Card data-testid="employment-section-conditions">
          <CardContent className="gba:p-4">
            <div className="gba:mb-6 gba:border-b gba:border-border gba:pb-2 gba:flex gba:justify-between gba:items-center">
              <h3 className="gba:text-lg gba:font-semibold">{t('employment-working-conditions')}</h3>
              <AppAction
                variant="create-secondary"
                data-testid="employee-working-conditions-add-button"
                contexts={[
                  {
                    context: FlowContextName.updateEmployeeWorkingCondition,
                    contextData: { employeeId: employee?.id, changeMode: 'INSERT' }
                  }
                ]}
                prefixDataTestId="employee-working-conditions-add"
                accessToken={accessToken}
              />
            </div>
            {renderDataItems(workingConditionsData)}
            {(workingCondition?.id || hasMultipleWorkingConditions) && (
              <div
                className="gba:mt-4 gba:flex gba:items-center gba:justify-between gba:gap-2"
                data-testid="employment-working-conditions-actions"
              >
                <div
                  className="gba:flex gba:items-center gba:gap-2"
                  data-testid="employment-working-conditions-navigation"
                >
                  {hasMultipleWorkingConditions && (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={isFirstWorkingCondition}
                        data-testid="employment-working-conditions-previous"
                        onClick={() => setSelectedWorkingConditionIndex(prev => Math.max(0, prev - 1))}
                      >
                        {t('employment-working-conditions-previous')}
                      </Button>
                      <span
                        className="gba:text-xs gba:text-muted-foreground"
                        data-testid="employment-working-conditions-pagination-position"
                      >
                        {selectedWorkingConditionSafeIndex + 1} / {workingConditions.length}
                      </span>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={isLastWorkingCondition}
                        data-testid="employment-working-conditions-next"
                        onClick={() =>
                          setSelectedWorkingConditionIndex(prev => Math.min(workingConditions.length - 1, prev + 1))
                        }
                      >
                        {t('employment-working-conditions-next')}
                      </Button>
                    </>
                  )}
                </div>
                <div className="gba:flex gba:items-center gba:gap-2" data-testid="employment-working-conditions-update">
                  {employmentPeriodIsNotContinuous && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className="gba:inline-flex gba:items-center gba:text-warning"
                          data-testid="employment-working-conditions-period-warning"
                        >
                          <WarningIcon size={16} />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{t('employment-working-conditions-period-not-continuous')}</TooltipContent>
                    </Tooltip>
                  )}
                  {workingCondition?.id && (
                    <AppAction
                      variant="update-secondary"
                      data-testid="employee-working-conditions-edit-button"
                      contexts={[
                        {
                          context: FlowContextName.updateEmployeeWorkingCondition,
                          contextData: {
                            employeeId: employee?.id,
                            workingConditionId: workingCondition.id,
                            changeMode: 'UPDATE'
                          }
                        }
                      ]}
                      prefixDataTestId="employee-working-conditions-edit"
                      accessToken={accessToken}
                    />
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Working Hours Card */}
        <Card data-testid="employment-section-hours">
          <CardContent className="gba:p-4">
            <div className="gba:mb-6 gba:border-b gba:border-border gba:pb-2 gba:flex gba:justify-between gba:items-center">
              <h3 className="gba:text-lg gba:font-semibold">{t('employment-working-hours')}</h3>
              <AppAction
                variant="create-secondary"
                data-testid="employee-working-hours-add-button"
                contexts={[
                  {
                    context: FlowContextName.updateEmployeeWorkingHours,
                    contextData: { employeeId: employee?.id, changeMode: 'INSERT' }
                  }
                ]}
                prefixDataTestId="employee-working-hours-add"
                accessToken={accessToken}
              />
            </div>
            {renderDataItems(workingHoursData)}
            {(workingHours?.id || hasMultipleWorkingHours) && (
              <div
                className="gba:mt-4 gba:flex gba:items-center gba:justify-between gba:gap-2"
                data-testid="employment-working-hours-actions"
              >
                <div className="gba:flex gba:items-center gba:gap-2" data-testid="employment-working-hours-navigation">
                  {hasMultipleWorkingHours && (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={isFirstWorkingHours}
                        data-testid="employment-working-hours-previous"
                        onClick={() => setSelectedWorkingHoursIndex(prev => Math.max(0, prev - 1))}
                      >
                        {t('employment-working-conditions-previous')}
                      </Button>
                      <span
                        className="gba:text-xs gba:text-muted-foreground"
                        data-testid="employment-working-hours-pagination-position"
                      >
                        {selectedWorkingHoursSafeIndex + 1} / {workingHoursEntries.length}
                      </span>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={isLastWorkingHours}
                        data-testid="employment-working-hours-next"
                        onClick={() =>
                          setSelectedWorkingHoursIndex(prev => Math.min(workingHoursEntries.length - 1, prev + 1))
                        }
                      >
                        {t('employment-working-conditions-next')}
                      </Button>
                    </>
                  )}
                </div>
                <div className="gba:flex gba:items-center gba:gap-2" data-testid="employment-working-hours-update">
                  {(workingHoursMissingRequiredInput || workingHoursPeriodIsNotContinuous) && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className="gba:inline-flex gba:items-center gba:text-warning"
                          data-testid="employment-working-hours-period-warning"
                        >
                          <WarningIcon size={16} />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {t(
                          workingHoursMissingRequiredInput
                            ? 'employment-working-hours-missing-required-input'
                            : 'employment-working-hours-period-not-continuous'
                        )}
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {workingHours?.id && (
                    <AppAction
                      variant="update-secondary"
                      data-testid="employee-working-hours-edit-button"
                      contexts={[
                        {
                          context: FlowContextName.updateEmployeeWorkingHours,
                          contextData: {
                            employeeId: employee?.id,
                            workingHoursId: workingHours.id,
                            changeMode: 'UPDATE'
                          }
                        }
                      ]}
                      prefixDataTestId="employee-working-hours-edit"
                      accessToken={accessToken}
                    />
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Row 3: Bank Account (left) | Tax Information (right) */}
        <Card data-testid="employment-section-bank-account">
          <CardContent className="gba:p-4">
            <div className="gba:mb-6 gba:border-b gba:border-border gba:pb-2 gba:flex gba:justify-between gba:items-center">
              <h3 className="gba:text-lg gba:font-semibold">{t('employment-label-bank-account')}</h3>
              <AppAction
                variant="update-secondary"
                data-testid="employment-bank-account-action-button"
                contexts={[
                  { context: FlowContextName.updateEmployeeBankAccount, contextData: { employeeId: employee?.id } }
                ]}
                prefixDataTestId="employment-bank-account-action"
                accessToken={accessToken}
              />
            </div>
            {renderDataItems(bankAccountData.map(item => ({ ...item, sectionKey: SECTION_KEYS.details.bankAccount })))}
          </CardContent>
        </Card>

        <Card data-testid="employment-section-tax">
          <CardContent className="gba:p-4">
            <div className="gba:mb-6 gba:border-b gba:border-border gba:pb-2 gba:flex gba:justify-between gba:items-center">
              <h3 className="gba:text-lg gba:font-semibold">{t('employment-tax-information')}</h3>
              {showChangeTaxDetailsButton && (
                <AppAction
                  variant="update-secondary"
                  data-testid="employee-tax-information-edit-button"
                  contexts={[{ context: FlowContextName.changeTaxDetails, contextData: { employeeId: employee?.id } }]}
                  prefixDataTestId="employee-tax-information-edit"
                  accessToken={accessToken}
                />
              )}
            </div>
            {renderDataItems(taxInformationData)}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default EmploymentTab
