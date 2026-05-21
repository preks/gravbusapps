import React, { useEffect, useRef } from 'react'
import { Badge } from '@newwork/nw-design-system'
import type { SearchItem, SearchSection, SearchTarget } from '../types'
import { isPeopleTrendingSwimlaneSection, isNavigationTrendingSection } from '../utils'
import { GlobalSearchResultCard } from './GlobalSearchResultCard'
import { AppIconBadge } from '@/business-apps/core/create/apps/ai-orchestrator/features/orchestrator/components/ui/AppIconBadge'

const isIdeRecentAppItem = (item: SearchItem): boolean =>
  item.categoryIds.includes('apps') && item.analytics.provider === 'ide-recent-apps'

const isCuratedRecentAppItem = (item: SearchItem): boolean =>
  item.categoryIds.includes('apps') && item.analytics.provider === 'curated-recent-apps'

const isPlainRecentItem = (item: SearchItem): boolean => !isIdeRecentAppItem(item) && !isCuratedRecentAppItem(item)

const RECENT_APP_GROUPS: Array<{ id: string; label: string; keywords: string[] }> = [
  { id: 'organizational-units', label: 'Organizational Units', keywords: ['organizational', 'org'] },
  { id: 'cost-center', label: 'Cost Center', keywords: ['cost center', 'cost-center'] },
  { id: 'flows', label: 'Flows', keywords: ['flow'] }
]

const matchesGroupKeywords = (item: SearchItem, keywords: string[]): boolean => {
  const haystack = `${item.name} ${item.description ?? ''}`.toLowerCase()
  return keywords.some(keyword => haystack.includes(keyword))
}

const groupRecentApps = (items: SearchItem[]): Array<{ id: string; label: string; items: SearchItem[] }> => {
  const appItems = items.filter(item => item.categoryIds.includes('apps'))
  return RECENT_APP_GROUPS.map(group => ({
    id: group.id,
    label: group.label,
    items: appItems.filter(item => matchesGroupKeywords(item, group.keywords)).slice(0, 4)
  }))
}

const isSwimlaneSection = (section: SearchSection): boolean =>
  section.presentation === 'GRID' ||
  section.kind === 'SUGGESTIONS' ||
  section.id === 'people-swimlane' ||
  isPeopleTrendingSwimlaneSection(section)

const useHorizontalScrollHandlers = (): React.RefObject<HTMLDivElement> => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined

    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) {
        return
      }
      const previousLeft = container.scrollLeft
      container.scrollLeft += event.deltaX
      if (container.scrollLeft !== previousLeft) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return

      const startX = event.clientX
      const startLeft = container.scrollLeft

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX
        container.scrollLeft = startLeft - deltaX
        moveEvent.preventDefault()
      }

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    container.addEventListener('wheel', handleWheel, { capture: true, passive: false })
    container.addEventListener('mousedown', handleMouseDown)
    return () => {
      container.removeEventListener('wheel', handleWheel, { capture: true })
      container.removeEventListener('mousedown', handleMouseDown)
    }
  }, [])

  return containerRef
}

interface HorizontalScrollRowProps {
  className: string
  testId?: string
  children: React.ReactNode
}

const HorizontalScrollRow: React.FC<HorizontalScrollRowProps> = ({ className, testId, children }) => {
  const containerRef = useHorizontalScrollHandlers()
  return (
    <div ref={containerRef} className={className} data-global-search-horizontal-scroll="true" data-testid={testId}>
      {children}
    </div>
  )
}

interface AppIconButtonProps {
  item: SearchItem
  active: boolean
  testId: string
  onSelect: (item: SearchItem) => void
}

