import React, { useState, useCallback, useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useDeskData, type ContentItem } from '@/business-apps/platform/apps/desk/hooks/useDeskData'

import { HeroSection, QuickSearch, EveryOfficeSection, EveryOneSection, EveryAISection } from './components'
import translations from './_i18n'

export interface CustomerHomeOfficeProps extends BusinessAppContextProps {
  'data-testid'?: string
}

const navigateToApp = (appPath: string, params?: Record<string, string>) => {
  const appName = appPath.replace(/^\/?platform\/apps\//, '')
  const urlMap: Record<string, string> = {
    'document-apps': '/platform/every-office/documents',
    'spreadsheet-apps': '/platform/every-office/spreadsheets',
    'note-apps': '/platform/every-office/notes',
    'slide-apps': '/platform/every-office/slides',
    'whiteboard-apps': '/platform/every-office/whiteboards',
    'drive-apps': '/platform/every-office/drive'
  }
  const platformUrl = urlMap[appName] ?? `/platform/apps/${appName}`
  navigateTo(buildPlatformUrl(platformUrl, { from: 'customer-home', ...params }))
}

export const CustomerHomeOffice: React.FC<CustomerHomeOfficeProps> = ({
  accessToken,
  userInfo,
  'data-testid': testId = 'customer-home-office-mode'
}) => {
  const { t } = useTranslation(translations)
  const [searchQuery, setSearchQuery] = useState('')

  const currentUserId = userInfo?.id || userInfo?.employeeDetails?.employeeId || ''
  const firstName = userInfo?.employeeDetails?.firstName || ''

  const { documents, spreadsheets, notes, slides, whiteboards, recentItems, isLoading } = useDeskData(
    accessToken,
    currentUserId
  )

  const allItems = useMemo(() => {
    return [...documents, ...spreadsheets, ...notes, ...slides, ...whiteboards].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  }, [documents, spreadsheets, notes, slides, whiteboards])

  const displayItems = useMemo(() => {
    if (!searchQuery.trim()) return recentItems
    const query = searchQuery.toLowerCase()
    return allItems.filter(item => item.title.toLowerCase().includes(query))
  }, [allItems, recentItems, searchQuery])

  const handleItemClick = useCallback((item: ContentItem) => {
    const routeMap: Record<string, { app: string; param: string; view?: string }> = {
      document: { app: 'document-apps', param: 'docId', view: 'editor' },
      spreadsheet: { app: 'spreadsheet-apps', param: 'appId', view: 'viewer' },
      note: { app: 'note-apps', param: 'noteId', view: 'editor' },
      slide: { app: 'slide-apps', param: 'slideId', view: 'editor' },
      whiteboard: { app: 'whiteboard-apps', param: 'whiteboardId' }
    }
    const route = routeMap[item.type]
    if (route) {
      const params: Record<string, string> = { [route.param]: item.id }
      if (route.view) params.view = route.view
      navigateToApp(route.app, params)
    }
  }, [])

  return (
    <div className="gba:min-h-screen gba:bg-background gba:relative" data-testid={testId}>
      <div className="gba:relative gba:z-10">
        <HeroSection firstName={firstName} data-testid={`${testId}-hero`} />

        <QuickSearch
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchResults={displayItems}
          onItemClick={handleItemClick}
          isLoading={isLoading}
          data-testid={`${testId}-search`}
        />

        <EveryOfficeSection data-testid={`${testId}-office`} />

        <EveryOneSection data-testid={`${testId}-one`} />

        <EveryAISection data-testid={`${testId}-ai`} />

        <section className="gba:py-8 gba:px-6 gba:border-t gba:border-border gba:relative">
          <div className="gba:absolute gba:inset-0 gba:bg-background" />
          <div className="gba:relative gba:max-w-4xl gba:mx-auto gba:text-center">
            <p className="gba:text-muted-foreground">
              {t('footer-tagline-before')} <span className="gba:font-semibold gba:text-foreground">NEWWORK</span>{' '}
              {t('footer-tagline-after')}
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

export default CustomerHomeOffice
