/**
 * SignaturePicker – list of user signatures with preview and insert action.
 */

import React from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Button, useTranslation } from '@newwork/nw-design-system'
import translations from '../../_i18n'
import type { UserSignatureDto } from '../../services/UserSignatureApiService'

const previewSvgCellClass =
  'gba:flex gba:min-h-20 gba:items-center gba:justify-center gba:rounded-md gba:border gba:border-border/80 gba:bg-background gba:px-2 gba:py-2 gba:[&_svg]:gba:max-h-14 gba:[&_svg]:gba:max-w-full'

export interface SignaturePickerProps {
  signatures: UserSignatureDto[]
  loading?: boolean
  selectedId: string | null
  onSelect: (id: string | null) => void
  onInsert: (signature: UserSignatureDto, part: 'full' | 'initials') => void
  onEdit?: (signature: UserSignatureDto) => void
  /** Opens parent confirmation before removing from library */
  onDeleteRequest?: (signature: UserSignatureDto) => void
  /** When set, delete (and optionally edit) controls are disabled for that item */
  busySignatureId?: string | null
  'data-testid'?: string
}

export function SignaturePicker({
  signatures,
  loading = false,
  selectedId,
  onSelect,
  onInsert,
  onEdit,
  onDeleteRequest,
  busySignatureId = null,
  'data-testid': testId = 'signature-picker'
}: Readonly<SignaturePickerProps>) {
  const { t } = useTranslation(translations)

  if (loading) {
    return (
      <div className="gba:py-6 gba:text-center gba:text-muted-foreground gba:text-sm" data-testid={`${testId}-loading`}>
        {t('signature-picker-loading')}
      </div>
    )
  }

  if (signatures.length === 0) {
    return (
      <div className="gba:py-6 gba:text-center gba:text-muted-foreground gba:text-sm" data-testid={`${testId}-empty`}>
        {t('signature-picker-empty')}
      </div>
    )
  }

  const selectedSig = selectedId ? signatures.find(s => s.id === selectedId) : undefined
  const selectedHasInitials = Boolean(selectedSig?.initialsSnapshotSvg)

  return (
    <div className="gba:flex gba:flex-col gba:gap-4" data-testid={testId}>
      <div
        className="gba:flex gba:max-h-80 gba:flex-col gba:gap-2 gba:overflow-y-auto gba:pr-1 sm:gba:max-h-96"
        data-testid={`${testId}-list`}
      >
        {signatures.map(sig => {
          const showEdit = Boolean(onEdit && sig.kind !== 'uploaded')
          const showIconRail = showEdit || Boolean(onDeleteRequest)
          const busyHere = busySignatureId === sig.id
          const isSelected = selectedId === sig.id
          const hasInitials = Boolean(sig.initialsSnapshotSvg)

          return (
            <div
              key={sig.id}
              className={`gba:flex gba:gap-2 gba:rounded-lg gba:border gba:p-2 gba:transition-colors sm:gba:gap-3 sm:gba:p-3 ${
                isSelected
                  ? 'gba:border-primary gba:bg-primary/5'
                  : 'gba:border-input gba:bg-card hover:gba:bg-muted/30'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(isSelected ? null : sig.id)}
                className="gba:flex gba:min-w-0 gba:flex-1 gba:flex-col gba:gap-2 gba:rounded-md gba:text-left gba:outline-none gba:focus-visible:ring-2 gba:focus-visible:ring-ring gba:focus-visible:ring-offset-2"
                data-testid={`${testId}-item-${sig.id}`}
                aria-label={
                  hasInitials
                    ? t('signature-picker-item-aria-with-initials', { name: sig.name })
                    : t('signature-picker-item-aria', { name: sig.name })
                }
              >
                <div
                  className={
                    hasInitials
                      ? 'gba:grid gba:grid-cols-1 gba:gap-2 gba:sm:grid-cols-[3fr_2fr]'
                      : 'gba:grid gba:grid-cols-1'
                  }
                >
                  <div
                    className={previewSvgCellClass}
                    dangerouslySetInnerHTML={{
                      __html: sig.previewSvg || sig.snapshotSvg
                    }}
                  />
                  {hasInitials ? (
                    <div
                      className={previewSvgCellClass}
                      data-testid={`${testId}-item-${sig.id}-initials`}
                      dangerouslySetInnerHTML={{ __html: sig.initialsSnapshotSvg ?? '' }}
                    />
                  ) : null}
                </div>
                <span className="gba:truncate gba:px-0.5 gba:text-xs gba:font-medium gba:text-foreground">
                  {sig.name}
                </span>
              </button>

              {showIconRail ? (
                <div
                  className="gba:flex gba:shrink-0 gba:flex-col gba:items-center gba:justify-start gba:gap-1 gba:rounded-md gba:border gba:border-border gba:bg-background gba:p-0.5"
                  data-testid={`${testId}-item-${sig.id}-actions`}
                >
                  {showEdit ? (
                    <button
                      type="button"
                      className="gba:rounded-md gba:p-1.5 gba:text-muted-foreground hover:gba:bg-muted hover:gba:text-foreground gba:focus-visible:outline-none gba:focus-visible:ring-2 gba:focus-visible:ring-ring disabled:gba:pointer-events-none disabled:gba:opacity-50"
                      onClick={e => {
                        e.stopPropagation()
                        if (!busyHere) onEdit?.(sig)
                      }}
                      disabled={busyHere}
                      aria-label={t('signature-picker-edit-aria', { name: sig.name })}
                      data-testid={`${testId}-edit-${sig.id}`}
                    >
                      <Pencil className="gba:size-4" />
                    </button>
                  ) : null}
                  {onDeleteRequest ? (
                    <button
                      type="button"
                      className="gba:rounded-md gba:p-1.5 gba:text-muted-foreground hover:gba:bg-destructive/10 hover:gba:text-destructive gba:focus-visible:outline-none gba:focus-visible:ring-2 gba:focus-visible:ring-ring disabled:gba:pointer-events-none disabled:gba:opacity-50"
                      onClick={e => {
                        e.stopPropagation()
                        if (!busyHere) onDeleteRequest(sig)
                      }}
                      disabled={busyHere}
                      aria-label={t('signature-picker-delete-aria', { name: sig.name })}
                      data-testid={`${testId}-delete-${sig.id}`}
                    >
                      <Trash2 className="gba:size-4" />
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      <div
        className="gba:flex gba:flex-col gba:gap-3 gba:border-t gba:border-border gba:pt-4"
        data-testid={`${testId}-footer`}
      >
        <p className="gba:text-xs gba:text-muted-foreground" data-testid={`${testId}-footer-hint`}>
          {selectedSig
            ? t('signature-picker-selected-hint', { name: selectedSig.name })
            : t('signature-picker-select-hint')}
        </p>
        <div className="gba:flex gba:flex-wrap gba:gap-2">
          <Button
            type="button"
            size="sm"
            disabled={!selectedSig}
            onClick={() => {
              if (selectedSig) onInsert(selectedSig, 'full')
            }}
            data-testid={`${testId}-insert-signature`}
          >
            {t('signature-picker-insert-signature')}
          </Button>
          {selectedHasInitials ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!selectedSig}
              onClick={() => {
                if (selectedSig) onInsert(selectedSig, 'initials')
              }}
              data-testid={`${testId}-insert-initials`}
            >
              {t('signature-picker-insert-initials')}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
