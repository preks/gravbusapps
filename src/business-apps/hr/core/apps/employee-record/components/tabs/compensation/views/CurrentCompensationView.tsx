'use client'

import React from 'react'
import { Card, Button } from '@newwork/nw-design-system'
import { CompensationData } from '../types/compensationTypes'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import TotalRewardsCard from '../components/current/TotalRewardsCard'
import BenefitsPerksSection from '../components/current/BenefitsPerksSection'
import { formatCurrencyString } from '@/common/utils/numberFormatter'

import CompensationKPICards from '../components/current/CompensationKPICards'
import { ScopePermissionCheckResult } from '@/common/hooks/useScopePermissionCheck'

interface CurrentCompensationViewProps extends BusinessAppContextProps {
  t: (key: string, params?: any) => string
  compensationData?: CompensationData | null
  loading: boolean
  error?: string | null
  onRetry?: () => void
  employeeId: string
  locale: string
  employeeRecordHrBackoffice: ScopePermissionCheckResult
  isSelfView: boolean // Whether user is viewing their own profile
}

/**
 * Current Compensation View Component
 * Displays base salary, bonuses YTD, and benefits information
 */
const CurrentCompensationView: React.FC<CurrentCompensationViewProps> = ({
  t,
  compensationData,
  loading,
  error,
  onRetry,
  employeeId,
  accessToken,
  userInfo,
  additionalData,
  locale,
  employeeRecordHrBackoffice,
  isSelfView
}) => {
  // Check if user has permission to create/grant employee bonuses
  // Only managers and HR admins should have write/create permission on employee_bonus
  // Note: We check permission on the employee being viewed (employeeId) - managers should have write access to their employees' bonuses
  // Permission check is currently disabled for development purposes
  // When ready for production, uncomment the following code and replace hasPermissionToGrantBonusDev with hasPermissionToGrantBonus:
  // const bonusCreatePermissionMap: Record<string, ResourcePermissionMap> = useMemo(
  //   () => ({
  //     grantBonus: {
  //       domain: 'employee',
  //       resource: 'employee_bonus',
  //       permission: 'write'
  //     }
  //   }),
  //   []
  // )
  // const { isResourceAccessible } = usePermissionCheck(employeeId, bonusCreatePermissionMap, accessToken || '')
  // const hasPermissionToGrantBonus = isResourceAccessible('grantBonus')
  const hasPermissionToGrantBonusDev = true //for development purposes

  // Handle loading state - show loading indicators when data is not yet available
  if (loading && !compensationData) {
    return (
      <div className="gba:space-y-6" data-testid="current-compensation-view-loading">
        <div className="gba:text-center gba:text-muted-foreground gba:py-12">
          <div className="gba:text-lg">{t('loading-compensation-data')}</div>
        </div>
      </div>
    )
  }

  // Handle error state with retry option
  if (error) {
    return (
      <div className="gba:space-y-6" data-testid="current-compensation-view-error">
        <Card className="gba:p-8">
          <div className="gba:text-center gba:space-y-4">
            <div className="gba:text-destructive gba:text-lg gba:font-semibold">{t('compensation-error-title')}</div>
            <div className="gba:text-muted-foreground">{error}</div>
            {onRetry && (
              <div className="gba:mt-4">
                <Button
                  variant="default"
                  size="default"
                  onClick={onRetry}
                  data-testid="current-compensation-retry-button"
                >
                  {t('compensation-error-retry')}
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    )
  }

  // Handle empty state (no error, but no data either)
  if (!compensationData) {
    return (
      <div className="gba:space-y-6" data-testid="current-compensation-view-empty">
        <div className="gba:text-center gba:text-muted-foreground gba:py-12">
          <div className="gba:text-lg">{t('rewards-no-data')}</div>
          <div className="gba:text-sm gba:mt-2">No compensation records have been created yet.</div>
        </div>
      </div>
    )
  }

  const { currentCompensation } = compensationData
  const currencyCode = currentCompensation?.currency?.code || 'EUR'

  return (
    <div className="gba:space-y-6" data-testid="current-compensation-view">
      {/* KPI Cards Row */}
      <CompensationKPICards
        t={t}
        compensationData={compensationData}
        loading={loading}
        employeeId={employeeId}
        accessToken={accessToken}
        locale={locale}
        isSelfView={isSelfView}
        hasPermissionToGrantBonus={hasPermissionToGrantBonusDev}
      />

      {/* Total Rewards 360° View */}
      <TotalRewardsCard t={t} compensationData={compensationData} loading={loading} locale={locale} />

      {/* Benefits & Perks Section */}
      <BenefitsPerksSection
        t={t}
        employeeId={employeeId}
        accessToken={accessToken}
        userInfo={userInfo}
        additionalData={additionalData}
        loading={loading}
        currencyCode={currencyCode}
        locale={locale}
        hrBackofficeHasPermission={employeeRecordHrBackoffice?.hasPermission}
      />
    </div>
  )
}

export default CurrentCompensationView
