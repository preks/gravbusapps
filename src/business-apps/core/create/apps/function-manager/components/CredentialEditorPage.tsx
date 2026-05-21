'use client'

import React from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Card,
  Input,
  Label,
  Textarea
} from '@newwork/nw-design-system'
import { KeyIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { PremiumHeroBackground } from '@/common/components/premium-hero-background'
import type { CredentialReferenceLocation } from '@/common/network/functions/FunctionsServiceClient'
import { ArrowLeft, Copy } from 'lucide-react'
import { fncredRefFor } from '@/common/utils/fncredRef'
import type { StoredSecretOption } from './editor/SettingsEditor'
import translations from '../_i18n'
import { useTranslation } from '@newwork/nw-design-system'
import {
  buildCreateLivePreviewFromRows,
  computeEditPayload,
  newProfileKeyValueRow,
  type EditExistingRow,
  type ProfileKeyValueRow
} from '../utils/credentialFormShared'

function formatReferenceLocation(loc: CredentialReferenceLocation): string {
  const where = loc.label ? `${loc.label} (${loc.id})` : loc.id
  const kind =
    loc.kind === 'function' ? 'Function' : loc.kind === 'external_connection' ? 'External connection' : 'Tool'
  return `${kind}: ${where} — ${loc.field}`
}

export interface CredentialEditorPageProps {
  mode: 'create' | 'edit'
  credential: StoredSecretOption | null
  fetchCredentialReferences: (credentialId: string) => Promise<CredentialReferenceLocation[]>
  onCreateStoredSecret: (input: {
    displayName: string
    live: Record<string, string>
    preview: Record<string, string>
  }) => Promise<void>
  onSaveCredential: (
    credentialId: string,
    input: {
      displayName: string
      removeFieldKeys: string[]
      liveToSet: Record<string, string>
      previewToSet: Record<string, string>
    }
  ) => Promise<void>
  onDeleteSecret: (credentialId: string) => Promise<void>
  onBack: () => void
  /** After successful create (navigate to list). */
  onCreated: () => void
  className?: string
  'data-testid'?: string
}

const DATA_TEST_ID = 'credential-editor'
const HERO_EDITOR_HEIGHT_PX = 180

export const CredentialEditorPage: React.FC<CredentialEditorPageProps> = ({
  mode,
  credential,
  fetchCredentialReferences,
  onCreateStoredSecret,
  onSaveCredential,
  onDeleteSecret,
  onBack,
  onCreated,
  className,
  'data-testid': testId = DATA_TEST_ID
}) => {
  const { t } = useTranslation(translations)

  const [name, setName] = React.useState(() => (mode === 'edit' && credential ? credential.displayName : ''))
  const [createRows, setCreateRows] = React.useState<ProfileKeyValueRow[]>(() => [
    newProfileKeyValueRow({ key: 'VALUE', liveValue: '', previewValue: '' })
  ])
  const [editExisting, setEditExisting] = React.useState<EditExistingRow[]>([])
  const [editNewRows, setEditNewRows] = React.useState<ProfileKeyValueRow[]>([])

  const [saving, setSaving] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)

  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deleteRefs, setDeleteRefs] = React.useState<CredentialReferenceLocation[]>([])
  const [deleteRefsLoading, setDeleteRefsLoading] = React.useState(false)
  const [deleteSaving, setDeleteSaving] = React.useState(false)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (mode === 'edit' && credential) {
      setName(credential.displayName)
      setEditExisting(
        [...(credential.fieldKeys || [])].sort().map(key => ({
          key,
          liveValue: '',
          previewValue: '',
          removed: false
        }))
      )
      setEditNewRows([])
      setCreateRows([newProfileKeyValueRow({ key: 'VALUE', liveValue: '', previewValue: '' })])
    }
    if (mode === 'create') {
      setName('')
      setCreateRows([newProfileKeyValueRow({ key: 'VALUE', liveValue: '', previewValue: '' })])
      setEditExisting([])
      setEditNewRows([])
    }
    setFormError(null)
  }, [mode, credential?.id])

  React.useEffect(() => {
    if (!deleteOpen || mode !== 'edit' || !credential) {
      setDeleteRefs([])
      return
    }
    let cancelled = false
    setDeleteRefsLoading(true)
    void fetchCredentialReferences(credential.id)
      .then(locations => {
        if (!cancelled) setDeleteRefs(locations)
      })
      .catch(() => {
        if (!cancelled) setDeleteRefs([])
      })
      .finally(() => {
        if (!cancelled) setDeleteRefsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [deleteOpen, mode, credential, fetchCredentialReferences])

  const heroTitle = mode === 'create' ? t('create-credential') : (credential?.displayName ?? t('edit-credential'))

  const handleSave = async () => {
    setFormError(null)
    try {
      setSaving(true)
      if (mode === 'create') {
        const { live, preview } = buildCreateLivePreviewFromRows(createRows)
        await onCreateStoredSecret({ displayName: name.trim(), live, preview })
        onCreated()
        return
      }
      if (!credential) return
      const payload = computeEditPayload(name, editExisting, editNewRows)
      await onSaveCredential(credential.id, payload)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : t('credentials-save-failed'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!credential) return
    try {
      setDeleteSaving(true)
      setDeleteError(null)
      await onDeleteSecret(credential.id)
      setDeleteOpen(false)
      onBack()
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : t('credentials-delete-failed'))
    } finally {
      setDeleteSaving(false)
    }
  }

  const main = (
    <div className="gba:flex gba:h-full gba:min-h-0 gba:flex-col gba:gap-6 gba:overflow-y-auto gba:p-6">
      <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-3">
        <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
          <Button
            type="button"
            variant="default"
            disabled={saving || !name.trim() || (mode === 'create' && !createRows.length)}
            onClick={() => void handleSave()}
            data-testid={`${testId}-save`}
          >
            {saving ? t('credentials-saving') : t('credentials-save')}
          </Button>
          {mode === 'edit' && credential ? (
            <Button
              type="button"
              variant="outline"
              className="gba:text-destructive gba:border-destructive/40"
              onClick={() => setDeleteOpen(true)}
              data-testid={`${testId}-delete-open`}
            >
              <TrashIcon className="gba:h-4 gba:w-4 gba:mr-2" />
              {t('credentials-delete')}
            </Button>
          ) : null}
        </div>
      </div>

      {formError ? (
        <div className="gba:text-sm gba:text-destructive" data-testid={`${testId}-error`}>
          {formError}
        </div>
      ) : null}

      <Card className="gba:[&&]:gap-2 gba:p-6">
        <div>
          <div className="gba:space-y-1">
            <Label htmlFor={`${testId}-name`}>{t('credentials-field-name')}</Label>
            <Input
              id={`${testId}-name`}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('credentials-name-placeholder')}
              data-testid={`${testId}-name-input`}
            />
          </div>
          <p className="gba:mt-4 gba:mb-0 gba:text-sm gba:text-muted-foreground gba:leading-relaxed">
            {t('credentials-intro')}
          </p>
        </div>

        {mode === 'create' ? (
          <div className="gba:space-y-3">
            <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
              <Label className="gba:text-base">{t('credentials-data-heading')}</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setCreateRows(prev => [...prev, newProfileKeyValueRow()])}
                data-testid={`${testId}-add-field-create`}
              >
                <PlusIcon className="gba:h-4 gba:w-4 gba:mr-1" />
                {t('credentials-add-field')}
              </Button>
            </div>
            <p className="gba:text-xs gba:text-muted-foreground">{t('credentials-profile-live-hint')}</p>
            <p className="gba:text-xs gba:text-muted-foreground">{t('credentials-profile-preview-hint')}</p>
            <div className="gba:rounded-lg gba:border gba:border-border gba:overflow-hidden">
              <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-[1fr_1fr_1fr_auto] gba:gap-2 gba:px-3 gba:py-2 gba:bg-muted/30 gba:text-xs gba:font-medium gba:text-muted-foreground">
                <div>{t('credentials-key-label')}</div>
                <div>{t('credentials-profile-live-heading')}</div>
                <div>{t('credentials-profile-preview-heading')}</div>
                <div className="gba:hidden gba:md:block" />
              </div>
              {createRows.map((row, idx) => (
                <div
                  key={row.id}
                  className={[
                    'gba:grid gba:grid-cols-1 gba:md:grid-cols-[1fr_1fr_1fr_auto] gba:gap-2 gba:items-start gba:px-3 gba:py-2',
                    idx > 0 ? 'gba:border-t gba:border-border' : ''
                  ].join(' ')}
                >
                  <Input
                    value={row.key}
                    onChange={e =>
                      setCreateRows(prev => prev.map(r => (r.id === row.id ? { ...r, key: e.target.value } : r)))
                    }
                    placeholder="API_KEY"
                    autoComplete="off"
                    data-testid={`${testId}-create-key-${row.id}`}
                  />
                  <Textarea
                    value={row.liveValue}
                    onChange={e =>
                      setCreateRows(prev => prev.map(r => (r.id === row.id ? { ...r, liveValue: e.target.value } : r)))
                    }
                    placeholder={t('credentials-value-placeholder')}
                    autoComplete="off"
                    rows={2}
                    className="gba:font-mono gba:text-sm"
                    data-testid={`${testId}-create-live-${row.id}`}
                  />
                  <Textarea
                    value={row.previewValue}
                    onChange={e =>
                      setCreateRows(prev =>
                        prev.map(r => (r.id === row.id ? { ...r, previewValue: e.target.value } : r))
                      )
                    }
                    placeholder={t('credentials-preview-value-placeholder')}
                    autoComplete="off"
                    rows={2}
                    className="gba:font-mono gba:text-sm"
                    data-testid={`${testId}-create-preview-${row.id}`}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="gba:text-destructive"
                    disabled={createRows.length <= 1}
                    aria-label={t('credentials-remove-row')}
                    onClick={() => setCreateRows(prev => prev.filter(r => r.id !== row.id))}
                    data-testid={`${testId}-create-remove-${row.id}`}
                  >
                    <TrashIcon className="gba:h-4 gba:w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="gba:space-y-4">
            <p className="gba:text-xs gba:text-muted-foreground">{t('credentials-edit-profiles-hint')}</p>
            <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
              <Label>{t('credentials-data-heading')}</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setEditNewRows(prev => [...prev, newProfileKeyValueRow()])}
                data-testid={`${testId}-add-field-edit`}
              >
                <PlusIcon className="gba:h-4 gba:w-4 gba:mr-1" />
                {t('credentials-add-field')}
              </Button>
            </div>

            {credential
              ? editExisting
                  .filter(r => !r.removed)
                  .map(row => {
                    let ref = ''
                    try {
                      ref = fncredRefFor(credential.id, row.key)
                    } catch {
                      ref = ''
                    }
                    return (
                      <div
                        key={row.key}
                        className="gba:rounded-lg gba:border gba:border-border gba:p-4 gba:space-y-3"
                        data-testid={`${testId}-field-${row.key}`}
                      >
                        <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-2">
                          <code className="gba:text-sm gba:font-mono">{row.key}</code>
                          <div className="gba:flex gba:flex-wrap gba:gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(ref)
                                } catch {
                                  // ignore
                                }
                              }}
                              data-testid={`${testId}-copy-${row.key}`}
                            >
                              <Copy className="gba:h-4 gba:w-4 gba:mr-1" />
                              {t('credentials-copy-ref')}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="gba:text-destructive"
                              onClick={() =>
                                setEditExisting(prev =>
                                  prev.map(x => (x.key === row.key ? { ...x, removed: true } : x))
                                )
                              }
                              data-testid={`${testId}-remove-${row.key}`}
                            >
                              <TrashIcon className="gba:h-4 gba:w-4 gba:mr-1" />
                              {t('credentials-remove-field')}
                            </Button>
                          </div>
                        </div>
                        <code className="gba:block gba:text-xs gba:font-mono gba:text-muted-foreground gba:break-all">
                          {ref}
                        </code>
                        <div className="gba:grid gba:gap-4 gba:md:grid-cols-2">
                          <div className="gba:space-y-1">
                            <Label htmlFor={`${testId}-live-${row.key}`}>{t('credentials-live-update-label')}</Label>
                            <Textarea
                              id={`${testId}-live-${row.key}`}
                              value={row.liveValue}
                              onChange={e =>
                                setEditExisting(prev =>
                                  prev.map(x => (x.key === row.key ? { ...x, liveValue: e.target.value } : x))
                                )
                              }
                              placeholder={t('credentials-keep-value-placeholder')}
                              autoComplete="off"
                              rows={2}
                              className="gba:font-mono gba:text-sm"
                              data-testid={`${testId}-live-value-${row.key}`}
                            />
                          </div>
                          <div className="gba:space-y-1">
                            <Label htmlFor={`${testId}-preview-${row.key}`}>
                              {t('credentials-preview-update-label')}
                            </Label>
                            <Textarea
                              id={`${testId}-preview-${row.key}`}
                              value={row.previewValue}
                              onChange={e =>
                                setEditExisting(prev =>
                                  prev.map(x => (x.key === row.key ? { ...x, previewValue: e.target.value } : x))
                                )
                              }
                              placeholder={t('credentials-preview-keep-placeholder')}
                              autoComplete="off"
                              rows={2}
                              className="gba:font-mono gba:text-sm"
                              data-testid={`${testId}-preview-value-${row.key}`}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })
              : null}

            {editNewRows.map((row, idx) => {
              const showTopBorder = (credential ? editExisting.some(r => !r.removed) : false) || idx > 0
              return (
                <div
                  key={row.id}
                  className={[
                    'gba:grid gba:grid-cols-1 gba:md:grid-cols-[1fr_1fr_1fr_auto] gba:gap-2 gba:items-start gba:rounded-lg gba:border gba:border-border gba:p-4',
                    showTopBorder ? 'gba:mt-2' : ''
                  ].join(' ')}
                >
                  <Input
                    value={row.key}
                    onChange={e =>
                      setEditNewRows(prev => prev.map(r => (r.id === row.id ? { ...r, key: e.target.value } : r)))
                    }
                    placeholder="NEW_KEY"
                    autoComplete="off"
                    data-testid={`${testId}-new-key-${row.id}`}
                  />
                  <Textarea
                    value={row.liveValue}
                    onChange={e =>
                      setEditNewRows(prev => prev.map(r => (r.id === row.id ? { ...r, liveValue: e.target.value } : r)))
                    }
                    placeholder={t('credentials-value-placeholder')}
                    autoComplete="off"
                    rows={2}
                    className="gba:font-mono gba:text-sm"
                    data-testid={`${testId}-new-live-${row.id}`}
                  />
                  <Textarea
                    value={row.previewValue}
                    onChange={e =>
                      setEditNewRows(prev =>
                        prev.map(r => (r.id === row.id ? { ...r, previewValue: e.target.value } : r))
                      )
                    }
                    placeholder={t('credentials-preview-value-placeholder')}
                    autoComplete="off"
                    rows={2}
                    className="gba:font-mono gba:text-sm"
                    data-testid={`${testId}-new-preview-${row.id}`}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="gba:text-destructive"
                    onClick={() => setEditNewRows(prev => prev.filter(r => r.id !== row.id))}
                    data-testid={`${testId}-new-remove-${row.id}`}
                  >
                    <TrashIcon className="gba:h-4 gba:w-4" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={open => !open && setDeleteOpen(false)}>
        <AlertDialogContent data-testid={`${testId}-delete-confirm`}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('credentials-delete-title')}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="gba:space-y-2">
                <p>{t('credentials-delete-body')}</p>
                {deleteRefsLoading ? (
                  <p className="gba:text-xs gba:text-muted-foreground">{t('credentials-delete-checking-refs')}</p>
                ) : deleteRefs.length ? (
                  <div className="gba:space-y-1">
                    <p className="gba:text-sm gba:font-medium">{t('credentials-delete-refs-heading')}</p>
                    <ul className="gba:list-disc gba:pl-5 gba:text-sm gba:text-muted-foreground gba:max-h-40 gba:overflow-y-auto">
                      {deleteRefs.map((loc, i) => (
                        <li key={`${loc.kind}-${loc.id}-${loc.field}-${i}`}>{formatReferenceLocation(loc)}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('credentials-cancel')}</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteSaving}
              onClick={() => void handleDeleteConfirm()}
              data-testid={`${testId}-delete-confirm-action`}
            >
              {deleteSaving ? t('credentials-deleting') : t('credentials-delete-confirm')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(deleteError)} onOpenChange={open => !open && setDeleteError(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('credentials-delete-failed-title')}</AlertDialogTitle>
            <AlertDialogDescription>{deleteError}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" onClick={() => setDeleteError(null)}>
              {t('credentials-ok')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )

  return (
    <div
      data-testid={testId}
      className={[
        'gba:flex gba:flex-1 gba:h-full gba:min-h-0 gba:w-full gba:flex-col gba:overflow-hidden gba:bg-background',
        className
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="gba:shrink-0 gba:min-h-0 gba:relative" style={{ height: HERO_EDITOR_HEIGHT_PX }}>
        <div className="gba:relative gba:overflow-hidden gba:h-full">
          <PremiumHeroBackground />
          <div className="layout-content gba:relative gba:h-full gba:py-6 gba:flex gba:flex-col gba:justify-end">
            <div className="gba:flex gba:flex-col gba:gap-4">
              <div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={onBack}
                  className="gba:gap-2 gba:text-white hover:gba:bg-white/10 gba:-ml-2"
                >
                  <ArrowLeft className="gba:h-4 gba:w-4" />
                  <span>{t('credentials-back')}</span>
                </Button>
              </div>
              <div className="gba:flex gba:items-start gba:justify-between gba:gap-4 gba:mb-1">
                <div className="gba:flex gba:items-start gba:gap-3 gba:min-w-0">
                  <div className="gba:w-10 gba:h-10 gba:rounded-lg gba:bg-white/10 gba:border gba:border-white/20 gba:flex gba:items-center gba:justify-center gba:shrink-0">
                    <KeyIcon className="gba:h-5 gba:w-5 gba:text-white" weight="regular" />
                  </div>
                  <div className="gba:min-w-0">
                    <h1 className="gba:font-display gba:text-2xl gba:sm:text-3xl gba:font-semibold gba:text-white gba:tracking-tight gba:truncate">
                      {heroTitle}
                    </h1>
                    <p className="gba:text-sm gba:text-white/60 gba:max-w-xl gba:truncate">
                      {t('credentials-editor-subtitle')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="gba:flex-1 gba:flex gba:min-h-0 gba:overflow-hidden">
        <div className="gba:flex gba:h-full gba:min-h-0 gba:min-w-0 gba:flex-1 gba:flex-col gba:overflow-hidden gba:bg-background">
          {main}
        </div>
      </div>
    </div>
  )
}

export default CredentialEditorPage
