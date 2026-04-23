// Layout picker for the "New Slide" split button (PowerPoint-style dropdown grid).

import React, { useState, useMemo, useCallback } from 'react'
import { Button, Popover, PopoverContent, PopoverTrigger, Separator, useTranslation } from '@newwork/nw-design-system'
import { Plus, ChevronDown, CopyPlus, LayoutTemplate } from 'lucide-react'
import type { SlideTheme } from './slideThemes'
import type { SlideMaster, SlideLayout } from '../types/slideMaster'
import type { AnySlideElement } from './slideElements'
import { getEffectiveMasters } from '../data/defaultSlideMaster'
import translations from '../_i18n'

export type LayoutPickerMode = 'new-slide' | 'change-layout'

export interface SlideLayoutPickerProps {
  masters: SlideMaster[] | undefined
  currentTheme: SlideTheme
  onSelectLayout: (layoutId: string, masterId: string) => void
  onDuplicateSlide?: () => void
  onBrowseTemplates?: () => void
  lastUsedLayoutId?: string
  mode?: LayoutPickerMode
  'data-testid'?: string
}

const THUMB_WIDTH = 140
const THUMB_ASPECT = 16 / 9
const THUMB_HEIGHT = THUMB_WIDTH / THUMB_ASPECT
const CANVAS_W = 1280
const THUMB_SCALE = THUMB_WIDTH / CANVAS_W