const AppIconButton: React.FC<AppIconButtonProps> = ({ item, active, testId, onSelect }) => {
  const frameClass = active ? '' : 'group-hover:gba:scale-105'
  const iconClass = active ? 'gba:ring-2 gba:ring-primary gba:ring-offset-2' : ''
  const labelClass = active
    ? 'gba:text-foreground gba:font-medium'
    : 'gba:text-muted-foreground group-hover:gba:text-foreground'

  return (
    <button
      type="button"
      className="gba:flex-none gba:flex gba:flex-col gba:items-center gba:gap-1.5 gba:bg-transparent gba:group gba:w-[76px] gba:p-1 gba:scroll-m-2"
      onClick={() => onSelect(item)}
      data-testid={testId}
      data-search-item-id={item.id}
    >
      <div className={`gba:transition-all gba:duration-150 gba:rounded-2xl ${frameClass}`}>
        <AppIconBadge
          iconName={item.media?.icon}
          size="lg"
          className={`gba:w-16 gba:h-16 gba:rounded-2xl ${iconClass}`}
        />
      </div>
      <span
        className={`gba:text-[10px] gba:leading-tight gba:text-center gba:w-full gba:truncate ${labelClass}`}
        title={item.name}
      >
        {item.name}
      </span>
    </button>
  )
}

interface SectionBodyProps {
  section: SearchSection
  activeItemId?: string
  accessToken?: string
  onSelectItem: (item: SearchItem) => void
  onSelectTarget: (target: SearchTarget) => void
  onActionExecute: () => void
}

const renderNavigationTrendingSection = ({
  section,
  activeItemId,
  onSelectItem
}: SectionBodyProps): React.ReactNode => (
  <HorizontalScrollRow
    className="no-scrollbar gba:flex gba:min-w-0 gba:w-full gba:max-w-full gba:gap-4 gba:overflow-x-auto gba:px-1 gba:py-1 gba:touch-pan-x"
    testId={`GlobalSearchNavigationTrending-${section.id}`}
  >
    {section.items.slice(0, 10).map(item => (
      <AppIconButton
        key={item.id}
        item={item}
        active={activeItemId === item.id}
        testId={`GlobalSearchNavigationTrendingItem-${item.id}`}
        onSelect={onSelectItem}
      />
    ))}
  </HorizontalScrollRow>
)

const renderSwimlaneSection = ({
  section,
  activeItemId,
  accessToken,
  onSelectItem,
  onSelectTarget,
  onActionExecute
}: SectionBodyProps): React.ReactNode => (
  <HorizontalScrollRow
    className="no-scrollbar gba:min-w-0 gba:w-full gba:max-w-full gba:overflow-x-auto gba:touch-pan-x"
    testId={`GlobalSearchSwimlane-${section.id}`}
  >
    <div className="gba:flex gba:w-max gba:gap-3 gba:py-1 gba:px-1">
      {section.items.map(item => (
        <GlobalSearchResultCard
          key={item.id}
          item={item}
          layout="swimlane"
          active={activeItemId === item.id}
          accessToken={accessToken}
          onSelect={onSelectItem}
          onTargetSelect={onSelectTarget}
          onActionExecute={onActionExecute}
        />
      ))}
    </div>
  </HorizontalScrollRow>
)

