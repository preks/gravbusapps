// Reusable role / department / owner inputs for workforce identity sections.

import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import type { RoleOwnershipValues } from './roleOwnershipForm'
import translations from '../../../_i18n'

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
  /**
   * When provided, the Department field renders this read-only node instead of
   * a free-text input (e.g. the org unit sourced from the orgchart identity).
   */
  departmentSlot?: React.ReactNode
  /**
   * When provided, the Owner field renders this read-only node instead of a
   * free-text user-id input (e.g. the resolved owner avatar + name + role).
   */
  ownerSlot?: React.ReactNode
}

export const RoleOwnershipFields: React.FC<RoleOwnershipFieldsProps> = ({
  values,
  onChange,
  fieldIds,
  testIds,
  departmentSlot,
  ownerSlot
}) => {
  const { t } = useTranslation(translations)
  return (
    <>
      <div>
        <label htmlFor={fieldIds.role} className="gba:mb-1 gba:block gba:text-xs gba:font-semibold gba:text-foreground">
          {t('roleown-role-label')}
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
          htmlFor={departmentSlot ? undefined : fieldIds.department}
          className="gba:mb-1 gba:block gba:text-xs gba:font-semibold gba:text-foreground"
        >
          {t('roleown-department-label')}
        </label>
        {departmentSlot ?? (
          <input
            id={fieldIds.department}
            value={values.department}
            onChange={e => onChange({ department: e.target.value })}
            className={INPUT_CLASS}
            data-testid={testIds.department}
          />
        )}
      </div>

      <div className="gba:sm:col-span-2">
        <label
          htmlFor={ownerSlot ? undefined : fieldIds.owner}
          className="gba:mb-1 gba:block gba:text-xs gba:font-semibold gba:text-foreground"
        >
          {t('roleown-owner-label')}
        </label>
        {ownerSlot ?? (
          <input
            id={fieldIds.owner}
            value={values.ownerUserId}
            onChange={e => onChange({ ownerUserId: e.target.value })}
            placeholder={t('roleown-owner-placeholder')}
            className={INPUT_CLASS}
            data-testid={testIds.owner}
          />
        )}
      </div>
    </>
  )
}
