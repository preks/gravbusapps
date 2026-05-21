'use client'

import React, { useCallback, useMemo, useRef, useState } from 'react'
import { Badge, Button, Card, CardContent } from '@newwork/nw-design-system'
import { CaretDownIcon, CaretLeftIcon, CaretRightIcon, DotsThreeIcon, SparkleIcon } from '@phosphor-icons/react'

export type HrGrowthInsightPriority = 'high' | 'recommended' | 'opportunity'

interface HrGrowthInsightsTestIds {
  section: string
  toggle: string
  scrollLeft: string
  scrollRight: string
  cardPrefix: string
  menuPrefix: string
}

export interface HrGrowthInsightCard {
  id: string
  priority: HrGrowthInsightPriority
  icon: React.ReactNode
  title: string
  description: React.ReactNode
  footer?: React.ReactNode
}

interface HrGrowthInsightsSectionProps {
  title: string
  description: string
  cards: HrGrowthInsightCard[]
  testIds: HrGrowthInsightsTestIds
}

const PRIORITY_CONFIG: Record<HrGrowthInsightPriority, { label: string; className: string }> = {
  high: { label: 'High priority', className: 'gba:bg-destructive gba:text-destructive-foreground' },
  recommended: { label: 'Recommended', className: 'gba:bg-info gba:text-info-foreground' },
  opportunity: { label: 'Opportunity', className: 'gba:bg-success gba:text-success-foreground' }
}

const ICON_BG: Record<HrGrowthInsightPriority, string> = {
  high: 'gba:bg-destructive/10',
  recommended: 'gba:bg-info/10',
  opportunity: 'gba:bg-success/10'
}

const ICON_COLOR: Record<HrGrowthInsightPriority, string> = {
  high: 'gba:text-destructive',
  recommended: 'gba:text-info',
  opportunity: 'gba:text-success'
}

const SHARED_INSIGHTS_STYLES = `
  @keyframes hrGrowthInsightsPulseGlow {
    0%, 100% { box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.35), 0 0 16px rgba(59, 130, 246, 0.12); }
    50% { box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.55), 0 0 24px rgba(59, 130, 246, 0.2); }
  }

  .hr-growth-insights-glow {
    animation: hrGrowthInsightsPulseGlow 2.5s ease-in-out infinite;
  }

  .hr-growth-insights-scroll {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .hr-growth-insights-scroll::-webkit-scrollbar {
    display: none;
  }
`

export const HrGrowthInsightsSection: React.FC<HrGrowthInsightsSectionProps> = ({
  title,
  description,
  cards,
  testIds
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const hasScrollableCards = useMemo(() => cards.length > 1, [cards.length])

  const updateScrollButtons = useCallback(() => {
    const element = scrollRef.current
    if (!element) return

    setCanScrollLeft(element.scrollLeft > 4)
    setCanScrollRight(element.scrollLeft + element.clientWidth < element.scrollWidth - 4)
  }, [])

  const handleRef = useCallback(
    (element: HTMLDivElement | null) => {
      scrollRef.current = element
      if (element) {
        requestAnimationFrame(updateScrollButtons)
      }
    },
    [updateScrollButtons]
  )

  const scroll = useCallback(
    (direction: 'left' | 'right') => {
      const element = scrollRef.current
      if (!element) return

      const cardWidth = element.firstElementChild?.getBoundingClientRect().width ?? 320
      const offset = direction === 'left' ? -cardWidth - 16 : cardWidth + 16
      element.scrollBy({ left: offset, behavior: 'smooth' })
      window.setTimeout(updateScrollButtons, 350)
    },
    [updateScrollButtons]
  )

  if (cards.length === 0) return null

  return (
    <>
      <style>{SHARED_INSIGHTS_STYLES}</style>
      <div
        className="hr-growth-insights-glow gba:relative gba:rounded-lg gba:bg-primary/[0.03] gba:px-4 gba:py-3"
        data-testid={testIds.section}
      >
        <button
          type="button"
          className="gba:flex gba:w-full gba:items-center gba:justify-between gba:text-left"
          onClick={() => setExpanded(previous => !previous)}
          data-testid={testIds.toggle}
        >
          <div className="gba:flex gba:items-center gba:gap-1.5">
            <SparkleIcon className="gba:h-4 gba:w-4 gba:text-primary" weight="fill" />
            <h3 className="gba:text-sm gba:font-semibold">
              {title} <span className="gba:font-normal gba:text-muted-foreground">({cards.length})</span>
            </h3>
          </div>
          <CaretDownIcon
            className={`gba:h-4 gba:w-4 gba:text-muted-foreground gba:transition-transform gba:duration-200 ${expanded ? 'gba:rotate-180' : ''}`}
            weight="bold"
          />
        </button>

        {expanded && (
          <>
            <p className="gba:mt-1 gba:mb-3 gba:text-xs gba:text-muted-foreground">{description}</p>

            <div className="gba:relative">
              {hasScrollableCards && (
                <div className="gba:mb-1.5 gba:flex gba:items-center gba:justify-end gba:gap-0.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gba:h-6 gba:w-6 gba:p-0"
                    disabled={!canScrollLeft}
                    onClick={() => scroll('left')}
                    data-testid={testIds.scrollLeft}
                  >
                    <CaretLeftIcon className="gba:h-3.5 gba:w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gba:h-6 gba:w-6 gba:p-0"
                    disabled={!canScrollRight}
                    onClick={() => scroll('right')}
                    data-testid={testIds.scrollRight}
                  >
                    <CaretRightIcon className="gba:h-3.5 gba:w-3.5" />
                  </Button>
                </div>
              )}

              <div
                ref={handleRef}
                onScroll={updateScrollButtons}
                className="hr-growth-insights-scroll gba:flex gba:gap-3 gba:overflow-x-auto gba:scroll-smooth"
              >
                {cards.map(card => {
                  const config = PRIORITY_CONFIG[card.priority]
                  return (
                    <Card
                      key={card.id}
                      className="gba:flex gba:min-w-[240px] gba:max-w-[280px] gba:flex-shrink-0 gba:flex-col"
                      data-testid={`${testIds.cardPrefix}-${card.id}`}
                    >
                      <CardContent className="gba:flex gba:flex-1 gba:flex-col gba:gap-2 gba:p-3">
                        <div className="gba:flex gba:items-start gba:justify-between">
                          <Badge className={config.className}>{config.label}</Badge>
                          <button
                            type="button"
                            className="gba:text-muted-foreground gba:transition-colors hover:gba:text-foreground"
                            data-testid={`${testIds.menuPrefix}-${card.id}-menu`}
                          >
                            <DotsThreeIcon className="gba:h-4 gba:w-4" weight="bold" />
                          </button>
                        </div>

                        <div className="gba:flex gba:items-start gba:gap-2.5">
                          <span
                            className={`gba:inline-flex gba:h-7 gba:w-7 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-full ${ICON_BG[card.priority]} ${ICON_COLOR[card.priority]}`}
                          >
                            {card.icon}
                          </span>
                          <div className="gba:min-w-0 gba:flex-1">
                            <p className="gba:text-xs gba:font-medium gba:leading-snug">{card.title}</p>
                            <p className="gba:mt-0.5 gba:text-[11px] gba:leading-relaxed gba:text-muted-foreground gba:line-clamp-2">
                              {card.description}
                            </p>
                          </div>
                        </div>

                        {card.footer ? <div className="gba:mt-auto gba:pt-1">{card.footer}</div> : null}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
