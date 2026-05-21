import { useMemo } from 'react'
import type { SlideSummary } from '../types'

export type SlideHubSortBy = 'name' | 'modified' | 'created'
export type SlideHubSortOrder = 'asc' | 'desc'
export type SlideHubSidebarSection = 'home' | 'my-slides' | 'shared' | 'favorites' | 'recent' | 'trash'

export interface UseSlidesHubFilteringParams {
  slides: SlideSummary[]
  activeSection: SlideHubSidebarSection
  favorites: Set<string>
  searchQuery: string
  sortBy: SlideHubSortBy
  sortOrder: SlideHubSortOrder
}

export interface UseSlidesHubFilteringReturn {
  mySlides: SlideSummary[]
  sharedSlides: SlideSummary[]
  recentSlides: SlideSummary[]
  filteredSlides: SlideSummary[]
}

function isSharedWithMe(slide: SlideSummary): boolean {
  return slide.isShared === true || (!slide.isOwner && slide.permission !== 'owner')
}

function applySearchFilter(slides: SlideSummary[], searchQuery: string): SlideSummary[] {
  const query = searchQuery.trim().toLowerCase()
  if (!query) return slides
  return slides.filter(
    slide => slide.title.toLowerCase().includes(query) || slide.description?.toLowerCase().includes(query)
  )
}

function sortSlides(slides: SlideSummary[], sortBy: SlideHubSortBy, sortOrder: SlideHubSortOrder): void {
  slides.sort((a, b) => {
    let comparison = 0
    switch (sortBy) {
      case 'name':
        comparison = (a.title || '').localeCompare(b.title || '')
        break
      case 'modified':
        comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        break
      case 'created':
        comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        break
    }
    return sortOrder === 'asc' ? -comparison : comparison
  })
}

export function useSlidesHubFiltering(params: UseSlidesHubFilteringParams): UseSlidesHubFilteringReturn {
  const { slides, activeSection, favorites, searchQuery, sortBy, sortOrder } = params

  const { mySlides, sharedSlides, recentSlides } = useMemo(() => {
    const my: SlideSummary[] = []
    const shared: SlideSummary[] = []

    // Sort by updatedAt for recent
    const sortedByDate = [...slides].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    const recent = sortedByDate.slice(0, 10)

    for (const slide of slides) {
      if (slide.status === 'archived') {
        continue
      }
      if (isSharedWithMe(slide)) {
        shared.push(slide)
      } else {
        my.push(slide)
      }
    }

    return { mySlides: my, sharedSlides: shared, recentSlides: recent }
  }, [slides])

  const filteredSlides = useMemo(() => {
    let baseSlides: SlideSummary[] = []

    switch (activeSection) {
      case 'home':
        baseSlides = [...mySlides, ...sharedSlides]
        break
      case 'my-slides':
        baseSlides = mySlides
        break
      case 'shared':
        baseSlides = sharedSlides
        break
      case 'favorites':
        baseSlides = slides
        break
      case 'recent':
        baseSlides = recentSlides
        break
      case 'trash':
        baseSlides = []
        break
    }

    const next = applySearchFilter(baseSlides, searchQuery)
    sortSlides(next, sortBy, sortOrder)
    return next
  }, [activeSection, slides, favorites, mySlides, recentSlides, searchQuery, sharedSlides, sortBy, sortOrder])

  return { mySlides, sharedSlides, recentSlides, filteredSlides }
}
