'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  useTranslation,
  useLocale,
  Skeleton,
  Card,
  CardHeader,
  CardContent
} from '@newwork/nw-design-system'
import { CurrencyEurIcon, ClockCounterClockwiseIcon } from '@phosphor-icons/react'
import CurrentCompensationView from './compensation/views/CurrentCompensationView'
import PayHistoryView from './compensation/views/PayHistoryView'
import { useCompensationData } from './compensation/hooks/useCompensationData'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useEmployeePermissions } from '../../hooks/useEmployeePermissions'
import { CompensationPermissions } from './compensation/hooks/useCompensationPermissions'
import translations from '../../_i18n'
import { ScopePermissionCheckResult } from '@/common/hooks/useScopePermissionCheck'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'

interface CompensationTabProps extends BusinessAppContextProps {
  employeeId: string
  compensationFeatureFlag: boolean
  employeeRecordHrBackoffice: ScopePermissionCheckResult
  // Computed permission props (passed from parent to avoid re-fetching)
  employeeGrowthPermission: ScopePermissionCheckResult
  employeeRecordAllHrBackoffice: ScopePermissionCheckResult
  compensationPermissions: CompensationPermissions
}

const COMPENSATION_SUBVIEW_VALUES = ['currentCompensation', 'compensationHistory'] as const
type CompensationSubView = (typeof COMPENSATION_SUBVIEW_VALUES)[number]

const getInitialCompensationSubView = (): CompensationSubView => {
  if (typeof window === 'undefined') return 'currentCompensation'
  const urlParams = new URLSearchParams(window.location.search)
  const subViewFromUrl = urlParams.get('subView')

  if (subViewFromUrl && COMPENSATION_SUBVIEW_VALUES.includes(subViewFromUrl as CompensationSubView)) {
    return subViewFromUrl as CompensationSubView
  }

  return 'currentCompensation'
}

