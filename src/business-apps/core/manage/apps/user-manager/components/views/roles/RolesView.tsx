import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Input,
  Alert,
  AlertDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { MagnifyingGlassIcon, PlusIcon, ShieldCheckIcon } from '@phosphor-icons/react'
import type { RoleRecord } from '@/common/network/users/types'
import { useRoleManagement } from '../../../hooks/useRoleManagement'
import translations from '../../../_i18n'
import { RoleDialog } from './dialogs/RoleDialog'
import { RoleDetailPanel } from '../../detail-panels/RoleDetailPanel'

const PAGE_SIZE = 20
const INCLUDE_ROLES_OPTIONS = ['all', 'ALL', 'BASE', 'STANDARD'] as const

export interface RolesViewProps {
  accessToken: string
  onRefresh?: () => void
}

export const RolesView = ({ accessToken, onRefresh }: RolesViewProps) => {
  const { t } = useTranslation(translations)
  const {
    roles,
    totalRecords,
    loading,
    error,
    fetchRoles,
    createRole,
    updateRole,
    deleteRole,
    getCompositeRoles,
    assignCompositeRoles
  } = useRoleManagement(accessToken)

  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const [includeRoles, setIncludeRoles] = useState<'ALL' | 'BASE' | 'STANDARD' | undefined>()
  const [selectedRole, setSelectedRole] = useState<RoleRecord | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setOffset(0)
    }, 300)
    return () => globalThis.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    setOffset(0)
  }, [includeRoles])

  const loadRoles = useCallback(async () => {
    await fetchRoles({ searchParam: debouncedSearch || undefined, offset, limit: PAGE_SIZE, includeRoles })
  }, [fetchRoles, debouncedSearch, offset, includeRoles])

  useEffect(() => {
    if (!accessToken) return
    void loadRoles()
  }, [accessToken, loadRoles])

  useEffect(() => {
    if (selectedRole) {
      const updated = roles.find(r => r.name === selectedRole.name)
      if (updated) setSelectedRole(updated)
    }
  }, [roles, selectedRole])

  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE))
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

  const afterMutation = useCallback(async () => {
    onRefresh?.()
    await loadRoles()
  }, [onRefresh, loadRoles])

  return (
    <div className="gba:flex gba:h-full gba:flex-col" data-testid="user-management-roles-root">
      {/* Toolbar */}
      <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2 gba:px-4 gba:py-3 gba:border-b">
        <div className="gba:flex gba:items-center gba:gap-2">
          <ShieldCheckIcon className="gba:h-5 gba:w-5" aria-hidden />
          <h1 className="gba:text-lg gba:font-semibold" data-testid="user-management-roles-heading">
            {t('user-management-roles-title')}
          </h1>
        </div>
        <div className="gba:flex gba:flex-1 gba:items-center gba:gap-2 gba:flex-wrap gba:min-w-0">
          <div className="gba:relative gba:flex-1 gba:min-w-[180px] gba:max-w-xs">
            <MagnifyingGlassIcon className="gba:absolute gba:left-3 gba:top-1/2 gba:h-4 gba:w-4 gba:-translate-y-1/2 gba:text-muted-foreground" />
            <Input
              className="gba:pl-9"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder={t('user-management-roles-search-placeholder')}
              data-testid="user-management-roles-input-search"
            />
          </div>
          <Select
            value={includeRoles ?? 'all'}
            onValueChange={val => setIncludeRoles(val === 'all' ? undefined : (val as 'ALL' | 'BASE' | 'STANDARD'))}
          >
            <SelectTrigger className="gba:w-36" data-testid="user-management-roles-filter">
              <SelectValue placeholder={t('user-management-roles-filter-all')} />
            </SelectTrigger>
            <SelectContent>
              {INCLUDE_ROLES_OPTIONS.map(opt => (
                <SelectItem key={opt} value={opt}>
                  {opt === 'all' ? t('user-management-roles-filter-all') : opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" onClick={() => setCreateDialogOpen(true)} data-testid="user-management-roles-button-add">
          <PlusIcon className="gba:mr-2 gba:h-4 gba:w-4" />
          {t('user-management-roles-action-add')}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="gba:mx-4 gba:mt-3" data-testid="user-management-roles-alert-error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Master-detail body */}
      <div className="gba:flex gba:flex-1 gba:min-h-0 gba:overflow-hidden">
        {/* List */}
        <div className="gba:flex gba:flex-col gba:w-72 gba:shrink-0 gba:border-r gba:overflow-hidden">
          <div className="gba:flex-1 gba:overflow-y-auto gba:relative" data-testid="user-management-roles-table">
            {loading && (
              <div className="gba:absolute gba:inset-0 gba:z-10 gba:flex gba:items-center gba:justify-center gba:bg-background/60">
                <Spinner data-testid="user-management-roles-loading" />
              </div>
            )}
            {roles.length === 0 && !loading ? (
              <p className="gba:p-4 gba:text-sm gba:text-muted-foreground" data-testid="user-management-roles-empty">
                {t('user-management-roles-empty')}
              </p>
            ) : (
              <ul>
                {roles.map(role => {
                  const isSelected = selectedRole?.name === role.name
                  return (
                    <li key={role.id}>
                      <button
                        type="button"
                        className={`gba:w-full gba:text-left gba:px-4 gba:py-3 gba:border-b gba:transition-colors gba:hover:bg-muted/50 ${isSelected ? 'gba:bg-muted' : ''}`}
                        onClick={() => setSelectedRole(role)}
                        data-testid={`user-management-roles-row-${role.id}`}
                      >
                        <p className="gba:text-sm gba:font-medium gba:truncate">{role.name}</p>
                        {role.description && (
                          <p className="gba:text-xs gba:text-muted-foreground gba:truncate">{role.description}</p>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          {/* Pagination */}
          <div className="gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-2 gba:border-t gba:text-xs gba:text-muted-foreground">
            <span data-testid="user-management-roles-pagination-info">
              {t('user-management-roles-pagination-info', { current: currentPage, total: totalPages })}
            </span>
            <div className="gba:flex gba:gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={offset <= 0 || loading}
                onClick={() => setOffset(o => Math.max(0, o - PAGE_SIZE))}
                data-testid="user-management-roles-button-pagination-prev"
              >
                {t('user-management-roles-pagination-prev')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={offset + PAGE_SIZE >= totalRecords || loading}
                onClick={() => setOffset(o => o + PAGE_SIZE)}
                data-testid="user-management-roles-button-pagination-next"
              >
                {t('user-management-roles-pagination-next')}
              </Button>
            </div>
          </div>
        </div>

        {/* Detail */}
        <div className="gba:flex-1 gba:overflow-y-auto">
          {selectedRole ? (
            <RoleDetailPanel
              role={selectedRole}
              accessToken={accessToken}
              allRoles={roles}
              allRolesLoading={loading}
              onUpdateRole={updateRole}
              onDeleteRole={deleteRole}
              onGetCompositeRoles={getCompositeRoles}
              onAssignCompositeRoles={assignCompositeRoles}
              onDeleted={() => {
                setSelectedRole(null)
                void afterMutation()
              }}
              onChanged={() => void afterMutation()}
            />
          ) : (
            <div className="gba:flex gba:h-full gba:items-center gba:justify-center gba:text-muted-foreground gba:text-sm">
              {t('user-management-detail-select-prompt')}
            </div>
          )}
        </div>
      </div>

      <RoleDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        mode="create"
        editingRoleName={null}
        initialName=""
        initialDescription=""
        createRole={createRole}
        updateRole={updateRole}
        onCompleted={() => void afterMutation()}
      />
    </div>
  )
}
