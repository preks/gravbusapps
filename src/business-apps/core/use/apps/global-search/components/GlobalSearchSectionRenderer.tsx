import React, { useEffect, useRef } from 'react'
import { Badge } from '@newwork/nw-design-system'
import type { SearchItem, SearchSection, SearchTarget } from '../types'
import { FlowArrowIcon } from '@phosphor-icons/react'
import {
  isFlowsTrendingSection,
  isPeopleTrendingSwimlaneSection,
  isNavigationTrendingSection,
  WORKFLOW_LEAD_CONTAINER_CLASS,
  WORKFLOW_LEAD_ICON_CLASS
} from '../utils'
import { AppIconBadge } from '@/business-apps/core/create/apps/ai-orchestrator/features/orchestrator/components/ui/AppIconBadge'
import { GlobalSearchResultCard } from './GlobalSearchResultCard'

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

const trendingIconButtonClass =
  'gba:relative gba:flex-none gba:flex gba:flex-col gba:items-center gba:gap-1.5 gba:bg-transparent gba:group gba:w-[76px] gba:p-1 gba:scroll-m-2 gba:origin-center gba:transition-transform gba:duration-150 gba:hover:scale-105 gba:hover:z-10'

const AppIconButton: React.FC<AppIconButtonProps> = ({ item, active, testId, onSelect }) => {
  const iconClass = active ? 'gba:ring-2 gba:ring-primary gba:ring-offset-2' : ''
  const labelClass = active
    ? 'gba:text-foreground gba:font-medium'
    : 'gba:text-muted-foreground gba:group-hover:text-foreground'

  return (
    <button
      type="button"
      className={trendingIconButtonClass}
      onClick={() => onSelect(item)}
      data-testid={testId}
      data-search-item-id={item.id}
    >
      <div className="gba:rounded-2xl">
        <AppIconBadge
          iconName={item.media?.icon}
          size="lg"
          className={`gba:w-16 gba:h-16 gba:rounded-2xl ${iconClass}`}
        />
      </div>
      <span
        className={`gba:block gba:text-[10px] gba:leading-tight gba:text-center gba:w-full gba:line-clamp-2 ${labelClass}`}
        title={item.name}
      >
        {item.name}
      </span>
    </button>
  )
}

const FlowTrendingIconButton: React.FC<AppIconButtonProps> = ({ item, active, testId, onSelect }) => {
  const iconShellClass = active
    ? `gba:ring-2 gba:ring-primary gba:ring-offset-2 ${WORKFLOW_LEAD_CONTAINER_CLASS}`
    : `${WORKFLOW_LEAD_CONTAINER_CLASS} gba:group-hover:brightness-110`
  const labelClass = active
    ? 'gba:text-foreground gba:font-medium'
    : 'gba:text-muted-foreground gba:group-hover:text-foreground'

  return (
    <button
      type="button"
      className={trendingIconButtonClass}
      onClick={() => onSelect(item)}
      data-testid={testId}
      data-search-item-id={item.id}
    >
      <div className="gba:rounded-2xl">
        <div
          className={`gba:relative gba:flex gba:items-center gba:justify-center gba:w-16 gba:h-16 gba:rounded-2xl gba:overflow-hidden ${iconShellClass}`}
        >
          <div className="gba:absolute gba:inset-x-0 gba:top-0 gba:h-1/2 gba:bg-linear-to-b gba:from-white/30 gba:to-transparent gba:pointer-events-none" />
          <FlowArrowIcon size={28} className={`gba:relative gba:z-10 ${WORKFLOW_LEAD_ICON_CLASS}`} weight="duotone" />
        </div>
      </div>
      <span
        className={`gba:block gba:text-[10px] gba:leading-tight gba:text-center gba:w-full gba:line-clamp-2 ${labelClass}`}
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

const renderIconTrendingSection = (
  { section, activeItemId, onSelectItem }: SectionBodyProps,
  renderButton: (props: AppIconButtonProps) => React.ReactNode,
  testIdPrefix: string
): React.ReactNode => (
  <HorizontalScrollRow
    className="no-scrollbar gba:flex gba:min-w-0 gba:w-full gba:max-w-full gba:gap-4 gba:overflow-x-auto gba:px-1 gba:py-1 gba:touch-pan-x"
    testId={`${testIdPrefix}-${section.id}`}
  >
    {section.items.slice(0, 10).map(item =>
      renderButton({
        item,
        active: activeItemId === item.id,
        testId: `${testIdPrefix}Item-${item.id}`,
        onSelect: onSelectItem
      })
    )}
  </HorizontalScrollRow>
)

const renderNavigationTrendingSection = (props: SectionBodyProps): React.ReactNode =>
  renderIconTrendingSection(
    props,
    buttonProps => <AppIconButton key={buttonProps.item.id} {...buttonProps} />,
    'GlobalSearchNavigationTrending'
  )

const renderFlowsTrendingSection = (props: SectionBodyProps): React.ReactNode =>
  renderIconTrendingSection(
    props,
    buttonProps => <FlowTrendingIconButton key={buttonProps.item.id} {...buttonProps} />,
    'GlobalSearchFlowsTrending'
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
  if (isFlowsTrendingSection(props.section)) {
    return renderFlowsTrendingSection(props)
  }
  if (isSwimlaneSection(props.section)) {
    return renderSwimlaneSection(props)
  }
  return renderListSection(props)
}

export interface GlobalSearchSectionRendererProps {
  sections: SearchSection[]
  showSectionCounts: boolean
  activeItemId?: string
  accessToken?: string
  onSelectItem: (item: SearchItem) => void
  onSelectTarget: (target: SearchTarget) => void
  onActionExecute: () => void
}

export const GlobalSearchSectionRenderer: React.FC<GlobalSearchSectionRendererProps> = ({
  sections,
  showSectionCounts,
  activeItemId,
  accessToken,
  onSelectItem,
  onSelectTarget,
  onActionExecute
}) => (
  <div className="gba:min-w-0 gba:w-full" data-testid="GlobalSearchSectionRenderer">
    {sections.map(section => (
      <section key={section.id} className="gba:min-w-0 gba:w-full" data-testid={`GlobalSearchSection-${section.id}`}>
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
          <h3 className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wide">
            {section.title}
          </h3>
          {showSectionCounts && typeof section.total === 'number' ? (
            <Badge variant="outline">{section.total}</Badge>
          ) : null}
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
