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
import { FileText, FileSpreadsheet, StickyNote, MessageSquare } from 'lucide-react'
import { Button } from '@newwork/nw-design-system'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'

// Components
import { ContentBackground, HeroSection, AppCard, QuickActions, ActivityVisualization, RecentItems } from './components'
import { DocumentChat } from './components/chat/DocumentChat'

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
 * Use pretty platform routes in production (e.g. /platform/documents),
 * and /platform/apps/* in development so navigationUtils can map to ?app=...
 */
const navigateToApp = (appPath: string, params?: Record<string, string>) => {
  // Extract just the app name (e.g., 'document-apps' from 'platform/apps/document-apps' or 'document-apps')
  const appName = appPath.replace(/^\/?platform\/apps\//, '')
  const isProduction = process.env.NODE_ENV === 'production'

  const platformUrl =
    appName === 'document-apps'
      ? isProduction
        ? '/platform/documents'
        : '/platform/apps/document-apps'
      : appName === 'spreadsheet-apps'
        ? isProduction
          ? '/platform/spreadsheets'
          : '/platform/apps/spreadsheet-apps'
        : appName === 'note-apps'
          ? isProduction
            ? '/platform/notes'
            : '/platform/apps/note-apps'
          : `/platform/apps/${appName}`
  const urlParams = params?.from ? params : { from: 'desk', ...params }
  navigateTo(buildPlatformUrl(platformUrl, urlParams))
}

/**
 * Every Desk Component - Premium Edition
 */
export const DeskHub: React.FC<DeskHubProps> = ({ accessToken, userInfo, 'data-testid': testId = 'desk-hub' }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatScope, setChatScope] = useState<'all' | 'space'>('all')
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null)

  // Get current user ID
  const currentUserId = userInfo?.id || userInfo?.employeeDetails?.employeeId || ''

  // Fetch data from all three apps
  const { documents, spreadsheets, notes, recentItems, isLoading, stats, activityData } = useDeskData(
    accessToken,
    currentUserId
  )

  // Fetch spaces
  const { spaces } = useSpaces(accessToken, {
    includeMembers: true,
    includeContent: true,
    autoLoad: true
  })

  // Combine all items for search
  const allItems = useMemo(() => {
    return [...documents, ...spreadsheets, ...notes].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  }, [documents, spreadsheets, notes])

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

  const handleOpenSpaces = useCallback(() => {
    const isProduction = process.env.NODE_ENV === 'production'
    const url = isProduction ? '/platform/spaces' : '/platform/apps/spaces'
    navigateTo(buildPlatformUrl(url))
  }, [])

  const handleSpaceClick = useCallback((spaceId: string) => {
    // Navigate to spaces screen with spaceId param
    // Use /platform/apps/spaces directly since /platform/spaces alias doesn't support query params
    navigateTo(buildPlatformUrl('/platform/apps/spaces', { spaceId, from: 'desk' }))
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
          searchResults={displayItems}
          onItemClick={handleItemClick}
          isLoading={isLoading}
          accessToken={accessToken}
          data-testid={`${testId}-quick-actions`}
        />

        {/* Spaces Section */}
        {spaces.length > 0 && (
          <section
            className="gba:py-6 gba:px-6 gba:relative"
            data-testid={`${testId}-spaces-section`}
            style={{ animation: 'fadeInUp 0.6s ease-out 0.3s both' }}
          >
            <div className="gba:absolute gba:inset-0 gba:bg-background" />

            <div className="gba:relative gba:max-w-6xl gba:mx-auto">
              {/* Section header */}
              <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
                <div>
                  <h2 className="gba:text-2xl gba:sm:text-3xl gba:font-bold gba:mb-2">
                    <span className="gba:bg-gradient-to-r gba:from-sky-500 gba:via-cyan-500 gba:to-teal-500 gba:bg-clip-text gba:text-transparent">
                      Your Spaces
                    </span>
                  </h2>
                  <p className="gba:text-muted-foreground">Collaborative workspaces for your team</p>
                </div>
                <button
                  onClick={handleOpenSpaces}
                  className="gba:text-primary gba:font-medium gba:text-sm hover:gba:underline"
                >
                  View all
                </button>
              </div>

              {/* Spaces grid */}
              <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4">
                {spaces.slice(0, 3).map((space, index) => (
                  <div key={space.id} style={{ animation: `fadeInUp 0.4s ease-out ${index * 0.1}s both` }}>
                    <SpaceCard
                      space={space}
                      onClick={() => handleSpaceClick(space.id)}
                      isOwner={space.ownerId === currentUserId}
                      data-testid={`${testId}-space-card-${space.id}`}
                    />
                  </div>
                ))}
              </div>
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
            {/* Section header */}
            <div className="gba:text-center gba:mb-6">
              <h2 className="gba:text-2xl gba:sm:text-3xl gba:font-bold gba:text-foreground gba:mb-2">
                Your workspace
              </h2>
              <p className="gba:text-muted-foreground gba:max-w-xl gba:mx-auto">
                Access your documents, spreadsheets, and notes in one place
              </p>
            </div>

            {/* App cards grid */}
            <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4">
              <AppCard
                title="Documents"
                description="Create and edit rich text documents with collaboration"
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
                title="Spreadsheets"
                description="Build data apps with formulas, charts, and AI analysis"
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
                title="Notes"
                description="Capture ideas quickly with rich formatting and tags"
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
            </div>
          </div>
        </section>

        {/* Activity Visualization */}
        <ActivityVisualization
          activityData={activityData}
          stats={stats}
          isLoading={isLoading}
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
              Part of the <span className="gba:font-semibold gba:text-foreground">NEWWORK</span> platform. Your content,
              unified.
            </p>
          </div>
        </section>
      </div>

      {/* Floating Chat Button */}
      {!isChatOpen && (
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
      {isChatOpen && accessToken && currentUserId && (
        <DocumentChat
          userId={currentUserId}
          userName={
            `${userInfo?.employeeDetails?.firstName || ''} ${userInfo?.employeeDetails?.lastName || ''}`.trim() ||
            userInfo?.userName
          }
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
