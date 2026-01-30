/**
 * SlidesAppsHub Component
 *
 * Main entry point for slide decks (presentations).
 * Enhanced with full feature parity to DocumentAppsHub.
 */

import React, { useState, useCallback, useEffect } from 'react'
import {
  Card,
  Button,
  Input,
  Spinner,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Badge,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import {
  Presentation,
  Plus,
  Search,
  Users,
  Home,
  FolderClosed,
  MoreHorizontal,
  Copy,
  Trash2,
  ChevronLeft,
  FileText,
  Star,
  Clock,
  Archive,
  ArrowUpDown,
  Grid3x3,
  List
} from 'lucide-react'
import { navigateTo } from '@/common/utils/navigationUtils'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useSlides } from './hooks/useSlides'
import {
  useSlidesHubUrlState,
  useSlidesHubFavorites,
  useSlidesHubFiltering,
  useSlidesHubUserLookup,
  type SlideHubSidebarSection,
  type SlideHubSortBy,
  type SlideHubSortOrder
} from './hooks'
import { SlideEditor } from './components'

export interface SlidesAppsHubProps extends BusinessAppContextProps {
  'data-testid'?: string
}

type ViewMode = 'grid' | 'list'
type HubView = 'list' | 'editor'

export const SlidesAppsHub: React.FC<SlidesAppsHubProps> = ({
  accessToken,
  userInfo,
  'data-testid': testId = 'slide-apps-hub'
}) => {
  const [currentView, setCurrentView] = useState<HubView>('list')
  const [activeSection, setActiveSection] = useState<SlideHubSidebarSection>('home')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SlideHubSortBy>('modified')
  const [sortOrder, setSortOrder] = useState<SlideHubSortOrder>('desc')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  const currentUserId = userInfo?.id || userInfo?.employeeDetails?.employeeId || ''

  const { slides, currentSlide, isLoading, error, loadSlide, createSlide, deleteSlide, duplicateSlide, clearCurrentSlide } =
    useSlides(accessToken)

  const { favorites, setFavorites } = useSlidesHubFavorites()
  const { ownerInfoMap, sharedUsersMap } = useSlidesHubUserLookup({ accessToken: accessToken || '', slides })
  const { filteredSlides, mySlides, sharedSlides, recentSlides } = useSlidesHubFiltering({
    slides,
    activeSection,
    favorites,
    searchQuery,
    sortBy,
    sortOrder
  })

  const { updateUrl, resetLoadAttempt } = useSlidesHubUrlState({
    currentView,
    currentSlideId: selectedSlideId,
    isLoadingSlide: isLoading,
    loadSlideById: loadSlide,
    setCurrentView,
    setSelectedSlideId
  })

  useEffect(() => {
    if (accessToken) {
      try {
        localStorage.setItem('business-app-ide-access-token', accessToken)
      } catch {
        // ignore
      }
    }
  }, [accessToken])

  const toggleFavorite = useCallback(
    (slideId: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation()
      setFavorites(prev => {
        const next = new Set(prev)
        if (next.has(slideId)) {
          next.delete(slideId)
        } else {
          next.add(slideId)
        }
        return next
      })
    },
    [setFavorites]
  )

  const handleCreate = useCallback(async () => {
    const created = await createSlide({ title: 'Untitled presentation' })
    if (created) {
      setSelectedSlideId(created.id)
      setCurrentView('editor')
      updateUrl(created.id, 'editor')
      loadSlide(created.id)
    }
  }, [createSlide, loadSlide, updateUrl])

  const handleOpen = useCallback(
    (id: string) => {
      setSelectedSlideId(id)
      setCurrentView('editor')
      updateUrl(id, 'editor')
      loadSlide(id)
    },
    [loadSlide, updateUrl]
  )

  const handleBack = useCallback(() => {
    setSelectedSlideId(null)
    setCurrentView('list')
    updateUrl(null, 'list')
    clearCurrentSlide()
    resetLoadAttempt()
  }, [clearCurrentSlide, updateUrl, resetLoadAttempt])

  const handleBackToDesk = useCallback(() => {
    navigateTo('/platform/every-office')
  }, [])

  const handleDuplicate = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.stopPropagation()
      const duplicated = await duplicateSlide(id)
      if (duplicated) handleOpen(duplicated.id)
    },
    [duplicateSlide, handleOpen]
  )

  const handleDelete = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.stopPropagation()
      if (!window.confirm('Delete this presentation?')) return
      const ok = await deleteSlide(id)
      if (ok && selectedSlideId === id) handleBack()
    },
    [deleteSlide, selectedSlideId, handleBack]
  )

  const getSectionCount = useCallback(
    (section: SlideHubSidebarSection): number => {
      switch (section) {
        case 'my-slides':
          return mySlides.length
        case 'shared':
          return sharedSlides.length
        case 'favorites':
          return [...favorites].filter(id => slides.some(s => s.id === id)).length
        case 'recent':
          return recentSlides.length
        default:
          return 0
      }
    },
    [favorites, mySlides, recentSlides, sharedSlides, slides]
  )

  if (currentView === 'editor' && selectedSlideId && currentSlide) {
    return (
      <SlideEditor
        slideId={selectedSlideId}
        slide={currentSlide}
        accessToken={accessToken}
        userInfo={userInfo}
        onBack={handleBack}
        data-testid={`${testId}-editor`}
      />
    )
  }

  return (
    <TooltipProvider>
      <div className="gba:flex gba:h-full gba:bg-background" data-testid={testId}>
        <aside className="gba:w-56 gba:flex gba:flex-col gba:border-r gba:bg-card">
          <div className="gba:p-3 gba:border-b gba:space-y-2">
            <Button variant="default" className="gba:w-full gba:gap-2" onClick={handleCreate} data-testid={`${testId}-create`}>
              <Plus className="gba:w-4 gba:h-4" />
              New presentation
            </Button>
            <Button variant="ghost" size="sm" className="gba:w-full gba:gap-2" onClick={handleBackToDesk} data-testid={`${testId}-back-to-desk`}>
              <ChevronLeft className="gba:w-4 gba:h-4" />
              Back to Desk
            </Button>
          </div>
          <nav className="gba:flex-1 gba:overflow-y-auto gba:px-2 gba:py-2 gba:space-y-1">
            {[
              { id: 'home' as const, label: 'Home', icon: Home },
              { id: 'my-slides' as const, label: 'My presentations', icon: FolderClosed },
              { id: 'shared' as const, label: 'Shared', icon: Users },
              { id: 'favorites' as const, label: 'Favorites', icon: Star },
              { id: 'recent' as const, label: 'Recent', icon: Clock },
              { id: 'archived' as const, label: 'Archived', icon: Archive }
            ].map(section => {
              const Icon = section.icon
              const count = getSectionCount(section.id)
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`gba:w-full gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm ${
                    activeSection === section.id
                      ? 'gba:bg-primary/10 gba:text-primary gba:font-medium'
                      : 'gba:text-muted-foreground hover:gba:bg-muted/50'
                  }`}
                  data-testid={`${testId}-nav-${section.id}`}
                >
                  <Icon className="gba:w-4 gba:h-4" />
                  {section.label}
                  {count > 0 && (
                    <Badge variant="secondary" className="gba:ml-auto gba:text-xs">
                      {count}
                    </Badge>
                  )}
                </button>
              )
            })}
          </nav>
        </aside>

        <main className="gba:flex-1 gba:flex gba:flex-col gba:min-w-0">
          <header className="gba:border-b gba:bg-card gba:px-6 gba:py-4">
            <div className="gba:flex gba:items-center gba:gap-4">
              <h2 className="gba:text-xl gba:font-semibold">
                {activeSection === 'home'
                  ? 'All presentations'
                  : activeSection === 'my-slides'
                    ? 'My presentations'
                    : activeSection === 'shared'
                      ? 'Shared with me'
                      : activeSection === 'favorites'
                        ? 'Favorites'
                        : activeSection === 'recent'
                          ? 'Recent'
                          : 'Archived'}
              </h2>
              <div className="gba:relative gba:flex-1 gba:max-w-sm">
                <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="gba:pl-9"
                  data-testid={`${testId}-search`}
                />
              </div>
              <div className="gba:flex gba:items-center gba:gap-2">
                <Select value={sortBy} onValueChange={v => setSortBy(v as SlideHubSortBy)}>
                  <SelectTrigger className="gba:w-32" data-testid={`${testId}-sort`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="modified">Modified</SelectItem>
                    <SelectItem value="created">Created</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  data-testid={`${testId}-sort-order`}
                >
                  <ArrowUpDown className="gba:w-4 gba:h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode('grid')}
                  className={viewMode === 'grid' ? 'gba:bg-muted' : ''}
                  data-testid={`${testId}-view-grid`}
                >
                  <Grid3x3 className="gba:w-4 gba:h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode('list')}
                  className={viewMode === 'list' ? 'gba:bg-muted' : ''}
                  data-testid={`${testId}-view-list`}
                >
                  <List className="gba:w-4 gba:h-4" />
                </Button>
              </div>
            </div>
          </header>

          <div className="gba:flex-1 gba:overflow-auto gba:p-6">
            {error && <p className="gba:text-destructive gba:mb-4">{error}</p>}
            {isLoading ? (
              <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
                <Spinner size="lg" />
              </div>
            ) : filteredSlides.length === 0 ? (
              <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-16 gba:text-center">
                <Presentation className="gba:w-12 gba:h-12 gba:text-muted-foreground gba:mb-4" />
                <p className="gba:text-muted-foreground">
                  {searchQuery ? 'No presentations found' : activeSection === 'shared' ? 'No presentations shared with you' : 'No presentations yet'}
                </p>
                {!searchQuery && activeSection !== 'shared' && (
                  <Button variant="outlined" className="gba:mt-4" onClick={handleCreate}>
                    <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
                    Create presentation
                  </Button>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              <div className="gba:grid gba:grid-cols-1 sm:gba:grid-cols-2 lg:gba:grid-cols-3 gba:gap-4">
                {filteredSlides.map(slide => {
                  const owner = ownerInfoMap.get(slide.createdBy || '')
                  const sharedUsers = sharedUsersMap[slide.id] || []
                  const isFavorite = favorites.has(slide.id)

                  return (
                    <Card
                      key={slide.id}
                      variant="outlined"
                      className="gba:p-4 gba:cursor-pointer hover:gba:bg-muted/50 gba:transition-colors"
                      onClick={() => handleOpen(slide.id)}
                      data-testid={`${testId}-slide-${slide.id}`}
                    >
                      <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
                        <div className="gba:min-w-0 gba:flex-1">
                          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                            <FileText className="gba:w-4 gba:h-4 gba:shrink-0 gba:text-muted-foreground" />
                            <span className="gba:font-medium gba:truncate">{slide.title}</span>
                          </div>
                          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                            {slide.isShared && <Badge variant="secondary" className="gba:text-xs">Shared</Badge>}
                            {isFavorite && <Star className="gba:w-3 gba:h-3 gba:fill-primary gba:text-primary" />}
                          </div>
                          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                            {owner && (
                              <div className="gba:flex gba:items-center gba:gap-1">
                                <Avatar className="gba:w-5 gba:h-5">
                                  {owner.avatar && <AvatarImage src={owner.avatar} />}
                                  <AvatarFallback className="gba:text-xs">{owner.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="gba:text-xs gba:text-muted-foreground gba:truncate">{owner.name}</span>
                              </div>
                            )}
                          </div>
                          {sharedUsers.length > 0 && (
                            <div className="gba:flex gba:items-center gba:gap-1 gba:mb-2">
                              {sharedUsers.slice(0, 3).map(user => (
                                <TooltipProvider key={user.userId}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Avatar className="gba:w-5 gba:h-5">
                                        {user.userAvatar && <AvatarImage src={user.userAvatar} />}
                                        <AvatarFallback className="gba:text-xs">{user.userName.charAt(0)}</AvatarFallback>
                                      </Avatar>
                                    </TooltipTrigger>
                                    <TooltipContent>{user.userName}</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ))}
                              {sharedUsers.length > 3 && (
                                <Badge variant="secondary" className="gba:text-xs">
                                  +{sharedUsers.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                          <p className="gba:text-xs gba:text-muted-foreground">
                            Updated {new Date(slide.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="gba:flex gba:flex-col gba:gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={e => toggleFavorite(slide.id, e)}
                            data-testid={`${testId}-favorite-${slide.id}`}
                          >
                            <Star className={`gba:w-4 gba:h-4 ${isFavorite ? 'gba:fill-primary gba:text-primary' : ''}`} />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={e => e.stopPropagation()} data-testid={`${testId}-menu-${slide.id}`}>
                                <MoreHorizontal className="gba:w-4 gba:h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={e => handleDuplicate(e, slide.id)}>
                                <Copy className="gba:w-4 gba:h-4 gba:mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              {(slide.permission === 'owner' || slide.permission === 'admin' || slide.createdBy === currentUserId) && (
                                <DropdownMenuItem onClick={e => handleDelete(e, slide.id)} className="gba:text-destructive">
                                  <Trash2 className="gba:w-4 gba:h-4 gba:mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <div className="gba:space-y-2">
                {filteredSlides.map(slide => {
                  const owner = ownerInfoMap.get(slide.createdBy || '')
                  const isFavorite = favorites.has(slide.id)

                  return (
                    <Card
                      key={slide.id}
                      variant="outlined"
                      className="gba:p-3 gba:cursor-pointer hover:gba:bg-muted/50 gba:transition-colors"
                      onClick={() => handleOpen(slide.id)}
                      data-testid={`${testId}-slide-${slide.id}`}
                    >
                      <div className="gba:flex gba:items-center gba:gap-4">
                        <FileText className="gba:w-4 gba:h-4 gba:shrink-0 gba:text-muted-foreground" />
                        <span className="gba:font-medium gba:truncate gba:flex-1">{slide.title}</span>
                        {owner && (
                          <div className="gba:flex gba:items-center gba:gap-1">
                            <Avatar className="gba:w-5 gba:h-5">
                              {owner.avatar && <AvatarImage src={owner.avatar} />}
                              <AvatarFallback className="gba:text-xs">{owner.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="gba:text-xs gba:text-muted-foreground">{owner.name}</span>
                          </div>
                        )}
                        <span className="gba:text-xs gba:text-muted-foreground">{new Date(slide.updatedAt).toLocaleDateString()}</span>
                        <Button variant="ghost" size="icon" onClick={e => toggleFavorite(slide.id, e)}>
                          <Star className={`gba:w-4 gba:h-4 ${isFavorite ? 'gba:fill-primary gba:text-primary' : ''}`} />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={e => e.stopPropagation()}>
                              <MoreHorizontal className="gba:w-4 gba:h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={e => handleDuplicate(e, slide.id)}>
                              <Copy className="gba:w-4 gba:h-4 gba:mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            {(slide.permission === 'owner' || slide.permission === 'admin' || slide.createdBy === currentUserId) && (
                              <DropdownMenuItem onClick={e => handleDelete(e, slide.id)} className="gba:text-destructive">
                                <Trash2 className="gba:w-4 gba:h-4 gba:mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </TooltipProvider>
  )
}

export default SlidesAppsHub
