import React, { useEffect, useRef } from 'react'
import { WidgetGroup, WidgetGroupProps, WidgetItem } from '@/components/widget-group'

type ManagerClickableWidgetGroupProps = Omit<WidgetGroupProps, 'onWidgetClick'> & {
  onWidgetClick?: (widgetKey: string) => void
}

const CARD_SELECTOR = 'div[class*="card"], div[class*="Card"]'

const getTopCardElement = (element: HTMLElement): HTMLElement => {
  let current = element
  let ancestor = current.parentElement?.closest<HTMLElement>(CARD_SELECTOR)

  while (ancestor) {
    current = ancestor
    ancestor = current.parentElement?.closest<HTMLElement>(CARD_SELECTOR)
  }

  return current
}

const findCardByWidgetTitle = (root: HTMLElement, title: string): HTMLElement | null => {
  const normalizedTitle = title.trim()
  if (!normalizedTitle) return null

  const titleNode = Array.from(root.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6, p, span, div')).find(
    node => node.textContent?.trim() === normalizedTitle
  )

  if (!titleNode) return null

  const nearestCard = titleNode.closest<HTMLElement>(CARD_SELECTOR)
  if (!nearestCard) return null

  return getTopCardElement(nearestCard)
}

const getFallbackCards = (root: HTMLElement): HTMLElement[] => {
  const allCards = Array.from(root.querySelectorAll<HTMLElement>(CARD_SELECTOR))
  const topLevelCards = allCards.filter(card => !card.parentElement?.closest(CARD_SELECTOR))
  return topLevelCards.length > 0 ? topLevelCards : allCards
}

const wireWidgetClicks = (
  root: HTMLElement,
  widgets: WidgetItem[],
  onWidgetClick?: (widgetKey: string) => void
): (() => void) => {
  const controller = new AbortController()
  const fallbackCards = getFallbackCards(root)
  const usedCards = new Set<HTMLElement>()

  widgets.forEach((widget, index) => {
    const card =
      findCardByWidgetTitle(root, widget.title) ||
      fallbackCards.find((candidate, candidateIndex) => candidateIndex === index && !usedCards.has(candidate))

    if (!card) return
    usedCards.add(card)

    card.dataset.widgetKey = widget.key
    const isClickable = typeof widget.onClick === 'function'

    if (isClickable) {
      card.classList.add('clickable')
      card.style.cursor = 'pointer'
      card.setAttribute('role', 'button')
      card.tabIndex = 0
    } else {
      card.classList.remove('clickable')
      card.style.cursor = 'default'
      card.removeAttribute('role')
      card.removeAttribute('tabindex')
    }

    const activate = (): void => {
      if (!isClickable) return
      onWidgetClick?.(widget.key)
      widget.onClick?.()
    }

    card.addEventListener('click', activate, { signal: controller.signal })
    card.addEventListener(
      'keydown',
      (event: KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          activate()
        }
      },
      { signal: controller.signal }
    )
  })

  return () => controller.abort()
}

const ManagerClickableWidgetGroup: React.FC<ManagerClickableWidgetGroupProps> = ({
  widgets,
  onWidgetClick,
  isLoading,
  error,
  ...rest
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || isLoading || error || widgets.length === 0) return

    let cleanup = wireWidgetClicks(containerRef.current, widgets, onWidgetClick)

    // Re-run once after paint so DS layout settles before wiring listeners.
    const timeoutId = setTimeout(() => {
      cleanup()
      if (!containerRef.current) return
      cleanup = wireWidgetClicks(containerRef.current, widgets, onWidgetClick)
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      cleanup()
    }
  }, [widgets, onWidgetClick, isLoading, error])

  return (
    <div ref={containerRef}>
      <WidgetGroup widgets={widgets} isLoading={isLoading} error={error} {...rest} />
    </div>
  )
}

export default ManagerClickableWidgetGroup
