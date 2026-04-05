import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEventHandler } from 'react'
import { createPortal } from 'react-dom'
import { CaretDown, CaretRight, Palette } from '@phosphor-icons/react'
import { cn, useTranslation } from '@newwork/nw-design-system'
import {
  DEFAULT_IMAGE_BORDER_COLOR,
  DEFAULT_IMAGE_BORDER_DASH,
  DEFAULT_IMAGE_BORDER_WIDTH_PT,
  IMAGE_BORDER_WEIGHT_PRESETS,
  type CustomImageAttributes,
  type ImageBorderDash
} from '@/components/tiptap-extensions/tiptap-custom-image'
import { normalizeImageBorderColor } from '@/components/tiptap-extensions/tiptap-custom-image/styleUtils'
import translations from '../../_i18n'
import { ImageSidebarSection } from './ImageSidebarSection'

interface ImageBorderSectionProps {
  attrs: CustomImageAttributes
  updateImageAttrs: (nextAttrs: Partial<CustomImageAttributes>) => boolean
  onChoiceMouseDown: MouseEventHandler<HTMLElement>
  testId: string
}

type BorderDashOption = { value: ImageBorderDash; labelKey: string; dashArray?: string }
type MenuPosition = { top: number; left: number }

const MAIN_MENU_WIDTH = 288
const WEIGHT_FLYOUT_WIDTH = 288
const DASH_FLYOUT_WIDTH = 256
const VIEWPORT_PADDING = 16
const FLYOUT_CLOSE_DELAY_MS = 140

function resolveFlyoutSide(menuLeft: number, flyoutWidth: number): 'left' | 'right' {
  if (typeof window === 'undefined') {
    return 'right'
  }

  const rightSpace = window.innerWidth - (menuLeft + MAIN_MENU_WIDTH) - VIEWPORT_PADDING
  const leftSpace = menuLeft - VIEWPORT_PADDING

  if (rightSpace >= flyoutWidth || rightSpace >= leftSpace) {
    return 'right'
  }

  return 'left'
}

const THEME_COLOR_ROWS = [
  ['#FFFFFF', '#000000', '#E7E6E6', '#1F4E79', '#247BA0', '#ED7D31', '#2E7D32', '#29ABE2', '#A349A4', '#70AD47'],
  ['#F2F2F2', '#7F7F7F', '#D0CECE', '#DCE6F1', '#D9EAF7', '#FCE4D6', '#E2F0D9', '#D7EFFA', '#F3D9F4', '#E2F0D9'],
  ['#D9D9D9', '#595959', '#BFBFBF', '#B4C7E7', '#A7D8F0', '#F8CBAD', '#C6E0B4', '#9FD9F4', '#E4C1E6', '#C5E0B3'],
  ['#BFBFBF', '#3F3F3F', '#A5A5A5', '#8FAADC', '#70C1E8', '#F4B183', '#A9D18E', '#6CC4EE', '#D8A7DB', '#A8D08D'],
  ['#A6A6A6', '#262626', '#7F7F7F', '#2F75B5', '#2F9FD4', '#C55A11', '#548235', '#0F9ED5', '#8E2F8A', '#548235'],
  ['#808080', '#1A1A1A', '#595959', '#1F4E79', '#156082', '#833C0C', '#375623', '#0B6E91', '#5F1F5B', '#385723']
] as const

const STANDARD_COLORS = [
  '#C00000',
  '#FF0000',
  '#FFC000',
  '#FFFF00',
  '#92D050',
  '#00B050',
  '#00B0F0',
  '#0070C0',
  '#002060',
  '#7030A0'
] as const

const BORDER_DASH_OPTIONS: ReadonlyArray<BorderDashOption> = [
  { value: 'solid', labelKey: 'image-sidebar-border-dash-solid' },
  { value: 'dash', labelKey: 'image-sidebar-border-dash-dash', dashArray: '12 8' },
  { value: 'dot', labelKey: 'image-sidebar-border-dash-dot', dashArray: '2 6' },
  { value: 'dash-dot', labelKey: 'image-sidebar-border-dash-dash-dot', dashArray: '12 6 2 6' },
  { value: 'dash-dot-dot', labelKey: 'image-sidebar-border-dash-dash-dot-dot', dashArray: '12 6 2 6 2 6' }
]

