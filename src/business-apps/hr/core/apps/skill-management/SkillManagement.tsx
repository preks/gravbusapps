import React, { useCallback, useMemo, useRef } from 'react'
import { PageLayout, SectionKpiCards, Spinner, type KpiCardData, Icon, useTranslation } from '@newwork/nw-design-system'
import { ClockCountdownIcon, FolderSimpleIcon, HammerIcon, StackIcon, UsersIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useScopePermissionCheck } from '@/common/hooks/useScopePermissionCheck'
import { ErrorAlert } from '@/components/error-alert/ErrorAlert'
import { ErrorBoundary } from '@/business-apps/core/every/apps/every-box/components/ErrorBoundary'
import { useTabQueryParamSync } from '@/business-apps/mdm/hooks/useTabQueryParamSync'
import { useSkillCatalog } from './hooks/useSkillCatalog'
import { useSkillCategories } from './hooks/useSkillCategories'
import { usePendingSkills } from './hooks/usePendingSkills'
import SkillDirectoryTab from './components/SkillDirectoryTab'
import PendingSkillsTab from './components/PendingSkillsTab'
import SkillCategoriesTab from './components/SkillCategoriesTab'
import { SkillManagementTabs } from './types'
import translations from './_i18n'

export interface SkillManagementProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
}

const DATA_TEST_ID = 'SkillManagement'

const SkillManagement: React.FC<SkillManagementProps> = ({ className, prefixDataTestId, ...contextProps }) => {
  const { t } = useTranslation(translations)
  const [activeTab, onTabChange] = useTabQueryParamSync(SkillManagementTabs, SkillManagementTabs.DIRECTORY)

  const { loading: permLoading, hasPermission } = useScopePermissionCheck(
    '/platform/employee-record',
    'employee-record-all-hr-backoffice',
    contextProps.accessToken
  )

  const catalogData = useSkillCatalog(contextProps.accessToken)
  const pendingData = usePendingSkills(contextProps.accessToken, contextProps.userInfo?.id)
  const categoriesData = useSkillCategories(contextProps.accessToken)

  const refetchRef = useRef({
    catalog: catalogData.refetch,
    pending: pendingData.refetch,
    categories: categoriesData.refetch
  })
  refetchRef.current = {
    catalog: catalogData.refetch,
    pending: pendingData.refetch,
    categories: categoriesData.refetch
  }

  const handleDataChange = useCallback(() => {
    refetchRef.current.catalog()
    refetchRef.current.pending()
    refetchRef.current.categories()
  }, [])

  const kpiCards = useMemo<KpiCardData[]>(
    () => [
      {
        id: 'total-skills',
        title: t('kpi-total-skills'),
        value: String(catalogData.kpi.totalSkills),
        icon: <Icon icon={StackIcon} size="sm" decorative />,
        iconColor: 'var(--nw-info)'
      },
      {
        id: 'employees-with-skills',
        title: t('kpi-total-employees-with-skills'),
        value: String(catalogData.kpi.employeesWithSkills),
        icon: <Icon icon={UsersIcon} size="sm" decorative />,
        iconColor: 'var(--nw-decorative)'
      },
      {
        id: 'pending-requests',
        title: t('kpi-pending-requests'),
        value: String(pendingData.totalPending),
        icon: <Icon icon={ClockCountdownIcon} size="sm" decorative />,
        iconColor: 'var(--nw-warning)'
      }
    ],
    [t, catalogData.kpi, pendingData.totalPending]
  )

  const dataTestId = `${prefixDataTestId ?? ''}-${DATA_TEST_ID}`

  if (permLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64">
        <Spinner />
      </div>
    )
  }

  if (!hasPermission) {
    return <ErrorAlert error={t('error-permission-denied')} type="forbidden" />
  }

  return (
    <PageLayout
      headerIcon={HammerIcon}
      headerTitle={t('skill-management-title')}
      headerDescription={t('skill-management-description')}
      onBack={null as unknown as (() => void) | undefined}
      headerSubViews={{
        value: activeTab,
        onValueChange: onTabChange,
        items: [
          { value: SkillManagementTabs.DIRECTORY, label: t('tab-skills-directory'), icon: <StackIcon /> },
          { value: SkillManagementTabs.PENDING, label: t('tab-pending-skills'), icon: <ClockCountdownIcon /> },
          { value: SkillManagementTabs.CATEGORIES, label: t('tab-skill-categories'), icon: <FolderSimpleIcon /> }
        ]
      }}
      className={`${className ?? ''} gba:min-h-screen`}
    >
      <div className="gba:mx-auto gba:w-full gba:max-w-[1600px] gba:space-y-6">
        {!catalogData.isLoading && (
          <SectionKpiCards cards={kpiCards} className="gba:w-full gba:md:grid-cols-3 nw:md:grid-cols-3" />
        )}

        {activeTab === SkillManagementTabs.DIRECTORY && (
          <ErrorBoundary>
            <SkillDirectoryTab
              {...contextProps}
              skills={catalogData.skills}
              isLoading={catalogData.isLoading}
              error={catalogData.error}
              categoryMap={catalogData.categoryMap}
              categories={catalogData.categories}
              categoryOptions={categoriesData.categories}
              onDataChange={handleDataChange}
              prefixDataTestId={dataTestId}
            />
          </ErrorBoundary>
        )}

        {activeTab === SkillManagementTabs.PENDING && (
          <ErrorBoundary>
            <PendingSkillsTab
              {...contextProps}
              pendingSkills={pendingData.pendingSkills}
              totalCount={pendingData.totalPending}
              isLoading={pendingData.isLoading}
              error={pendingData.error?.message ?? null}
              onDataChange={handleDataChange}
              prefixDataTestId={dataTestId}
            />
          </ErrorBoundary>
        )}

        {activeTab === SkillManagementTabs.CATEGORIES && (
          <ErrorBoundary>
            <SkillCategoriesTab
              {...contextProps}
              categories={categoriesData.categories}
              isLoading={categoriesData.isLoading}
              error={categoriesData.error}
              refetchCategories={categoriesData.refetch}
              onDataChange={handleDataChange}
              prefixDataTestId={dataTestId}
            />
          </ErrorBoundary>
        )}
      </div>
    </PageLayout>
  )
}

export default SkillManagement
export { SkillManagement }