function LayoutThumbnail({
  layout,
  master,
  onClick,
  testId
}: {
  layout: SlideLayout
  master: SlideMaster
  onClick: () => void
  testId?: string
}) {
  const bg = layout.background || master.background
  const bgStyle = useMemo(() => {
    if (!bg) return { backgroundColor: '#fff' }
    switch (bg.type) {
      case 'gradient':
        return bg.gradient
          ? {
              background: `linear-gradient(${bg.gradient.angle}deg, ${bg.gradient.stops.map(s => `${s.color} ${s.position}%`).join(', ')})`
            }
          : {}
      case 'image':
        return bg.imageUrl
          ? { backgroundImage: `url(${bg.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { backgroundColor: '#fff' }
      default:
        return { backgroundColor: bg.color || '#ffffff' }
    }
  }, [bg])

  return (
    <button
      type="button"
      onClick={onClick}
      className="gba:group gba:flex gba:flex-col gba:items-center gba:gap-1 gba:cursor-pointer gba:rounded-md gba:p-1 hover:gba:bg-accent gba:transition-colors"
      data-testid={testId}
    >
      <div
        className="gba:rounded gba:border gba:border-border gba:overflow-hidden group-hover:gba:border-primary gba:transition-colors"
        style={{ width: THUMB_WIDTH, height: THUMB_HEIGHT }}
      >
        <div className="gba:relative gba:w-full gba:h-full" style={bgStyle}>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: CANVAS_W,
              height: 720,
              transform: `scale(${THUMB_SCALE})`,
              transformOrigin: 'top left'
            }}
          >
            {layout.elements.map(el => (
              <LayoutElementPreview key={el.id} element={el} />
            ))}
          </div>
        </div>
      </div>
      <span className="gba:text-[10px] gba:text-muted-foreground gba:text-center gba:leading-tight gba:max-w-full gba:truncate">
        {layout.name}
      </span>
    </button>
  )
}

function LayoutElementPreview({ element }: { element: AnySlideElement }) {
  const el = element as any

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: el.position.x,
    top: el.position.y,
    width: el.size.width,
    height: el.size.height,
    zIndex: el.zIndex || 0
  }

  if (el.type === 'text') {
    return (
      <div
        style={{
          ...baseStyle,
          color: el.color,
          fontSize: el.fontSize,
          fontWeight: el.fontWeight,
          fontFamily: el.fontFamily,
          textAlign: el.textAlign,
          lineHeight: el.lineHeight || 1.2,
          overflow: 'hidden',
          whiteSpace: 'pre-wrap',
          padding: el.padding || 0
        }}
      >
        {el.content}
      </div>
    )
  }

  if (el.type === 'shape') {
    return (
      <div
        style={{
          ...baseStyle,
          backgroundColor: el.fill,
          borderRadius: el.shapeType === 'circle' || el.shapeType === 'ellipse' ? '50%' : el.cornerRadius || 0,
          border: el.strokeWidth ? `${el.strokeWidth}px ${el.strokeStyle || 'solid'} ${el.strokeColor}` : undefined
        }}
      />
    )
  }

  if (el.type === 'image') {
    return (
      <div
        style={{
          ...baseStyle,
          backgroundColor: 'hsl(var(--muted))',
          borderRadius: el.borderRadius || 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth="1.5"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </svg>
      </div>
    )
  }

  return <div style={baseStyle} />
}

export const SlideLayoutPicker: React.FC<SlideLayoutPickerProps> = ({
  masters,
  currentTheme,
  onSelectLayout,
  onDuplicateSlide,
  onBrowseTemplates,
  lastUsedLayoutId = 'title-content',
  mode = 'new-slide',
  'data-testid': testId = 'slide-layout-picker'
}) => {
  const { t } = useTranslation(translations)
  const [open, setOpen] = useState(false)

  const effectiveMasters = useMemo(() => getEffectiveMasters(masters, currentTheme, t), [masters, currentTheme, t])

  const activeMaster = effectiveMasters[0]

  const handleSelectLayout = useCallback(
    (layoutId: string, masterId: string) => {
      onSelectLayout(layoutId, masterId)
      setOpen(false)
    },
    [onSelectLayout]
  )

  const handleDefaultClick = useCallback(() => {
    const masterId = activeMaster?.id || 'default-master'
    onSelectLayout(lastUsedLayoutId, masterId)
  }, [activeMaster, lastUsedLayoutId, onSelectLayout])

  if (mode === 'change-layout') {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="gba:gap-1" data-testid={`${testId}-change-btn`}>
            <LayoutTemplate className="gba:w-4 gba:h-4" />
            {t('layout-change') || 'Layout'}
            <ChevronDown className="gba:w-3 gba:h-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="gba:w-auto gba:p-3" align="start" data-testid={`${testId}-popover`}>
          <LayoutGrid masters={effectiveMasters} onSelectLayout={handleSelectLayout} testId={testId} />
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <div className="gba:flex gba:w-full" data-testid={testId}>
      <Button
        variant="default"
        size="sm"
        onClick={handleDefaultClick}
        className="gba:flex-1 gba:gap-2 gba:justify-center gba:rounded-r-none"
        data-testid={`${testId}-add-btn`}
      >
        <Plus className="gba:w-4 gba:h-4" />
        {t('editor-new-slide') || 'New Slide'}
      </Button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="default"
            size="sm"
            className="gba:px-1.5 gba:rounded-l-none gba:border-l gba:border-l-primary-foreground/30"
            data-testid={`${testId}-dropdown-btn`}
          >
            <ChevronDown className="gba:w-3.5 gba:h-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="gba:w-auto gba:p-3" align="start" side="top" data-testid={`${testId}-popover`}>
          <LayoutGrid
            masters={effectiveMasters}
            onSelectLayout={handleSelectLayout}
            onDuplicateSlide={onDuplicateSlide}
            onBrowseTemplates={onBrowseTemplates}
            testId={testId}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

function LayoutGrid({
  masters,
  onSelectLayout,
  onDuplicateSlide,
  onBrowseTemplates,
  testId
}: {
  masters: SlideMaster[]
  onSelectLayout: (layoutId: string, masterId: string) => void
  onDuplicateSlide?: () => void
  onBrowseTemplates?: () => void
  testId?: string
}) {
  const { t } = useTranslation(translations)

  return (
    <div className="gba:flex gba:flex-col gba:gap-2" data-testid={`${testId}-grid`}>
      {masters.map(master => (
        <div key={master.id}>
          <p className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:mb-2 gba:italic">{master.name}</p>
          <div className="gba:grid gba:grid-cols-3 gba:gap-2">
            {master.layouts.map(layout => (
              <LayoutThumbnail
                key={layout.id}
                layout={layout}
                master={master}
                onClick={() => onSelectLayout(layout.id, master.id)}
                testId={`${testId}-layout-${layout.id}`}
              />
            ))}
          </div>
        </div>
      ))}

      {(onDuplicateSlide || onBrowseTemplates) && (
        <>
          <Separator className="gba:my-1" />
          <div className="gba:flex gba:flex-col gba:gap-0.5">
            {onDuplicateSlide && (
              <button
                type="button"
                onClick={onDuplicateSlide}
                className="gba:flex gba:items-center gba:gap-2 gba:px-2 gba:py-1.5 gba:text-sm gba:text-foreground gba:rounded-md hover:gba:bg-accent gba:transition-colors gba:text-left"
                data-testid={`${testId}-duplicate`}
              >
                <CopyPlus className="gba:w-4 gba:h-4" />
                {t('layout-duplicate-slides') || 'Duplicate Selected Slides'}
              </button>
            )}
            {onBrowseTemplates && (
              <button
                type="button"
                onClick={onBrowseTemplates}
                className="gba:flex gba:items-center gba:gap-2 gba:px-2 gba:py-1.5 gba:text-sm gba:text-foreground gba:rounded-md hover:gba:bg-accent gba:transition-colors gba:text-left"
                data-testid={`${testId}-browse-templates`}
              >
                <LayoutTemplate className="gba:w-4 gba:h-4" />
                {t('layout-browse-templates') || 'Browse Templates...'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default SlideLayoutPicker