function BorderColorSwatch({ color, className }: Readonly<{ color: string; className?: string }>) {
  return (
    <span
      className={cn('gba:block gba:rounded-sm gba:border gba:border-border/70', className)}
      style={{ backgroundColor: color }}
      aria-hidden
    />
  )
}

function BorderLinePreview({
  color,
  dashArray,
  width = 2,
  muted = false,
  className
}: Readonly<{ color: string; dashArray?: string; width?: number; muted?: boolean; className?: string }>) {
  return (
    <svg className={cn('gba:h-4 gba:w-16', className)} viewBox="0 0 64 16" fill="none" aria-hidden>
      <path
        d="M6 8H58"
        stroke={muted ? 'currentColor' : color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={dashArray}
      />
    </svg>
  )
}

function BorderPalette({
  rows,
  activeColor,
  testIdPrefix,
  onChoiceMouseDown,
  onSelect
}: Readonly<{
  rows: readonly (readonly string[])[]
  activeColor: string
  testIdPrefix: string
  onChoiceMouseDown: MouseEventHandler<HTMLElement>
  onSelect: (color: string) => void
}>) {
  return (
    <div className="gba:space-y-1">
      {rows.map((row, rowIndex) => (
        <div key={`${testIdPrefix}-row-${rowIndex}`} className="gba:grid gba:grid-cols-10 gba:gap-1">
          {row.map((color, colorIndex) => {
            const active = activeColor.toUpperCase() === color

            return (
              <button
                key={`${testIdPrefix}-${rowIndex}-${colorIndex}-${color}`}
                type="button"
                className={cn(
                  'gba:flex gba:h-7 gba:w-7 gba:items-center gba:justify-center gba:rounded-sm gba:border gba:bg-background',
                  active
                    ? 'gba:border-primary gba:ring-1 gba:ring-primary/30'
                    : 'gba:border-border/30 hover:gba:border-border/70'
                )}
                onMouseDown={onChoiceMouseDown}
                onClick={() => onSelect(color)}
                aria-pressed={active}
                title={color}
                data-testid={`${testIdPrefix}-row-${rowIndex}-${colorIndex}-${color.slice(1).toLowerCase()}`}
              >
                <BorderColorSwatch color={color} className="gba:h-5 gba:w-5 gba:border-border/40" />
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export function ImageBorderSection({
  attrs,
  updateImageAttrs,
  onChoiceMouseDown,
  testId
}: Readonly<ImageBorderSectionProps>) {
  const { t } = useTranslation(translations)
  const [open, setOpen] = useState(false)
  const [showCustomColorEditor, setShowCustomColorEditor] = useState(false)
  const [activeFlyout, setActiveFlyout] = useState<'weight' | 'dash' | null>(null)
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const closeFlyoutTimeoutRef = useRef<number | null>(null)
  const borderVisible = attrs.borderVisible ?? false
  const borderColor = attrs.borderColor ?? DEFAULT_IMAGE_BORDER_COLOR
  const borderWidthPt = attrs.borderWidthPt ?? DEFAULT_IMAGE_BORDER_WIDTH_PT
  const borderDash = attrs.borderDash ?? DEFAULT_IMAGE_BORDER_DASH
  const [customColorInput, setCustomColorInput] = useState(borderColor)
  const selectedDashOption = useMemo(
    () => BORDER_DASH_OPTIONS.find(option => option.value === borderDash) ?? BORDER_DASH_OPTIONS[0],
    [borderDash]
  )
  const colorPickerValue = useMemo(
    () => normalizeImageBorderColor(customColorInput, borderColor) ?? borderColor,
    [borderColor, customColorInput]
  )

  useEffect(() => {
    setCustomColorInput(borderColor)
  }, [borderColor])

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)

    if (!nextOpen) {
      if (closeFlyoutTimeoutRef.current !== null) {
        window.clearTimeout(closeFlyoutTimeoutRef.current)
        closeFlyoutTimeoutRef.current = null
      }
      setMenuPosition(null)
      setShowCustomColorEditor(false)
      setActiveFlyout(null)
    }
  }

  useEffect(() => {
    return () => {
      if (closeFlyoutTimeoutRef.current !== null) {
        window.clearTimeout(closeFlyoutTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }

    const updateMenuPosition = () => {
      const triggerElement = triggerRef.current

      if (!triggerElement) {
        return
      }

      const rect = triggerElement.getBoundingClientRect()
      const preferredLeft = rect.left
      const maxLeft = Math.max(16, window.innerWidth - 288 - 16)

      setMenuPosition({
        top: rect.bottom + 8,
        left: Math.min(preferredLeft, maxLeft)
      })
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target

      if (!(target instanceof Node)) {
        return
      }

      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return
      }

      handleOpenChange(false)
    }

    const handleDocumentKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }

      handleOpenChange(false)
    }

    updateMenuPosition()
    window.addEventListener('resize', updateMenuPosition)
    window.addEventListener('scroll', updateMenuPosition, true)
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleDocumentKeyDown)

    return () => {
      window.removeEventListener('resize', updateMenuPosition)
      window.removeEventListener('scroll', updateMenuPosition, true)
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleDocumentKeyDown)
    }
  }, [open])

  const applyBorderAttrs = (nextAttrs: Partial<CustomImageAttributes>, closeMenu = true) => {
    updateImageAttrs({
      borderVisible: true,
      ...nextAttrs
    })

    if (closeMenu) {
      handleOpenChange(false)
    }
  }

  const disableOutline = () => {
    updateImageAttrs({ borderVisible: false })
    handleOpenChange(false)
  }

  const commitCustomColor = () => {
    const normalizedColor = normalizeImageBorderColor(customColorInput, borderColor)

    if (!normalizedColor) {
      setCustomColorInput(borderColor)
      return
    }

    setCustomColorInput(normalizedColor)
    applyBorderAttrs({ borderColor: normalizedColor })
  }

  const handleCustomColorKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return
    }

    event.preventDefault()
    commitCustomColor()
  }

  const handleColorPickerChange = (nextColor: string) => {
    const normalizedColor = normalizeImageBorderColor(nextColor, borderColor)

    if (!normalizedColor) {
      return
    }

    setCustomColorInput(normalizedColor)
    applyBorderAttrs({ borderColor: normalizedColor }, false)
  }

  const clearScheduledFlyoutClose = () => {
    if (closeFlyoutTimeoutRef.current === null) {
      return
    }

    window.clearTimeout(closeFlyoutTimeoutRef.current)
    closeFlyoutTimeoutRef.current = null
  }

  const openFlyout = (flyout: 'weight' | 'dash') => {
    clearScheduledFlyoutClose()
    setActiveFlyout(flyout)
  }

  const scheduleFlyoutClose = (flyout: 'weight' | 'dash') => {
    clearScheduledFlyoutClose()

    closeFlyoutTimeoutRef.current = window.setTimeout(() => {
      setActiveFlyout(current => (current === flyout ? null : current))
      closeFlyoutTimeoutRef.current = null
    }, FLYOUT_CLOSE_DELAY_MS)
  }

  const weightFlyoutSide = menuPosition ? resolveFlyoutSide(menuPosition.left, WEIGHT_FLYOUT_WIDTH) : 'right'
  const dashFlyoutSide = menuPosition ? resolveFlyoutSide(menuPosition.left, DASH_FLYOUT_WIDTH) : 'right'

  const mainMenu =
    open && menuPosition
      ? createPortal(
          <div
            ref={panelRef}
            className="gba:fixed gba:z-50 gba:w-72 gba:rounded-md gba:border gba:border-border/60 gba:bg-popover gba:p-0 gba:shadow-md"
            style={{ top: menuPosition.top, left: menuPosition.left }}
            data-document-image-sidebar-dropdown="true"
          >
            <div className="gba:p-2">
              <button
                type="button"
                onMouseDown={onChoiceMouseDown}
                onClick={disableOutline}
                className="gba:mb-3 gba:flex gba:w-full gba:justify-center gba:rounded-md gba:border gba:border-primary/70 gba:bg-background gba:py-2.5 gba:text-base gba:font-semibold hover:gba:bg-accent"
                data-testid={`${testId}-border-no-outline`}
              >
                {t('image-sidebar-border-no-outline')}
              </button>

              <div className="gba:px-1 gba:pb-3">
                <div className="gba:px-0 gba:pb-2 gba:text-xs gba:font-medium gba:text-muted-foreground">
                  {t('image-sidebar-border-theme-colors')}
                </div>
                <BorderPalette
                  rows={THEME_COLOR_ROWS}
                  activeColor={borderColor}
                  testIdPrefix={`${testId}-border-theme`}
                  onChoiceMouseDown={onChoiceMouseDown}
                  onSelect={color => applyBorderAttrs({ borderColor: color })}
                />
              </div>

              <div className="gba:px-1 gba:pb-1">
                <div className="gba:px-0 gba:pb-2 gba:text-xs gba:font-medium gba:text-muted-foreground">
                  {t('image-sidebar-border-standard-colors')}
                </div>
                <BorderPalette
                  rows={[STANDARD_COLORS]}
                  activeColor={borderColor}
                  testIdPrefix={`${testId}-border-standard`}
                  onChoiceMouseDown={onChoiceMouseDown}
                  onSelect={color => applyBorderAttrs({ borderColor: color })}
                />
              </div>
            </div>

            <div className="gba:h-px gba:bg-border/60" />

            <div className="gba:p-1">
              <button
                type="button"
                className="gba:flex gba:w-full gba:items-center gba:gap-2 gba:rounded-md gba:px-3 gba:py-2 gba:text-left gba:text-sm hover:gba:bg-accent"
                onMouseDown={onChoiceMouseDown}
                onClick={() => setShowCustomColorEditor(value => !value)}
                data-testid={`${testId}-border-more-colors-trigger`}
              >
                <Palette className="gba:h-4 gba:w-4 gba:text-muted-foreground" aria-hidden />
                <span>{t('image-sidebar-border-more-colors')}</span>
              </button>

              {showCustomColorEditor ? (
                <div className="gba:space-y-2 gba:px-3 gba:pb-2 gba:pt-1">
                  <label
                    htmlFor={`${testId}-border-color-input`}
                    className="gba:text-xs gba:font-medium gba:text-muted-foreground"
                  >
                    {t('image-sidebar-border-custom-color')}
                  </label>
                  <div className="gba:flex gba:items-end gba:gap-2">
                    <label
                      className="gba:relative gba:flex gba:h-10 gba:w-12 gba:shrink-0 gba:cursor-pointer gba:items-center gba:justify-center gba:overflow-hidden gba:rounded-md gba:border gba:border-input gba:bg-background"
                      title={t('image-sidebar-border-custom-color')}
                    >
                      <span
                        className="gba:absolute gba:inset-1 gba:rounded-sm gba:border gba:border-black/10"
                        style={{ backgroundColor: colorPickerValue }}
                      />
                      <input
                        type="color"
                        value={colorPickerValue}
                        onChange={event => handleColorPickerChange(event.target.value)}
                        className="gba:absolute gba:inset-0 gba:h-full gba:w-full gba:cursor-pointer gba:opacity-0"
                        aria-label={t('image-sidebar-border-custom-color')}
                        data-testid={`${testId}-border-color-picker`}
                      />
                    </label>
                    <div className="gba:flex-1 gba:space-y-1.5">
                      <input
                        id={`${testId}-border-color-input`}
                        value={customColorInput}
                        placeholder={t('image-sidebar-border-hex-placeholder')}
                        onChange={event => setCustomColorInput(event.target.value)}
                        onKeyDown={handleCustomColorKeyDown}
                        className="gba:flex gba:h-10 gba:w-full gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:ring-offset-background placeholder:gba:text-muted-foreground focus-visible:gba:outline-none focus-visible:gba:ring-2 focus-visible:gba:ring-ring focus-visible:gba:ring-offset-2"
                        data-testid={`${testId}-border-color-input`}
                      />
                    </div>
                    <button
                      type="button"
                      className="gba:inline-flex gba:h-9 gba:items-center gba:justify-center gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:text-sm gba:font-medium hover:gba:bg-accent"
                      onMouseDown={onChoiceMouseDown}
                      onClick={commitCustomColor}
                      data-testid={`${testId}-border-apply-custom-color`}
                    >
                      {t('image-sidebar-border-apply-color')}
                    </button>
                  </div>
                </div>
              ) : null}

              <div
                className="gba:relative"
                onMouseEnter={() => openFlyout('weight')}
                onMouseLeave={() => scheduleFlyoutClose('weight')}
              >
                <button
                  type="button"
                  className="gba:flex gba:w-full gba:items-center gba:gap-2 gba:rounded-md gba:px-3 gba:py-2 gba:text-left gba:text-sm hover:gba:bg-accent"
                  onMouseDown={onChoiceMouseDown}
                  onClick={() => {
                    clearScheduledFlyoutClose()
                    setActiveFlyout(current => (current === 'weight' ? null : 'weight'))
                  }}
                  data-testid={`${testId}-border-weight-trigger`}
                >
                  <BorderLinePreview color="currentColor" width={2} className="gba:w-5 gba:text-muted-foreground" />
                  <span className="gba:flex-1">{t('image-sidebar-border-weight')}</span>
                  <CaretRight className="gba:h-4 gba:w-4 gba:text-muted-foreground" aria-hidden />
                </button>

                {activeFlyout === 'weight' ? (
                  <div
                    className={cn(
                      'gba:absolute gba:top-0 gba:z-10 gba:w-72 gba:rounded-md gba:border gba:border-border/60 gba:bg-popover gba:p-1 gba:shadow-md',
                      weightFlyoutSide === 'right' ? 'gba:left-full gba:ml-1' : 'gba:right-full gba:mr-1'
                    )}
                    onMouseEnter={() => openFlyout('weight')}
                    onMouseLeave={() => scheduleFlyoutClose('weight')}
                  >
                    {IMAGE_BORDER_WEIGHT_PRESETS.map(weight => (
                      <button
                        key={weight}
                        type="button"
                        onMouseDown={onChoiceMouseDown}
                        onClick={() => applyBorderAttrs({ borderWidthPt: weight })}
                        className={cn(
                          'gba:flex gba:w-full gba:items-center gba:gap-3 gba:rounded-md gba:px-3 gba:py-2 gba:text-left hover:gba:bg-accent',
                          borderWidthPt === weight && 'gba:bg-accent'
                        )}
                        data-testid={`${testId}-border-weight-${String(weight).replace('.', '-')}`}
                      >
                        <span className="gba:min-w-14 gba:text-sm">{weight} pt</span>
                        <BorderLinePreview
                          color="currentColor"
                          width={Math.max(1, Math.min(6, Math.round(weight)))}
                          className="gba:w-32 gba:flex-1 gba:text-foreground"
                        />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div
                className="gba:relative"
                onMouseEnter={() => openFlyout('dash')}
                onMouseLeave={() => scheduleFlyoutClose('dash')}
              >
                <button
                  type="button"
                  className="gba:flex gba:w-full gba:items-center gba:gap-2 gba:rounded-md gba:px-3 gba:py-2 gba:text-left gba:text-sm hover:gba:bg-accent"
                  onMouseDown={onChoiceMouseDown}
                  onClick={() => {
                    clearScheduledFlyoutClose()
                    setActiveFlyout(current => (current === 'dash' ? null : 'dash'))
                  }}
                  data-testid={`${testId}-border-dashes-trigger`}
                >
                  <BorderLinePreview
                    color="currentColor"
                    dashArray="4 3"
                    width={2}
                    className="gba:w-5 gba:text-muted-foreground"
                  />
                  <span className="gba:flex-1">{t('image-sidebar-border-dashes')}</span>
                  <CaretRight className="gba:h-4 gba:w-4 gba:text-muted-foreground" aria-hidden />
                </button>

                {activeFlyout === 'dash' ? (
                  <div
                    className={cn(
                      'gba:absolute gba:top-0 gba:z-10 gba:w-64 gba:rounded-md gba:border gba:border-border/60 gba:bg-popover gba:p-1 gba:shadow-md',
                      dashFlyoutSide === 'right' ? 'gba:left-full gba:ml-1' : 'gba:right-full gba:mr-1'
                    )}
                    onMouseEnter={() => openFlyout('dash')}
                    onMouseLeave={() => scheduleFlyoutClose('dash')}
                  >
                    {BORDER_DASH_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onMouseDown={onChoiceMouseDown}
                        onClick={() => applyBorderAttrs({ borderDash: option.value })}
                        className={cn(
                          'gba:flex gba:w-full gba:items-center gba:rounded-md gba:px-3 gba:py-2 hover:gba:bg-accent',
                          borderDash === option.value && 'gba:bg-accent'
                        )}
                        aria-label={t(option.labelKey)}
                        data-testid={`${testId}-border-dash-${option.value}`}
                      >
                        <BorderLinePreview
                          color="currentColor"
                          dashArray={option.dashArray}
                          width={3}
                          className="gba:w-36 gba:flex-1 gba:text-foreground"
                        />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>,
          document.body
        )
      : null

  return (
    <ImageSidebarSection title={t('image-sidebar-border')} data-testid={`${testId}-border-section`}>
      <button
        ref={triggerRef}
        type="button"
        className="gba:flex gba:h-auto gba:w-full gba:items-center gba:justify-start gba:gap-2.5 gba:rounded-xl gba:border gba:border-border/60 gba:bg-background gba:px-3 gba:py-2.5 hover:gba:bg-muted/40"
        onMouseDown={onChoiceMouseDown}
        onClick={() => handleOpenChange(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        data-testid={`${testId}-border-trigger`}
      >
        <span
          className={cn(
            'gba:flex gba:h-8 gba:w-10 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-lg gba:border',
            borderVisible
              ? 'gba:border-primary/30 gba:bg-background'
              : 'gba:border-border/60 gba:bg-muted/30 gba:text-muted-foreground'
          )}
        >
          <BorderLinePreview
            color={borderColor}
            dashArray={selectedDashOption.dashArray}
            width={Math.max(2, Math.min(5, Math.round(borderWidthPt)))}
            muted={!borderVisible}
            className="gba:w-10"
          />
        </span>
        <span className="gba:min-w-0 gba:flex-1 gba:text-left">
          <span className="gba:block gba:text-sm gba:font-medium gba:leading-none">
            {borderVisible ? t('image-sidebar-border-current-outline') : t('image-sidebar-border-no-outline')}
          </span>
          <span className="gba:mt-1 gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:text-muted-foreground">
            {borderVisible ? (
              <>
                <BorderColorSwatch color={borderColor} className="gba:h-2.5 gba:w-2.5 gba:rounded-full" />
                <span className="gba:truncate">{`${borderWidthPt} pt · ${t(selectedDashOption.labelKey)}`}</span>
              </>
            ) : (
              <span>{t('image-sidebar-border-apply-outline')}</span>
            )}
          </span>
        </span>
        <CaretDown className="gba:h-4 gba:w-4 gba:shrink-0 gba:text-muted-foreground" aria-hidden />
      </button>
      {mainMenu}
    </ImageSidebarSection>
  )
}
