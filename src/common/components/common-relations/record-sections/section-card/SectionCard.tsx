import React, { useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@newwork/nw-design-system'
import { PiCaretLeft, PiCaretRight } from 'react-icons/pi'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'

export interface ActionButtonConfig {
  type: 'AppActionButton' | 'AppAction'
  config: {
    contextsArray?: FlowContextName[]
    externalContextData?: Record<string, any>
    prefixDataTestId?: string
    emptyStateBehavior?: 'enable' | 'disable' | 'hide'
    deferMainContextRequestsUntilClick?: boolean
    // For AppAction only
    children?: React.ReactNode
  }
}

export interface Section<T = Record<string, any>> {
  id: string
  component: React.ComponentType<T>
  props: T
  // Carousel support
  getPages?: (props: T) => any[] // Returns array of page data
  renderPage?: (pageData: any, pageIndex: number, props: T) => React.ReactNode
  getActionButtonConfig?: (pageData: any, pageIndex: number, props: T) => ActionButtonConfig | null
}

export interface SectionWrapperProps<T = Record<string, any>> {
  sections: Section<T>[]
  className?: string
  'data-testid'?: string
}

const SectionWrapper = <T = Record<string, any>,>({
  sections,
  className,
  'data-testid': dataTestId
}: SectionWrapperProps<T>) => {
  // Create a stable storage key based on sections (memoized for performance)
  const storageKey = useMemo(() => `sectionWrapper_${sections.map(s => s.id).join('_')}`, [sections])

  // Get initial tab from sessionStorage or default to first section
  const getInitialTab = () => {
    try {
      const storedTab = sessionStorage.getItem(storageKey)
      // Verify the stored tab still exists in sections
      if (storedTab && sections.some(s => s.id === storedTab)) {
        return storedTab
      }
    } catch {
      // ignore storage errors
    }
    return sections[0]?.id || ''
  }

  const [activeTab, setActiveTab] = useState(getInitialTab)

  // Persist tab changes to sessionStorage
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    try {
      sessionStorage.setItem(storageKey, tabId)
    } catch {
      // ignore storage errors
    }
  }

  const isSingleSection = sections.length === 1
  const singleSection = sections[0]

  // Carousel state per section
  const [carouselStates, setCarouselStates] = useState<Record<string, number>>({})

  // Helper function to get section info from component
  const getSectionInfo = (section: Section<T>, pageIndex?: number) => {
    const Component = section.component
    const props = { ...section.props, showHeader: false }

    // Extract title from component props or static methods
    const sectionTitleProp = (Component as any).sectionTitle
    const title =
      typeof sectionTitleProp === 'function'
        ? sectionTitleProp(section.props)
        : sectionTitleProp || (section.props as any).sectionTitle || 'Section'

    // Check if section supports carousel (has getPages) - static methods are set on Component
    const getPages = (Component as any).getPages
    const pages = getPages ? getPages(section.props) : null
    const hasCarousel = pages && pages.length > 0
    const currentPageIndex = pageIndex ?? carouselStates[section.id] ?? 0
    const currentPage = hasCarousel && pages ? pages[currentPageIndex] : null

    // Get action button config - use getActionButtonConfig if available
    let actionButtonConfig: ActionButtonConfig | null = null
    const getActionButtonConfig = (Component as any).getActionButtonConfig
    if (getActionButtonConfig) {
      if (hasCarousel && currentPage) {
        // Carousel mode: use current page
        actionButtonConfig = getActionButtonConfig(currentPage, currentPageIndex, section.props)
      } else if (hasCarousel && pages && pages.length > 0) {
        // Single page in carousel: use first page
        actionButtonConfig = getActionButtonConfig(pages[0], 0, section.props)
      } else {
        // Non-carousel: pass null as pageData, section should handle it
        actionButtonConfig = getActionButtonConfig(null, 0, section.props)
      }
    }

    // Render content - use renderPage if carousel, otherwise default component - static methods are set on Component
    let content: React.ReactNode
    const renderPage = (Component as any).renderPage
    if (hasCarousel && currentPage && renderPage) {
      content = renderPage(currentPage, currentPageIndex, section.props)
    } else if (hasCarousel && pages && pages.length > 0 && renderPage) {
      // Single page: still use renderPage
      content = renderPage(pages[0], 0, section.props)
    } else {
      content = <Component {...(props as any)} />
    }

    return {
      title,
      actionButtonConfig,
      content,
      hasCarousel: !!hasCarousel,
      pages: pages || [],
      currentPageIndex
    }
  }

  // Carousel navigation handlers
  const handleCarouselPrevious = (sectionId: string, totalPages: number) => {
    setCarouselStates(prev => {
      const current = prev[sectionId] || 0
      const newIndex = current > 0 ? current - 1 : totalPages - 1
      return { ...prev, [sectionId]: newIndex }
    })
  }

  const handleCarouselNext = (sectionId: string, totalPages: number) => {
    setCarouselStates(prev => {
      const current = prev[sectionId] || 0
      const newIndex = current < totalPages - 1 ? current + 1 : 0
      return { ...prev, [sectionId]: newIndex }
    })
  }

  // Render action button from config
  const renderActionButton = (config: ActionButtonConfig | null, accessToken?: string) => {
    if (!config || !accessToken) {
      return null
    }

    if (config.type === 'AppActionButton') {
      // Use externalContextData as key to force re-render when context changes (e.g., different accountId/contactId)
      const contextKey = JSON.stringify(config.config.externalContextData || {})
      return (
        <AppActionButton
          key={`action-button-${contextKey}`}
          data-testid={`section-action-button-${config.config.prefixDataTestId || 'default'}`}
          size="icon"
          contextsArray={config.config.contextsArray}
          externalContextData={config.config.externalContextData}
          prefixDataTestId={config.config.prefixDataTestId}
          accessToken={accessToken}
          emptyStateBehavior={config.config.emptyStateBehavior || 'enable'}
          deferMainContextRequestsUntilClick={config.config.deferMainContextRequestsUntilClick}
        />
      )
    } else if (config.type === 'AppAction') {
      if (!config.config.children || !React.isValidElement(config.config.children)) {
        return null
      }
      return (
        <AppAction
          accessToken={accessToken}
          contextsArray={config.config.contextsArray}
          externalContextData={config.config.externalContextData}
          prefixDataTestId={config.config.prefixDataTestId}
          emptyStateBehavior={config.config.emptyStateBehavior || 'enable'}
        >
          {config.config.children}
        </AppAction>
      )
    }
    return null
  }

  if (isSingleSection) {
    const currentPageIndex = carouselStates[singleSection.id] || 0
    const sectionInfo = getSectionInfo(singleSection, currentPageIndex)
    const accessToken = (singleSection.props as any).accessToken

    // Single section: Card with header containing title and actions
    return (
      <Card className={`${className} gba:flex-col gba:h-full`} data-testid={dataTestId || 'section-wrapper-single'}>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-center gba:w-full">
            <CardTitle>{sectionInfo.title}</CardTitle>
            {renderActionButton(sectionInfo.actionButtonConfig, accessToken)}
          </div>
        </CardHeader>
        <CardContent className="gba:overflow-auto gba:h-full gba:relative">
          {sectionInfo.content}
          {/* Carousel Navigation - Bottom Right */}
          {sectionInfo.hasCarousel && sectionInfo.pages.length > 1 && (
            <div className="gba:absolute gba:bottom-2 gba:right-2 gba:z-10">
              <div className="gba:flex gba:items-center gba:gap-1 gba:rounded gba:border gba:bg-muted gba:px-2 gba:py-1 gba:shadow-sm gba:border-border">
                <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">
                  {currentPageIndex + 1}/{sectionInfo.pages.length}
                </span>
                <button
                  onClick={() => handleCarouselPrevious(singleSection.id, sectionInfo.pages.length)}
                  data-testid={`${singleSection.id}-carousel-prev`}
                  className="gba:h-4 gba:w-4 gba:flex gba:items-center gba:justify-center gba:rounded gba:transition-colors gba:p-1 gba:text-muted-foreground gba:hover:bg-muted-foreground/10"
                >
                  <PiCaretLeft className="gba:text-[10px]" />
                </button>
                <button
                  onClick={() => handleCarouselNext(singleSection.id, sectionInfo.pages.length)}
                  data-testid={`${singleSection.id}-carousel-next`}
                  className="gba:h-4 gba:w-4 gba:flex gba:items-center gba:justify-center gba:rounded gba:transition-colors gba:p-1 gba:text-muted-foreground gba:hover:bg-muted-foreground/10"
                >
                  <PiCaretRight className="gba:text-[10px]" />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Multiple sections: Card with custom tab implementation
  const activeSection = sections.find(section => section.id === activeTab)
  const activeSectionCurrentPageIndex = activeSection ? carouselStates[activeSection.id] || 0 : 0
  const activeSectionInfo = activeSection ? getSectionInfo(activeSection, activeSectionCurrentPageIndex) : null
  const activeSectionAccessToken = activeSection ? (activeSection.props as any).accessToken : undefined

  return (
    <Card className={`${className} gba:flex-col gba:h-full`} data-testid={dataTestId || 'section-wrapper-tabs'}>
      <CardHeader>
        <div className="gba:flex gba:justify-between gba:items-center gba:w-full">
          <div>
            {sections.map(section => {
              const sectionInfo = getSectionInfo(section)
              return (
                <Button
                  key={section.id}
                  variant={activeTab === section.id ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleTabChange(section.id)}
                  data-testid={`${section.id}-tab`}
                >
                  {sectionInfo.title}
                </Button>
              )
            })}
          </div>
          {/* Show actions for the active section */}
          {activeSectionInfo && renderActionButton(activeSectionInfo.actionButtonConfig, activeSectionAccessToken)}
        </div>
      </CardHeader>
      <CardContent className="gba:overflow-auto gba:h-full gba:relative">
        {sections.map(section => {
          if (activeTab !== section.id) return null
          const currentPageIndex = carouselStates[section.id] || 0
          const sectionInfo = getSectionInfo(section, currentPageIndex)
          return <div key={section.id}>{sectionInfo.content}</div>
        })}
        {/* Carousel Navigation - Bottom Right (for active section) */}
        {activeSectionInfo && activeSectionInfo.hasCarousel && activeSectionInfo.pages.length > 1 && (
          <div className="gba:absolute gba:bottom-2 gba:right-2 gba:z-10">
            <div className="gba:flex gba:items-center gba:gap-1 gba:rounded gba:border gba:bg-muted gba:px-2 gba:py-1 gba:shadow-sm gba:border-border">
              <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">
                {activeSectionCurrentPageIndex + 1}/{activeSectionInfo.pages.length}
              </span>
              <button
                onClick={() => handleCarouselPrevious(activeTab, activeSectionInfo.pages.length)}
                data-testid={`${activeTab}-carousel-prev`}
                className="gba:h-4 gba:w-4 gba:flex gba:items-center gba:justify-center gba:rounded gba:transition-colors gba:p-1 gba:text-muted-foreground gba:hover:bg-muted-foreground/10"
              >
                <PiCaretLeft className="gba:text-[10px]" />
              </button>
              <button
                onClick={() => handleCarouselNext(activeTab, activeSectionInfo.pages.length)}
                data-testid={`${activeTab}-carousel-next`}
                className="gba:h-4 gba:w-4 gba:flex gba:items-center gba:justify-center gba:rounded gba:transition-colors gba:p-1 gba:text-muted-foreground gba:hover:bg-muted-foreground/10"
              >
                <PiCaretRight className="gba:text-[10px]" />
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default SectionWrapper as <T = Record<string, any>>(props: SectionWrapperProps<T>) => JSX.Element
