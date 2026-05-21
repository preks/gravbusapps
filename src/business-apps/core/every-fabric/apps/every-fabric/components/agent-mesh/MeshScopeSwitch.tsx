import React from 'react'
import { type MeshScope, MESH_SCOPES } from './meshScopes'

interface MeshScopeSwitchProps {
  activeScope: MeshScope
  onChange: (scope: MeshScope) => void
  disabledScopes?: MeshScope[]
}

export const MeshScopeSwitch: React.FC<MeshScopeSwitchProps> = ({ activeScope, onChange, disabledScopes = [] }) => {
  return (
    <div
      className="gba:inline-flex gba:items-center gba:rounded-lg gba:border gba:border-border/60 gba:bg-muted/30 gba:p-0.5"
      role="tablist"
      aria-label="Mesh scope"
      data-testid="mesh-scope-switch"
    >
      {MESH_SCOPES.map(scope => {
        const isActive = scope.key === activeScope
        const isDisabled = disabledScopes.includes(scope.key)
        return (
          <button
            key={scope.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-disabled={isDisabled}
            disabled={isDisabled}
            onClick={() => onChange(scope.key)}
            className={`gba:relative gba:px-3 gba:py-1.5 gba:text-[12px] gba:font-medium gba:rounded-md gba:transition-all gba:whitespace-nowrap ${
              isActive
                ? 'gba:bg-background gba:text-foreground gba:shadow-sm gba:border gba:border-border/60'
                : isDisabled
                  ? 'gba:text-muted-foreground/40 gba:cursor-not-allowed'
                  : 'gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/50'
            }`}
            data-testid={`mesh-scope-${scope.key}`}
          >
            {scope.label}
          </button>
        )
      })}
    </div>
  )
}
