/**
 * SpacesHub - Main Spaces Listing Page
 *
 * Clean, professional layout following NEWWORK design system
 */

import React, { useState, useCallback, useMemo } from 'react'
import { Button, Input } from '@newwork/nw-design-system'
import { Plus, Search } from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

// Components
import { SpaceCard } from './components/SpaceCard'
import { CreateSpaceDialog } from './components/CreateSpaceDialog'

// Hooks
import { useSpaces } from './hooks/useSpaces'
import type { CreateSpaceInput } from './types/space.types'

export interface SpacesHubProps extends BusinessAppContextProps {
  'data-testid'?: string
}

type FilterType = 'all' | 'owned' | 'shared'

export const SpacesHub: React.FC<SpacesHubProps> = ({
  accessToken,
  userInfo,
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
        window.dispatchEvent(new PopStateEvent('popstate', { state: { spaceId: space.id } }))
      }
    },
    [createSpace]
  )

  const handleSpaceClick = useCallback((spaceId: string) => {
    const urlParams = new URLSearchParams(window.location.search)
    urlParams.set('spaceId', spaceId)
    const newUrl = `${window.location.pathname}?${urlParams.toString()}`
    window.history.pushState({ spaceId }, '', newUrl)
    window.dispatchEvent(new PopStateEvent('popstate', { state: { spaceId } }))
  }, [])

  return (
    <div className="gba:min-h-screen gba:bg-background" data-testid={testId}>
      {/* Header with decorative gradient background */}
      {/* eslint-disable newwork-local/no-hardcoded-colors */}
      <header
        className="gba:relative"
        style={{
          backgroundColor: '#000021',
          backgroundImage: `
            radial-gradient(120% 120% at 72% 55%,
              #0076d0 0%,
              #0066c3 22%,
              #0052b0 38%,
              #003f9d 56%,
              #002787 70%,
              #001271 82%,
              #000021 100%
            ),
            linear-gradient(110deg,
              rgba(0, 0, 0, 0.92) 0%,
              rgba(0, 0, 0, 0.00) 46%
            )`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover'
        }}
      >
        {/* eslint-enable newwork-local/no-hardcoded-colors */}
        <div className="gba:max-w-7xl gba:mx-auto gba:px-6 gba:py-10">
          {/* Title & CTA */}
          <div className="gba:flex gba:items-center gba:justify-between gba:mb-8">
            <div>
              <h1 className="gba:text-3xl gba:font-semibold gba:text-white">Spaces</h1>
              <p className="gba:text-sm gba:text-white/60 gba:mt-1">
                {stats.total} space{stats.total !== 1 ? 's' : ''}
              </p>
            </div>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="gba:gap-2 gba:bg-white gba:text-primary hover:gba:bg-white/90"
              data-testid={`${testId}-create-button`}
            >
              <Plus className="gba:w-4 gba:h-4" />
              Create Space
            </Button>
          </div>

          {/* Search & Filters */}
          <div className="gba:flex gba:flex-col gba:sm:flex-row gba:gap-4">
            {/* Search */}
            <div className="gba:relative gba:flex-1">
              <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-white/50" />
              <Input
                placeholder="Search spaces..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="gba:pl-9 gba:h-10 gba:bg-white/10 gba:border-white/20 gba:text-white placeholder:gba:text-white/50 focus:gba:border-white/40"
                data-testid={`${testId}-search`}
              />
            </div>

            {/* Filter Tabs */}
            <div className="gba:flex gba:gap-1 gba:p-1 gba:bg-white/10 gba:rounded-lg">
              {(['all', 'owned', 'shared'] as FilterType[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`gba:px-4 gba:py-2 gba:text-sm gba:font-medium gba:rounded-md gba:transition-colors ${
                    filter === f ? 'gba:bg-white gba:text-primary' : 'gba:text-white/70 hover:gba:text-white'
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
        data-testid={`${testId}-create-dialog`}
      />
    </div>
  )
}

export default SpacesHub
