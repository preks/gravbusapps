/**
 * SpacesHub - Main Spaces Listing Page
 *
 * Clean, professional layout following NEWWORK design system
 */

import React, { useState, useCallback, useMemo } from 'react'
import { Button, Input } from '@newwork/nw-design-system'
import { Plus, Search, LayoutDashboard } from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo } from '@/common/utils/navigationUtils'

// Components
import { SpaceCard } from './components/SpaceCard'
import { CreateSpaceDialog } from './components/CreateSpaceDialog'
import { SpaceHeroBackground } from './components/SpaceHeroBackground'

const hubHostedVideoUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_SPACES_HUB_VIDEO_URL
const hubLocalVideoUrl = '/space-hub-background.mp4'
const hubUseVideo =
  hubHostedVideoUrl || (typeof import.meta !== 'undefined' && import.meta.env?.DEV && hubLocalVideoUrl)
const hubVideoSrc = hubHostedVideoUrl || hubLocalVideoUrl

// Hooks
import { useSpaces } from './hooks/useSpaces'
import type { CreateSpaceInput } from './types/space.types'

export interface SpacesHubProps extends BusinessAppContextProps {
  /** Open a specific space in detail view (handled by SpacesRouter) */
  onOpenSpace: (spaceId: string) => void
  'data-testid'?: string
}

type FilterType = 'all' | 'owned' | 'shared'

