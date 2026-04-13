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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Label,
  Badge
} from '@newwork/nw-design-system'
import {
  FunctionsSecretDeleteConflictError,
  type SecretReferenceLocation
} from '@/common/network/functions/FunctionsServiceClient'
import { Copy, KeyRound, MoreVertical, Pencil, RefreshCw, Trash2 } from 'lucide-react'
import { fnsecretRefForId } from '@/common/utils/fnsecretRef'
import type { StoredSecretOption } from './SettingsEditor'

export interface SecretsTabPanelProps {
  /** When defined, user can see this list (values are never shown). */
  secrets?: StoredSecretOption[]
  onRefreshSecrets?: () => void | Promise<void>
  onCreateStoredSecret?: (input: { displayName: string; value: string }) => Promise<void>
  onUpdateDisplayName?: (secretId: string, displayName: string) => Promise<void>
  onAppendSecretValue?: (secretId: string, value: string) => Promise<void>
  onDeleteSecret?: (secretId: string) => Promise<void>
  'data-testid'?: string
}

function formatReferenceLocation(loc: SecretReferenceLocation): string {
  const where = loc.label ? `${loc.label} (${loc.id})` : loc.id
  const kind =
    loc.kind === 'function' ? 'Function' : loc.kind === 'external_connection' ? 'External connection' : 'Tool'
  return `${kind}: ${where} — ${loc.field}`
}

