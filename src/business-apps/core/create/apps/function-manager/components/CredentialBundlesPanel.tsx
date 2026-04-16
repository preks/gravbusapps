'use client'

import React, { useCallback, useEffect, useState } from 'react'
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
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import {
  FunctionsServiceClient,
  FunctionsBundleDeleteConflictError,
  type SecretBundleListItemDto,
  type SecretReferenceLocation,
  type BlockingBundleRefDto,
  type StoredSecretListItem
} from '@/common/network/functions/FunctionsServiceClient'
import { Plus, Trash2, Pencil } from 'lucide-react'

const PAGE = 20

function formatRefLoc(loc: SecretReferenceLocation): string {
  const where = loc.label ? `${loc.label} (${loc.id})` : loc.id
  const kind =
    loc.kind === 'function' ? 'Function' : loc.kind === 'external_connection' ? 'External connection' : 'Tool'
  return `${kind}: ${where} — ${loc.field}`
}

function formatBlocking(b: BlockingBundleRefDto): string {
  return `${b.displayName} (${b.id})`
}

type SlotRow = { slotKey: string; secretId: string }

export interface CredentialBundlesPanelProps {
  accessToken: string
  onMutation?: () => void
  'data-testid'?: string
}

export const CredentialBundlesPanel: React.FC<CredentialBundlesPanelProps> = ({
  accessToken,
  onMutation,
  'data-testid': testId = 'credential-bundles-panel'
}) => {
  const client = React.useMemo(() => new FunctionsServiceClient(accessToken), [accessToken])
  const [items, setItems] = useState<SecretBundleListItemDto[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [secrets, setSecrets] = useState<StoredSecretListItem[]>([])

  const loadSecrets = useCallback(async () => {
    try {
      const list = await client.listSecrets()
      setSecrets(list || [])
    } catch {
      setSecrets([])
    }
  }, [client])

  const loadBundles = useCallback(async () => {
    setLoading(true)
    try {
      const page = await client.listSecretBundles({ limit: PAGE, offset, includeSlots: false })
      setItems(page.items || [])
      setTotal(page.total || 0)
    } catch {
      setItems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [client, offset])

  useEffect(() => {
    void loadSecrets()
  }, [loadSecrets])

  useEffect(() => {
    void loadBundles()
  }, [loadBundles])

  const [createOpen, setCreateOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [slotRows, setSlotRows] = useState<SlotRow[]>([{ slotKey: '', secretId: '' }])
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteErr, setDeleteErr] = useState<string | null>(null)
  const [deleteSaving, setDeleteSaving] = useState(false)

  const resetForm = () => {
    setDisplayName('')
    setSlotRows([{ slotKey: '', secretId: '' }])
    setFormError(null)
  }

  const openCreate = () => {
    resetForm()
    setEditId(null)
    setCreateOpen(true)
    void loadSecrets()
  }

  const openEdit = async (id: string) => {
    setFormError(null)
    setSaving(false)
    void loadSecrets()
    try {
      const detail = await client.getSecretBundle(id)
      setEditId(id)
      setDisplayName(detail.displayName)
      setSlotRows(
        (detail.slots || []).map(s => ({
          slotKey: s.slotKey,
          secretId: s.secretId
        }))
      )
      setCreateOpen(true)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to load bundle')
    }
  }

  const submitForm = async () => {
    setFormError(null)
    const name = displayName.trim()
    if (!name) {
      setFormError('Display name is required')
      return
    }
    const slots = slotRows
      .map(r => ({
        slotKey: String(r.slotKey || '').trim(),
        secretId: String(r.secretId || '').trim()
      }))
      .filter(r => r.slotKey && r.secretId)
    if (!slots.length) {
      setFormError('Add at least one slot with a slot key and credential')
      return
    }
    setSaving(true)
    try {
      if (editId) {
        await client.updateSecretBundle(editId, { displayName: name, slots })
      } else {
        await client.createSecretBundle({ displayName: name, slots })
      }
      setCreateOpen(false)
      resetForm()
      setEditId(null)
      await loadBundles()
      onMutation?.()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const runDelete = async () => {
    if (!deleteId) return
    setDeleteSaving(true)
    setDeleteErr(null)
    try {
      await client.deleteSecretBundle(deleteId)
      setDeleteId(null)
      await loadBundles()
      void loadSecrets()
      onMutation?.()
    } catch (e) {
      if (e instanceof FunctionsBundleDeleteConflictError) {
        const parts: string[] = []
        if (e.blockingBundles?.length) {
          parts.push(`Still linked from bundle(s): ${e.blockingBundles.map(formatBlocking).join('; ')}`)
        }
        if (e.locations?.length) {
          parts.push(`Still referenced: ${e.locations.map(formatRefLoc).join('; ')}`)
        }
        setDeleteErr(parts.join('\n') || e.message)
      } else {
        setDeleteErr(e instanceof Error ? e.message : 'Delete failed')
      }
    } finally {
      setDeleteSaving(false)
    }
  }

  return (
    <div className="gba:space-y-4" data-testid={testId}>
      <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-2">
        <div>
          <h3 className="gba:text-base gba:font-semibold">Credential bundles</h3>
          <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
            Group existing credentials by integration. Slots use UPPER_SNAKE keys (e.g. API_KEY). Deleting a bundle
            removes its member credentials unless they are still referenced or linked from another bundle.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => openCreate()} data-testid={`${testId}-create`}>
          <Plus className="gba:h-4 gba:w-4 gba:mr-1" />
          New bundle
        </Button>
      </div>

      <div className="gba:rounded-xl gba:border gba:border-border gba:divide-y gba:divide-border">
        {loading ? (
          <div className="gba:p-4 gba:text-sm gba:text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="gba:p-4 gba:text-sm gba:text-muted-foreground">No credential bundles yet.</div>
        ) : (
          items.map(b => (
            <div
              key={b.id}
              className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-2 gba:p-3"
              data-testid={`${testId}-row-${b.id}`}
            >
              <div className="gba:min-w-0">
                <div className="gba:font-medium gba:truncate">{b.displayName}</div>
                <div className="gba:text-xs gba:text-muted-foreground">
                  {b.slotCount} slot{b.slotCount === 1 ? '' : 's'} · {b.namespace}
                </div>
              </div>
              <div className="gba:flex gba:items-center gba:gap-1">
                <Button type="button" size="sm" variant="ghost" onClick={() => void openEdit(b.id)} aria-label="Edit">
                  <Pencil className="gba:h-4 gba:w-4" />
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setDeleteId(b.id)} aria-label="Delete">
                  <Trash2 className="gba:h-4 gba:w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {total > PAGE ? (
        <div className="gba:flex gba:items-center gba:gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={offset <= 0}
            onClick={() => setOffset(o => Math.max(0, o - PAGE))}
          >
            Previous
          </Button>
          <span className="gba:text-xs gba:text-muted-foreground">
            {offset + 1}–{Math.min(offset + PAGE, total)} of {total}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={offset + PAGE >= total}
            onClick={() => setOffset(o => o + PAGE)}
          >
            Next
          </Button>
        </div>
      ) : null}

      <Dialog
        open={createOpen}
        onOpenChange={open => {
          if (!open) {
            setCreateOpen(false)
            setEditId(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="gba:max-w-lg" data-testid={`${testId}-dialog`}>
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit credential bundle' : 'New credential bundle'}</DialogTitle>
            <DialogDescription>
              Each slot maps a UPPER_SNAKE key to an existing credential. Values stay stored as separate credentials;
              this bundle is only metadata and grouping.
            </DialogDescription>
          </DialogHeader>
          <div className="gba:space-y-3">
            <div className="gba:space-y-1">
              <Label>Display name</Label>
              <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="SAP production" />
            </div>
            <div className="gba:space-y-2">
              <Label>Slots</Label>
              {slotRows.map((row, idx) => (
                <div key={idx} className="gba:flex gba:flex-wrap gba:items-end gba:gap-2">
                  <div className="gba:grid gba:grid-cols-2 gba:gap-2 gba:flex-1 gba:min-w-0">
                    <div className="gba:space-y-1">
                      <span className="gba:text-xs gba:text-muted-foreground">Slot key</span>
                      <Input
                        placeholder="API_KEY"
                        value={row.slotKey}
                        onChange={e => {
                          const next = [...slotRows]
                          next[idx] = { ...next[idx], slotKey: e.target.value }
                          setSlotRows(next)
                        }}
                      />
                    </div>
                    <div className="gba:space-y-1">
                      <span className="gba:text-xs gba:text-muted-foreground">Credential</span>
                      <Select
                        value={row.secretId || '__none__'}
                        onValueChange={v => {
                          const next = [...slotRows]
                          next[idx] = { ...next[idx], secretId: v === '__none__' ? '' : v }
                          setSlotRows(next)
                        }}
                      >
                        <SelectTrigger className="gba:max-w-full gba:w-full [&>span]:truncate [&>span]:block [&>span]:text-left">
                          <SelectValue placeholder="Select credential" />
                        </SelectTrigger>
                        <SelectContent className="gba:max-w-[min(100vw-2rem,28rem)]">
                          <SelectItem value="__none__">Select…</SelectItem>
                          {secrets.map(s => (
                            <SelectItem
                              key={s.id}
                              value={s.id}
                              className="[&>span]:line-clamp-2 [&>span]:break-all"
                              title={s.displayName}
                            >
                              {s.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {slotRows.length > 1 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="gba:shrink-0"
                      onClick={() => setSlotRows(prev => prev.filter((_, i) => i !== idx))}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setSlotRows(prev => [...prev, { slotKey: '', secretId: '' }])}
              >
                Add slot
              </Button>
            </div>
            {formError ? <div className="gba:text-sm gba:text-destructive">{formError}</div> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitForm()} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={open => (!open ? setDeleteId(null) : undefined)}>
        <AlertDialogContent data-testid={`${testId}-delete-dialog`}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete credential bundle?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the bundle and deletes all member credentials from the vault, unless they are still
              referenced or linked from another bundle.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteErr ? <div className="gba:text-sm gba:text-destructive gba:whitespace-pre-wrap">{deleteErr}</div> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSaving}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deleteSaving}
              onClick={() => {
                setDeleteErr(null)
                void runDelete()
              }}
            >
              {deleteSaving ? 'Deleting…' : 'Delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
