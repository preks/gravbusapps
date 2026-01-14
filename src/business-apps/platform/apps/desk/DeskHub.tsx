/**
 * Every Desk - Unified Content Hub
 *
 * The central hub for all content creation apps:
 * Documents, Spreadsheets, and Notes.
 */

import React, { useState, useCallback, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Badge,
  Spinner
} from '@newwork/nw-design-system'
import {
  FileText,
  FileSpreadsheet,
  StickyNote,
  Plus,
  Search,
  ArrowRight,
  TrendingUp,
  Layers,
  ChevronRight
} from 'lucide-react'
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip } from 'recharts'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

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
 * Format relative time
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

// Chart colors
const CHART_COLORS = {
  documents: '#0284c7', // sky-600
  spreadsheets: '#0d9488', // teal-600
  notes: '#d97706' // amber-600
}

/**
 * Every Desk Component
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

  // Prepare distribution data for pie-like visualization
  const distributionData = useMemo(
    () => [
      { name: 'Documents', value: stats.documents.total, color: CHART_COLORS.documents },
      { name: 'Spreadsheets', value: stats.spreadsheets.total, color: CHART_COLORS.spreadsheets },
      { name: 'Notes', value: stats.notes.total, color: CHART_COLORS.notes }
    ],
    [stats]
  )

  return (
    <div className="gba:min-h-full gba:bg-background" data-testid={testId}>
      {/* Header */}
      <div className="gba:border-b gba:bg-card">
        <div className="gba:max-w-7xl gba:mx-auto gba:px-6 gba:py-6">
          <div className="gba:flex gba:items-center gba:justify-between">
            <div className="gba:flex gba:items-center gba:gap-3">
              <div className="gba:w-10 gba:h-10 gba:rounded-lg gba:bg-foreground gba:flex gba:items-center gba:justify-center">
                <Layers className="gba:w-5 gba:h-5 gba:text-background" />
              </div>
              <div>
                <h1 className="gba:text-xl gba:font-semibold gba:text-foreground">Every Desk</h1>
                <p className="gba:text-xs gba:text-muted-foreground">Your content, one place</p>
              </div>
            </div>

            {/* Search */}
            <div className="gba:relative gba:w-64">
              <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="gba:pl-9 gba:h-9"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="gba:max-w-7xl gba:mx-auto gba:px-6 gba:py-6">
        <div className="gba:grid gba:grid-cols-12 gba:gap-6">
          {/* Left Column - Stats & Chart */}
          <div className="gba:col-span-12 gba:lg:col-span-4 gba:space-y-6">
            {/* Stats Overview */}
            <Card>
              <CardHeader className="gba:pb-2">
                <CardTitle className="gba:text-sm gba:font-medium gba:text-muted-foreground">Overview</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="gba:flex gba:justify-center gba:py-8">
                    <Spinner size="lg" />
                  </div>
                ) : (
                  <>
                    <div className="gba:text-4xl gba:font-bold gba:text-foreground gba:mb-1">{stats.totalItems}</div>
                    <p className="gba:text-sm gba:text-muted-foreground gba:mb-6">Total items in your desk</p>

                    {/* Distribution bars */}
                    <div className="gba:space-y-3">
                      {distributionData.map(item => (
                        <div key={item.name} className="gba:flex gba:items-center gba:gap-3">
                          <div
                            className="gba:w-2 gba:h-2 gba:rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="gba:text-sm gba:text-muted-foreground gba:flex-1">{item.name}</span>
                          <span className="gba:text-sm gba:font-medium gba:text-foreground">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Activity Chart */}
            <Card>
              <CardHeader className="gba:pb-2">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <TrendingUp className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                  <CardTitle className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                    7-Day Activity
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="gba:flex gba:justify-center gba:py-8">
                    <Spinner />
                  </div>
                ) : (
                  <div className="gba:h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={activityData} barGap={1}>
                        <XAxis
                          dataKey="day"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="gba:bg-popover gba:border gba:rounded-lg gba:px-3 gba:py-2 gba:shadow-lg">
                                  <p className="gba:text-xs gba:font-medium gba:text-foreground gba:mb-1">{label}</p>
                                  {payload.map((entry: any) => (
                                    <p key={entry.name} className="gba:text-xs gba:text-muted-foreground">
                                      {entry.name}: {entry.value}
                                    </p>
                                  ))}
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Bar dataKey="documents" stackId="a" fill={CHART_COLORS.documents} radius={[0, 0, 0, 0]} />
                        <Bar dataKey="spreadsheets" stackId="a" fill={CHART_COLORS.spreadsheets} radius={[0, 0, 0, 0]} />
                        <Bar dataKey="notes" stackId="a" fill={CHART_COLORS.notes} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Apps & Recent */}
          <div className="gba:col-span-12 gba:lg:col-span-8 gba:space-y-6">
            {/* App Cards */}
            <div className="gba:grid gba:grid-cols-3 gba:gap-4">
              {/* Documents */}
              <Card
                className="gba:group gba:cursor-pointer gba:transition-all hover:gba:shadow-md hover:gba:border-sky-500/50"
                onClick={handleOpenDocuments}
              >
                <CardContent className="gba:p-4">
                  <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
                    <div className="gba:w-10 gba:h-10 gba:rounded-lg gba:bg-sky-600 gba:flex gba:items-center gba:justify-center">
                      <FileText className="gba:w-5 gba:h-5 gba:text-white" />
                    </div>
                    <ChevronRight className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity" />
                  </div>
                  <h3 className="gba:font-medium gba:text-foreground gba:mb-0.5">Documents</h3>
                  <p className="gba:text-xs gba:text-muted-foreground gba:mb-3">Rich text editing</p>
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <span className="gba:text-lg gba:font-semibold gba:text-foreground">
                      {isLoading ? '-' : stats.documents.total}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gba:h-7 gba:px-2"
                      onClick={e => {
                        e.stopPropagation()
                        handleCreateDocument()
                      }}
                    >
                      <Plus className="gba:w-3.5 gba:h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Spreadsheets */}
              <Card
                className="gba:group gba:cursor-pointer gba:transition-all hover:gba:shadow-md hover:gba:border-teal-500/50"
                onClick={handleOpenSpreadsheets}
              >
                <CardContent className="gba:p-4">
                  <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
                    <div className="gba:w-10 gba:h-10 gba:rounded-lg gba:bg-teal-600 gba:flex gba:items-center gba:justify-center">
                      <FileSpreadsheet className="gba:w-5 gba:h-5 gba:text-white" />
                    </div>
                    <ChevronRight className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity" />
                  </div>
                  <h3 className="gba:font-medium gba:text-foreground gba:mb-0.5">Spreadsheets</h3>
                  <p className="gba:text-xs gba:text-muted-foreground gba:mb-3">Data & calculations</p>
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <span className="gba:text-lg gba:font-semibold gba:text-foreground">
                      {isLoading ? '-' : stats.spreadsheets.total}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gba:h-7 gba:px-2"
                      onClick={e => {
                        e.stopPropagation()
                        handleCreateSpreadsheet()
                      }}
                    >
                      <Plus className="gba:w-3.5 gba:h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              <Card
                className="gba:group gba:cursor-pointer gba:transition-all hover:gba:shadow-md hover:gba:border-amber-500/50"
                onClick={handleOpenNotes}
              >
                <CardContent className="gba:p-4">
                  <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
                    <div className="gba:w-10 gba:h-10 gba:rounded-lg gba:bg-amber-600 gba:flex gba:items-center gba:justify-center">
                      <StickyNote className="gba:w-5 gba:h-5 gba:text-white" />
                    </div>
                    <ChevronRight className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity" />
                  </div>
                  <h3 className="gba:font-medium gba:text-foreground gba:mb-0.5">Notes</h3>
                  <p className="gba:text-xs gba:text-muted-foreground gba:mb-3">Quick capture</p>
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <span className="gba:text-lg gba:font-semibold gba:text-foreground">
                      {isLoading ? '-' : stats.notes.total}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gba:h-7 gba:px-2"
                      onClick={e => {
                        e.stopPropagation()
                        handleCreateNote()
                      }}
                    >
                      <Plus className="gba:w-3.5 gba:h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Items */}
            <Card>
              <CardHeader className="gba:pb-3">
                <CardTitle className="gba:text-sm gba:font-medium gba:text-muted-foreground">Recent</CardTitle>
              </CardHeader>
              <CardContent className="gba:pt-0">
                {isLoading ? (
                  <div className="gba:flex gba:justify-center gba:py-8">
                    <Spinner size="lg" />
                  </div>
                ) : filteredRecentItems.length === 0 ? (
                  <div className="gba:text-center gba:py-8">
                    <p className="gba:text-muted-foreground gba:mb-4">
                      {searchQuery ? 'No items match your search.' : 'No recent items yet.'}
                    </p>
                    {!searchQuery && (
                      <div className="gba:flex gba:justify-center gba:gap-2">
                        <Button size="sm" variant="outline" onClick={handleCreateDocument}>
                          <FileText className="gba:w-4 gba:h-4 gba:mr-1.5" />
                          Document
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCreateSpreadsheet}>
                          <FileSpreadsheet className="gba:w-4 gba:h-4 gba:mr-1.5" />
                          Spreadsheet
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCreateNote}>
                          <StickyNote className="gba:w-4 gba:h-4 gba:mr-1.5" />
                          Note
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="gba:space-y-1">
                    {filteredRecentItems.map(item => {
                      const iconConfig = {
                        document: { icon: FileText, bg: 'gba:bg-sky-600' },
                        spreadsheet: { icon: FileSpreadsheet, bg: 'gba:bg-teal-600' },
                        note: { icon: StickyNote, bg: 'gba:bg-amber-600' }
                      }[item.type]

                      const Icon = iconConfig.icon

                      return (
                        <div
                          key={`${item.type}-${item.id}`}
                          className="gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2.5 gba:rounded-lg gba:cursor-pointer gba:transition-colors hover:gba:bg-muted/50 gba:group"
                          onClick={() => handleItemClick(item)}
                          data-testid={`${testId}-recent-item-${item.id}`}
                        >
                          <div
                            className={`gba:w-8 gba:h-8 gba:rounded-md ${iconConfig.bg} gba:flex gba:items-center gba:justify-center gba:flex-shrink-0`}
                          >
                            <Icon className="gba:w-4 gba:h-4 gba:text-white" />
                          </div>

                          <div className="gba:flex-1 gba:min-w-0">
                            <div className="gba:flex gba:items-center gba:gap-2">
                              <h4 className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">
                                {item.title || 'Untitled'}
                              </h4>
                              {item.isShared && (
                                <Badge variant="secondary" className="gba:text-[10px] gba:px-1.5 gba:py-0">
                                  Shared
                                </Badge>
                              )}
                            </div>
                            <p className="gba:text-xs gba:text-muted-foreground">{formatRelativeTime(item.updatedAt)}</p>
                          </div>

                          <ArrowRight className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity" />
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DeskHub
