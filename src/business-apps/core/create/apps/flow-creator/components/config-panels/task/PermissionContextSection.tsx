import React, { useMemo } from 'react'
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch
} from '@newwork/nw-design-system'
import { AssignmentSelector } from '@/components/assignment-selector/AssignmentSelector'
import { AssignmentMode, type TaskAssignment } from '@/common/network/flows/FlowTemplateClient'
import type { PermissionContextType, StepPermission, DesignerMode } from '../../../types/studioTypes'
import { NEUTRAL_SWITCH_CLASSNAME } from '../../../utils/neutralSwitchClassName'

interface PermissionContextValue {
  contextType: PermissionContextType
  organizationalUnitId?: string
  permissions: StepPermission[]
}

interface PermissionContextSectionProps {
  mode: DesignerMode
  value?: PermissionContextValue
  onChange: (next: PermissionContextValue) => void
  accessToken: string
  'data-testid'?: string
}

const ALL_PERMISSIONS: StepPermission[] = ['read', 'write', 'execute']

export const PermissionContextSection: React.FC<PermissionContextSectionProps> = ({
  mode,
  value,
  onChange,
  accessToken,
  'data-testid': testId = 'permission-context'
}) => {
  const contextType = value?.contextType ?? 'USER'
  const permissions = value?.permissions ?? ALL_PERMISSIONS
  const organizationalUnitId = value?.organizationalUnitId

  const ouAssignmentValue: TaskAssignment | undefined = useMemo(() => {
    if (!organizationalUnitId) return undefined
    return {
      assignmentMode: AssignmentMode.CLAIM,
      targets: { organizationalUnits: [organizationalUnitId] }
    }
  }, [organizationalUnitId])

  return (
    <div
      className="gba:flex gba:flex-col gba:gap-3 gba:rounded-lg gba:bg-muted gba:p-4 gba:border gba:border-border"
      data-testid={testId}
    >
      <Label className="gba:text-xs gba:font-semibold gba:text-foreground">Permission Context</Label>

      {/* Context */}
      <div className="gba:flex gba:flex-col gba:gap-2 gba:p-3 gba:rounded-lg gba:bg-background gba:border gba:border-border">
        <Label className="gba:text-xs gba:font-semibold gba:text-foreground">Context</Label>

        {mode === 'simple' ? (
          <Input value="User Context" readOnly data-testid={`${testId}-context-readonly`} />
        ) : (
          <Select
            value={contextType}
            onValueChange={next =>
              onChange({
                contextType: next as PermissionContextType,
                organizationalUnitId,
                permissions
              })
            }
          >
            <SelectTrigger className="gba:bg-background" data-testid={`${testId}-context`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USER">User Context</SelectItem>
              <SelectItem value="ORGANIZATIONAL_UNIT">Organizational Unit</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Org Unit */}
      {mode === 'advanced' && contextType === 'ORGANIZATIONAL_UNIT' && (
        <div className="gba:flex gba:flex-col gba:gap-2 gba:p-3 gba:rounded-lg gba:bg-background gba:border gba:border-border">
          <Label className="gba:text-xs gba:font-semibold gba:text-foreground">Organizational Unit</Label>
          <AssignmentSelector
            value={ouAssignmentValue}
            assignmentMode={AssignmentMode.CLAIM}
            accessToken={accessToken}
            allowedTypes={['departments']}
            onChange={assignment => {
              const ids = assignment.targets?.organizationalUnits ?? []
              const lastSelected = ids.length > 0 ? ids[ids.length - 1] : undefined
              onChange({
                contextType: 'ORGANIZATIONAL_UNIT',
                organizationalUnitId: lastSelected,
                permissions
              })
            }}
            data-testid={`${testId}-ou-selector`}
          />
        </div>
      )}

      {/* Permissions */}
      <div className="gba:flex gba:flex-col gba:gap-2 gba:p-3 gba:rounded-lg gba:bg-background gba:border gba:border-border">
        <Label className="gba:text-xs gba:font-semibold gba:text-foreground">Permissions</Label>
        <div className="gba:divide-y gba:divide-border">
          {ALL_PERMISSIONS.map(permission => {
            const checked = permissions.includes(permission)
            return (
              <div key={permission} className="gba:flex gba:items-center gba:justify-between gba:py-2">
                <span className="gba:text-xs gba:font-medium gba:text-foreground gba:capitalize">{permission}</span>
                <Switch
                  checked={checked}
                  onCheckedChange={nextValue => {
                    const nextPermissions = nextValue
                      ? Array.from(new Set([...permissions, permission]))
                      : permissions.filter(p => p !== permission)
                    onChange({
                      contextType,
                      organizationalUnitId,
                      permissions: nextPermissions
                    })
                  }}
                  className={NEUTRAL_SWITCH_CLASSNAME}
                  data-testid={`${testId}-permission-${permission}`}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
