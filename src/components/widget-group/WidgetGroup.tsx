import React, { ReactNode, useEffect, useRef } from 'react'
import { SectionKpiCards, KpiCardData, Button, Icon } from '@newwork/nw-design-system'
import { WarningIcon, ArrowClockwiseIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { UsersIcon, CalendarIcon, EnvelopeIcon, PhoneIcon } from '@phosphor-icons/react'

export interface WidgetItem {
  key: string
  title: string
  value: number | string | undefined | null
  prefix?: ReactNode
  /**
   * Optional className(s) applied to the icon container in the card header.
   * Useful for coloring the icon bubble.
   */
  iconClassName?: string
  /**
   * Optional className(s) applied to the footer/description text.
   */
  footerClassName?: string
  /**
   * Optional className(s) applied to the card element itself.
   */
  cardClassName?: string
  suffix?: ReactNode
  color?: string
  precision?: number
  /**
   * Flag to indicate if the value is already formatted as a string
   */
  valueIsString?: boolean
  span?: {
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  /**
   * Optional description text to show below the value (alias for footer; use footer for clarity)
   */
  description?: string
  /**
   * Optional footer text to show below the value (maps to KPI card footer)
   */
  footer?: string
  /**
   * Optional trend data for showing trend indicators
   */
  trend?: {
    value?: string
    positive?: boolean
    description?: string
    /** When true, hides the trend badge (e.g. for no-trend cards with value + empty row + footer). */
    hideBadge?: boolean
  }
  customContent?: ReactNode
  /**
   * Optional click handler for the widget
   */
  onClick?: () => void
  /**
   * Flag to indicate if the widget is currently active/selected
   */
  active?: boolean
}

export interface WidgetGroupProps {
  /**
   * Array of widget items to display
   */
  widgets: WidgetItem[]

  /**
   * Flag to indicate if data is loading
   */
  isLoading?: boolean

  /**
   * Error message or null if no error
   */
  error?: string | Error | null

  /**
   * Function to call when retry button is clicked
   */
  onRetry?: () => void

  /**
   * Function to call when a widget card is clicked (makes cards clickable when provided)
   */
  onWidgetClick?: (widgetKey: string) => void

  /**
   * Custom class names to apply to the container
   */
  className?: string

  /**
   * Gap between widgets
   */
  gutter?: number | [number, number]

  /**
   * Whether cards should be hoverable
   */
  hoverable?: boolean

  /**
   * Default column span for each widget if not specified in the widget item
   */
  defaultSpan?: {
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }

  /**
   * Number of placeholder skeletons to show when loading
   */
  skeletonCount?: number

  /**
   * Text to show when widgets array is empty
   */
  emptyText?: string

  /**
   * Background for each card
   */
  cardBackground?: string

  /**
   * Test ID for the widget group container
   */
  'data-testid'?: string

  /**
   * Custom className for the SectionKpiCards grid container
   */
  cardsClassName?: string

  /**
   * If true, uses the widgets array structure during loading to preserve height
   * This ensures loading placeholders match the height of loaded widgets
   * When true, also shows loading text in the footer/description area instead of the value area
   */
  useWidgetStructureForLoading?: boolean
}

/**
 * Helper function to convert ReactNode to string for icons/prefixes
 */
const reactNodeToString = (node: ReactNode): string | undefined => {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return node.toString()
  // For icon components, we can't easily convert them to strings
  // Return undefined for now, could be enhanced to map common icons
  return undefined
}

/**
 * Map Ant Design icon elements to design-system Icon ReactNodes
 */
const mapAntIconToReactNode = (iconElement: ReactNode): ReactNode | undefined => {
  if (!iconElement || typeof iconElement !== 'object') return undefined

  // Check if it's a React element with a type
  const element = iconElement as any
  if (element.type && element.type.name) {
    const iconName = element.type.name

    // Map common Ant Design icons to phosphor icons wrapped by DS Icon
    const iconMapping: Record<string, ReactNode> = {
      UserOutlined: <Icon icon={UsersIcon} size="sm" decorative />,
      ContactsOutlined: <Icon icon={UsersIcon} size="sm" decorative />,
      TeamOutlined: <Icon icon={UsersIcon} size="sm" decorative />,
      MailOutlined: <Icon icon={EnvelopeIcon} size="sm" decorative />,
      FileTextOutlined: <Icon icon={EnvelopeIcon} size="sm" decorative />,
      PhoneOutlined: <Icon icon={PhoneIcon} size="sm" decorative />,
      CalendarOutlined: <Icon icon={CalendarIcon} size="sm" decorative />,
      ClockCircleOutlined: <Icon icon={CalendarIcon} size="sm" decorative />,
      // Fallbacks
      DollarOutlined: <Icon icon={EnvelopeIcon} size="sm" decorative />,
      TrophyOutlined: <Icon icon={UsersIcon} size="sm" decorative />,
      FireOutlined: <Icon icon={UsersIcon} size="sm" decorative />,
      ShopOutlined: <Icon icon={UsersIcon} size="sm" decorative />,
      BankOutlined: <Icon icon={UsersIcon} size="sm" decorative />,
      RiseOutlined: <Icon icon={UsersIcon} size="sm" decorative />
    }

    return iconMapping[iconName]
  }

  return undefined
}

/**
 * Map simple string names like 'users', 'calendar', 'mail', 'phone' to Icon ReactNodes
 */
const mapStringNameToIconNode = (name?: string): ReactNode | undefined => {
  if (!name) return undefined
  const key = name.toLowerCase().trim()
  if (key === 'users' || key === 'user' || key === 'people') return <Icon icon={UsersIcon} size="sm" decorative />
  if (key === 'calendar' || key === 'date' || key === 'time') return <Icon icon={CalendarIcon} size="sm" decorative />
  if (key === 'clock') return <Icon icon={CalendarIcon} size="sm" decorative />
  if (key === 'firstaid' || key === 'first-aid' || key === 'health' || key === 'sick')
    return <Icon icon={UsersIcon} size="sm" decorative />
  if (key === 'mail' || key === 'email' || key === 'envelope') return <Icon icon={EnvelopeIcon} size="sm" decorative />
  if (key === 'phone' || key === 'call') return <Icon icon={PhoneIcon} size="sm" decorative />
  return undefined
}

/**
 * Extract an Icon ReactNode from a provided prefix ReactNode or string
 * - Supports AntD icon elements
 * - Supports string shorthands: 'users', 'calendar', 'mail', 'phone'
 */
const extractIconFromPrefix = (prefix: ReactNode): ReactNode | undefined => {
  // First, try mapping AntD icon elements
  const mappedFromElement = mapAntIconToReactNode(prefix)
  if (mappedFromElement) return mappedFromElement

  // Next, if prefix is a string name, map to an icon
  if (typeof prefix === 'string') {
    return mapStringNameToIconNode(prefix)
  }

  return undefined
}

/**
 * Transform WidgetItem to KpiCardData
 */
const transformWidgetToKpiCard = (widget: WidgetItem): KpiCardData => {
  // Determine icon from prefix (element or string shorthand)
  const iconNode =
    extractIconFromPrefix(widget.prefix) ||
    (React.isValidElement(widget.prefix) ? (widget.prefix as ReactNode) : undefined)

  // Decide whether to keep textual prefix
  // If prefix is a known icon string, don't show it as text
  const potentialPrefixText = reactNodeToString(widget.prefix)
  const isIconKeyword =
    typeof potentialPrefixText === 'string' &&
    ['users', 'user', 'people', 'calendar', 'date', 'time', 'mail', 'email', 'envelope', 'phone', 'call'].includes(
      potentialPrefixText.toLowerCase()
    )

  return {
    id: widget.key,
    title: widget.title,
    value: widget.value ?? (widget.valueIsString ? '0' : 0),
    prefix: isIconKeyword ? undefined : potentialPrefixText,
    suffix: reactNodeToString(widget.suffix),
    decimalPlaces: widget.precision,
    footer: widget.footer ?? widget.description,
    icon: iconNode,
    trend: widget.trend ? { ...widget.trend, value: widget.trend.value ?? '' } : undefined
    // Note: SectionKpiCards doesn't support onClick directly,
    // but we'll handle it in the component if needed
  }
}

/**
 * Applies widget metadata and interactivity to card DOM elements (used when onWidgetClick is provided).
 * Makes each card a proper interactive element (role, tabIndex, click, keyboard) for accessibility.
 * Returns a cleanup function to remove event listeners.
 */
function applyWidgetInteractivityToCards(
  container: HTMLDivElement,
  widgets: WidgetItem[],
  onWidgetClick: (widgetKey: string) => void
): () => void {
  const controller = new AbortController()
  const { signal } = controller

  const cards = container.querySelectorAll('div[class*="card"], div[class*="Card"]')
  const count = widgets.length
  const cardsPerWidget = count > 0 ? Math.ceil(cards.length / count) : 0
  for (let widgetIndex = 0; widgetIndex < count; widgetIndex++) {
    const widget = widgets[widgetIndex]
    const startIndex = widgetIndex * cardsPerWidget
    const endIndex = Math.min(startIndex + cardsPerWidget, cards.length)
    for (let i = startIndex; i < endIndex; i++) {
      const card = cards[i] as HTMLElement
      card.dataset.widgetKey = widget.key
      if (widget.onClick) {
        card.classList.add('clickable')
      } else {
        card.classList.remove('clickable')
      }

      card.setAttribute('role', 'button')
      card.tabIndex = 0
      if (widget.title) {
        card.setAttribute('aria-label', widget.title)
      }

      const activate = (): void => {
        onWidgetClick(widget.key)
        widget.onClick?.()
      }

      card.addEventListener('click', activate, { signal })
      card.addEventListener(
        'keydown',
        (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            activate()
          }
        },
        { signal }
      )
    }
  }

  return () => controller.abort()
}

/**
 * A component that displays a group of widgets with consistent height
 */
export const WidgetGroup: React.FC<WidgetGroupProps> = ({
  widgets,
  isLoading = false,
  error = null,
  onRetry,
  onWidgetClick,
  cardsClassName,
  className = 'gba:py-2',
  skeletonCount = 4,
  emptyText = 'No data available',
  useWidgetStructureForLoading = false,
  'data-testid': dataTestId = 'widget-group'
}) => {
  const cardsRef = useRef<HTMLDivElement>(null)

  // When onWidgetClick is used, make each card an accessible interactive element (role, tabIndex, click, keyboard)
  useEffect(() => {
    if (!onWidgetClick || !cardsRef.current) return
    let cleanup: () => void = () => {}
    const run = (): void => {
      cleanup()
      if (cardsRef.current) cleanup = applyWidgetInteractivityToCards(cardsRef.current, widgets, onWidgetClick)
    }
    run()
    const timeoutId = setTimeout(run, 100)
    return () => {
      clearTimeout(timeoutId)
      cleanup()
    }
  }, [onWidgetClick, widgets])

  // Transform widgets to KPI cards (declare before content usage)
  const kpiCards: KpiCardData[] = widgets.map(widget => transformWidgetToKpiCard(widget))
  // Build cards for each state but keep a single return to avoid tree shape churn
  let content: React.ReactNode
  if (isLoading) {
    let loadingCards: KpiCardData[]
    if (useWidgetStructureForLoading && widgets && widgets.length > 0) {
      const loadingText = getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.loading_text', 'Loading...')
      loadingCards = widgets.map(widget => {
        const kpiCard = transformWidgetToKpiCard(widget)
        const trendSkeleton = widget.trend ? { value: '\u00A0', positive: undefined, description: '\u00A0' } : undefined
        return { ...kpiCard, value: widget.valueIsString ? '0' : 0, footer: loadingText, trend: trendSkeleton }
      })
    } else {
      loadingCards = [...Array(skeletonCount)].map((_, index) => ({
        id: `loading-${index}`,
        title: getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.loading_text', 'Loading...'),
        value: 0
      }))
    }
    content = (
      <SectionKpiCards cards={loadingCards} className="gba:opacity-50" data-testid={`${dataTestId}-loading-cards`} />
    )
  } else if (error) {
    const errorMessage = error instanceof Error ? error.message : error
    content = (
      <div
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center gba:bg-red-50 gba:border gba:border-red-200 gba:rounded-lg"
        data-testid={`${dataTestId}-error-container`}
      >
        <WarningIcon className="gba:text-red-500 gba:text-4xl gba:mb-4" data-testid={`${dataTestId}-error-icon`} />
        <h3 className="gba:text-lg gba:font-medium gba:text-red-900 gba:mb-2" data-testid={`${dataTestId}-error-title`}>
          Error Loading Data
        </h3>
        <p className="gba:text-red-700 gba:mb-4" data-testid={`${dataTestId}-error-message`}>
          {errorMessage}
        </p>
        {onRetry && (
          <Button
            variant="outline"
            onClick={onRetry}
            className="gba:flex gba:items-center gba:gap-2"
            data-testid={`${dataTestId}-error-retry-button`}
          >
            <ArrowClockwiseIcon />
            Retry
          </Button>
        )}
      </div>
    )
  } else if (!widgets || widgets.length === 0) {
    content = (
      <div className="gba:text-center gba:p-8" data-testid={`${dataTestId}-empty`}>
        <p className="gba:text-gray-500 gba:mb-4" data-testid={`${dataTestId}-empty-message`}>
          {emptyText}
        </p>
        {onRetry && (
          <Button
            variant="outline"
            onClick={onRetry}
            className="gba:flex gba:items-center gba:gap-2 gba:mx-auto"
            data-testid={`${dataTestId}-empty-load-button`}
          >
            <ArrowClockwiseIcon />
            Load Data
          </Button>
        )}
      </div>
    )
  } else if (onWidgetClick) {
    content = (
      <div className="gba:relative" style={{ cursor: 'default' }} data-testid={`${dataTestId}-clickable-container`}>
        <div ref={cardsRef} className="widget-group-cards">
          <SectionKpiCards cards={kpiCards} className={cardsClassName} data-testid={`${dataTestId}-cards`} />
        </div>
      </div>
    )
  } else {
    content = <SectionKpiCards cards={kpiCards} className={cardsClassName} data-testid={`${dataTestId}-cards`} />
  }

  return (
    <div className={className} data-testid={dataTestId}>
      {content}
    </div>
  )
}

export default WidgetGroup
