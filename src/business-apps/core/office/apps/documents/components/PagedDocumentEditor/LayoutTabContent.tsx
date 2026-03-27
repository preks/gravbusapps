/**
 * Word-style Layout ribbon: page setup as icon+label dropdowns, paragraph indents and spacing.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import type { Editor } from '@tiptap/react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import {
  Check,
  ChevronDown,
  Columns2,
  FileText,
  FoldVertical,
  Frame,
  ListOrdered,
  Maximize2,
  MoreHorizontal,
  PanelLeft
} from 'lucide-react'
import type { DocumentFormatting, PageSizeId } from '../../types'
import { resolvePageLayout, PAGE_SIZE_LABELS } from '../../utils/pageLayoutUtils'
import { getCurrentSpacing } from './extensions/LineAndParagraphSpacing'
import { getCurrentParagraphIndent } from './extensions/ParagraphIndent'
import translations from '../../_i18n'
import { RibbonGroup } from './editorToolbarShared'
import { LayoutWordRibbonDropdown, LayoutRibbonNumericField } from './layoutWordRibbon'

const PAGE_SIZE_IDS: PageSizeId[] = ['A4', 'A3', 'A5', 'LETTER', 'LEGAL', 'TABLOID', 'CUSTOM']

const MARGIN_PRESETS: Record<string, { top: number; right: number; bottom: number; left: number }> = {
  normal: { top: 2.54, right: 2.54, bottom: 2.54, left: 2.54 },
  narrow: { top: 1.27, right: 1.27, bottom: 1.27, left: 1.27 },
  moderate: { top: 2.54, right: 1.91, bottom: 2.54, left: 1.91 },
  wide: { top: 3.81, right: 3.81, bottom: 3.81, left: 3.81 }
}

const PAGE_COLOUR_PRESETS: { hex: string; labelKey: string }[] = [
  { hex: '#ffffff', labelKey: 'editor-layout-colour-white' },
  { hex: '#f4f4f5', labelKey: 'editor-layout-colour-light-gray' },
  { hex: '#fefce8', labelKey: 'editor-layout-colour-warm-white' },
  { hex: '#eff6ff', labelKey: 'editor-layout-colour-soft-blue' },
  { hex: '#f0fdf4', labelKey: 'editor-layout-colour-soft-green' },
  { hex: '#fff7ed', labelKey: 'editor-layout-colour-soft-orange' }
]

function normalizeHex(hex: string): string {
  const h = hex.trim().toLowerCase()
  if (h.length === 4 && h.startsWith('#')) {
    return `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`
  }
  return h
}

function marginsNearEqual(
  a: { top: number; right: number; bottom: number; left: number },
  b: { top: number; right: number; bottom: number; left: number },
  eps = 0.02
): boolean {
  return (
    Math.abs(a.top - b.top) < eps &&
    Math.abs(a.right - b.right) < eps &&
    Math.abs(a.bottom - b.bottom) < eps &&
    Math.abs(a.left - b.left) < eps
  )
}

const MARGIN_PT_RE = /^([\d.]+)\s*pt$/i
const MARGIN_EM_RE = /^([\d.]+)\s*em$/i

function marginStringToPt(s: string | null | undefined): number {
  if (!s?.trim()) return 0
  const t = s.trim()
  const pt = MARGIN_PT_RE.exec(t)
  if (pt) return Math.round(Number.parseFloat(pt[1]) * 10) / 10
  const em = MARGIN_EM_RE.exec(t)
  if (em) return Math.round(Number.parseFloat(em[1]) * 12 * 10) / 10
  return 0
}

export interface LayoutFormattingPatch {
  pageSize?: PageSizeId
  customPageWidthCm?: number
  customPageHeightCm?: number
  orientation?: 'portrait' | 'landscape'
  margins?: DocumentFormatting['margins']
  pageColor?: string
}

export interface LayoutTabContentProps {
  editor: Editor
  formatting: DocumentFormatting
  onApplyLayoutPatch: (patch: LayoutFormattingPatch) => void
  onOpenPageSetupDialog?: () => void
  onInsertPageBreak?: () => void
  testId?: string
}

export function LayoutTabContent({
  editor,
  formatting,
  onApplyLayoutPatch,
  onOpenPageSetupDialog,
  onInsertPageBreak,
  testId = 'editor-toolbar'
}: Readonly<LayoutTabContentProps>) {
  const { t } = useTranslation(translations)
  const [layoutRefreshKey, setLayoutRefreshKey] = useState(0)
  useEffect(() => {
    const fn = () => setLayoutRefreshKey(x => x + 1)
    editor.on('transaction', fn)
    editor.on('selectionUpdate', fn)
    return () => {
      editor.off('transaction', fn)
      editor.off('selectionUpdate', fn)
    }
  }, [editor])

  const layout = useMemo(() => resolvePageLayout(formatting), [formatting])
  const spacing = useMemo(() => getCurrentSpacing(editor), [editor, editor.state, layoutRefreshKey])
  const indents = useMemo(() => getCurrentParagraphIndent(editor), [editor, editor.state, layoutRefreshKey])

  const applyMargins = useCallback(
    (margins: DocumentFormatting['margins']) => {
      if (margins) onApplyLayoutPatch({ margins: { ...margins } })
    },
    [onApplyLayoutPatch]
  )

  const activeMarginPreset = useMemo(() => {
    for (const key of ['normal', 'narrow', 'moderate', 'wide'] as const) {
      if (marginsNearEqual(layout.margins, MARGIN_PRESETS[key])) return key
    }
    return null
  }, [layout.margins])

  const handleCustomColour = useCallback(() => {
    const current = layout.pageColor ?? '#ffffff'
    const next = globalThis.prompt(t('editor-layout-colour-prompt'), current)
    if (next == null || next.trim() === '') return
    const body = next.trim().replace(/^#/, '')
    if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(body)) return
    const hex = body.length === 3 ? `#${body[0]}${body[0]}${body[1]}${body[1]}${body[2]}${body[2]}` : `#${body}`
    onApplyLayoutPatch({ pageColor: normalizeHex(hex) })
  }, [layout.pageColor, onApplyLayoutPatch, t])

  const beforePt = marginStringToPt(spacing.marginBefore)
  const afterPt = marginStringToPt(spacing.marginAfter)

  return (
    <>
      <RibbonGroup label={t('editor-layout-group-page')} data-testid={`${testId}-group-layout-page`}>
        <LayoutWordRibbonDropdown
          Icon={PanelLeft}
          label={t('editor-layout-ribbon-margins')}
          testId={testId ? `${testId}-layout-margins` : undefined}
          menuClassName="gba:min-w-48"
        >
          {(['normal', 'narrow', 'moderate', 'wide'] as const).map(key => (
            <DropdownMenuItem key={key} onSelect={() => applyMargins(MARGIN_PRESETS[key])}>
              {activeMarginPreset === key ? (
                <Check className="gba:mr-2 gba:h-4 gba:w-4" />
              ) : (
                <span className="gba:mr-2 gba:w-4" />
              )}
              {t(`editor-layout-margin-${key}`)}
            </DropdownMenuItem>
          ))}
          {onOpenPageSetupDialog ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onOpenPageSetupDialog()}>
                {t('editor-layout-margin-page-setup')}
              </DropdownMenuItem>
            </>
          ) : null}
        </LayoutWordRibbonDropdown>

        <LayoutWordRibbonDropdown
          Icon={Maximize2}
          label={t('editor-layout-ribbon-orientation')}
          testId={testId ? `${testId}-layout-orientation` : undefined}
        >
          <DropdownMenuItem onSelect={() => onApplyLayoutPatch({ orientation: 'portrait' })}>
            {layout.orientation === 'portrait' ? (
              <Check className="gba:mr-2 gba:h-4 gba:w-4" />
            ) : (
              <span className="gba:mr-2 gba:w-4" />
            )}
            {t('page-setup-portrait')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onApplyLayoutPatch({ orientation: 'landscape' })}>
            {layout.orientation === 'landscape' ? (
              <Check className="gba:mr-2 gba:h-4 gba:w-4" />
            ) : (
              <span className="gba:mr-2 gba:w-4" />
            )}
            {t('page-setup-landscape')}
          </DropdownMenuItem>
        </LayoutWordRibbonDropdown>

        <LayoutWordRibbonDropdown
          Icon={FileText}
          label={t('editor-layout-ribbon-size')}
          testId={testId ? `${testId}-layout-size` : undefined}
          menuClassName="gba:max-h-72 gba:overflow-y-auto gba:min-w-52"
        >
          {PAGE_SIZE_IDS.map(id => {
            const meta = PAGE_SIZE_LABELS[id]
            const label = t(meta.labelKey)
            const sizeLabel = id === 'CUSTOM' ? label : `${label} (${meta.widthCm} cm × ${meta.heightCm} cm)`
            return (
              <DropdownMenuItem
                key={id}
                onSelect={() => {
                  if (id === 'CUSTOM') {
                    const dims =
                      layout.pageSize === 'CUSTOM'
                        ? {
                            customPageWidthCm: layout.customPageWidthCm ?? PAGE_SIZE_LABELS.A4.widthCm,
                            customPageHeightCm: layout.customPageHeightCm ?? PAGE_SIZE_LABELS.A4.heightCm
                          }
                        : {
                            customPageWidthCm: PAGE_SIZE_LABELS[layout.pageSize].widthCm,
                            customPageHeightCm: PAGE_SIZE_LABELS[layout.pageSize].heightCm
                          }
                    onApplyLayoutPatch({ pageSize: 'CUSTOM', ...dims })
                  } else {
                    onApplyLayoutPatch({ pageSize: id })
                  }
                }}
              >
                {layout.pageSize === id ? (
                  <Check className="gba:mr-2 gba:h-4 gba:w-4 gba:shrink-0" />
                ) : (
                  <span className="gba:mr-2 gba:w-4" />
                )}
                <span className="gba:truncate">{sizeLabel}</span>
              </DropdownMenuItem>
            )
          })}
        </LayoutWordRibbonDropdown>
      </RibbonGroup>

      <RibbonGroup label={t('editor-layout-group-columns-breaks')} data-testid={`${testId}-group-layout-breaks`}>
        <LayoutWordRibbonDropdown
          Icon={Columns2}
          label={t('editor-layout-ribbon-columns')}
          testId={`${testId}-layout-columns`}
        >
          <DropdownMenuItem onSelect={() => {}}>
            <Check className="gba:mr-2 gba:h-4 gba:w-4" />
            {t('editor-layout-columns-one')}
          </DropdownMenuItem>
          <DropdownMenuItem disabled className="gba:opacity-50">
            {t('editor-layout-columns-two')}
          </DropdownMenuItem>
          <DropdownMenuItem disabled className="gba:opacity-50">
            {t('editor-layout-columns-three')}
          </DropdownMenuItem>
        </LayoutWordRibbonDropdown>

        <LayoutWordRibbonDropdown
          Icon={FoldVertical}
          label={t('editor-layout-ribbon-breaks')}
          testId={`${testId}-layout-breaks`}
        >
          <DropdownMenuItem
            onSelect={() => {
              editor.chain().focus().setPageBreak().run()
              onInsertPageBreak?.()
            }}
          >
            {t('editor-layout-break-page')}
          </DropdownMenuItem>
          <DropdownMenuItem disabled className="gba:opacity-50">
            {t('editor-layout-break-column')}
          </DropdownMenuItem>
          <DropdownMenuItem disabled className="gba:opacity-50">
            {t('editor-layout-break-section')}
          </DropdownMenuItem>
        </LayoutWordRibbonDropdown>

        <LayoutWordRibbonDropdown
          Icon={ListOrdered}
          label={t('editor-layout-ribbon-line-numbers')}
          testId={`${testId}-layout-line-numbers`}
        >
          <DropdownMenuItem onSelect={() => {}}>
            <Check className="gba:mr-2 gba:h-4 gba:w-4" />
            {t('editor-layout-line-numbers-none')}
          </DropdownMenuItem>
          <DropdownMenuItem disabled className="gba:opacity-50">
            {t('editor-layout-line-numbers-continuous')}
          </DropdownMenuItem>
        </LayoutWordRibbonDropdown>
      </RibbonGroup>

      <RibbonGroup label={t('editor-layout-group-paragraph')} data-testid={`${testId}-group-layout-paragraph`}>
        <LayoutRibbonNumericField
          label={t('editor-layout-indent-left')}
          value={indents.leftCm}
          unit="cm"
          step={0.1}
          min={0}
          max={55}
          onCommit={v => {
            editor
              .chain()
              .focus()
              .setIndentLeftCm(v <= 0 ? null : v)
              .run()
          }}
          testId={testId ? `${testId}-layout-indent-left` : undefined}
        />
        <LayoutRibbonNumericField
          label={t('editor-layout-indent-right')}
          value={indents.rightCm}
          unit="cm"
          step={0.1}
          min={0}
          max={55}
          onCommit={v => {
            editor
              .chain()
              .focus()
              .setIndentRightCm(v <= 0 ? null : v)
              .run()
          }}
          testId={testId ? `${testId}-layout-indent-right` : undefined}
        />
        <LayoutRibbonNumericField
          label={t('editor-layout-spacing-before')}
          value={beforePt}
          unit="pt"
          step={1}
          min={0}
          max={1584}
          onCommit={v => {
            editor
              .chain()
              .focus()
              .setMarginBefore(v <= 0 ? null : `${v}pt`)
              .run()
          }}
          testId={testId ? `${testId}-layout-spacing-before` : undefined}
        />
        <LayoutRibbonNumericField
          label={t('editor-layout-spacing-after')}
          value={afterPt}
          unit="pt"
          step={1}
          min={0}
          max={1584}
          onCommit={v => {
            editor
              .chain()
              .focus()
              .setMarginAfter(v <= 0 ? null : `${v}pt`)
              .run()
          }}
          testId={testId ? `${testId}-layout-spacing-after` : undefined}
        />
      </RibbonGroup>

      <RibbonGroup label={t('editor-layout-group-more')} data-testid={`${testId}-group-layout-more`}>
        <LayoutWordRibbonDropdown
          Icon={Frame}
          label={t('editor-layout-ribbon-page-borders')}
          testId={`${testId}-layout-borders`}
        >
          <DropdownMenuItem onSelect={() => {}}>
            <Check className="gba:mr-2 gba:h-4 gba:w-4" />
            {t('editor-layout-borders-none')}
          </DropdownMenuItem>
          {onOpenPageSetupDialog ? (
            <DropdownMenuItem onSelect={() => onOpenPageSetupDialog()}>{t('page-setup-title')}</DropdownMenuItem>
          ) : null}
        </LayoutWordRibbonDropdown>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="gba:flex gba:h-auto gba:min-h-16 gba:flex-col gba:items-center gba:justify-center gba:gap-0.5 gba:rounded-md gba:px-2 gba:py-1.5 gba:w-16 gba:shrink-0"
              data-testid={testId ? `${testId}-layout-more` : undefined}
            >
              <MoreHorizontal className="gba:h-5 gba:w-5 gba:text-muted-foreground" aria-hidden />
              <span className="gba:text-xs">{t('editor-layout-more')}</span>
              <ChevronDown className="gba:h-3 gba:w-3 gba:text-muted-foreground" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="gba:min-w-48">
            {onOpenPageSetupDialog ? (
              <DropdownMenuItem onSelect={() => onOpenPageSetupDialog()}>{t('page-setup-title')}</DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            {PAGE_COLOUR_PRESETS.map(({ hex, labelKey }) => (
              <DropdownMenuItem key={hex} onSelect={() => onApplyLayoutPatch({ pageColor: normalizeHex(hex) })}>
                <span
                  className="gba:mr-2 gba:inline-block gba:h-4 gba:w-4 gba:rounded gba:border gba:border-border"
                  style={{ backgroundColor: normalizeHex(hex) }}
                  aria-hidden
                />
                {t(labelKey)}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleCustomColour}>{t('editor-layout-colour-custom')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </RibbonGroup>
    </>
  )
}