const CompensationTab: React.FC<CompensationTabProps> = ({
  employeeId,
  accessToken,
  userInfo,
  compensationFeatureFlag,
  additionalData,
  employeeRecordHrBackoffice,
  employeeGrowthPermission,
  employeeRecordAllHrBackoffice,
  compensationPermissions
}) => {
  const [activeSubView, setActiveSubView] = useState<CompensationSubView>(getInitialCompensationSubView())
  const { t } = useTranslation(translations)
  const { locale: currentLocale } = useLocale()

  const { loading: permissionsLoading } = useEmployeePermissions(employeeId, accessToken)

  // Use permissions computed in parent
  const hasCompensationPermission =
    permissionsLoading || employeeRecordAllHrBackoffice.loading || employeeGrowthPermission.loading
      ? false
      : compensationPermissions.canViewCompensationTab

  const shouldShowCompensationTabs =
    compensationFeatureFlag &&
    (permissionsLoading ||
      employeeRecordAllHrBackoffice.loading ||
      employeeGrowthPermission.loading ||
      hasCompensationPermission)

  const shouldLoadCompensationData =
    compensationFeatureFlag &&
    hasCompensationPermission &&
    (activeSubView === 'currentCompensation' || activeSubView === 'compensationHistory')

  const {
    loading: compensationLoading,
    error: compensationError,
    compensationData,
    historyData,
    refetch: refetchCompensation
  } = useCompensationData(
    shouldLoadCompensationData ? employeeId : '',
    shouldLoadCompensationData ? accessToken : '',
    currentLocale
  )

  useProcessCompletion({
    onSuccess: () => {
      if (!shouldLoadCompensationData) return
      void refetchCompensation()
    }
  })

  const updateUrl = useCallback(
    (subView: CompensationSubView) => {
      if (typeof window === 'undefined') return

      const searchParams = new URLSearchParams(window.location.search)
      searchParams.set('tab', 'compensation')
      searchParams.set('subView', subView)

      const currentUserEmployeeId = userInfo?.employeeDetails?.employeeId || ''
      if (employeeId && employeeId !== currentUserEmployeeId) {
        searchParams.set('employeeId', employeeId)
      } else {
        searchParams.delete('employeeId')
        searchParams.delete('id')
      }

      const newUrl = `${window.location.pathname}?${searchParams.toString()}`
      window.history.replaceState({}, '', newUrl)
    },
    [employeeId, userInfo?.employeeDetails?.employeeId]
  )

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (
      (!compensationFeatureFlag ||
        (!permissionsLoading &&
          !employeeRecordAllHrBackoffice.loading &&
          !employeeGrowthPermission.loading &&
          !hasCompensationPermission)) &&
      activeSubView
    ) {
      const newSubView = 'currentCompensation'
      setActiveSubView(newSubView)
      updateUrl(newSubView)
    }
  }, [
    compensationFeatureFlag,
    activeSubView,
    permissionsLoading,
    hasCompensationPermission,
    employeeRecordAllHrBackoffice.loading,
    employeeGrowthPermission.loading,
    updateUrl
  ])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const urlParams = new URLSearchParams(window.location.search)
    if (!urlParams.has('tab') || urlParams.get('tab') !== 'compensation') {
      updateUrl(activeSubView)
    }
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      const newSubView = getInitialCompensationSubView()
      setActiveSubView(newSubView)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const handleSubViewChange = (value: string) => {
    const newSubView = value as CompensationSubView
    setActiveSubView(newSubView)
    updateUrl(newSubView)
  }

  if (!shouldShowCompensationTabs) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-12" data-testid="compensation-tab-no-access">
        <div className="gba:text-center gba:text-muted-foreground">
          <p>{t('no-access-to-compensation-data')}</p>
        </div>
      </div>
    )
  }

  return (
    <div data-testid="compensation-tab-container" className="gba:w-full">
      <Tabs value={activeSubView} onValueChange={handleSubViewChange} className="gba:w-full">
        <TabsList className="gba:mb-4 gba:w-full" data-testid="compensation-tabs-list">
          <TabsTrigger
            value="currentCompensation"
            data-testid="compensation-current-subtab"
            className="gba:flex-1"
            disabled={permissionsLoading || employeeRecordAllHrBackoffice.loading || employeeGrowthPermission.loading}
          >
            <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
              <CurrencyEurIcon />
              <span>{t('tab-current-compensation')}</span>
            </div>
          </TabsTrigger>
          <TabsTrigger
            value="compensationHistory"
            data-testid="compensation-history-subtab"
            className="gba:flex-1"
            disabled={permissionsLoading || employeeRecordAllHrBackoffice.loading || employeeGrowthPermission.loading}
          >
            <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
              <ClockCounterClockwiseIcon />
              <span>{t('tab-compensation-history')}</span>
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="currentCompensation" data-testid="compensation-current-content" className="gba:mt-4">
          {permissionsLoading || employeeRecordAllHrBackoffice.loading || employeeGrowthPermission.loading ? (
            <div className="gba:space-y-6" data-testid="current-compensation-permissions-loading">
              <Card>
                <CardHeader>
                  <Skeleton className="gba:h-6 gba:w-48" />
                </CardHeader>
                <CardContent className="gba:space-y-4">
                  <Skeleton className="gba:h-32 gba:w-full" />
                  <div className="gba:space-y-2">
                    <Skeleton className="gba:h-4 gba:w-full" />
                    <Skeleton className="gba:h-4 gba:w-3/4" />
                    <Skeleton className="gba:h-4 gba:w-1/2" />
                  </div>
                  <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                    <Skeleton className="gba:h-24 gba:w-full" />
                    <Skeleton className="gba:h-24 gba:w-full" />
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <CurrentCompensationView
              t={t}
              compensationData={compensationData}
              loading={compensationLoading}
              error={compensationError}
              onRetry={refetchCompensation}
              employeeId={employeeId}
              accessToken={accessToken}
              userInfo={userInfo}
              additionalData={additionalData}
              locale={currentLocale}
              employeeRecordHrBackoffice={employeeRecordHrBackoffice}
              canManageCompensation={compensationPermissions.canManageCompensation}
              hasHrBackoffice={employeeRecordAllHrBackoffice.hasPermission}
              permissionsLoading={
                permissionsLoading || employeeRecordAllHrBackoffice.loading || employeeGrowthPermission.loading
              }
            />
          )}
        </TabsContent>

        <TabsContent value="compensationHistory" data-testid="compensation-history-content" className="gba:mt-4">
          {permissionsLoading || employeeRecordAllHrBackoffice.loading || employeeGrowthPermission.loading ? (
            <div className="gba:space-y-6" data-testid="compensation-history-permissions-loading">
              <Card>
                <CardHeader>
                  <Skeleton className="gba:h-6 gba:w-48" />
                </CardHeader>
                <CardContent>
                  <div className="gba:text-center gba:text-muted-foreground gba:py-8">
                    {t('loading-compensation-history')}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <PayHistoryView
              t={t}
              historyData={historyData}
              loading={compensationLoading}
              error={compensationError}
              onRetry={refetchCompensation}
              locale={currentLocale}
              accessToken={accessToken}
              userInfo={userInfo}
              additionalData={additionalData}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default CompensationTab