export const SecretsTabPanel: React.FC<SecretsTabPanelProps> = ({
  secrets,
  onRefreshSecrets,
  onCreateStoredSecret,
  onUpdateDisplayName,
  onAppendSecretValue,
  onDeleteSecret,
  'data-testid': testId = 'function-editor-credentials'
}) => {
  const [createOpen, setCreateOpen] = React.useState(false)
  const [newSecretName, setNewSecretName] = React.useState('')
  const [newSecretValue, setNewSecretValue] = React.useState('')
  const [createSaving, setCreateSaving] = React.useState(false)
  const [refreshing, setRefreshing] = React.useState(false)

  const [renameOpen, setRenameOpen] = React.useState(false)
  const [renameRow, setRenameRow] = React.useState<StoredSecretOption | null>(null)
  const [renameInput, setRenameInput] = React.useState('')
  const [renameSaving, setRenameSaving] = React.useState(false)

  const [valueOpen, setValueOpen] = React.useState(false)
  const [valueRow, setValueRow] = React.useState<StoredSecretOption | null>(null)
  const [valueInput, setValueInput] = React.useState('')
  const [valueSaving, setValueSaving] = React.useState(false)

  const [deleteTarget, setDeleteTarget] = React.useState<StoredSecretOption | null>(null)
  const [deleteSaving, setDeleteSaving] = React.useState(false)

  const [conflictOpen, setConflictOpen] = React.useState(false)
  const [conflictLocations, setConflictLocations] = React.useState<SecretReferenceLocation[]>([])
  const [deleteError, setDeleteError] = React.useState<string | null>(null)

  const list = secrets ?? []
  const storeAvailable = secrets !== undefined
  const hasRowActions = Boolean(onUpdateDisplayName || onAppendSecretValue || onDeleteSecret)

  const handleRefresh = async () => {
    if (!onRefreshSecrets) return
    try {
      setRefreshing(true)
      await onRefreshSecrets()
    } finally {
      setRefreshing(false)
    }
  }

  const openRename = (s: StoredSecretOption) => {
    setRenameRow(s)
    setRenameInput(s.displayName)
    setRenameOpen(true)
  }

  const openValue = (s: StoredSecretOption) => {
    setValueRow(s)
    setValueInput('')
    setValueOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !onDeleteSecret) return
    try {
      setDeleteSaving(true)
      setDeleteError(null)
      await onDeleteSecret(deleteTarget.id)
      setDeleteTarget(null)
    } catch (e) {
      if (e instanceof FunctionsSecretDeleteConflictError) {
        setConflictLocations(e.locations)
        setConflictOpen(true)
        setDeleteTarget(null)
      } else {
        setDeleteError(e instanceof Error ? e.message : 'Delete failed')
        setDeleteTarget(null)
      }
    } finally {
      setDeleteSaving(false)
    }
  }

  // Use max-sm: for 1 column so we never pair unconditional grid-cols-1 with sm:grid-cols-* —
  // production CSS order can otherwise let the base rule win over the breakpoint.
  const gridCols = hasRowActions
    ? 'gba:max-sm:grid-cols-1 gba:sm:grid-cols-[1fr_minmax(160px,1fr)_auto_auto]'
    : 'gba:max-sm:grid-cols-1 gba:sm:grid-cols-[1fr_minmax(200px,280px)_auto]'

  return (
    <div className="gba:space-y-4" data-testid={testId}>
      <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
        <Label>Credentials</Label>
        <Badge variant="secondary">Encrypted store · values never listed here</Badge>
        {storeAvailable ? <Badge variant="outline">{list.length} visible</Badge> : null}
      </div>

      <div className="gba:rounded-xl gba:border gba:border-border gba:bg-background gba:p-4">
        <div className="gba:text-sm gba:font-medium gba:text-foreground">Stored credentials</div>
        <p className="gba:text-xs gba:text-muted-foreground gba:mt-1 gba:leading-relaxed">
          These credentials are tenant-wide. Create them here, then bind them to a function’s <strong>Settings</strong>{' '}
          key using <span className="gba:font-mono">Plain value</span> /{' '}
          <span className="gba:font-mono">Stored credential</span> so config keeps an{' '}
          <span className="gba:font-mono">fnsecret:…</span> reference instead of plaintext.
        </p>
      </div>

      {!storeAvailable ? (
        <p className="gba:text-sm gba:text-muted-foreground">
          Stored credentials are not available in this context (missing permissions or client support).
        </p>
      ) : (
        <>
          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
            {onRefreshSecrets ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void handleRefresh()}
                disabled={refreshing}
                data-testid={`${testId}-refresh`}
              >
                <RefreshCw className={`gba:h-4 gba:w-4 gba:mr-2 ${refreshing ? 'gba:animate-spin' : ''}`} />
                Refresh list
              </Button>
            ) : null}
            {onCreateStoredSecret ? (
              <Button
                type="button"
                size="sm"
                variant="default"
                onClick={() => {
                  setNewSecretName('')
                  setNewSecretValue('')
                  setCreateOpen(true)
                }}
                data-testid={`${testId}-new-credential`}
              >
                <KeyRound className="gba:h-4 gba:w-4 gba:mr-2" />
                New stored credential
              </Button>
            ) : null}
          </div>

          {list.length === 0 ? (
            <p className="gba:text-sm gba:text-muted-foreground">
              No stored credentials yet. Create one to reference it from the Settings tab without saving plaintext in
              function config.
            </p>
          ) : (
            <div className="gba:rounded-xl gba:border gba:border-border gba:bg-background gba:overflow-hidden">
              <div
                className={`gba:hidden gba:sm:grid gba:gap-3 gba:px-4 gba:py-2 gba:bg-muted/30 gba:text-xs gba:text-muted-foreground ${gridCols}`}
              >
                <div>Name</div>
                <div>Reference</div>
                <div className="gba:text-right">Copy</div>
                {hasRowActions ? <div className="gba:text-right">Actions</div> : null}
              </div>
              {list.map((s, idx) => {
                const ref = fnsecretRefForId(s.id)
                return (
                  <div
                    key={s.id}
                    className={[
                      'gba:px-4 gba:py-3 gba:grid gba:gap-2 gba:sm:items-center',
                      gridCols,
                      idx === 0 ? '' : 'gba:border-t gba:border-border'
                    ].join(' ')}
                    data-testid={`${testId}-row-${s.id}`}
                  >
                    <div>
                      <div className="gba:text-xs gba:text-muted-foreground gba:sm:hidden">Name</div>
                      <div className="gba:text-sm gba:font-medium gba:text-foreground">{s.displayName}</div>
                    </div>
                    <div className="gba:min-w-0">
                      <div className="gba:text-xs gba:text-muted-foreground gba:sm:hidden">Reference</div>
                      <code className="gba:text-xs gba:font-mono gba:text-muted-foreground gba:break-all">{ref}</code>
                    </div>
                    <div className="gba:flex gba:justify-end gba:gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-label={`Copy ${ref}`}
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(ref)
                          } catch {
                            // ignore
                          }
                        }}
                        data-testid={`${testId}-copy-${s.id}`}
                      >
                        <Copy className="gba:h-4 gba:w-4 gba:mr-1" />
                        Copy ref
                      </Button>
                    </div>
                    {hasRowActions ? (
                      <div className="gba:flex gba:justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              aria-label="Credential actions"
                              data-testid={`${testId}-row-actions-${s.id}`}
                            >
                              <MoreVertical className="gba:h-4 gba:w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {onUpdateDisplayName ? (
                              <DropdownMenuItem onClick={() => openRename(s)} data-testid={`${testId}-rename-${s.id}`}>
                                <Pencil className="gba:h-4 gba:w-4 gba:mr-2" />
                                Rename…
                              </DropdownMenuItem>
                            ) : null}
                            {onAppendSecretValue ? (
                              <DropdownMenuItem onClick={() => openValue(s)} data-testid={`${testId}-rotate-${s.id}`}>
                                <KeyRound className="gba:h-4 gba:w-4 gba:mr-2" />
                                Update value…
                              </DropdownMenuItem>
                            ) : null}
                            {onDeleteSecret ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="gba:text-destructive"
                                  onClick={() => setDeleteTarget(s)}
                                  data-testid={`${testId}-delete-${s.id}`}
                                >
                                  <Trash2 className="gba:h-4 gba:w-4 gba:mr-2" />
                                  Delete…
                                </DropdownMenuItem>
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}

          {onCreateStoredSecret ? (
            <Dialog open={createOpen} onOpenChange={open => !open && setCreateOpen(false)}>
              <DialogContent
                className="gba:max-w-md"
                data-testid={`${testId}-create-credential-dialog`}
                onInteractOutside={e => e.preventDefault()}
              >
                <DialogHeader>
                  <DialogTitle>Create stored credential</DialogTitle>
                  <DialogDescription>
                    The value is encrypted server-side. Bind it from <strong>Settings</strong> as{' '}
                    <span className="gba:font-mono">fnsecret:&lt;id&gt;</span> without storing plaintext in function
                    config.
                  </DialogDescription>
                </DialogHeader>
                <div className="gba:grid gba:gap-3 gba:py-2">
                  <div className="gba:space-y-1">
                    <Label htmlFor={`${testId}-new-secret-name`}>Display name</Label>
                    <Input
                      id={`${testId}-new-secret-name`}
                      value={newSecretName}
                      onChange={e => setNewSecretName(e.target.value)}
                      placeholder="e.g. Production API key"
                      data-testid={`${testId}-new-secret-name-input`}
                    />
                  </div>
                  <div className="gba:space-y-1">
                    <Label htmlFor={`${testId}-new-secret-value`}>Credential value</Label>
                    <Input
                      id={`${testId}-new-secret-value`}
                      type="password"
                      value={newSecretValue}
                      onChange={e => setNewSecretValue(e.target.value)}
                      autoComplete="off"
                      data-testid={`${testId}-new-secret-value-input`}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={createSaving || !newSecretName.trim() || !newSecretValue}
                    onClick={async () => {
                      if (!onCreateStoredSecret) return
                      try {
                        setCreateSaving(true)
                        await onCreateStoredSecret({ displayName: newSecretName.trim(), value: newSecretValue })
                        setCreateOpen(false)
                        setNewSecretName('')
                        setNewSecretValue('')
                        await onRefreshSecrets?.()
                      } finally {
                        setCreateSaving(false)
                      }
                    }}
                    data-testid={`${testId}-new-credential-save`}
                  >
                    {createSaving ? 'Saving…' : 'Create'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null}

          {renameRow && onUpdateDisplayName ? (
            <Dialog open={renameOpen} onOpenChange={open => !open && setRenameOpen(false)}>
              <DialogContent className="gba:max-w-md" data-testid={`${testId}-rename-dialog`}>
                <DialogHeader>
                  <DialogTitle>Rename credential</DialogTitle>
                  <DialogDescription>
                    Update the display name. The fnsecret reference id does not change.
                  </DialogDescription>
                </DialogHeader>
                <div className="gba:py-2">
                  <Label htmlFor={`${testId}-rename-input`}>Display name</Label>
                  <Input
                    id={`${testId}-rename-input`}
                    value={renameInput}
                    onChange={e => setRenameInput(e.target.value)}
                    data-testid={`${testId}-rename-input-field`}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setRenameOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={renameSaving || !renameInput.trim()}
                    onClick={async () => {
                      if (!renameRow || !onUpdateDisplayName) return
                      try {
                        setRenameSaving(true)
                        await onUpdateDisplayName(renameRow.id, renameInput.trim())
                        setRenameOpen(false)
                        setRenameRow(null)
                        await onRefreshSecrets?.()
                      } finally {
                        setRenameSaving(false)
                      }
                    }}
                    data-testid={`${testId}-rename-save`}
                  >
                    {renameSaving ? 'Saving…' : 'Save'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null}

          {valueRow && onAppendSecretValue ? (
            <Dialog open={valueOpen} onOpenChange={open => !open && setValueOpen(false)}>
              <DialogContent className="gba:max-w-md" data-testid={`${testId}-value-dialog`}>
                <DialogHeader>
                  <DialogTitle>Update credential value</DialogTitle>
                  <DialogDescription>
                    Appends a new encrypted version. Existing <span className="gba:font-mono">fnsecret:</span> bindings
                    keep working.
                  </DialogDescription>
                </DialogHeader>
                <div className="gba:py-2">
                  <Label htmlFor={`${testId}-value-input`}>New value</Label>
                  <Input
                    id={`${testId}-value-input`}
                    type="password"
                    value={valueInput}
                    onChange={e => setValueInput(e.target.value)}
                    autoComplete="off"
                    data-testid={`${testId}-value-input-field`}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setValueOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={valueSaving || !valueInput}
                    onClick={async () => {
                      if (!valueRow || !onAppendSecretValue) return
                      try {
                        setValueSaving(true)
                        await onAppendSecretValue(valueRow.id, valueInput)
                        setValueOpen(false)
                        setValueRow(null)
                        setValueInput('')
                        await onRefreshSecrets?.()
                      } finally {
                        setValueSaving(false)
                      }
                    }}
                    data-testid={`${testId}-value-save`}
                  >
                    {valueSaving ? 'Saving…' : 'Save new version'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null}

          <AlertDialog open={Boolean(deleteTarget)} onOpenChange={open => !open && setDeleteTarget(null)}>
            <AlertDialogContent data-testid={`${testId}-delete-confirm`}>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete credential?</AlertDialogTitle>
                <AlertDialogDescription>
                  {deleteTarget
                    ? `Remove “${deleteTarget.displayName}” from the encrypted store. This cannot be undone. If it is still referenced, delete will be blocked.`
                    : null}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deleteSaving}
                  onClick={() => void handleDeleteConfirm()}
                  data-testid={`${testId}-delete-confirm-action`}
                >
                  {deleteSaving ? 'Deleting…' : 'Delete'}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Dialog open={conflictOpen} onOpenChange={setConflictOpen}>
            <DialogContent className="gba:max-w-lg" data-testid={`${testId}-delete-conflict`}>
              <DialogHeader>
                <DialogTitle>Cannot delete</DialogTitle>
                <DialogDescription>
                  This credential is still referenced. Remove bindings from the locations below, then try again.
                </DialogDescription>
              </DialogHeader>
              <ul className="gba:list-disc gba:pl-5 gba:text-sm gba:text-muted-foreground gba:space-y-1 gba:max-h-60 gba:overflow-y-auto">
                {conflictLocations.map((loc, i) => (
                  <li key={`${loc.kind}-${loc.id}-${loc.field}-${i}`}>{formatReferenceLocation(loc)}</li>
                ))}
              </ul>
              <DialogFooter>
                <Button type="button" onClick={() => setConflictOpen(false)}>
                  OK
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={Boolean(deleteError)} onOpenChange={open => !open && setDeleteError(null)}>
            <DialogContent className="gba:max-w-md" data-testid={`${testId}-delete-error`}>
              <DialogHeader>
                <DialogTitle>Delete failed</DialogTitle>
                <DialogDescription>{deleteError}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button type="button" onClick={() => setDeleteError(null)}>
                  OK
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}

export default SecretsTabPanel
