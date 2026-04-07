import React from 'react'
import { Input } from '@newwork/nw-design-system'
import { EntitySelect } from '@/common/components/common-relations/selects/reference-select'
import type { EntitySelectOption } from '@/common/components/common-relations/selects/reference-select'
import type { TaskTemplateEntitySelectBindings } from '../types'
import type { TaskTemplateHydratableEntityType } from '../taskTemplateEntityTypeMap'

export interface TaskTemplateEntityComboProps {
  value: string
  onChange: (next: string) => void
  entitySelect?: TaskTemplateEntitySelectBindings
  mappedType: TaskTemplateHydratableEntityType | null
  filteredEntities: EntitySelectOption[]
  inputPlaceholder: string
  selectPlaceholder: string
  searchPlaceholder: string
  dataTestId: string
}

/** EntitySelect when hooks are wired; otherwise UUID text field (fallback). */
export const TaskTemplateEntityCombo: React.FC<TaskTemplateEntityComboProps> = ({
  value,
  onChange,
  entitySelect,
  mappedType,
  filteredEntities,
  inputPlaceholder,
  selectPlaceholder,
  searchPlaceholder,
  dataTestId
}) => {
  if (entitySelect && mappedType) {
    return (
      <EntitySelect
        entities={filteredEntities}
        value={value || null}
        onValueChange={(v: string | null) => onChange(v || '')}
        onSearch={entitySelect.onEntitySearch}
        loading={entitySelect.entitiesLoading}
        onLoadMore={entitySelect.onEntityLoadMore}
        hasMore={entitySelect.hasMore}
        placeholder={selectPlaceholder}
        searchPlaceholder={searchPlaceholder}
        data-testid={dataTestId}
      />
    )
  }

  return (
    <Input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={inputPlaceholder}
      data-testid={dataTestId}
    />
  )
}
