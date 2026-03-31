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
import { PencilIcon, CheckIcon, XIcon, WarningIcon, ArrowClockwiseIcon } from '@phosphor-icons/react'
import type {
  GroupRecord,
  UpdateGroupPayload,
  CreateSubGroupPayload,
  RoleRecord,
  GroupMember,
  User
} from '@/common/network/users/types'
import { RelationshipSection } from './RelationshipSection'
import type { RelationshipItem, RelationshipOption } from './RelationshipSection'
import translations from '../../_i18n'

export interface GroupDetailPanelProps {
  group: GroupRecord
  allUsers: User[]
  allUsersLoading: boolean
  allRoles: RoleRecord[]
  allRolesLoading: boolean
  allGroups: GroupRecord[]
  allGroupsLoading: boolean
  onUpdateGroup: (groupId: string, payload: UpdateGroupPayload) => Promise<GroupRecord>
  onDeleteGroup: (groupId: string) => Promise<void>
  onResynchronizeGroups: (groupIds: string[]) => Promise<void>
  onGetGroupMembers: (groupId: string) => Promise<{ data: GroupMember[] }>
  onAddUsersToGroup: (groupId: string, userIds: string[]) => Promise<void>
  onRemoveUsersFromGroup: (groupId: string, userIds: string[]) => Promise<void>
  onGetGroupRoles: (groupId: string) => Promise<{ data: RoleRecord[] }>
  onAddRolesToGroup: (groupId: string, roleNames: string[]) => Promise<void>
  onRemoveRolesFromGroup: (groupId: string, roleNames: string[]) => Promise<void>
  onGetGroupChildren: (groupId: string) => Promise<{ data: GroupRecord[] }>
  onAssignSubGroup: (groupId: string, payload: CreateSubGroupPayload) => Promise<void>
  onDeleted: () => void
  onChanged: () => void
}

