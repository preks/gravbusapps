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

// Components
import {
  ContentBackground,
  HeroSection,
  AppCard,
  QuickActions,
  ActivityVisualization,
  RecentItems
} from './components'

// Hooks
import { useDeskData, type ContentItem } from './hooks/useDeskData'

export interface DeskHubProps extends BusinessAppContextProps {
  'data-testid'?: string
}

/**
 * Navigate to a specific app screen
 */
const navigateToApp = (appPath: string, params?: Record<string, string>) => {
  const baseUrl = window.location.origin
  const searchParams = new URLSearchParams({ app: appPath })

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      searchParams.set(key, value)
    })
  }

  window.location.href = `${baseUrl}?${searchParams.toString()}`
}

/**
 * Every Desk Component - Premium Edition
 */
export const DeskHub: React.FC<DeskHubProps> = ({
  accessToken,
  userInfo,
  'data-testid': testId = 'desk-hub'
}) => {
  const [searchQuery, setSearchQuery] = useState('')

  // Get current user ID
  const currentUserId = userInfo?.id || userInfo?.employeeDetails?.employeeId || ''

  // Fetch data from all three apps
  const { recentItems, isLoading, stats, activityData } = useDeskData(accessToken, currentUserId)

  // Filter recent items based on search
  const filteredRecentItems = useMemo(() => {
    if (!searchQuery.trim()) return recentItems

    const query = searchQuery.toLowerCase()
    return recentItems.filter(item => item.title.toLowerCase().includes(query))
  }, [recentItems, searchQuery])

  // Navigation handlers
  const handleOpenDocuments = useCallback(() => {
    navigateToApp('platform/apps/document-apps')
  }, [])

  const handleOpenSpreadsheets = useCallback(() => {
    navigateToApp('platform/apps/spreadsheet-apps')
  }, [])

  const handleOpenNotes = useCallback(() => {
    navigateToApp('platform/apps/note-apps')
  }, [])

  const handleCreateDocument = useCallback(() => {
    navigateToApp('platform/apps/document-apps', { action: 'new' })
  }, [])

  const handleCreateSpreadsheet = useCallback(() => {
    navigateToApp('platform/apps/spreadsheet-apps', { action: 'upload' })
  }, [])

  const handleCreateNote = useCallback(() => {
    navigateToApp('platform/apps/note-apps', { action: 'new' })
  }, [])

  // Handle item click - navigate to the specific item
  const handleItemClick = useCallback((item: ContentItem) => {
    switch (item.type) {
      case 'document':
        navigateToApp('platform/apps/document-apps', { docId: item.id, view: 'editor' })
        break
      case 'spreadsheet':
        navigateToApp('platform/apps/spreadsheet-apps', { appId: item.id, view: 'viewer' })
        break
      case 'note':
        navigateToApp('platform/apps/note-apps', { noteId: item.id, view: 'editor' })
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

        {/* Recent Items */}
        <RecentItems
          items={filteredRecentItems}
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