export const SpacesHub: React.FC<SpacesHubProps> = ({
  accessToken,
  userInfo,
  onOpenSpace,
  'data-testid': testId = 'spaces-hub'
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const currentUserId = userInfo?.id || userInfo?.employeeDetails?.employeeId || ''

  // Fetch spaces
  const { spaces, isLoading, error, createSpace, refresh } = useSpaces(accessToken, {
    includeMembers: true,
    includeContent: true,
    ownedOnly: filter === 'owned',
    sharedOnly: filter === 'shared'
  })

  // Filter and sort spaces
  const displaySpaces = useMemo(() => {
    let filtered = spaces

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        space => space.name.toLowerCase().includes(query) || space.description?.toLowerCase().includes(query)
      )
    }

    // Sort by recent
    return [...filtered].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [spaces, searchQuery])

  // Stats
  const stats = useMemo(
    () => ({
      total: spaces.length,
      owned: spaces.filter(s => s.ownerId === currentUserId).length,
      shared: spaces.filter(s => s.ownerId !== currentUserId).length
    }),
    [spaces, currentUserId]
  )

  // Handlers
  const handleCreateSpace = useCallback(
    async (input: CreateSpaceInput) => {
      const space = await createSpace(input)
      if (space) {
        const urlParams = new URLSearchParams(window.location.search)
        urlParams.set('spaceId', space.id)
        const newUrl = `${window.location.pathname}?${urlParams.toString()}`
        window.history.pushState({ spaceId: space.id }, '', newUrl)
        onOpenSpace(space.id)
      }
    },
    [createSpace, onOpenSpace]
  )

  const handleSpaceClick = useCallback(
    (spaceId: string) => {
      const urlParams = new URLSearchParams(window.location.search)
      urlParams.set('spaceId', spaceId)
      const newUrl = `${window.location.pathname}?${urlParams.toString()}`
      window.history.pushState({ spaceId }, '', newUrl)
      onOpenSpace(spaceId)
    },
    [onOpenSpace]
  )

  return (
    <div className="gba:min-h-screen gba:bg-background" data-testid={testId}>
      {/* Hero: same visual weight as Space detail – entry page impact */}
      <header className="gba:relative gba:overflow-hidden gba:min-h-96">
        {hubUseVideo ? (
          <video
            src={hubVideoSrc}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            className="gba:absolute gba:inset-0 gba:w-full gba:h-full gba:object-cover gba:pointer-events-none"
            aria-hidden
            data-testid="spaces-hub-video"
          />
        ) : (
          <SpaceHeroBackground />
        )}
        {/* Overlay for text readability */}
        {/* eslint-disable newwork-local/no-hardcoded-colors */}
        <div
          className="gba:absolute gba:inset-0 gba:pointer-events-none"
          style={{
            background: `linear-gradient(105deg, rgba(15, 23, 42, 0.38) 0%, rgba(15, 23, 42, 0.12) 40%, transparent 60%)`
          }}
          aria-hidden
        />
        {/* eslint-enable newwork-local/no-hardcoded-colors */}
        <div className="gba:relative gba:max-w-7xl gba:mx-auto gba:px-6 gba:pt-12 gba:pb-14">
          {/* Title block – big and confident like Space detail */}
          <div className="gba:flex gba:items-start gba:justify-between gba:gap-6 gba:mb-10">
            <div>
              <h1 className="gba:font-funnel-display gba:text-4xl gba:sm:text-5xl gba:lg:text-6xl gba:font-semibold gba:text-white gba:tracking-tight gba:mb-3">
                Spaces
              </h1>
              <p className="gba:text-lg gba:text-white/80 gba:max-w-xl gba:mb-6">
                Collaborative workspaces for your team. Documents, notes, and spreadsheets in one place.
              </p>
              <div className="gba:flex gba:items-center gba:gap-4 gba:text-sm gba:text-white/60">
                <span data-testid={`${testId}-stat-total`}>
                  {stats.total} space{stats.total !== 1 ? 's' : ''}
                </span>
                {stats.owned > 0 && (
                  <span>
                    {stats.owned} yours
                    {stats.shared > 0 ? ` · ${stats.shared} shared with you` : ''}
                  </span>
                )}
              </div>
            </div>
            <div className="gba:flex gba:items-center gba:gap-3 gba:shrink-0">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => navigateTo('/platform/every-office')}
                className="gba:gap-2 gba:rounded-xl gba:bg-white/10 gba:text-white gba:border-white/20 hover:gba:bg-white/20"
                data-testid={`${testId}-every-office-link`}
              >
                <LayoutDashboard className="gba:w-5 gba:h-5" />
                Every Office
              </Button>
              <Button
                size="lg"
                onClick={() => setCreateDialogOpen(true)}
                className="spaces-hero-cta-btn gba:gap-2 gba:rounded-xl gba:bg-white gba:text-primary gba:font-medium gba:transition-colors"
                data-testid={`${testId}-create-button`}
              >
                <Plus className="gba:w-5 gba:h-5" />
                Create Space
              </Button>
            </div>
          </div>

          {/* Search & Filters – clear bar below the hero message */}
          <div className="gba:flex gba:flex-col gba:sm:flex-row gba:gap-4">
            <div className="gba:relative gba:flex-1">
              <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-white/50" />
              <Input
                placeholder="Search spaces..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="gba:pl-9 gba:h-11 gba:bg-white/10 gba:border-white/20 gba:text-white placeholder:gba:text-white/50 focus:gba:border-white/40"
                data-testid={`${testId}-search`}
              />
            </div>
            <div className="gba:flex gba:gap-1 gba:p-1 gba:bg-white/10 gba:rounded-xl gba:backdrop-blur-sm">
              {(['all', 'owned', 'shared'] as FilterType[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`gba:px-4 gba:py-2.5 gba:text-sm gba:font-medium gba:rounded-lg gba:transition-colors ${
                    filter === f
                      ? 'gba:bg-white gba:text-primary'
                      : 'gba:text-white/80 hover:gba:text-white hover:gba:bg-white/15'
                  }`}
                  data-testid={`${testId}-filter-${f}`}
                >
                  {f === 'all' ? 'All' : f === 'owned' ? 'Owned' : 'Shared'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="gba:max-w-7xl gba:mx-auto gba:px-6 gba:py-8">
        {/* Loading State */}
        {isLoading && (
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="gba:h-48 gba:rounded-lg gba:bg-card gba:animate-pulse" />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="gba:text-center gba:py-16">
            <p className="gba:text-sm gba:text-destructive gba:mb-4">{error}</p>
            <Button onClick={refresh} variant="secondary">
              Try Again
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && displaySpaces.length === 0 && (
          <div className="gba:text-center gba:py-16">
            <h3 className="gba:text-lg gba:font-medium gba:text-foreground gba:mb-2">
              {searchQuery ? 'No spaces found' : 'No spaces yet'}
            </h3>
            <p className="gba:text-sm gba:text-muted-foreground gba:mb-6 gba:max-w-sm gba:mx-auto">
              {searchQuery
                ? 'Try adjusting your search to find what you are looking for'
                : 'Create a space to start organizing your team content'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setCreateDialogOpen(true)} className="gba:gap-2">
                <Plus className="gba:w-4 gba:h-4" />
                Create Space
              </Button>
            )}
          </div>
        )}

        {/* Spaces Grid */}
        {!isLoading && !error && displaySpaces.length > 0 && (
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-4">
            {displaySpaces.map(space => (
              <SpaceCard
                key={space.id}
                space={space}
                onClick={() => handleSpaceClick(space.id)}
                isOwner={space.ownerId === currentUserId}
                data-testid={`${testId}-space-card-${space.id}`}
              />
            ))}
          </div>
        )}
      </main>

      {/* Create Space Dialog */}
      <CreateSpaceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreate={handleCreateSpace}
        accessToken={accessToken}
        currentUserId={currentUserId}
        data-testid={`${testId}-create-dialog`}
      />
    </div>
  )
}

export default SpacesHub
