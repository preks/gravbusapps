// Slide Master View -- Dedicated editing mode for managing slide masters and layouts.

import React, { useState, useCallback, useMemo } from 'react'
import { Button, Input, Separator, useTranslation } from '@newwork/nw-design-system'
import { X, Plus, CopyPlus, Trash2, Pencil, Check, LayoutTemplate } from 'lucide-react'
import { toast } from 'sonner'
import type { SlideMaster, SlideLayout } from '../types/slideMaster'
import type { SlideTheme } from './slideThemes'
import type { AnySlideElement, SlideBackground } from './slideElements'
import { createTextElement } from './slideElements'
import { SlideCanvas } from './SlideCanvas'
import { gradientToCss } from './slideElements'
import translations from '../_i18n'

export interface SlideMasterViewProps {
  masters: SlideMaster[]
  currentTheme: SlideTheme
  onUpdateMasters: (masters: SlideMaster[]) => void
  onClose: () => void
  'data-testid'?: string
}

type Selection = { type: 'master'; masterId: string } | { type: 'layout'; masterId: string; layoutId: string }

const CANVAS_W = 1280
const CANVAS_H = 720
const THUMB_WIDTH = 180
const THUMB_SCALE = THUMB_WIDTH / CANVAS_W

export const SlideMasterView: React.FC<SlideMasterViewProps> = ({
  masters,
  currentTheme,
  onUpdateMasters,
  onClose,
  'data-testid': testId = 'slide-master-view'
}) => {
  const { t } = useTranslation(translations)

  const [selection, setSelection] = useState<Selection>(
    masters.length > 0 ? { type: 'master', masterId: masters[0].id } : { type: 'master', masterId: '' }
  )
  const [selectedElementIds, setSelectedElementIds] = useState<Set<string>>(new Set())
  const [renamingLayoutId, setRenamingLayoutId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const activeMaster = useMemo(
    () => masters.find(m => m.id === selection.masterId) || masters[0],
    [masters, selection.masterId]
  )

  const activeLayout = useMemo(() => {
    if (selection.type !== 'layout' || !activeMaster) return undefined
    return activeMaster.layouts.find(l => l.id === selection.layoutId)
  }, [selection, activeMaster])

  const activeElements = useMemo(() => {
    if (selection.type === 'layout' && activeLayout) return activeLayout.elements
    if (activeMaster) return activeMaster.sharedElements
    return []
  }, [selection, activeMaster, activeLayout])

  const activeBackground = useMemo<SlideBackground>(() => {
    if (selection.type === 'layout' && activeLayout?.background) return activeLayout.background
    if (activeMaster) return activeMaster.background
    return { type: 'solid', color: '#ffffff' }
  }, [selection, activeMaster, activeLayout])

  const updateMasterLayouts = useCallback(
    (masterId: string, updater: (layouts: SlideLayout[]) => SlideLayout[]) => {
      const updated = masters.map(m => (m.id === masterId ? { ...m, layouts: updater(m.layouts) } : m))
      onUpdateMasters(updated)
    },
    [masters, onUpdateMasters]
  )

  const handleUpdateElement = useCallback(
    (elementId: string, updates: Partial<AnySlideElement>) => {
      if (selection.type === 'layout' && activeLayout) {
        updateMasterLayouts(selection.masterId, layouts =>
          layouts.map(l =>
            l.id === activeLayout.id
              ? { ...l, elements: l.elements.map(el => (el.id === elementId ? { ...el, ...updates } : el)) }
              : l
          )
        )
      } else if (activeMaster) {
        const updated = masters.map(m =>
          m.id === activeMaster.id
            ? { ...m, sharedElements: m.sharedElements.map(el => (el.id === elementId ? { ...el, ...updates } : el)) }
            : m
        )
        onUpdateMasters(updated)
      }
    },
    [selection, activeMaster, activeLayout, masters, onUpdateMasters, updateMasterLayouts]
  )

  const handleUpdateMultipleElements = useCallback(
    (updates: { id: string; updates: Partial<AnySlideElement> }[]) => {
      updates.forEach(u => handleUpdateElement(u.id, u.updates))
    },
    [handleUpdateElement]
  )

  const handleAddLayout = useCallback(() => {
    if (!activeMaster) return
    const newId = `layout-custom-${Date.now()}`
    const newLayout: SlideLayout = {
      id: newId,
      name: t('master-new-layout') || 'Custom Layout',
      masterId: activeMaster.id,
      elements: [
        createTextElement({
          id: `title-${Date.now()}`,
          content: 'Click to add title',
          position: { x: 60, y: 60 },
          size: { width: CANVAS_W - 120, height: 60 },
          fontSize: 40,
          fontWeight: 'bold',
          fontFamily: currentTheme.theme.fonts.header,
          color: currentTheme.theme.colors.primary,
          textAlign: 'left',
          verticalAlign: 'middle'
        })
      ],
      isCustom: true
    }

    updateMasterLayouts(activeMaster.id, layouts => [...layouts, newLayout])
    setSelection({ type: 'layout', masterId: activeMaster.id, layoutId: newId })
    toast.success(t('master-layout-added') || 'Layout added')
  }, [activeMaster, updateMasterLayouts, currentTheme, t])

  const handleDuplicateLayout = useCallback(
    (layout: SlideLayout) => {
      const newId = `layout-dup-${Date.now()}`
      const duplicate: SlideLayout = {
        ...layout,
        id: newId,
        name: `${layout.name} (Copy)`,
        elements: layout.elements.map((el, i) => ({
          ...el,
          id: `${el.type}-dup-${Date.now()}-${i}`
        })),
        isCustom: true
      }
      updateMasterLayouts(layout.masterId, layouts => {
        const idx = layouts.findIndex(l => l.id === layout.id)
        const copy = [...layouts]
        copy.splice(idx + 1, 0, duplicate)
        return copy
      })
      setSelection({ type: 'layout', masterId: layout.masterId, layoutId: newId })
      toast.success(t('master-layout-duplicated') || 'Layout duplicated')
    },
    [updateMasterLayouts, t]
  )

  const handleDeleteLayout = useCallback(
    (layout: SlideLayout) => {
      if (!activeMaster || activeMaster.layouts.length <= 1) {
        toast.error(t('master-delete-last-layout-error') || 'Cannot delete the last layout')
        return
      }
      updateMasterLayouts(layout.masterId, layouts => layouts.filter(l => l.id !== layout.id))
      setSelection({ type: 'master', masterId: layout.masterId })
      toast.success(t('master-layout-deleted') || 'Layout deleted')
    },
    [activeMaster, updateMasterLayouts, t]
  )

  const handleStartRename = useCallback((layout: SlideLayout) => {
    setRenamingLayoutId(layout.id)
    setRenameValue(layout.name)
  }, [])

  const handleFinishRename = useCallback(() => {
    if (!renamingLayoutId || !renameValue.trim()) {
      setRenamingLayoutId(null)
      return
    }
    updateMasterLayouts(selection.masterId, layouts =>
      layouts.map(l => (l.id === renamingLayoutId ? { ...l, name: renameValue.trim() } : l))
    )
    setRenamingLayoutId(null)
  }, [renamingLayoutId, renameValue, selection.masterId, updateMasterLayouts])

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid={testId}>
      {/* Toolbar */}
      <div className="gba:flex gba:items-center gba:gap-2 gba:px-4 gba:py-2 gba:border-b gba:bg-card">
        <LayoutTemplate className="gba:w-5 gba:h-5 gba:text-primary" />
        <span className="gba:font-semibold gba:text-sm">{t('master-view-title') || 'Slide Master View'}</span>
        <Separator orientation="vertical" className="gba:h-5 gba:mx-2" />
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddLayout}
          className="gba:gap-1"
          data-testid={`${testId}-add-layout`}
        >
          <Plus className="gba:w-4 gba:h-4" />
          {t('master-insert-layout') || 'Insert Layout'}
        </Button>
        <div className="gba:flex-1" />
        <Button variant="default" size="sm" onClick={onClose} className="gba:gap-1" data-testid={`${testId}-close`}>
          <X className="gba:w-4 gba:h-4" />
          {t('master-close') || 'Close Master View'}
        </Button>
      </div>

      <div className="gba:flex gba:flex-1 gba:min-h-0 gba:overflow-hidden">
        {/* Left panel: master + layouts list */}
        <div className="gba:w-56 gba:flex-shrink-0 gba:border-r gba:bg-card gba:flex gba:flex-col gba:overflow-y-auto">
          <div className="gba:p-2 gba:space-y-1">
            {masters.map(master => (
              <div key={master.id}>
                {/* Master slide thumbnail */}
                <MasterThumbnail
                  master={master}
                  isSelected={selection.type === 'master' && selection.masterId === master.id}
                  onClick={() => setSelection({ type: 'master', masterId: master.id })}
                  label={master.name}
                  isMaster
                  testId={`${testId}-master-${master.id}`}
                />

                {/* Layout thumbnails */}
                {master.layouts.map(layout => (
                  <div key={layout.id} className="gba:ml-4">
                    {renamingLayoutId === layout.id ? (
                      <div className="gba:flex gba:items-center gba:gap-1 gba:px-1 gba:py-0.5">
                        <Input
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleFinishRename()
                            if (e.key === 'Escape') setRenamingLayoutId(null)
                          }}
                          onBlur={handleFinishRename}
                          className="gba:h-6 gba:text-xs"
                          autoFocus
                          data-testid={`${testId}-rename-input`}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gba:h-6 gba:w-6 gba:p-0"
                          onClick={handleFinishRename}
                        >
                          <Check className="gba:w-3 gba:h-3" />
                        </Button>
                      </div>
                    ) : (
                      <MasterThumbnail
                        master={master}
                        layout={layout}
                        isSelected={
                          selection.type === 'layout' &&
                          selection.masterId === master.id &&
                          selection.layoutId === layout.id
                        }
                        onClick={() => setSelection({ type: 'layout', masterId: master.id, layoutId: layout.id })}
                        label={layout.name}
                        testId={`${testId}-layout-${layout.id}`}
                        onRename={() => handleStartRename(layout)}
                        onDuplicate={() => handleDuplicateLayout(layout)}
                        onDelete={() => handleDeleteLayout(layout)}
                      />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Center canvas */}
        <div className="gba:flex-1 gba:bg-muted/30 gba:overflow-auto gba:p-4 md:gba:p-8 gba:min-w-0">
          <div className="gba:inline-flex gba:justify-center gba:min-w-full">
            <div className="gba:relative" style={{ width: CANVAS_W, height: CANVAS_H }}>
              <SlideCanvas
                elements={activeElements as AnySlideElement[]}
                selectedIds={selectedElementIds}
                background={activeBackground}
                onSelectElements={setSelectedElementIds}
                onUpdateElement={handleUpdateElement}
                onUpdateMultipleElements={handleUpdateMultipleElements}
                onEditText={() => {}}
                scale={1}
              />

              {/* Label overlay */}
              <div className="gba:absolute gba:top-2 gba:left-2 gba:bg-primary/80 gba:text-primary-foreground gba:px-2 gba:py-0.5 gba:rounded gba:text-xs gba:font-medium gba:pointer-events-none">
                {selection.type === 'master'
                  ? t('master-editing-master') || 'Editing: Slide Master'
                  : `${t('master-editing-layout') || 'Editing Layout'}: ${activeLayout?.name || ''}`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Thumbnail component for the left panel ---

function MasterThumbnail({
  master,
  layout,
  isSelected,
  onClick,
  label,
  isMaster,
  testId,
  onRename,
  onDuplicate,
  onDelete
}: {
  master: SlideMaster
  layout?: SlideLayout
  isSelected: boolean
  onClick: () => void
  label: string
  isMaster?: boolean
  testId?: string
  onRename?: () => void
  onDuplicate?: () => void
  onDelete?: () => void
}) {
  const bg = layout?.background || master.background
  const elements = layout ? layout.elements : master.sharedElements

  const bgStyle = useMemo(() => {
    if (!bg) return { backgroundColor: '#fff' }
    switch (bg.type) {
      case 'gradient':
        return bg.gradient
          ? {
              background: `linear-gradient(${bg.gradient.angle}deg, ${bg.gradient.stops.map(s => `${s.color} ${s.position}%`).join(', ')})`
            }
          : {}
      default:
        return { backgroundColor: bg.color || '#ffffff' }
    }
  }, [bg])

  const thumbH = THUMB_WIDTH / (16 / 9)

  return (
    <div
      className={`gba:group gba:rounded-md gba:cursor-pointer gba:transition-all gba:border-2 gba:overflow-hidden gba:mb-1 ${
        isSelected ? 'gba:border-primary gba:shadow-md' : 'gba:border-border hover:gba:border-muted-foreground/40'
      } ${isMaster ? 'gba:border-dashed' : ''}`}
      onClick={onClick}
      data-testid={testId}
    >
      <div className="gba:relative gba:overflow-hidden" style={{ width: '100%', height: thumbH }}>
        <div className="gba:absolute gba:inset-0" style={bgStyle}>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: CANVAS_W,
              height: CANVAS_H,
              transform: `scale(${THUMB_SCALE})`,
              transformOrigin: 'top left'
            }}
          >
            {elements.map(el => {
              const elAny = el as any
              return (
                <div
                  key={el.id}
                  className="gba:absolute"
                  style={{
                    left: elAny.position.x,
                    top: elAny.position.y,
                    width: elAny.size.width,
                    height: elAny.size.height,
                    zIndex: elAny.zIndex || 0,
                    backgroundColor: elAny.type === 'shape' && !elAny.gradient ? elAny.fill : 'transparent',
                    background: elAny.type === 'shape' && elAny.gradient ? gradientToCss(elAny.gradient) : undefined,
                    borderRadius:
                      elAny.type === 'shape'
                        ? elAny.shapeType === 'circle' || elAny.shapeType === 'ellipse'
                          ? '50%'
                          : elAny.cornerRadius || 0
                        : undefined,
                    overflow: elAny.type === 'text' ? 'hidden' : undefined
                  }}
                >
                  {elAny.type === 'text' && (
                    <div
                      className="gba:w-full gba:h-full gba:overflow-hidden gba:whitespace-pre-wrap"
                      style={{
                        color: elAny.color,
                        fontSize: elAny.fontSize,
                        fontWeight: elAny.fontWeight,
                        fontFamily: elAny.fontFamily,
                        textAlign: elAny.textAlign,
                        lineHeight: elAny.lineHeight || 1.2
                      }}
                    >
                      {elAny.content}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Label + actions */}
      <div className="gba:flex gba:items-center gba:px-2 gba:py-1 gba:bg-card gba:border-t gba:min-h-[28px]">
        <span className="gba:text-[10px] gba:text-muted-foreground gba:truncate gba:flex-1">{label}</span>
        {!isMaster && (
          <div className="gba:hidden group-hover:gba:flex gba:items-center gba:gap-0.5">
            {onRename && (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation()
                  onRename()
                }}
                className="gba:p-0.5 gba:rounded hover:gba:bg-muted gba:text-muted-foreground"
                title="Rename"
              >
                <Pencil className="gba:w-3 gba:h-3" />
              </button>
            )}
            {onDuplicate && (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation()
                  onDuplicate()
                }}
                className="gba:p-0.5 gba:rounded hover:gba:bg-muted gba:text-muted-foreground"
                title="Duplicate"
              >
                <CopyPlus className="gba:w-3 gba:h-3" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation()
                  onDelete()
                }}
                className="gba:p-0.5 gba:rounded hover:gba:bg-destructive/10 gba:text-muted-foreground hover:gba:text-destructive"
                title="Delete"
              >
                <Trash2 className="gba:w-3 gba:h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default SlideMasterView
