import React, { useRef, useState, useCallback, useEffect } from 'react'
import { ArrowLeft, MessageSquare } from 'lucide-react'
import {
  Button,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  TabSwitch,
  TabSwitchList,
  TabSwitchTrigger
} from '@newwork/nw-design-system'
import { PremiumHeroBackground } from '@/common/components/premium-hero-background'

export type CreateLayoutHeroVariant = 'editor' | 'overview'

export interface CreateLayoutView {
  value: string
  label: React.ReactNode
  icon?: React.ReactNode
}

export interface CreateLayoutProps {
  /** 'editor' = compact hero with back button (default). 'overview' = large centered hero for list/landing pages. */
  heroVariant?: CreateLayoutHeroVariant
  /** Semantic overline displayed above the title. */
  heroOverline?: React.ReactNode
  /** Icon shown in the hero (e.g. Lucide icon component). */
  heroIcon?: React.ReactNode
  /** Hero: main title. With onBack (editor) or alone (overview) enables the hero. */
  heroTitle?: React.ReactNode
  /** Hero: optional subtitle below the title. */
  heroSubtitle?: React.ReactNode
  /** Overview variant only: optional headline line below the title (e.g. "Build screens. Powered by AI."). */
  heroHeadline?: string
  /** Overview variant only: optional badges/chips row (e.g. SessionHeroSection badges). */
  heroBadges?: React.ReactNode
  /** Overview variant only: custom footer row inside the hero. */
  heroFooter?: React.ReactNode
  /** Overview variant only: tab views rendered as a design-system TabSwitch in the hero footer. */
  views?: CreateLayoutView[]
  /** Controlled selected view. */
  currentView?: string
  /** Uncontrolled initial view. */
  defaultView?: string
  /** Called when the selected view changes. */
  onViewChange?: (value: string) => void
  /** Editor variant: back navigation handler. */
  onBack?: () => void
  /** Editor variant: back button label. Default "Back". */
  heroBackLabel?: string
  /** Optional content rendered in the hero extra area. */
  heroExtra?: React.ReactNode
  /** Editor variant: optional secondary row below the title area for status/meta content. */
  heroMeta?: React.ReactNode
  /** Editor variant: whether to render the default back button. */
  showBackButton?: boolean
  /** Editor variant: left panel chat / AI wizard content. */
  chatPanel?: React.ReactNode
  /** Primary content area. In overview variant this becomes the single content column. */
  canvasPanel: React.ReactNode
  /** Optional sidebar (e.g. session history); when open, replaces chat panel */
  sidebar?: React.ReactNode
  /** Whether the sidebar is open */
  sidebarOpen?: boolean
  /** When set, chat panel is collapsed (canvas full width). Use with onChatPanelCollapseChange for controlled mode. */
  chatPanelCollapsed?: boolean
  /** When provided, enables close/open chat panel. Called with new collapsed state. Use with chatPanelCollapsed for controlled mode. */
  onChatPanelCollapseChange?: (collapsed: boolean) => void
  /** Default size of the chat panel in percent (0–100). Default 25. */
  chatDefaultSize?: number
  /** Minimum size of the chat panel in percent (0–100). Default 25. */
  chatMinSize?: number
  /** Minimum size of the canvas panel in percent (0–100). Default 25. */
  canvasMinSize?: number
  testId?: string
  className?: string
}

const PANEL_CLASS = 'gba:flex gba:flex-col gba:min-h-0 gba:rounded-none'
const CHAT_RAIL_WIDTH = '3.5rem'
/** Panel size when fixed collapsed (0 = fully collapsed). */
const CHAT_PANEL_MIN_SIZE_PERCENT = 0
/** Below this width: show icon only; from this width up: show chat content. */
const CONTENT_SWITCH_THRESHOLD_PERCENT = 15
const HERO_EDITOR_HEIGHT = '180px'
const HERO_OVERVIEW_MIN_HEIGHT = '18rem'
const HERO_OVERVIEW_MIN_HEIGHT_WITH_VIEWS = '20rem'
const HERO_ICON_CLASS = 'gba:w-5 gba:h-5 gba:text-white'
const HERO_ICON_OVERVIEW_CLASS = 'gba:w-8 gba:h-8 gba:text-white'

