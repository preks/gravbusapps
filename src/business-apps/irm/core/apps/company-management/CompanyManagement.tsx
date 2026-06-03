import React, { useEffect, useState } from 'react'
import { PageLayout, useTranslation } from '@newwork/nw-design-system'
import { BuildingsIcon, TreeStructureIcon } from '@phosphor-icons/react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { MODULE_COLORS } from '@/common/constants/ui'
import {
  CompanyGroupsView,
  updateCompanyGroupUrl
} from '@/business-apps/irm/investments/apps/investment-management/views/company-groups-view'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { CompanyListView } from './components/CompanyListView'
import translations from './_i18n'

export type CompanyManagementProps = BusinessAppContextProps

const getInitialView = (): string => {
  if (globalThis.window === undefined) return 'companies'
  const view = new URLSearchParams(globalThis.location.search).get('view')
  return view === 'groups' ? 'groups' : 'companies'
}

const getSelectedGroupId = (): string | undefined => {
  if (globalThis.window === undefined) return undefined
  return new URLSearchParams(globalThis.location.search).get('groupId') || undefined
}

export const CompanyManagement: React.FC<CompanyManagementProps> = context => {
  const { t } = useTranslation(translations)
  const [activeView, setActiveView] = useState(getInitialView)
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(getSelectedGroupId)

  const handleViewChange = (view: string) => {
    setActiveView(view)
    setSelectedGroupId(undefined)
    if (globalThis.window === undefined) return

    const params = new URLSearchParams(globalThis.location.search)
    params.set('view', view)
    if (view !== 'groups') {
      params.delete('groupId')
    }
    globalThis.history.replaceState(null, '', `${globalThis.location.pathname}?${params.toString()}`)
  }

  useEffect(() => {
    if (globalThis.window === undefined) return

    const syncGroupIdFromUrl = () => {
      setSelectedGroupId(getSelectedGroupId())
    }

    syncGroupIdFromUrl()
    globalThis.addEventListener('popstate', syncGroupIdFromUrl)
    return () => globalThis.removeEventListener('popstate', syncGroupIdFromUrl)
  }, [])

  const handleSelectGroup = (groupId: string) => {
    setSelectedGroupId(groupId)
    updateCompanyGroupUrl(groupId)
  }

  const handleBackFromGroup = () => {
    setSelectedGroupId(undefined)
    updateCompanyGroupUrl()
  }

  const renderGroupsHeaderAction = () => (
    <AppAction
      variant="create-primary"
      emptyState="enable"
      contexts={[
        {
          context: FlowContextName.investmentCompanyGroupCreate,
          contextData: {}
        }
      ]}
      prefixDataTestId="investment-company-group-create"
      accessToken={context.accessToken}
    >
      {t('create-group-button')}
    </AppAction>
  )

  if (activeView === 'groups' && selectedGroupId) {
    return (
      <div className="gba:h-screen gba:overflow-hidden" data-testid="company-management-app">
        <CompanyGroupsView
          {...context}
          selectedGroupId={selectedGroupId}
          onSelectGroup={handleSelectGroup}
          onBackFromGroup={handleBackFromGroup}
        />
      </div>
    )
  }

  return (
    <div data-testid="company-management-app">
      <PageLayout
        headerIcon={BuildingsIcon}
        headerTitle={t('page-title')}
        headerDescription={t('page-description')}
        headerSubViews={{
          value: activeView,
          onValueChange: handleViewChange,
          items: [
            {
              value: 'companies',
              label: t('companies-tab'),
              icon: <BuildingsIcon />
            },
            {
              value: 'groups',
              label: t('groups-tab'),
              icon: <TreeStructureIcon />
            }
          ]
        }}
        variant={MODULE_COLORS.IRM}
        className="gba:min-h-screen"
      >
        {activeView === 'groups' ? (
          <div className="gba:flex gba:h-full gba:flex-col" data-testid="company-management-groups-view">
            <div
              className="gba:flex gba:items-center gba:justify-end gba:px-6 gba:pt-6"
              data-testid="company-management-groups-toolbar"
            >
              {renderGroupsHeaderAction()}
            </div>
            <CompanyGroupsView
              {...context}
              selectedGroupId={selectedGroupId}
              onSelectGroup={handleSelectGroup}
              onBackFromGroup={handleBackFromGroup}
            />
          </div>
        ) : (
          <CompanyListView {...context} />
        )}
      </PageLayout>
    </div>
  )
}

export default CompanyManagement
