// Non-modal "companion tools" hint, shared by the Add-to-skill modal preview
// and the Tools page. It surfaces the tools a selected tool usually needs
// first (e.g. a write flow that links to a parent entity lists the search /
// read lookups that resolve the parent id), with an inline "Add" and a link
// to open the companion's detail — never a pop-up.

import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { ArrowSquareOut, PlusCircle, CheckCircle } from '@phosphor-icons/react'
import type { RelatedToolRef } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import translations from '../../_i18n'

const NECESSITY_STYLE: Record<RelatedToolRef['necessity'], { labelKey: string; className: string }> = {
  required: { labelKey: 'skills-tool-companions-required', className: 'gba:bg-amber-100 gba:text-amber-800' },
  recommended: { labelKey: 'skills-tool-companions-recommended', className: 'gba:bg-primary/10 gba:text-primary' },
  conditional: { labelKey: 'skills-tool-companions-if-needed', className: 'gba:bg-muted gba:text-muted-foreground' }
}

const refLabel = (ref: string): string => (ref.includes('.') ? ref.split('.').slice(1).join('.') : ref)

export interface ToolCompanionsProps {
  relatedTools: RelatedToolRef[]
  /** Resolve a companion ref to its human label; falls back to the bare name. */
  resolveLabel?: (ref: string) => string | undefined
  /** Whether a companion ref is already selected (renders "Added"). */
  isSelected?: (ref: string) => boolean
  /** Add a single companion to the current selection. Omit for read-only. */
  onAdd?: (ref: string) => void
  /** Open the companion's detail/preview. */
  onOpen?: (ref: string) => void
  /** Add every not-yet-selected companion at once. */
  onAddAll?: (refs: string[]) => void
  /** Compact, read-only layout for the Tools page row. */
  compact?: boolean
}

export const ToolCompanions: React.FC<ToolCompanionsProps> = ({
  relatedTools,
  resolveLabel,
  isSelected,
  onAdd,
  onOpen,
  onAddAll,
  compact = false
}) => {
  const { t } = useTranslation(translations)
  if (!relatedTools || relatedTools.length === 0) return null

  const missing = onAdd && isSelected ? relatedTools.filter(r => !isSelected(r.tool_ref)) : []

  return (
    <div
      className="gba:rounded-lg gba:border gba:border-border gba:bg-muted/20 gba:p-2.5"
      data-testid="tool-companions"
    >
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
        <p className="gba:text-[11px] gba:font-semibold gba:text-foreground">{t('skills-tool-companions-title')}</p>
        {onAddAll && missing.length > 1 && (
          <button
            type="button"
            className="gba:text-[11px] gba:font-medium gba:text-primary gba:hover:underline"
            onClick={() => onAddAll(missing.map(r => r.tool_ref))}
            data-testid="tool-companions-add-all"
          >
            {t('skills-tool-companions-add-all', { count: missing.length })}
          </button>
        )}
      </div>
      <ul className="gba:mt-1.5 gba:space-y-1.5">
        {relatedTools.map(row => {
          const selected = isSelected?.(row.tool_ref) ?? false
          const label = resolveLabel?.(row.tool_ref) ?? refLabel(row.tool_ref)
          const style = NECESSITY_STYLE[row.necessity]
          return (
            <li
              key={row.tool_ref}
              className="gba:flex gba:items-start gba:gap-2"
              data-testid={`tool-companion-${row.tool_ref}`}
            >
              <span className="gba:flex-1 gba:min-w-0">
                <span className="gba:flex gba:items-center gba:gap-1.5 gba:flex-wrap">
                  <span className="gba:text-xs gba:font-medium gba:text-foreground gba:truncate">{label}</span>
                  <span
                    className={`gba:rounded-full gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium ${style.className}`}
                  >
                    {t(style.labelKey)}
                  </span>
                </span>
                {!compact && <span className="gba:block gba:text-[11px] gba:text-muted-foreground">{row.reason}</span>}
              </span>
              <span className="gba:flex gba:shrink-0 gba:items-center gba:gap-1">
                {onOpen && (
                  <button
                    type="button"
                    className="gba:inline-flex gba:items-center gba:gap-0.5 gba:text-[11px] gba:font-medium gba:text-muted-foreground gba:hover:text-foreground"
                    onClick={() => onOpen(row.tool_ref)}
                    data-testid={`tool-companion-open-${row.tool_ref}`}
                    title={t('skills-tool-companions-open-details')}
                  >
                    <ArrowSquareOut className="gba:h-3.5 gba:w-3.5" />
                  </button>
                )}
                {onAdd &&
                  (selected ? (
                    <span className="gba:inline-flex gba:items-center gba:gap-0.5 gba:text-[11px] gba:font-medium gba:text-green-700">
                      <CheckCircle className="gba:h-3.5 gba:w-3.5" weight="fill" />
                      {t('skills-tool-companions-added')}
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="gba:inline-flex gba:items-center gba:gap-0.5 gba:text-[11px] gba:font-medium gba:text-primary gba:hover:underline"
                      onClick={() => onAdd(row.tool_ref)}
                      data-testid={`tool-companion-add-${row.tool_ref}`}
                    >
                      <PlusCircle className="gba:h-3.5 gba:w-3.5" />
                      {t('skills-tool-companions-add')}
                    </button>
                  ))}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