const renderRecentSection = ({ section, activeItemId, onSelectItem }: SectionBodyProps): React.ReactNode => {
  const ideRecentItems = section.items.filter(isIdeRecentAppItem).slice(0, 10)
  const curatedRecentItems = section.items.filter(isCuratedRecentAppItem)
  const plainItems = section.items.filter(isPlainRecentItem)
  const groupedCurated = curatedRecentItems.length > 0 ? groupRecentApps(curatedRecentItems) : []

  return (
    <div className="gba:space-y-4" data-testid={`GlobalSearchRecentCards-${section.id}`}>
      {ideRecentItems.length > 0 && (
        <HorizontalScrollRow className="no-scrollbar gba:flex gba:min-w-0 gba:w-full gba:max-w-full gba:gap-4 gba:overflow-x-auto gba:px-1 gba:py-1 gba:touch-pan-x">
          {ideRecentItems.map(item => (
            <AppIconButton
              key={item.id}
              item={item}
              active={activeItemId === item.id}
              testId={`GlobalSearchRecentCard-${item.id}`}
              onSelect={onSelectItem}
            />
          ))}
        </HorizontalScrollRow>
      )}

      {groupedCurated.length > 0 && (
        <div className="gba:grid gba:grid-cols-3 gba:gap-4">
          {groupedCurated.map(group => (
            <div key={group.id} className="gba:space-y-2" data-testid={`GlobalSearchRecentGroup-${group.id}`}>
              <h4 className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wide">
                {group.label}
              </h4>
              <div className="gba:space-y-1">
                {group.items.map(item => (
                  <button
                    key={`${group.id}-${item.id}`}
                    type="button"
                    className="gba:block gba:w-full gba:text-left gba:text-sm gba:px-2 gba:py-1.5 gba:rounded gba:hover:gba:bg-muted"
                    onClick={() => onSelectItem(item)}
                    data-testid={`GlobalSearchRecentGroupItem-${group.id}-${item.id}`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {plainItems.length > 0 && (
        <HorizontalScrollRow
          className="no-scrollbar gba:flex gba:min-w-0 gba:w-full gba:max-w-full gba:gap-2 gba:overflow-x-auto gba:px-1 gba:py-1 gba:touch-pan-x"
          testId={`GlobalSearchRecentPills-${section.id}`}
        >
          {plainItems.map(item => {
            const activeClass =
              activeItemId === item.id ? 'gba:ring-2 gba:ring-primary gba:ring-offset-1 gba:bg-accent' : ''
            return (
              <button
                key={item.id}
                type="button"
                className={`gba:inline-flex gba:max-w-full gba:min-w-0 gba:items-center gba:rounded-full gba:px-3 gba:py-1.5 gba:text-sm gba:transition-colors gba:scroll-m-2 gba:bg-muted hover:gba:bg-accent ${activeClass}`}
                onClick={() => onSelectItem(item)}
                title={item.name}
                data-testid={`GlobalSearchRecentPill-${item.id}`}
                data-search-item-id={item.id}
              >
                <span className="gba:min-w-0 gba:truncate gba:max-w-xs">{item.name}</span>
              </button>
            )
          })}
        </HorizontalScrollRow>
      )}
    </div>
  )
}

const renderListSection = (props: SectionBodyProps): React.ReactNode => {
  const { section, activeItemId, accessToken, onSelectItem, onSelectTarget, onActionExecute } = props
  return (
    <div className="gba:space-y-2">
      {section.items.map(item => (
        <GlobalSearchResultCard
          key={item.id}
          item={item}
          layout="list"
          leadingStyle={section.kind === 'RECENT' ? 'icon' : 'avatar'}
          sectionKind={section.kind}
          active={activeItemId === item.id}
          accessToken={accessToken}
          onSelect={onSelectItem}
          onTargetSelect={onSelectTarget}
          onActionExecute={onActionExecute}
        />
      ))}
    </div>
  )
}

const renderSectionBody = (props: SectionBodyProps): React.ReactNode => {
  if (isNavigationTrendingSection(props.section)) {
    return renderNavigationTrendingSection(props)
  }
  if (isSwimlaneSection(props.section)) {
    return renderSwimlaneSection(props)
  }
  if (props.section.kind === 'RECENT') {
    return renderRecentSection(props)
  }
  return renderListSection(props)
}

export interface GlobalSearchSectionRendererProps {
  sections: SearchSection[]
  activeItemId?: string
  accessToken?: string
  onSelectItem: (item: SearchItem) => void
  onSelectTarget: (target: SearchTarget) => void
  onActionExecute: () => void
}

export const GlobalSearchSectionRenderer: React.FC<GlobalSearchSectionRendererProps> = ({
  sections,
  activeItemId,
  accessToken,
  onSelectItem,
  onSelectTarget,
  onActionExecute
}) => (
  <div className="gba:min-w-0 gba:w-full gba:space-y-3" data-testid="GlobalSearchSectionRenderer">
    {sections.map(section => (
      <section key={section.id} className="gba:min-w-0 gba:w-full" data-testid={`GlobalSearchSection-${section.id}`}>
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
          <h3 className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wide">
            {section.title}
          </h3>
          {typeof section.total === 'number' ? <Badge variant="outline">{section.total}</Badge> : null}
        </div>
        {renderSectionBody({
          section,
          activeItemId,
          accessToken,
          onSelectItem,
          onSelectTarget,
          onActionExecute
        })}
      </section>
    ))}
  </div>
)
