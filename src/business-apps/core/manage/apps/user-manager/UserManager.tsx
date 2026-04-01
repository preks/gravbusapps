import React, { useState, useCallback } from 'react'
import { PageLayout, useTranslation } from '@newwork/nw-design-system'
import { UsersIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { UsersView } from './components/views/users/UsersView'
import { GroupsView } from './components/views/groups/GroupsView'
import { RolesView } from './components/views/roles/RolesView'
import translations from './_i18n'

type ViewKey = 'users' | 'groups' | 'roles'

const VIEW_OPTIONS: Array<{ value: ViewKey; labelKey: string; icon: React.ReactNode }> = [
  { value: 'users', labelKey: 'user-management-tab-users', icon: undefined },
  { value: 'groups', labelKey: 'user-management-tab-groups', icon: undefined },
  { value: 'roles', labelKey: 'user-management-tab-roles', icon: undefined }
]

const UserManager: React.FC<BusinessAppContextProps> = context => {
  const { accessToken } = context
  const { t } = useTranslation(translations)

  const [activeView, setActiveView] = useState<ViewKey>(() => {
    const params = new URLSearchParams(globalThis.location.search)
    const viewParam = params.get('view')
    if (viewParam === 'groups' || viewParam === 'roles') return viewParam
    return 'users'
  })

  const handleViewChange = useCallback((value: string) => {
    const view = value as ViewKey
    setActiveView(view)
    const url = new URL(globalThis.location.href)
    url.searchParams.set('view', view)
    globalThis.history.replaceState(null, '', url.toString())
  }, [])

  const headerSubViews = {
    value: activeView,
    onValueChange: handleViewChange,
    items: VIEW_OPTIONS.map(option => ({
      value: option.value,
      label: t(option.labelKey),
      icon: option.icon
    }))
  }

  const renderActiveView = () => {
    switch (activeView) {
      case 'users':
        return <UsersView accessToken={accessToken} />
      case 'groups':
        return <GroupsView accessToken={accessToken} />
      case 'roles':
        return <RolesView accessToken={accessToken} />
    }
  }

  return (
    <div data-testid="user-management-app" className="gba:w-full">
      <PageLayout
        headerIcon={UsersIcon}
        headerTitle={t('user-management-title')}
        headerDescription={t('user-management-description')}
        headerSubViews={headerSubViews}
        className="gba:min-h-screen"
      >
        <div className="gba:h-full gba:overflow-auto">{renderActiveView()}</div>
      </PageLayout>
    </div>
  )
}

export default UserManager
