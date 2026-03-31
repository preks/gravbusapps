import { useState, useEffect, useCallback } from 'react'
import {
  Button,
  Badge,
  Switch,
  Label,
  Input,
  Separator,
  Alert,
  AlertDescription,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { PencilIcon, CheckIcon, XIcon, WarningIcon } from '@phosphor-icons/react'
import type {
  User,
  UpdateUserPayload,
  ActivateUserPayload,
  UpsertPasswordPayload,
  RoleRecord,
  GroupRecord
} from '@/common/network/users/types'
import { RelationshipSection } from './RelationshipSection'
import type { RelationshipItem, RelationshipOption } from './RelationshipSection'
import translations from '../../_i18n'

export interface UserDetailPanelProps {
  user: User
  allGroups: GroupRecord[]
  allGroupsLoading: boolean
  allRoles: RoleRecord[]
  allRolesLoading: boolean
  onUpdateUser: (userId: string, payload: UpdateUserPayload) => Promise<User>
  onActivateUser: (userId: string, payload: ActivateUserPayload) => Promise<void>
  onUpsertPassword: (userId: string, payload: UpsertPasswordPayload) => Promise<void>
  onGetUserGroups: (userId: string) => Promise<{ data: Array<{ id: string; name: string }> }>
  onAddGroupsToUser: (userId: string, groupIds: string[]) => Promise<void>
  onRemoveGroupsFromUser: (userId: string, groupIds: string[]) => Promise<void>
  onGetUserRoles: (userId: string) => Promise<{ data: RoleRecord[] }>
  onAssignRolesToUser: (userId: string, roleNames: string[]) => Promise<void>
  onRemoveRolesFromUser: (userId: string, roleNames: string[]) => Promise<void>
  onDeleteUser: (userId: string) => Promise<void>
  onDeleted: () => void
  onChanged: () => void
}

export const UserDetailPanel = ({
  user,
  allGroups,
  allGroupsLoading,
  allRoles,
  allRolesLoading,
  onUpdateUser,
  onActivateUser,
  onUpsertPassword,
  onGetUserGroups,
  onAddGroupsToUser,
  onRemoveGroupsFromUser,
  onGetUserRoles,
  onAssignRolesToUser,
  onRemoveRolesFromUser,
  onDeleteUser,
  onDeleted,
  onChanged
}: UserDetailPanelProps) => {
  const { t } = useTranslation(translations)

  const [editing, setEditing] = useState(false)
  const [editValues, setEditValues] = useState<UpdateUserPayload>({})
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [passwordValue, setPasswordValue] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  const [activeLoading, setActiveLoading] = useState(false)

  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([])
  const [groupsLoading, setGroupsLoading] = useState(false)
  const [addGroupLoading, setAddGroupLoading] = useState(false)
  const [removeGroupId, setRemoveGroupId] = useState<string | null>(null)

  const [roles, setRoles] = useState<RoleRecord[]>([])
  const [rolesLoading, setRolesLoading] = useState(false)
  const [addRoleLoading, setAddRoleLoading] = useState(false)
  const [removeRoleId, setRemoveRoleId] = useState<string | null>(null)

  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const loadGroups = useCallback(async () => {
    setGroupsLoading(true)
    try {
      const res = await onGetUserGroups(user.id)
      setGroups(res.data)
    } finally {
      setGroupsLoading(false)
    }
  }, [user.id, onGetUserGroups])

  const loadRoles = useCallback(async () => {
    setRolesLoading(true)
    try {
      const res = await onGetUserRoles(user.id)
      setRoles(res.data)
    } finally {
      setRolesLoading(false)
    }
  }, [user.id, onGetUserRoles])

  useEffect(() => {
    void loadGroups()
    void loadRoles()
    setEditing(false)
    setPasswordValue('')
    setPasswordSuccess(false)
    setPasswordError(null)
    setSaveError(null)
    setDeleteConfirm(false)
    setDeleteError(null)
  }, [user.id, loadGroups, loadRoles])

  const startEdit = () => {
    setEditValues({
      givenName: user.givenName,
      familyName: user.familyName,
      preferredUsername: user.preferredUsername,
      email: user.email,
      employeeId: user.employeeId
    })
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
      await onUpdateUser(user.id, editValues)
      setEditing(false)
      onChanged()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('user-management-dialog-save-error'))
    } finally {
      setSaveLoading(false)
    }
  }

  const handleActiveToggle = async (checked: boolean) => {
    setActiveLoading(true)
    try {
      await onActivateUser(user.id, { active: checked })
      onChanged()
    } finally {
      setActiveLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!passwordValue.trim()) return
    setPasswordLoading(true)
    setPasswordError(null)
    setPasswordSuccess(false)
    try {
      await onUpsertPassword(user.id, { password: passwordValue })
      setPasswordValue('')
      setPasswordSuccess(true)
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : t('user-management-reset-password-error'))
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleAddGroup = async (groupId: string) => {
    setAddGroupLoading(true)
    try {
      await onAddGroupsToUser(user.id, [groupId])
      await loadGroups()
      onChanged()
    } finally {
      setAddGroupLoading(false)
    }
  }

  const handleRemoveGroup = async (groupId: string) => {
    setRemoveGroupId(groupId)
    try {
      await onRemoveGroupsFromUser(user.id, [groupId])
      await loadGroups()
      onChanged()
    } finally {
      setRemoveGroupId(null)
    }
  }

  const handleAddRole = async (roleName: string) => {
    setAddRoleLoading(true)
    try {
      await onAssignRolesToUser(user.id, [roleName])
      await loadRoles()
      onChanged()
    } finally {
      setAddRoleLoading(false)
    }
  }

  const handleRemoveRole = async (roleName: string) => {
    setRemoveRoleId(roleName)
    try {
      await onRemoveRolesFromUser(user.id, [roleName])
      await loadRoles()
      onChanged()
    } finally {
      setRemoveRoleId(null)
    }
  }

  const handleDelete = async () => {
    setDeleteLoading(true)
    setDeleteError(null)
    try {
      await onDeleteUser(user.id)
      onDeleted()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t('user-management-delete-error'))
      setDeleteLoading(false)
      setDeleteConfirm(false)
    }
  }

  const displayName = [user.givenName, user.familyName].filter(Boolean).join(' ') || user.name || '—'

  const groupItems: RelationshipItem[] = groups.map(g => ({ id: g.id, label: g.name }))
  const groupOptions: RelationshipOption[] = allGroups.map(g => ({
    value: g.id,
    label: g.displayName || g.name
  }))

  const roleItems: RelationshipItem[] = roles.map(r => ({ id: r.name, label: r.name }))
  const roleOptions: RelationshipOption[] = allRoles.map(r => ({ value: r.name, label: r.name }))

  return (
    <div
      className="gba:flex gba:flex-col gba:gap-4 gba:p-4 gba:h-full gba:overflow-y-auto"
      data-testid="user-detail-panel"
    >
      {/* Header */}
      <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
        <div>
          <h2 className="gba:text-lg gba:font-semibold" data-testid="user-detail-name">
            {displayName}
          </h2>
          {user.preferredUsername && <p className="gba:text-sm gba:text-muted-foreground">@{user.preferredUsername}</p>}
        </div>
        {!editing && (
          <Button type="button" size="sm" variant="outline" onClick={startEdit} data-testid="user-detail-edit-btn">
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

      {/* Profile fields */}
      {editing ? (
        <div className="gba:space-y-3">
          <div className="gba:grid gba:grid-cols-2 gba:gap-2">
            <div className="gba:space-y-1">
              <Label className="gba:text-xs">{t('user-management-field-given-name')}</Label>
              <Input
                value={editValues.givenName ?? ''}
                onChange={e => setEditValues(v => ({ ...v, givenName: e.target.value }))}
                data-testid="user-detail-given-name"
              />
            </div>
            <div className="gba:space-y-1">
              <Label className="gba:text-xs">{t('user-management-field-family-name')}</Label>
              <Input
                value={editValues.familyName ?? ''}
                onChange={e => setEditValues(v => ({ ...v, familyName: e.target.value }))}
                data-testid="user-detail-family-name"
              />
            </div>
          </div>
          <div className="gba:space-y-1">
            <Label className="gba:text-xs">{t('user-management-field-preferred-username')}</Label>
            <Input
              value={editValues.preferredUsername ?? ''}
              onChange={e => setEditValues(v => ({ ...v, preferredUsername: e.target.value }))}
              data-testid="user-detail-username"
            />
          </div>
          <div className="gba:space-y-1">
            <Label className="gba:text-xs">{t('user-management-field-email')}</Label>
            <Input
              type="email"
              value={editValues.email ?? ''}
              onChange={e => setEditValues(v => ({ ...v, email: e.target.value }))}
              data-testid="user-detail-email"
            />
          </div>
          <div className="gba:space-y-1">
            <Label className="gba:text-xs">{t('user-management-field-employee-id')}</Label>
            <Input
              value={editValues.employeeId ?? ''}
              onChange={e => setEditValues(v => ({ ...v, employeeId: e.target.value || null }))}
              data-testid="user-detail-employee-id"
            />
          </div>
          <div className="gba:flex gba:gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => void saveEdit()}
              disabled={saveLoading}
              data-testid="user-detail-save-btn"
            >
              {saveLoading ? (
                <Spinner className="gba:h-4 gba:w-4 gba:mr-1" />
              ) : (
                <CheckIcon className="gba:h-4 gba:w-4 gba:mr-1" />
              )}
              {t('user-management-action-save')}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={cancelEdit} data-testid="user-detail-cancel-btn">
              <XIcon className="gba:h-4 gba:w-4 gba:mr-1" />
              {t('user-management-action-cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="gba:space-y-1.5 gba:text-sm">
          <div className="gba:flex gba:gap-2">
            <span className="gba:text-muted-foreground gba:w-28 gba:shrink-0">{t('user-management-field-email')}</span>
            <span data-testid="user-detail-email-display">{user.email || '—'}</span>
          </div>
          <div className="gba:flex gba:gap-2">
            <span className="gba:text-muted-foreground gba:w-28 gba:shrink-0">
              {t('user-management-field-employee-id')}
            </span>
            <span data-testid="user-detail-emp-id-display">{user.employeeId || '—'}</span>
          </div>
          {user.syncStatus && (
            <div className="gba:flex gba:gap-2">
              <span className="gba:text-muted-foreground gba:w-28 gba:shrink-0">
                {t('user-management-column-sync-status')}
              </span>
              <Badge variant="secondary">{user.syncStatus}</Badge>
            </div>
          )}
        </div>
      )}

      {/* Active toggle */}
      {!editing && (
        <div className="gba:flex gba:items-center gba:gap-3">
          <Switch
            checked={user.active}
            onCheckedChange={checked => void handleActiveToggle(checked)}
            disabled={activeLoading}
            data-testid="user-detail-active-toggle"
          />
          <Label className="gba:text-sm">{t('user-management-field-active')}</Label>
          {activeLoading && <Spinner className="gba:h-4 gba:w-4" />}
        </div>
      )}

      <Separator />

      {/* Groups */}
      <RelationshipSection
        title={t('user-management-field-groups')}
        items={groupItems}
        loading={groupsLoading}
        addLoading={addGroupLoading}
        removeLoadingId={removeGroupId}
        options={groupOptions}
        optionsLoading={allGroupsLoading}
        addPlaceholder={t('user-management-groups-add')}
        onAdd={handleAddGroup}
        onRemove={handleRemoveGroup}
        data-testid="user-detail-groups"
      />

      <Separator />

      {/* Roles */}
      <RelationshipSection
        title={t('user-management-roles-title')}
        items={roleItems}
        loading={rolesLoading}
        addLoading={addRoleLoading}
        removeLoadingId={removeRoleId}
        options={roleOptions}
        optionsLoading={allRolesLoading}
        addPlaceholder={t('user-management-roles-action-add')}
        onAdd={handleAddRole}
        onRemove={handleRemoveRole}
        data-testid="user-detail-roles"
      />

      <Separator />

      {/* Password reset */}
      <div className="gba:space-y-2">
        <Label className="gba:text-xs gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground">
          {t('user-management-reset-password-title')}
        </Label>
        {passwordError && (
          <Alert variant="destructive">
            <WarningIcon className="gba:h-4 gba:w-4" />
            <AlertDescription>{passwordError}</AlertDescription>
          </Alert>
        )}
        {passwordSuccess && (
          <p className="gba:text-sm gba:text-green-600" data-testid="user-detail-password-success">
            {t('user-management-reset-password-submit')}
          </p>
        )}
        <div className="gba:flex gba:gap-2">
          <Input
            type="password"
            value={passwordValue}
            onChange={e => {
              setPasswordValue(e.target.value)
              setPasswordSuccess(false)
            }}
            placeholder={t('user-management-field-password')}
            className="gba:flex-1"
            data-testid="user-detail-password-input"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!passwordValue.trim() || passwordLoading}
            onClick={() => void handleResetPassword()}
            data-testid="user-detail-password-btn"
          >
            {passwordLoading ? <Spinner className="gba:h-4 gba:w-4" /> : t('user-management-reset-password-submit')}
          </Button>
        </div>
      </div>

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
          <div className="gba:flex gba:gap-2 gba:items-center">
            <span className="gba:text-sm gba:text-destructive">{t('user-management-delete-confirm')}</span>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={deleteLoading}
              onClick={() => void handleDelete()}
              data-testid="user-detail-delete-confirm-btn"
            >
              {deleteLoading ? <Spinner className="gba:h-4 gba:w-4" /> : t('user-management-delete-submit')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setDeleteConfirm(false)}
              data-testid="user-detail-delete-cancel-btn"
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
            data-testid="user-detail-delete-btn"
          >
            {t('user-management-delete-title')}
          </Button>
        )}
      </div>
    </div>
  )
}