function renderHeroIcon(icon: React.ReactNode, large = false): React.ReactNode {
  const iconClass = large ? HERO_ICON_OVERVIEW_CLASS : HERO_ICON_CLASS
  if (React.isValidElement(icon)) return icon
  const isComponentType =
    typeof icon === 'function' || (typeof icon === 'object' && icon !== null && '$$typeof' in icon)
  if (isComponentType)
    return React.createElement(icon as unknown as React.ComponentType<{ className?: string }>, { className: iconClass })
  return <span className={iconClass}>{icon}</span>
}

export const CreateLayout: React.FC<CreateLayoutProps> = ({
  heroVariant = 'editor',
  heroOverline,
  heroIcon,
  heroTitle,
  heroSubtitle,
  heroHeadline,
  heroBadges,
  heroFooter,
  views,
  currentView,
  defaultView,
  onViewChange,
  onBack,
  heroBackLabel = 'Back',
  heroExtra,
  heroMeta,
  showBackButton = true,
  chatPanel,
  canvasPanel,
  sidebar,
  sidebarOpen = false,
  chatPanelCollapsed: controlledCollapsed,
  onChatPanelCollapseChange,
  chatDefaultSize = 25,
  chatMinSize = 25,
  canvasMinSize = 25,
  testId = 'create-layout',
  className = ''
}) => {
  const handleDragRef = useRef(false)
  const canCollapse = onChatPanelCollapseChange != null
  const [internalCollapsed, setInternalCollapsed] = useState(false)
  const [internalView, setInternalView] = useState<string | undefined>(() => defaultView ?? views?.[0]?.value)
  const isCollapsed = controlledCollapsed ?? internalCollapsed
  const [panelLayout, setPanelLayout] = useState<number[] | null>(null)

  const setCollapsed = useCallback(
    (collapsed: boolean) => {
      if (controlledCollapsed === undefined) setInternalCollapsed(collapsed)
      onChatPanelCollapseChange?.(collapsed)
    },
    [controlledCollapsed, onChatPanelCollapseChange]
  )

  const onHandlePointerDown = useCallback(() => {
    handleDragRef.current = false
  }, [])
  const onHandlePointerMove = useCallback(() => {
    handleDragRef.current = true
  }, [])
  const onHandlePointerUp = useCallback(() => {
    if (!canCollapse || handleDragRef.current) return
    const iconState = panelLayout != null ? panelLayout[0] < CONTENT_SWITCH_THRESHOLD_PERCENT : isCollapsed
    if (iconState) setCollapsed(false)
    else setCollapsed(true)
  }, [canCollapse, isCollapsed, panelLayout, setCollapsed])

  const hasHeroTitle = heroTitle != null
  const useHero = hasHeroTitle && (heroVariant === 'overview' || (heroVariant === 'editor' && onBack != null))
  const chatContent = sidebarOpen && sidebar ? sidebar : chatPanel

  const canvasWrapperClass =
    'gba:flex gba:flex-col gba:h-full gba:min-h-0 gba:overflow-hidden gba:min-w-0 gba:bg-background'

  const chatPanelContent = (
    <div className="gba:flex gba:flex-col gba:h-full gba:min-h-0 gba:overflow-hidden gba:bg-background gba:border-r gba:border-border">
      {chatContent}
    </div>
  )

  const panelGroupRef = useRef<React.ComponentRef<typeof ResizablePanelGroup> | null>(null)

  const chatSize = canCollapse && isCollapsed ? CHAT_PANEL_MIN_SIZE_PERCENT : chatDefaultSize
  const chatMin = canCollapse && isCollapsed ? 0 : chatMinSize
  const canvasSize = canCollapse && isCollapsed ? 100 - CHAT_PANEL_MIN_SIZE_PERCENT : 100 - chatDefaultSize

  const onPanelLayout = useCallback((layout: number[]) => {
    if (layout.length >= 2) setPanelLayout(layout)
  }, [])

  useEffect(() => {
    if (!canCollapse || panelGroupRef.current?.setLayout == null) return
    panelGroupRef.current.setLayout([chatSize, canvasSize])
  }, [canCollapse, isCollapsed, chatSize, canvasSize])

  const showIconOnly =
    canCollapse && (panelLayout != null ? panelLayout[0] < CONTENT_SWITCH_THRESHOLD_PERCENT : isCollapsed)

  const collapsedRail = (
    <button
      type="button"
      onClick={() => setCollapsed(false)}
      className="gba:flex gba:w-full gba:h-full gba:min-w-0 gba:items-center gba:justify-center gba:bg-background gba:border-r gba:border-border gba:hover:gba:bg-muted/50 gba:transition-colors gba:cursor-pointer"
      data-testid={`${testId}-chat-rail`}
      aria-label="Open chat panel"
    >
      <MessageSquare className="gba:w-6 gba:h-6 gba:text-muted-foreground" />
    </button>
  )

  const splitBodyContent = (
    <div className="gba:flex-1 gba:flex gba:min-h-0 gba:overflow-hidden" data-testid={`${testId}-body`}>
      <ResizablePanelGroup
        ref={panelGroupRef}
        direction="horizontal"
        onLayout={onPanelLayout}
        className="gba:flex-1 gba:min-h-0 gba:w-full"
        data-testid={`${testId}-layout`}
      >
        <ResizablePanel
          defaultSize={chatSize}
          minSize={chatMin}
          className={PANEL_CLASS}
          data-testid={`${testId}-chat-panel`}
          style={canCollapse && isCollapsed ? { minWidth: CHAT_RAIL_WIDTH } : undefined}
        >
          {showIconOnly ? collapsedRail : chatPanelContent}
        </ResizablePanel>
        <ResizableHandle
          withHandle
          className="gba:bg-border"
          data-testid={`${testId}-resize-handle`}
          onPointerDown={canCollapse ? onHandlePointerDown : undefined}
          onPointerMove={canCollapse ? onHandlePointerMove : undefined}
          onPointerUp={canCollapse ? onHandlePointerUp : undefined}
        />
        <ResizablePanel
          defaultSize={canvasSize}
          minSize={canvasMinSize}
          className={PANEL_CLASS}
          data-testid={`${testId}-canvas-panel`}
        >
          <div className={canvasWrapperClass}>{canvasPanel}</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )

  const overviewBodyContent = (
    <div className="gba:flex-1 gba:min-h-0 gba:w-full gba:overflow-auto" data-testid={`${testId}-body`}>
      <main className="layout-content gba:flex gba:flex-col gba:w-full gba:pt-6 gba:pb-12">{canvasPanel}</main>
    </div>
  )

  const bodyContent = heroVariant === 'overview' ? overviewBodyContent : splitBodyContent
  const hasViews = Boolean(views && views.length > 0)
  const activeView = currentView ?? internalView ?? defaultView ?? views?.[0]?.value
  const handleViewChange = useCallback(
    (value: string) => {
      if (currentView === undefined) setInternalView(value)
      onViewChange?.(value)
    },
    [currentView, onViewChange]
  )
  const overviewFooterContent =
    hasViews && views ? (
      <TabSwitch
        value={activeView}
        onValueChange={handleViewChange}
        className="gba:w-full gba:[&_.nw\\:bg-foreground]:!bg-white"
        data-testid={`${testId}-tabs`}
      >
        <div className="gba:-mx-4 gba:px-4 gba:overflow-x-auto gba:scrollbar-hide">
          <TabSwitchList>
            {views.map(view => {
              const isActiveView = activeView === view.value

              return (
                <TabSwitchTrigger
                  key={view.value}
                  value={view.value}
                  startIcon={
                    view.icon != null ? (
                      <span className={isActiveView ? 'gba:text-white' : 'gba:text-white/70'}>{view.icon}</span>
                    ) : undefined
                  }
                  data-testid={`${testId}-tab-${view.value}`}
                >
                  <span className={isActiveView ? 'gba:text-white' : 'gba:text-white/70'}>{view.label}</span>
                </TabSwitchTrigger>
              )
            })}
          </TabSwitchList>
        </div>
      </TabSwitch>
    ) : (
      heroFooter
    )

  if (!useHero) {
    return (
      <div
        className={`gba:flex gba:flex-col gba:h-full gba:min-h-0 gba:w-full gba:overflow-hidden gba:bg-background ${className}`.trim()}
        data-testid={testId}
      >
        {bodyContent}
      </div>
    )
  }

  const heroSection =
    heroVariant === 'overview' ? (
      <section
        className="gba:relative gba:overflow-hidden gba:shrink-0 gba:flex gba:flex-col"
        style={{
          minHeight: overviewFooterContent != null ? HERO_OVERVIEW_MIN_HEIGHT_WITH_VIEWS : HERO_OVERVIEW_MIN_HEIGHT
        }}
        data-testid={`${testId}-header`}
      >
        <PremiumHeroBackground data-testid={`${testId}-hero-background`} />
        <div className="gba:absolute gba:inset-0 gba:pointer-events-none gba:space-hero-overlay" aria-hidden />
        <div
          className={`layout-content gba:relative gba:flex-1 ${
            overviewFooterContent != null ? 'gba:pt-8 gba:pb-4' : 'gba:py-8'
          }`}
        >
          {heroExtra != null ? (
            <div
              className="gba:flex gba:flex-wrap gba:justify-end gba:gap-2 gba:mb-6"
              data-testid={`${testId}-hero-extra`}
            >
              {heroExtra}
            </div>
          ) : null}
          <div className="gba:w-full gba:max-w-4xl gba:mx-auto gba:text-center">
            <div className="gba:mb-3" data-testid={`${testId}-hero-logo`}>
              <div className="gba:inline-flex gba:flex-col gba:items-center gba:gap-2">
                <div className="gba:relative">
                  <div className="gba:relative gba:w-16 gba:h-16 gba:rounded-2xl gba:bg-white/10 gba:flex gba:items-center gba:justify-center gba:border gba:border-white/20">
                    {heroIcon != null && renderHeroIcon(heroIcon, true)}
                  </div>
                </div>
                <span className="gba:text-xs gba:font-medium gba:tracking-[0.4em] gba:text-white/60 gba:uppercase gba:mt-3">
                  {heroOverline ?? 'NEWWORK'}
                </span>
                {typeof heroTitle === 'string' || typeof heroTitle === 'number' ? (
                  <h1
                    className="gba:font-funnel-display gba:text-5xl gba:sm:text-6xl gba:lg:text-7xl gba:tracking-tight gba:text-white gba:font-semibold"
                    data-testid={`${testId}-hero-title`}
                  >
                    {heroTitle}
                  </h1>
                ) : (
                  <div data-testid={`${testId}-hero-title`}>{heroTitle}</div>
                )}
              </div>
            </div>
            {heroBadges && (
              <div className="gba:flex gba:items-center gba:justify-center gba:gap-3 gba:mb-5">{heroBadges}</div>
            )}
            {heroHeadline && (
              <h2
                className="gba:text-2xl gba:sm:text-3xl gba:font-semibold gba:tracking-tight gba:text-white gba:mb-3"
                data-testid={`${testId}-hero-headline`}
              >
                {heroHeadline}
              </h2>
            )}
            {heroSubtitle != null ? (
              typeof heroSubtitle === 'string' || typeof heroSubtitle === 'number' ? (
                <p
                  className="gba:text-base gba:text-white/70 gba:max-w-xl gba:mx-auto gba:leading-relaxed"
                  data-testid={`${testId}-hero-description`}
                >
                  {heroSubtitle}
                </p>
              ) : (
                <div
                  className="gba:text-base gba:text-white/70 gba:max-w-xl gba:mx-auto gba:leading-relaxed"
                  data-testid={`${testId}-hero-description`}
                >
                  {heroSubtitle}
                </div>
              )
            ) : null}
          </div>
        </div>
        {overviewFooterContent != null ? (
          <div className="gba:relative gba:-mb-px" data-testid={`${testId}-hero-footer`}>
            <div className="layout-content">{overviewFooterContent}</div>
          </div>
        ) : null}
      </section>
    ) : (
      <div className="gba:shrink-0 gba:min-h-0" data-testid={`${testId}-header`} style={{ height: HERO_EDITOR_HEIGHT }}>
        <div className="gba:relative gba:overflow-hidden gba:h-full">
          <PremiumHeroBackground data-testid={`${testId}-hero-background`} />
          <div className="gba:absolute gba:inset-0 gba:pointer-events-none gba:space-hero-overlay" aria-hidden />
          <div className="layout-content gba:relative gba:h-full gba:py-6 gba:flex gba:flex-col gba:justify-end">
            <div className="gba:flex gba:flex-col gba:gap-4">
              {showBackButton && onBack != null ? (
                <div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onBack}
                    className="gba:gap-2 gba:text-white hover:gba:bg-white/10 gba:-ml-2"
                    data-testid={`${testId}-hero-back`}
                  >
                    <ArrowLeft className="gba:w-4 gba:h-4" />
                    <span>{heroBackLabel}</span>
                  </Button>
                </div>
              ) : null}
              <div className="gba:flex gba:items-start gba:justify-between gba:gap-4 gba:mb-1">
                <div className="gba:flex gba:items-start gba:gap-3 gba:min-w-0">
                  <div className="gba:w-10 gba:h-10 gba:rounded-lg gba:bg-white/10 gba:border gba:border-white/20 gba:flex gba:items-center gba:justify-center gba:shrink-0">
                    {heroIcon != null && renderHeroIcon(heroIcon)}
                  </div>
                  <div className="gba:min-w-0">
                    {heroOverline != null ? (
                      <span
                        className="gba:block gba:text-xs gba:font-medium gba:tracking-[0.3em] gba:text-white/60 gba:uppercase gba:mb-1"
                        data-testid={`${testId}-hero-overline`}
                      >
                        {heroOverline}
                      </span>
                    ) : null}
                    {typeof heroTitle === 'string' || typeof heroTitle === 'number' ? (
                      <h1
                        className="gba:font-funnel-display gba:text-2xl gba:sm:text-3xl gba:font-semibold gba:text-white gba:tracking-tight gba:truncate"
                        data-testid={`${testId}-hero-title`}
                      >
                        {heroTitle}
                      </h1>
                    ) : (
                      <div data-testid={`${testId}-hero-title`}>{heroTitle}</div>
                    )}
                    {heroSubtitle != null ? (
                      typeof heroSubtitle === 'string' || typeof heroSubtitle === 'number' ? (
                        <p
                          className="gba:text-sm gba:text-white/60 gba:max-w-xl gba:truncate"
                          data-testid={`${testId}-hero-description`}
                        >
                          {heroSubtitle}
                        </p>
                      ) : (
                        <div
                          className="gba:text-sm gba:text-white/60 gba:max-w-xl"
                          data-testid={`${testId}-hero-description`}
                        >
                          {heroSubtitle}
                        </div>
                      )
                    ) : null}
                  </div>
                </div>
                {heroExtra != null ? (
                  <div
                    className="gba:flex gba:items-center gba:gap-2 gba:shrink-0"
                    data-testid={`${testId}-hero-extra`}
                  >
                    {heroExtra}
                  </div>
                ) : null}
              </div>
              {heroMeta != null || heroBadges != null ? (
                <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2" data-testid={`${testId}-hero-meta`}>
                  {heroMeta}
                  {heroBadges}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    )

  return (
    <div
      className={`gba:flex gba:flex-col gba:h-full gba:min-h-0 gba:w-full gba:overflow-hidden gba:bg-background ${className}`.trim()}
      data-testid={testId}
    >
      {heroSection}
      {bodyContent}
    </div>
  )
}
