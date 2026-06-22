/**
 * ModelSelector — composer-native model and reasoning-effort picker.
 *
 * Key design decisions:
 *  - The dropdown is rendered via a React portal directly under document.body
 *    so it escapes any overflow:hidden ancestor (the composer card).
 *  - The panel is positioned with fixed coords computed from the trigger's
 *    getBoundingClientRect, updated on every open and on scroll/resize.
 *  - Models that support reasoning show the active effort in light gray and a
 *    right-chevron to signal a submenu exists; models without reasoning show
 *    only their name.
 */
import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from '@newwork/nw-design-system'
import { CaretDownIcon, CaretRightIcon, SpinnerGapIcon } from '@phosphor-icons/react'
import type { ModelOption, ReasoningEffort } from '../../types/enterpriseAgent'
import { useFloatingPanel } from './useFloatingPanel'
import translations from '../../_i18n'

// ── Effort labels ─────────────────────────────────────────────────────────────

const EFFORT_LABEL_KEYS: Record<ReasoningEffort, string> = {
  none: 'landing-effort-none',
  low: 'landing-effort-low',
  medium: 'landing-effort-medium',
  high: 'landing-effort-high'
}

function isReasoningEffort(value: string): value is ReasoningEffort {
  return value in EFFORT_LABEL_KEYS
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ModelSelectorProps {
  models: ModelOption[]
  selectedModelId: string
  selectedEffort: ReasoningEffort
  isLoading?: boolean
  variant?: 'landing' | 'workspace'
  onChange: (modelId: string, effort: ReasoningEffort) => void
  disabled?: boolean
}

// ── Positioning helpers ───────────────────────────────────────────────────────

interface PanelCoords {
  top: number
  left: number
  minWidth: number
}

function computePanelCoords(trigger: HTMLElement, panelEl: HTMLElement | null): PanelCoords {
  const rect = trigger.getBoundingClientRect()
  const panelH = panelEl?.offsetHeight ?? 180
  const spaceAbove = rect.top
  const spaceBelow = window.innerHeight - rect.bottom
  const openAbove = spaceAbove > spaceBelow && spaceAbove > panelH

  const top = openAbove ? rect.top - panelH - 6 : rect.bottom + 6
  const left = Math.min(rect.left, window.innerWidth - (panelEl?.offsetWidth ?? 200) - 8)

  return { top, left, minWidth: rect.width }
}

// ── Component ─────────────────────────────────────────────────────────────────

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModelId,
  selectedEffort,
  isLoading = false,
  variant = 'landing',
  onChange,
  disabled = false
}) => {
  const { t } = useTranslation(translations)
  const [isOpen, setIsOpen] = useState(false)
  const [hoverModelId, setHoverModelId] = useState<string | null>(null)
  const [coords, setCoords] = useState<PanelCoords>({ top: 0, left: 0, minWidth: 0 })

  const selectedModel = models.find(m => m.id === selectedModelId) ?? models.find(m => m.is_default) ?? models[0]
  const isSmall = variant === 'workspace'

  const close = useCallback(() => {
    setIsOpen(false)
    setHoverModelId(null)
  }, [])

  const { triggerRef, panelRef } = useFloatingPanel({
    isOpen,
    onClose: close,
    onMeasure: useCallback((panelEl, triggerEl) => {
      setCoords(computePanelCoords(triggerEl, panelEl))
    }, []),
    measureDeps: [hoverModelId]
  })

  const handleSelectModel = useCallback(
    (modelId: string) => {
      const model = models.find(m => m.id === modelId)
      if (!model) return
      if (!model.supports_reasoning_effort) {
        onChange(modelId, 'none')
        setIsOpen(false)
        setHoverModelId(null)
      } else {
        setHoverModelId(modelId)
      }
    },
    [models, onChange]
  )

  const handleSelectEffort = useCallback(
    (modelId: string, effort: ReasoningEffort) => {
      onChange(modelId, effort)
      setIsOpen(false)
      setHoverModelId(null)
    },
    [onChange]
  )

  const activeHoverModel = models.find(m => m.id === hoverModelId)

  const triggerLabel = selectedModel?.label ?? t('landing-model-fallback')
  const effortLabel =
    selectedModel?.supports_reasoning_effort && selectedEffort !== 'none' ? t(EFFORT_LABEL_KEYS[selectedEffort]) : null
  const triggerAriaLabel = effortLabel
    ? t('landing-model-aria-with-effort', { model: triggerLabel, effort: effortLabel })
    : t('landing-model-aria', { model: triggerLabel })
  const activeHoverEfforts = (activeHoverModel?.allowed_reasoning_efforts ?? []).filter(isReasoningEffort)

  const textSize = isSmall ? 'gba:text-[11px]' : 'gba:text-[11.5px]'

  // ── Portal panel ────────────────────────────────────────────────────────────

  const panel =
    isOpen && !isLoading && models.length > 0
      ? createPortal(
          <div
            ref={panelRef}
            data-testid="model-selector-panel"
            style={{ top: coords.top, left: coords.left, minWidth: coords.minWidth }}
            className="gba:fixed gba:z-9999 gba:flex gba:flex-row gba:rounded-2xl gba:border gba:border-foreground/12 gba:bg-white gba:shadow-[0_8px_32px_rgba(15,23,42,0.14),0_2px_8px_rgba(15,23,42,0.07)] gba:overflow-hidden"
          >
            {/* Model list column */}
            <div className="gba:min-w-[172px] gba:py-1.5" aria-label={t('landing-model-label')}>
              <div className="gba:px-3 gba:pb-1 gba:pt-1">
                <span className="gba:text-[9.5px] gba:font-semibold gba:uppercase gba:tracking-[0.07em] gba:text-muted-foreground/50">
                  {t('landing-model-label')}
                </span>
              </div>

              {models.map(model => {
                const isSelected = model.id === selectedModelId
                const isHovered = model.id === hoverModelId
                const activeEffortForThisModel =
                  isSelected && model.supports_reasoning_effort ? t(EFFORT_LABEL_KEYS[selectedEffort]) : null

                return (
                  <button
                    key={model.id}
                    type="button"
                    onPointerEnter={() =>
                      model.supports_reasoning_effort ? setHoverModelId(model.id) : setHoverModelId(null)
                    }
                    onClick={() => handleSelectModel(model.id)}
                    className={`gba:w-full gba:flex gba:items-center gba:justify-between gba:gap-3 gba:px-3 gba:py-[7px] gba:text-left gba:transition-colors gba:text-[12.5px] gba:leading-snug gba:select-none ${
                      isSelected || isHovered
                        ? 'gba:bg-foreground/5.5 gba:text-foreground'
                        : 'gba:text-foreground/70 gba:hover:bg-foreground/3.5 gba:hover:text-foreground'
                    }`}
                    data-testid={`model-option-${model.id}`}
                  >
                    {/* Left: name + selected dot */}
                    <span className="gba:flex gba:items-center gba:gap-1.5 gba:min-w-0">
                      <span className="gba:font-medium gba:truncate">{model.label}</span>
                      {isSelected && (
                        <span className="gba:h-1.5 gba:w-1.5 gba:rounded-full gba:bg-foreground/50 gba:shrink-0" />
                      )}
                    </span>

                    {/* Right: effort label (if reasoning capable) + right chevron */}
                    {model.supports_reasoning_effort && (
                      <span className="gba:flex gba:items-center gba:gap-1 gba:shrink-0">
                        <span className="gba:text-[11px] gba:text-muted-foreground/50 gba:font-normal">
                          {activeEffortForThisModel ?? t(EFFORT_LABEL_KEYS.none)}
                        </span>
                        <CaretRightIcon
                          className={`gba:h-2.5 gba:w-2.5 gba:transition-opacity ${isHovered ? 'gba:opacity-70' : 'gba:opacity-35'}`}
                          weight="bold"
                        />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Reasoning effort column — shown when hovering a reasoning-capable model */}
            {activeHoverModel?.supports_reasoning_effort && (
              <div
                className="gba:min-w-[110px] gba:py-1.5 gba:border-l gba:border-foreground/10"
                aria-label={t('landing-reasoning-label')}
              >
                <div className="gba:px-3 gba:pb-1 gba:pt-1">
                  <span className="gba:text-[9.5px] gba:font-semibold gba:uppercase gba:tracking-[0.07em] gba:text-muted-foreground/50">
                    {t('landing-reasoning-label')}
                  </span>
                </div>

                {activeHoverEfforts.map(effort => {
                  const isEffortSelected = activeHoverModel.id === selectedModelId && effort === selectedEffort
                  return (
                    <button
                      key={effort}
                      type="button"
                      aria-pressed={isEffortSelected}
                      onClick={() => handleSelectEffort(activeHoverModel.id, effort)}
                      className={`gba:w-full gba:flex gba:items-center gba:justify-between gba:gap-2 gba:px-3 gba:py-[7px] gba:text-left gba:transition-colors gba:text-[12.5px] gba:leading-snug gba:select-none ${
                        isEffortSelected
                          ? 'gba:bg-foreground/5.5 gba:text-foreground'
                          : 'gba:text-foreground/70 gba:hover:bg-foreground/3.5 gba:hover:text-foreground'
                      }`}
                      data-testid={`effort-option-${effort}`}
                    >
                      <span className="gba:font-medium">{t(EFFORT_LABEL_KEYS[effort])}</span>
                      {isEffortSelected && (
                        <span className="gba:h-1.5 gba:w-1.5 gba:rounded-full gba:bg-foreground/50 gba:shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>,
          document.body
        )
      : null

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="gba:relative gba:shrink-0" data-testid="model-selector">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || isLoading}
        onClick={() => {
          if (disabled || isLoading) return
          setIsOpen(o => !o)
          if (isOpen) {
            setHoverModelId(null)
          }
        }}
        className={`gba:inline-flex gba:items-center gba:gap-1 gba:px-1 gba:py-1 gba:bg-white gba:text-foreground/60 gba:hover:bg-white gba:hover:text-foreground gba:transition-colors gba:select-none gba:rounded-md ${
          disabled ? 'gba:opacity-40 gba:cursor-not-allowed' : ''
        }`}
        aria-label={triggerAriaLabel}
        aria-expanded={isOpen}
        data-testid="model-selector-trigger"
      >
        {isLoading ? (
          <SpinnerGapIcon className="gba:h-3 gba:w-3 gba:animate-spin" weight="bold" />
        ) : (
          <>
            <span className={`${textSize} gba:font-medium gba:leading-none gba:tabular-nums`}>{triggerLabel}</span>
            {effortLabel && (
              <span className={`${textSize} gba:font-medium gba:leading-none gba:text-foreground/45`}>
                · {effortLabel}
              </span>
            )}
            <CaretDownIcon
              className={`gba:h-2.5 gba:w-2.5 gba:shrink-0 gba:transition-transform ${isOpen ? 'gba:rotate-180' : ''}`}
              weight="bold"
            />
          </>
        )}
      </button>

      {panel}
    </div>
  )
}