export const GroupDetailPanel = ({
  group,
  allUsers,
  allUsersLoading,
  allRoles,
  allRolesLoading,
  allGroups,
  allGroupsLoading,
  onUpdateGroup,
  onDeleteGroup,
  onResynchronizeGroups,
  onGetGroupMembers,
  onAddUsersToGroup,
  onRemoveUsersFromGroup,
  onGetGroupRoles,
  onAddRolesToGroup,
  onRemoveRolesFromGroup,
  onGetGroupChildren,
  onAssignSubGroup,
  onDeleted,
  onChanged
}: GroupDetailPanelProps) => {
  const { t } = useTranslation(translations)

  const [editing, setEditing] = useState(false)
  const [editValues, setEditValues] = useState<UpdateGroupPayload>({})
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [members, setMembers] = useState<GroupMember[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [addMemberLoading, setAddMemberLoading] = useState(false)
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null)

  const [roles, setRoles] = useState<RoleRecord[]>([])
  const [rolesLoading, setRolesLoading] = useState(false)
  const [addRoleLoading, setAddRoleLoading] = useState(false)
  const [removeRoleId, setRemoveRoleId] = useState<string | null>(null)

  const [children, setChildren] = useState<GroupRecord[]>([])
  const [childrenLoading, setChildrenLoading] = useState(false)
  const [addChildLoading, setAddChildLoading] = useState(false)
  const [removeChildId] = useState<string | null>(null)

  const [resyncLoading, setResyncLoading] = useState(false)

  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const loadMembers = useCallback(async () => {
    setMembersLoading(true)
    try {
      const res = await onGetGroupMembers(group.id)
      setMembers(res.data)
    } finally {
      setMembersLoading(false)
    }
  }, [group.id, onGetGroupMembers])

  const loadRoles = useCallback(async () => {
    setRolesLoading(true)
    try {
      const res = await onGetGroupRoles(group.id)
      setRoles(res.data)
    } finally {
      setRolesLoading(false)
    }
  }, [group.id, onGetGroupRoles])

  const loadChildren = useCallback(async () => {
    setChildrenLoading(true)
    try {
      const res = await onGetGroupChildren(group.id)
      setChildren(res.data)
    } finally {
      setChildrenLoading(false)
    }
  }, [group.id, onGetGroupChildren])

  useEffect(() => {
    void loadMembers()
    void loadRoles()
    void loadChildren()
    setEditing(false)
    setSaveError(null)
    setDeleteConfirm(false)
    setDeleteError(null)
  }, [group.id, loadMembers, loadRoles, loadChildren])

  const startEdit = () => {
    setEditValues({ name: group.name, displayName: group.displayName, description: group.description })
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
      await onUpdateGroup(group.id, editValues)
      setEditing(false)
      onChanged()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('um-group-dialog-save'))
    } finally {
      setSaveLoading(false)
    }
  }

  const handleResync = async () => {
    setResyncLoading(true)
    try {
      await onResynchronizeGroups([group.id])
      onChanged()
    } finally {
      setResyncLoading(false)
    }
  }

  const handleAddMember = async (userId: string) => {
    setAddMemberLoading(true)
    try {
      await onAddUsersToGroup(group.id, [userId])
      await loadMembers()
      onChanged()
    } finally {
      setAddMemberLoading(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    setRemoveMemberId(userId)
    try {
      await onRemoveUsersFromGroup(group.id, [userId])
      await loadMembers()
      onChanged()
    } finally {
      setRemoveMemberId(null)
    }
  }

  const handleAddRole = async (roleName: string) => {
    setAddRoleLoading(true)
    try {
      await onAddRolesToGroup(group.id, [roleName])
      await loadRoles()
      onChanged()
    } finally {
      setAddRoleLoading(false)
    }
  }

  const handleRemoveRole = async (roleName: string) => {
    setRemoveRoleId(roleName)
    try {
      await onRemoveRolesFromGroup(group.id, [roleName])
      await loadRoles()
      onChanged()
    } finally {
      setRemoveRoleId(null)
    }
  }

  const handleAddChild = async (childGroupId: string) => {
    const childGroup = allGroups.find(g => g.id === childGroupId)
    if (!childGroup) return
    setAddChildLoading(true)
    try {
      await onAssignSubGroup(group.id, {
        name: childGroup.name,
        displayName: childGroup.displayName,
        description: childGroup.description
      })
      await loadChildren()
      onChanged()
    } finally {
      setAddChildLoading(false)
    }
  }

  const handleDelete = async () => {
    setDeleteLoading(true)
    setDeleteError(null)
    try {
      await onDeleteGroup(group.id)
      onDeleted()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t('um-groups-error'))
      setDeleteLoading(false)
      setDeleteConfirm(false)
    }
  }

  const memberItems: RelationshipItem[] = members.map(m => ({
    id: m.id,
    label: [m.givenName, m.familyName].filter(Boolean).join(' ') || m.name || m.id,
    sublabel: m.email
  }))
  const memberOptions: RelationshipOption[] = allUsers.map(u => ({
    value: u.id,
    label: [u.givenName, u.familyName].filter(Boolean).join(' ') || u.name || u.email
  }))

  const roleItems: RelationshipItem[] = roles.map(r => ({ id: r.name, label: r.name }))
  const roleOptions: RelationshipOption[] = allRoles.map(r => ({ value: r.name, label: r.name }))

  const childItems: RelationshipItem[] = children.map(c => ({ id: c.id, label: c.displayName || c.name }))
  const childOptions: RelationshipOption[] = allGroups
    .filter(g => g.id !== group.id && !children.some(c => c.id === g.id))
    .map(g => ({ value: g.id, label: g.displayName || g.name }))

  return (
    <div
      className="gba:flex gba:flex-col gba:gap-4 gba:p-4 gba:h-full gba:overflow-y-auto"
      data-testid="group-detail-panel"
    >
      {/* Header */}
      <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
        <div>
          <h2 className="gba:text-lg gba:font-semibold" data-testid="group-detail-name">
            {group.displayName || group.name}
          </h2>
          <p className="gba:text-xs gba:text-muted-foreground gba:font-mono">{group.path}</p>
        </div>
        <div className="gba:flex gba:gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void handleResync()}
            disabled={resyncLoading}
            data-testid="group-detail-resync-btn"
          >
            {resyncLoading ? (
              <Spinner className="gba:h-4 gba:w-4" />
            ) : (
              <ArrowClockwiseIcon className="gba:h-4 gba:w-4" />
            )}
          </Button>
          {!editing && (
            <Button type="button" size="sm" variant="outline" onClick={startEdit} data-testid="group-detail-edit-btn">
              <PencilIcon className="gba:h-4 gba:w-4 gba:mr-1" />
              {t('user-management-action-edit')}
            </Button>
          )}
        </div>
      </div>

      {group.syncStatus && (
        <Badge variant="secondary" className="gba:self-start">
          {group.syncStatus}
        </Badge>
      )}

      {saveError && (
        <Alert variant="destructive">
          <WarningIcon className="gba:h-4 gba:w-4" />
        </Alert>
      )}

      {/* Fields */}
      {editing ? (
        <div className="gba:space-y-3">
          <div className="gba:space-y-1">
            <Label className="gba:text-xs">{t('um-group-dialog-name')}</Label>
            <Input
              value={editValues.name ?? ''}
              onChange={e => setEditValues(v => ({ ...v, name: e.target.value }))}
              data-testid="group-detail-name-input"
            />
          </div>
          <div className="gba:space-y-1">
            <Label className="gba:text-xs">{t('um-group-dialog-display-name')}</Label>
            <Input
              value={editValues.displayName ?? ''}
              onChange={e => setEditValues(v => ({ ...v, displayName: e.target.value }))}
              data-testid="group-detail-display-name-input"
            />
          </div>
          <div className="gba:space-y-1">
            <Label className="gba:text-xs">{t('um-group-dialog-description')}</Label>
            <Textarea
              value={editValues.description ?? ''}
              onChange={e => setEditValues(v => ({ ...v, description: e.target.value }))}
              data-testid="group-detail-description-input"
            />
          </div>
          <div className="gba:flex gba:gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => void saveEdit()}
              disabled={saveLoading}
              data-testid="group-detail-save-btn"
            >
              {saveLoading ? (
                <Spinner className="gba:h-4 gba:w-4 gba:mr-1" />
              ) : (
                <CheckIcon className="gba:h-4 gba:w-4 gba:mr-1" />
              )}
              {t('user-management-action-save')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={cancelEdit}
              data-testid="group-detail-cancel-btn"
            >
              <XIcon className="gba:h-4 gba:w-4 gba:mr-1" />
              {t('user-management-action-cancel')}
            </Button>
          </div>
        </div>
      ) : (
        group.description && (
          <p className="gba:text-sm gba:text-muted-foreground" data-testid="group-detail-description">
            {group.description}
          </p>
        )
      )}

      <Separator />

      <RelationshipSection
        title={t('um-group-members-title')}
        items={memberItems}
        loading={membersLoading}
        addLoading={addMemberLoading}
        removeLoadingId={removeMemberId}
        options={memberOptions}
        optionsLoading={allUsersLoading}
        addPlaceholder={t('um-group-members-search-placeholder')}
        onAdd={handleAddMember}
        onRemove={handleRemoveMember}
        data-testid="group-detail-members"
      />

      <Separator />

      <RelationshipSection
        title={t('um-group-roles-title')}
        items={roleItems}
        loading={rolesLoading}
        addLoading={addRoleLoading}
        removeLoadingId={removeRoleId}
        options={roleOptions}
        optionsLoading={allRolesLoading}
        addPlaceholder={t('um-group-roles-search-placeholder')}
        onAdd={handleAddRole}
        onRemove={handleRemoveRole}
        data-testid="group-detail-roles"
      />

      <Separator />

      <RelationshipSection
        title={t('um-groups-children-title')}
        items={childItems}
        loading={childrenLoading}
        addLoading={addChildLoading}
        removeLoadingId={removeChildId}
        options={childOptions}
        optionsLoading={allGroupsLoading}
        addPlaceholder={t('um-groups-search-placeholder')}
        onAdd={handleAddChild}
        data-testid="group-detail-children"
      />

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
              {t('um-groups-delete-description', { name: group.name })}
            </span>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={deleteLoading}
              onClick={() => void handleDelete()}
              data-testid="group-detail-delete-confirm-btn"
            >
              {deleteLoading ? <Spinner className="gba:h-4 gba:w-4" /> : t('um-groups-delete-confirm')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setDeleteConfirm(false)}
              data-testid="group-detail-delete-cancel-btn"
            >
              {t('um-groups-delete-cancel')}
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => setDeleteConfirm(true)}
            data-testid="group-detail-delete-btn"
          >
            {t('um-groups-delete-title')}
          </Button>
        )}
      </div>
    </div>
  )
}
