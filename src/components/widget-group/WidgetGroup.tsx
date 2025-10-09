import React, { ReactNode, useEffect, useRef } from 'react'
import { SectionKpiCards, KpiCardData, Button } from '@newwork/nw-design-system'
import { PiWarning, PiArrowClockwise } from 'react-icons/pi'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface WidgetItem {
  key: string
  title: string
  value: number | string | undefined | null
  prefix?: ReactNode
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
   * Optional description text to show below the value
   */
  description?: string
  /**
   * Optional trend data for showing trend indicators
   */
  trend?: {
    value: string
    positive?: boolean
    description?: string
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
   * Function to call when a widget is clicked
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
 * Map Ant Design icon types to supported icon names in SectionKpiCards
 */
const mapAntIconToSupported = (iconElement: ReactNode): string | undefined => {
  if (!iconElement || typeof iconElement !== 'object') return undefined

  // Check if it's a React element with a type
  const element = iconElement as any
  if (element.type && element.type.name) {
    const iconName = element.type.name

    // Map common Ant Design icons to supported ones
    const iconMapping: Record<string, string> = {
      UserOutlined: 'users',
      ContactsOutlined: 'users',
      MailOutlined: 'mail',
      PhoneOutlined: 'phone',
      CalendarOutlined: 'calendar',
      ClockCircleOutlined: 'calendar',
      FileTextOutlined: 'mail', // Using mail as closest alternative
      DollarOutlined: 'mail', // No direct currency icon, using mail as fallback
      TrophyOutlined: 'users', // Using users as fallback
      FireOutlined: 'users', // Using users as fallback
      ShopOutlined: 'users', // Using users as fallback
      BankOutlined: 'users', // Using users as fallback
      RiseOutlined: 'users', // Using users as fallback
      TeamOutlined: 'users' // Using users as fallback
      // Add more mappings as needed
    }

    return iconMapping[iconName]
  }

  return undefined
}

/**
 * Transform WidgetItem to KpiCardData
 */
const transformWidgetToKpiCard = (widget: WidgetItem): KpiCardData => {
  return {
    id: widget.key,
    title: widget.title,
    value: widget.value ?? (widget.valueIsString ? '0' : 0),
    prefix: reactNodeToString(widget.prefix),
    suffix: reactNodeToString(widget.suffix),
    decimalPlaces: widget.precision,
    footer: widget.description,
    icon: mapAntIconToSupported(widget.prefix),
    trend: widget.trend
    // Note: SectionKpiCards doesn't support onClick directly,
    // but we'll handle it in the component if needed
  }
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
  className = 'gba:py-2',
  skeletonCount = 4,
  emptyText = 'No data available',
  'data-testid': dataTestId = 'widget-group'
}) => {
  // Handle loading state
  if (isLoading) {
    // Create placeholder KPI cards for loading state
    const placeholderCards: KpiCardData[] = [...Array(skeletonCount)].map((_, index) => ({
      id: `loading-${index}`,
      title: getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.loading_text', 'Loading...'),
      value: 0
    }))

    return (
      <div className={className} data-testid={`${dataTestId}-loading`}>
        <SectionKpiCards
          cards={placeholderCards}
          className="gba:opacity-50"
          data-testid={`${dataTestId}-loading-cards`}
        />
      </div>
    )
  }

  // Handle error state
  if (error) {
    const errorMessage = error instanceof Error ? error.message : error
    return (
      <div className={className} data-testid={`${dataTestId}-error`}>
        <div
          className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center gba:bg-red-50 gba:border gba:border-red-200 gba:rounded-lg"
          data-testid={`${dataTestId}-error-container`}
        >
          <PiWarning className="gba:text-red-500 gba:text-4xl gba:mb-4" data-testid={`${dataTestId}-error-icon`} />
          <h3
            className="gba:text-lg gba:font-medium gba:text-red-900 gba:mb-2"
            data-testid={`${dataTestId}-error-title`}
          >
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
              <PiArrowClockwise />
              Retry
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Handle empty state
  if (!widgets || widgets.length === 0) {
    return (
      <div className={`${className} gba:text-center gba:p-8`} data-testid={`${dataTestId}-empty`}>
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
            <PiArrowClockwise />
            Load Data
          </Button>
        )}
      </div>
    )
  }

  // Transform widgets to KPI cards
  const kpiCards: KpiCardData[] = widgets.map(widget => transformWidgetToKpiCard(widget))

  // Ref to the cards container
  const cardsRef = useRef<HTMLDivElement>(null)

  // Apply cursor styling to individual cards
  useEffect(() => {
    const applyCursorStyling = () => {
      if (cardsRef.current) {
        // Find all card elements using a more reliable selector
        const cards = cardsRef.current.querySelectorAll('div[class*="card"], div[class*="Card"]')

        // Process each widget and find its corresponding card(s)
        widgets.forEach((widget, widgetIndex) => {
          // Calculate which cards belong to this widget
          const cardsPerWidget = Math.ceil(cards.length / widgets.length)
          const startIndex = widgetIndex * cardsPerWidget
          const endIndex = Math.min(startIndex + cardsPerWidget, cards.length)
          const widgetCards = Array.from(cards).slice(startIndex, endIndex)

          widgetCards.forEach(card => {
            // Add data attribute for identification
            card.setAttribute('data-widget-key', widget.key)
            // Add clickable class if widget has onClick handler
            if (widget.onClick) {
              card.classList.add('clickable')
            } else {
              card.classList.remove('clickable')
            }
          })
        })
      }
    }

    // Apply immediately
    applyCursorStyling()

    // Also apply after a short delay to ensure DOM is fully rendered
    const timeoutId = setTimeout(applyCursorStyling, 100)

    return () => clearTimeout(timeoutId)
  }, [widgets])

  // Display widgets using SectionKpiCards with conditional click handling
  return (
    <div className={className} data-testid={dataTestId}>
      {onWidgetClick ? (
        // Add clickable wrapper only when onWidgetClick is provided
        <div
          className="gba:relative"
          style={{
            // Default cursor for the container
            cursor: 'default'
          }}
          onClick={e => {
            // Calculate which card was clicked based on mouse position
            const rect = e.currentTarget.getBoundingClientRect()
            const x = e.clientX - rect.left
            const cardWidth = rect.width / 4 // Assuming 4 cards per row
            const cardIndex = Math.floor(x / cardWidth)

            if (cardIndex >= 0 && cardIndex < widgets.length) {
              const widgetKey = widgets[cardIndex].key
              if (onWidgetClick) {
                onWidgetClick(widgetKey)
              }
              // Also call individual widget onClick if it exists
              if (widgets[cardIndex]?.onClick) {
                widgets[cardIndex].onClick()
              }
            }
          }}
          data-testid={`${dataTestId}-clickable-container`}
        >
          <div ref={cardsRef} className="widget-group-cards">
            <SectionKpiCards cards={kpiCards} data-testid={`${dataTestId}-cards`} />
          </div>
        </div>
      ) : (
        // Use SectionKpiCards directly when no click functionality is needed
        <SectionKpiCards cards={kpiCards} data-testid={`${dataTestId}-cards`} />
      )}
    </div>
  )
}

export default WidgetGroup
