// Reusable role / department / owner inputs for workforce identity sections.

import React from 'react'
import type { RoleOwnershipValues } from './roleOwnershipForm'

const INPUT_CLASS =
  'gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring'

export interface RoleOwnershipFieldIds {
  role: string
  department: string
  owner: string
}

export interface RoleOwnershipFieldsProps {
  values: RoleOwnershipValues
  onChange: (patch: Partial<RoleOwnershipValues>) => void
  fieldIds: RoleOwnershipFieldIds
  testIds: RoleOwnershipFieldIds
}

export const RoleOwnershipFields: React.FC<RoleOwnershipFieldsProps> = ({ values, onChange, fieldIds, testIds }) => (
  <>
    <div>
      <label htmlFor={fieldIds.role} className="gba:mb-1 gba:block gba:text-xs gba:font-semibold gba:text-foreground">
        Role
      </label>
      <input
        id={fieldIds.role}
        value={values.role}
        onChange={e => onChange({ role: e.target.value })}
        className={INPUT_CLASS}
        data-testid={testIds.role}
      />
    </div>

    <div>
      <label
        htmlFor={fieldIds.department}
        className="gba:mb-1 gba:block gba:text-xs gba:font-semibold gba:text-foreground"
      >
        Department
      </label>
      <input
        id={fieldIds.department}
        value={values.department}
        onChange={e => onChange({ department: e.target.value })}
        className={INPUT_CLASS}
        data-testid={testIds.department}
      />
    </div>

    <div className="gba:sm:col-span-2">
      <label htmlFor={fieldIds.owner} className="gba:mb-1 gba:block gba:text-xs gba:font-semibold gba:text-foreground">
        Owner user ID
      </label>
      <input
        id={fieldIds.owner}
        value={values.ownerUserId}
        onChange={e => onChange({ ownerUserId: e.target.value })}
        placeholder="Person responsible for escalations"
        className={INPUT_CLASS}
        data-testid={testIds.owner}
      />
    </div>
  </>
)
