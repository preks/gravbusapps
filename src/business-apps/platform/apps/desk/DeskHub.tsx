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
import { FileText, FileSpreadsheet, StickyNote } from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'

// Components
import { ContentBackground, HeroSection, AppCard, QuickActions, ActivityVisualization, RecentItems } from './components'

// Hooks
import { useDeskData, type ContentItem } from './hooks/useDeskData'

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

  // Get current user ID
  const currentUserId = userInfo?.id || userInfo?.employeeDetails?.employeeId || ''

  // Fetch data from all three apps
  const { documents, spreadsheets, notes, recentItems, isLoading, stats, activityData } = useDeskData(
    accessToken,
    currentUserId
  )

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
    </div>
  )
}

export default DeskHub
