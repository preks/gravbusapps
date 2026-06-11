import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Button, useTranslation } from '@newwork/nw-design-system'
import { CaretDownIcon, CaretUpIcon } from '@phosphor-icons/react'
import translations from '../_i18n'

const OVERVIEW_CARD_MAX_HEIGHT = 384

interface ExpandableCardProps {
  readonly children: ReactNode
  readonly canExpand?: boolean
}

export function ExpandableCard({ children, canExpand = true }: Readonly<ExpandableCardProps>) {
  const { t } = useTranslation(translations)
  const contentRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)

  useLayoutEffect(() => {
    const el = contentRef.current
    if (!el) return
    if (!canExpand) {
      setExpanded(false)
      setOverflows(false)
      return
    }

    const nowOverflows = el.scrollHeight > OVERVIEW_CARD_MAX_HEIGHT
    setOverflows(prev => (prev === nowOverflows ? prev : nowOverflows))
  }, [canExpand, children])

  const collapsed = !expanded && overflows

  return (
    <div className="gba:flex gba:flex-col">
      <div
        ref={contentRef}
        className={collapsed ? 'gba:relative gba:flex-1 gba:max-h-96 gba:overflow-hidden' : 'gba:relative gba:flex-1'}
      >
        {children}
        {collapsed && (
          <div className="gba:absolute gba:bottom-0 gba:left-0 gba:right-0 gba:h-16 gba:bg-gradient-to-t gba:from-background gba:to-transparent gba:pointer-events-none" />
        )}
      </div>
      {overflows && (
        <div className="gba:flex gba:justify-center gba:pt-2 gba:pb-1">
          <Button variant="ghost" size="sm" onClick={() => setExpanded(e => !e)} className="gba:text-xs gba:gap-1">
            {expanded ? (
              <>
                <CaretUpIcon className="gba:size-3.5" /> {t('btn-show-less')}
              </>
            ) : (
              <>
                <CaretDownIcon className="gba:size-3.5" /> {t('btn-show-more')}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
