import { useState, useEffect, useCallback } from 'react'
import {
  Button,
  Badge,
  Label,
  Input,
  Textarea,
  Separator,
  Alert,
  AlertDescription,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { PencilIcon, CheckIcon, XIcon, WarningIcon } from '@phosphor-icons/react'
import type { RoleRecord, UpdateRolePayload } from '@/common/network/users/types'
import { RelationshipSection } from './RelationshipSection'
import type { RelationshipItem, RelationshipOption } from './RelationshipSection'
import translations from '../../_i18n'

export interface RoleDetailPanelProps {
  role: RoleRecord
  allRoles: RoleRecord[]
  allRolesLoading: boolean
  onUpdateRole: (roleName: string, payload: UpdateRolePayload) => Promise<RoleRecord>
  onDeleteRole: (roleName: string) => Promise<void>
  onGetCompositeRoles: (roleName: string) => Promise<{ data: RoleRecord[] }>
  onAssignCompositeRoles: (roleName: string, roleNames: string[]) => Promise<void>
  onDeleted: () => void
  onChanged: () => void
}

export const RoleDetailPanel = ({
  role,
  allRoles,
  allRolesLoading,
  onUpdateRole,
  onDeleteRole,
  onGetCompositeRoles,
  onAssignCompositeRoles,
  onDeleted,
  onChanged
}: RoleDetailPanelProps) => {
  const { t } = useTranslation(translations)

  const [editing, setEditing] = useState(false)
  const [editValues, setEditValues] = useState<UpdateRolePayload>({})
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [composites, setComposites] = useState<RoleRecord[]>([])
  const [compositesLoading, setCompositesLoading] = useState(false)
  const [addCompositeLoading, setAddCompositeLoading] = useState(false)

  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const loadComposites = useCallback(async () => {
    if (!role.composite) return
    setCompositesLoading(true)
    try {
      const res = await onGetCompositeRoles(role.name)
      setComposites(res.data)
    } finally {
      setCompositesLoading(false)
    }
  }, [role.name, role.composite, onGetCompositeRoles])

  useEffect(() => {
    void loadComposites()
    setEditing(false)
    setSaveError(null)
    setDeleteConfirm(false)
    setDeleteError(null)
  }, [role.name, loadComposites])

  const startEdit = () => {
    setEditValues({ name: role.name, description: role.description })
    setEditing(true)
    setSaveError(null)
  }

  const cancelEdit = () => {
    setEditing(false)
    setSaveError(null)
  }

  const saveEdit = async () => {
    setSaveLoading(true)
    setSaveError(null)
    try {
      await onUpdateRole(role.name, editValues)
      setEditing(false)
      onChanged()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('user-management-roles-dialog-submit-failed'))
    } finally {
      setSaveLoading(false)
    }
  }

  const handleAddComposite = async (roleName: string) => {
    setAddCompositeLoading(true)
    try {
      await onAssignCompositeRoles(role.name, [roleName])
      await loadComposites()
      onChanged()
    } finally {
      setAddCompositeLoading(false)
    }
  }

  const handleDelete = async () => {
    setDeleteLoading(true)
    setDeleteError(null)
    try {
      await onDeleteRole(role.name)
      onDeleted()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t('user-management-roles-delete-failed'))
      setDeleteLoading(false)
      setDeleteConfirm(false)
    }
  }

  const compositeItems: RelationshipItem[] = composites.map(r => ({ id: r.name, label: r.name }))
  const compositeOptions: RelationshipOption[] = allRoles
    .filter(r => r.name !== role.name && !composites.some(c => c.name === r.name))
    .map(r => ({ value: r.name, label: r.name }))

  return (
    <div
      className="gba:flex gba:flex-col gba:gap-4 gba:p-4 gba:h-full gba:overflow-y-auto"
      data-testid="role-detail-panel"
    >
      {/* Header */}
      <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
        <div>
          <h2 className="gba:text-lg gba:font-semibold" data-testid="role-detail-name">
            {role.name}
          </h2>
          <div className="gba:flex gba:gap-2 gba:mt-1">
            <Badge variant={role.composite ? 'default' : 'secondary'} data-testid="role-detail-composite-badge">
              {role.composite ? t('user-management-roles-yes') : t('user-management-roles-no')}{' '}
              {t('user-management-roles-column-composite')}
            </Badge>
            {role.clientRole && <Badge variant="outline">{t('user-management-roles-column-client-role')}</Badge>}
          </div>
        </div>
        {!editing && (
          <Button type="button" size="sm" variant="outline" onClick={startEdit} data-testid="role-detail-edit-btn">
            <PencilIcon className="gba:h-4 gba:w-4 gba:mr-1" />
            {t('user-management-action-edit')}
          </Button>
        )}
      </div>

      {saveError && (
        <Alert variant="destructive">
          <WarningIcon className="gba:h-4 gba:w-4" />
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      {/* Fields */}
      {editing ? (
        <div className="gba:space-y-3">
          <div className="gba:space-y-1">
            <Label className="gba:text-xs">{t('user-management-roles-field-name')}</Label>
            <Input
              value={editValues.name ?? ''}
              onChange={e => setEditValues(v => ({ ...v, name: e.target.value }))}
              data-testid="role-detail-name-input"
            />
          </div>
          <div className="gba:space-y-1">
            <Label className="gba:text-xs">{t('user-management-roles-field-description')}</Label>
            <Textarea
              value={editValues.description ?? ''}
              onChange={e => setEditValues(v => ({ ...v, description: e.target.value }))}
              data-testid="role-detail-description-input"
            />
          </div>
          <div className="gba:flex gba:gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => void saveEdit()}
              disabled={saveLoading}
              data-testid="role-detail-save-btn"
            >
              {saveLoading ? (
                <Spinner className="gba:h-4 gba:w-4 gba:mr-1" />
              ) : (
                <CheckIcon className="gba:h-4 gba:w-4 gba:mr-1" />
              )}
              {t('user-management-action-save')}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={cancelEdit} data-testid="role-detail-cancel-btn">
              <XIcon className="gba:h-4 gba:w-4 gba:mr-1" />
              {t('user-management-action-cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="gba:space-y-1.5 gba:text-sm">
          {role.description && (
            <p className="gba:text-muted-foreground" data-testid="role-detail-description">
              {role.description}
            </p>
          )}
          <div className="gba:flex gba:gap-2">
            <span className="gba:text-muted-foreground gba:w-28 gba:shrink-0">
              {t('user-management-roles-column-container-id')}
            </span>
            <span className="gba:font-mono gba:text-xs">{role.containerId || '—'}</span>
          </div>
        </div>
      )}

      {/* Composite roles */}
      {role.composite && (
        <>
          <Separator />
          <RelationshipSection
            title={t('user-management-detail-composed-of')}
            items={compositeItems}
            loading={compositesLoading}
            addLoading={addCompositeLoading}
            options={compositeOptions}
            optionsLoading={allRolesLoading}
            addPlaceholder={t('user-management-roles-search-placeholder')}
            onAdd={handleAddComposite}
            data-testid="role-detail-composites"
          />
        </>
      )}

      <Separator />

      {/* Delete */}
      <div className="gba:space-y-2">
        {deleteError && (
          <Alert variant="destructive">
            <WarningIcon className="gba:h-4 gba:w-4" />
            <AlertDescription>{deleteError}</AlertDescription>
          </Alert>
        )}
        {deleteConfirm ? (
          <div className="gba:flex gba:gap-2 gba:items-center gba:flex-wrap">
            <span className="gba:text-sm gba:text-destructive">
              {t('user-management-roles-delete-message', { name: role.name })}
            </span>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={deleteLoading}
              onClick={() => void handleDelete()}
              data-testid="role-detail-delete-confirm-btn"
            >
              {deleteLoading ? <Spinner className="gba:h-4 gba:w-4" /> : t('user-management-roles-delete-confirm')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setDeleteConfirm(false)}
              data-testid="role-detail-delete-cancel-btn"
            >
              {t('user-management-action-cancel')}
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => setDeleteConfirm(true)}
            data-testid="role-detail-delete-btn"
          >
            {t('user-management-roles-action-delete')}
          </Button>
        )}
      </div>
    </div>
  )
}
