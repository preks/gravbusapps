/**
 * Every Desk - Premium Unified Content Hub
 *
 * The central hub for all content creation apps:
 * Documents, Spreadsheets, and Notes.
 *
 * Design inspired by NEWWORK CREATE with premium animations,
 * floating backgrounds, and interactive visualizations.
 */

import React, { useState, useCallback, useMemo } from 'react'
import {
  FileText,
  FileSpreadsheet,
  StickyNote,
  MessageSquare,
  Presentation,
  HardDrive,
  PenTool,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import {
  Button,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  useTranslation
} from '@newwork/nw-design-system'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'

// Components
import {
  ContentBackground,
  HeroSection,
  AppCard,
  QuickActions,
  NexusTeaser,
  ActivityVisualization,
  RecentItems
} from './components'
import { DocumentChat } from './components/chat/DocumentChat'
import deskTranslations from './_i18n'

// Hooks
import { useDeskData, type ContentItem } from './hooks/useDeskData'

// Spaces integration
import { useSpaces } from '@/business-apps/platform/apps/spaces/hooks/useSpaces'
import { SpaceCard } from '@/business-apps/platform/apps/spaces/components/SpaceCard'

export interface DeskHubProps extends BusinessAppContextProps {
  'data-testid'?: string
}

/**
 * Navigate to a specific app screen using platform URLs
 * Use canonical Every Office routes and let navigationUtils map them in dev.
 */
const navigateToApp = (appPath: string, params?: Record<string, string>) => {
  // Extract just the app name (e.g., 'document-apps' from 'platform/apps/document-apps' or 'document-apps')
  const appName = appPath.replace(/^\/?platform\/apps\//, '')

  const platformUrl =
    appName === 'document-apps'
      ? '/platform/every-office/documents'
      : appName === 'spreadsheet-apps'
        ? '/platform/every-office/spreadsheets'
        : appName === 'note-apps'
          ? '/platform/every-office/notes'
          : appName === 'slide-apps'
            ? '/platform/every-office/slides'
            : appName === 'whiteboard-apps'
              ? '/platform/every-office/whiteboards'
              : appName === 'drive-apps'
                ? '/platform/every-office/drive'
                : `/platform/apps/${appName}`
  const urlParams = params?.from ? params : { from: 'desk', ...params }
  navigateTo(buildPlatformUrl(platformUrl, urlParams))
}

/**
 * Every Desk Component - Premium Edition
 */
export const DeskHub: React.FC<DeskHubProps> = ({ accessToken, userInfo, 'data-testid': testId = 'desk-hub' }) => {
  const { t } = useTranslation(deskTranslations)
  const previewFeature = useFeature<boolean>(Feature.Preview.Enabled.Key)
  const previewEnabled = previewFeature === true
  const [searchQuery, setSearchQuery] = useState('')
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatScope, setChatScope] = useState<'all' | 'space'>('all')
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null)
  const [isAppsCollapsed, setIsAppsCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem('desk-apps-collapsed')
      return stored ? JSON.parse(stored) : false
    } catch {
      return false
    }
  })

  // Get current user ID
  const currentUserId = userInfo?.id || userInfo?.employeeDetails?.employeeId || ''

  // Fetch data from all content apps
  const { documents, spreadsheets, notes, slides, whiteboards, recentItems, isLoading, stats, activityData } =
    useDeskData(accessToken, currentUserId)

  // Fetch spaces
  const { spaces } = useSpaces(accessToken, {
    includeMembers: true,
    includeContent: true,
    autoLoad: true
  })

  const activityStats = useMemo(
    () =>
      previewEnabled
        ? stats
        : {
            ...stats,
            whiteboards: { total: 0, shared: 0 }
          },
    [previewEnabled, stats]
  )

  const activityDataWithoutWhiteboards = useMemo(
    () => (previewEnabled ? activityData : activityData.map(day => ({ ...day, whiteboards: 0 }))),
    [activityData, previewEnabled]
  )

  // Combine all items for search
  const allItems = useMemo(() => {
    return [...documents, ...spreadsheets, ...notes, ...slides, ...whiteboards].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  }, [documents, spreadsheets, notes, slides, whiteboards])

  // Filter items based on search - search all items when searching, show recent when not
  const displayItems = useMemo(() => {
    if (!searchQuery.trim()) return recentItems

    const query = searchQuery.toLowerCase()
    return allItems.filter(item => item.title.toLowerCase().includes(query))
  }, [allItems, recentItems, searchQuery])

  // Navigation handlers
  const handleOpenDocuments = useCallback(() => {
    navigateToApp('document-apps')
  }, [])

  const handleOpenSpreadsheets = useCallback(() => {
    navigateToApp('spreadsheet-apps')
  }, [])

  const handleOpenNotes = useCallback(() => {
    navigateToApp('note-apps')
  }, [])

  const handleCreateDocument = useCallback(() => {
    navigateToApp('document-apps', { action: 'new' })
  }, [])

  const handleCreateSpreadsheet = useCallback(() => {
    navigateToApp('spreadsheet-apps', { action: 'upload' })
  }, [])

  const handleCreateNote = useCallback(() => {
    navigateToApp('note-apps', { action: 'new' })
  }, [])

  const handleOpenSlides = useCallback(() => {
    navigateToApp('slide-apps')
  }, [])

  const handleCreateSlide = useCallback(() => {
    navigateToApp('slide-apps', { action: 'new' })
  }, [])

  const handleOpenWhiteboards = useCallback(() => {
    navigateToApp('whiteboard-apps')
  }, [])

  const handleCreateWhiteboard = useCallback(() => {
    navigateToApp('whiteboard-apps', { action: 'new' })
  }, [])

  const handleOpenDrive = useCallback(() => {
    navigateToApp('drive-apps')
  }, [])

  const handleOpenSpaces = useCallback(() => {
    navigateTo(buildPlatformUrl('/platform/every-office/spaces'))
  }, [])

  const toggleAppsCollapse = useCallback(() => {
    setIsAppsCollapsed((prev: boolean) => {
      const newValue = !prev
      localStorage.setItem('desk-apps-collapsed', JSON.stringify(newValue))
      return newValue
    })
  }, [])

  const handleSpaceClick = useCallback((spaceId: string) => {
    navigateTo(buildPlatformUrl('/platform/every-office/spaces', { spaceId, from: 'desk' }))
  }, [])

  // Handle item click - navigate to the specific item
  const handleItemClick = useCallback((item: ContentItem) => {
    switch (item.type) {
      case 'document':
        navigateToApp('document-apps', { docId: item.id, view: 'editor' })
        break
      case 'spreadsheet':
        navigateToApp('spreadsheet-apps', { appId: item.id, view: 'viewer' })
        break
      case 'note':
        navigateToApp('note-apps', { noteId: item.id, view: 'editor' })
        break
      case 'slide':
        navigateToApp('slide-apps', { slideId: item.id, view: 'editor' })
        break
      case 'whiteboard':
        navigateToApp('whiteboard-apps', { whiteboardId: item.id })
        break
    }
  }, [])

  return (
    <div className="gba:min-h-screen gba:bg-background gba:relative" data-testid={testId}>
      {/* Animated Content Background */}
      <div className="gba:fixed gba:inset-0 gba:pointer-events-none gba:z-0 gba:overflow-hidden">
        <ContentBackground />
      </div>

      {/* Content layer */}
      <div className="gba:relative gba:z-10">
        {/* Hero Section */}
        <HeroSection data-testid={`${testId}-hero`} />

        {/* Quick Actions - Search & Create */}
        <QuickActions
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onCreateDocument={handleCreateDocument}
          onCreateSpreadsheet={handleCreateSpreadsheet}
          onCreateNote={handleCreateNote}
          onCreateSlide={handleCreateSlide}
          onCreateWhiteboard={handleCreateWhiteboard}
          searchResults={displayItems}
          onItemClick={handleItemClick}
          isLoading={isLoading}
          accessToken={accessToken}
          data-testid={`${testId}-quick-actions`}
        />

        {/* Nexus Teaser */}
        {previewEnabled && <NexusTeaser data-testid={`${testId}-nexus-teaser`} />}

        {/* Spaces Section */}
        {spaces.length > 0 && (
          <section
            className="gba:py-6 gba:px-6 gba:relative"
            data-testid={`${testId}-spaces-section`}
            style={{ animation: 'fadeInUp 0.6s ease-out 0.3s both' }}
          >
            <div className="gba:absolute gba:inset-0 gba:bg-background" />

            <div className="gba:relative gba:max-w-6xl gba:mx-auto">
              {/* Section header – aligned with Your Spaces */}
              <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
                <div>
                  <button
                    type="button"
                    onClick={handleOpenSpaces}
                    className="desk-section-title gba:text-2xl gba:sm:text-3xl gba:font-semibold gba:mb-2 gba:block gba:text-left gba:w-full gba:bg-transparent gba:border-0 gba:cursor-pointer hover:gba:opacity-90 gba:transition-opacity focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-primary focus:gba:ring-offset-2 gba:rounded"
                    data-testid={`${testId}-spaces-section-title`}
                  >
                    {t('spaces-title')}
                  </button>
                  <p className="gba:text-muted-foreground">{t('spaces-subtitle')}</p>
                </div>
              </div>

              {/* Spaces slider – touch-friendly, works on iPad and mobile */}
              <Carousel
                opts={{ align: 'start', loop: false }}
                className="gba:w-full gba:overflow-hidden"
                data-testid={`${testId}-spaces-carousel`}
              >
                <CarouselContent className="gba:-ml-2 gba:md:-ml-4 gba:items-stretch">
                  {spaces.map((space, index) => (
                    <CarouselItem
                      key={space.id}
                      className="gba:pl-2 gba:md:pl-4 gba:!min-w-[280px] gba:!flex-[0_0_280px] gba:flex"
                      style={{ animation: `fadeInUp 0.4s ease-out ${index * 0.05}s both` }}
                    >
                      <SpaceCard
                        space={space}
                        onClick={() => handleSpaceClick(space.id)}
                        isOwner={space.ownerId === currentUserId}
                        data-testid={`${testId}-space-card-${space.id}`}
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {spaces.length > 1 && (
                  <>
                    <CarouselPrevious className="gba:left-0 gba:border gba:bg-card hover:gba:bg-accent" />
                    <CarouselNext className="gba:right-0 gba:border gba:bg-card hover:gba:bg-accent" />
                  </>
                )}
              </Carousel>
            </div>
          </section>
        )}

        {/* App Cards Section */}
        <section
          className="gba:py-6 gba:px-6 gba:relative"
          data-testid={`${testId}-apps-section`}
          style={{ animation: 'fadeInUp 0.6s ease-out 0.4s both' }}
        >
          <div className="gba:absolute gba:inset-0 gba:bg-background" />

          <div className="gba:relative gba:max-w-6xl gba:mx-auto">
            {/* Section header – aligned with Your Spaces */}
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
              <div>
                <h2 className="desk-section-title gba:text-2xl gba:sm:text-3xl gba:font-semibold gba:mb-2">
                  {t('your-work-title')}
                </h2>
                <p className="gba:text-muted-foreground">{t('your-work-subtitle')}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAppsCollapse}
                className="gba:flex-shrink-0"
                data-testid={`${testId}-toggle-apps`}
              >
                {isAppsCollapsed ? (
                  <ChevronDown className="gba:w-5 gba:h-5" />
                ) : (
                  <ChevronUp className="gba:w-5 gba:h-5" />
                )}
              </Button>
            </div>

            {/* App cards grid - collapsible */}
            {!isAppsCollapsed && (
              <div className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:lg:grid-cols-3 gba:xl:grid-cols-6 gba:gap-4">
                <AppCard
                  title={t('app-documents-title')}
                  description={t('app-documents-description')}
                  icon={FileText}
                  count={stats.documents.total}
                  sharedCount={stats.documents.shared}
                  accentColor="sky"
                  onOpen={handleOpenDocuments}
                  onCreate={handleCreateDocument}
                  isLoading={isLoading}
                  animationDelay={0.1}
                  data-testid={`${testId}-app-documents`}
                />
                <AppCard
                  title={t('app-spreadsheets-title')}
                  description={t('app-spreadsheets-description')}
                  icon={FileSpreadsheet}
                  count={stats.spreadsheets.total}
                  sharedCount={stats.spreadsheets.shared}
                  accentColor="teal"
                  onOpen={handleOpenSpreadsheets}
                  onCreate={handleCreateSpreadsheet}
                  isLoading={isLoading}
                  animationDelay={0.2}
                  data-testid={`${testId}-app-spreadsheets`}
                />
                <AppCard
                  title={t('app-notes-title')}
                  description={t('app-notes-description')}
                  icon={StickyNote}
                  count={stats.notes.total}
                  sharedCount={stats.notes.shared}
                  accentColor="amber"
                  onOpen={handleOpenNotes}
                  onCreate={handleCreateNote}
                  isLoading={isLoading}
                  animationDelay={0.3}
                  data-testid={`${testId}-app-notes`}
                />
                <AppCard
                  title={t('app-slides-title')}
                  description={t('app-slides-description')}
                  icon={Presentation}
                  count={stats.slides.total}
                  sharedCount={stats.slides.shared}
                  accentColor="primary"
                  onOpen={handleOpenSlides}
                  onCreate={handleCreateSlide}
                  isLoading={isLoading}
                  animationDelay={0.4}
                  data-testid={`${testId}-app-slides`}
                />
                {previewEnabled && (
                  <AppCard
                    title={t('app-whiteboards-title')}
                    description={t('app-whiteboards-description')}
                    icon={PenTool}
                    count={stats.whiteboards.total}
                    sharedCount={stats.whiteboards.shared}
                    accentColor="secondary"
                    onOpen={handleOpenWhiteboards}
                    onCreate={handleCreateWhiteboard}
                    isLoading={isLoading}
                    animationDelay={0.45}
                    data-testid={`${testId}-app-whiteboards`}
                  />
                )}
                <AppCard
                  title={t('app-drive-title')}
                  description={t('app-drive-description')}
                  icon={HardDrive}
                  count={stats.totalItems}
                  accentColor="decorative"
                  onOpen={handleOpenDrive}
                  onCreate={handleOpenDrive}
                  isLoading={isLoading}
                  animationDelay={0.5}
                  data-testid={`${testId}-app-drive`}
                />
              </div>
            )}
          </div>
        </section>

        {/* Activity Visualization */}
        <ActivityVisualization
          activityData={activityDataWithoutWhiteboards}
          stats={activityStats}
          isLoading={isLoading}
          showWhiteboards={previewEnabled}
          data-testid={`${testId}-activity`}
        />

        {/* Recent Items / Search Results */}
        <RecentItems
          items={displayItems}
          isLoading={isLoading}
          searchQuery={searchQuery}
          onItemClick={handleItemClick}
          onCreateDocument={handleCreateDocument}
          onCreateSpreadsheet={handleCreateSpreadsheet}
          onCreateNote={handleCreateNote}
          data-testid={`${testId}-recent`}
        />

        {/* Footer tagline */}
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

      {/* Floating Chat Button */}
      {previewEnabled && !isChatOpen && (
        <Button
          onClick={() => setIsChatOpen(true)}
          className="gba:fixed gba:right-6 gba:bottom-6 gba:h-14 gba:w-14 gba:rounded-full gba:z-50"
          size="default"
          data-testid={`${testId}-chat-toggle`}
        >
          <MessageSquare className="gba:h-6 gba:w-6" />
        </Button>
      )}

      {/* Document Chat Panel */}
      {previewEnabled && accessToken && currentUserId && (
        <DocumentChat
          userId={currentUserId}
          userName={
            `${userInfo?.employeeDetails?.firstName || ''} ${userInfo?.employeeDetails?.lastName || ''}`.trim() ||
            userInfo?.userName
          }
          isOpen={isChatOpen}
          accessToken={accessToken}
          scope={chatScope}
          spaceId={selectedSpaceId}
          spaces={spaces.map(s => ({ id: s.id, name: s.name }))}
          onScopeChange={setChatScope}
          onSpaceChange={setSelectedSpaceId}
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </div>
  )
}

export default DeskHub
