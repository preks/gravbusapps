import React from 'react'
import { Button, Input, Label } from '@newwork/nw-design-system'
import { Database, List, Plus, X } from 'lucide-react'
import { InputType, type DataSource, type InputBlock, type InputOption } from '@/common/data/flow/types/flowTemplate'
import type { DesignerMode } from '../../types/studioTypes'
import { CatalogSourceSection } from './CatalogSourceSection'
import { EntitySourceSection } from './EntitySourceSection'
import { CustomDataSourceSection } from './CustomDataSourceSection'

interface CatalogOption {
  identifier: string
  name: string
  version: string
  entryCount: number
}

interface FormFieldOptionsSectionProps {
  field: InputBlock
  catalogs?: CatalogOption[]
  catalogsLoading?: boolean
  catalogsError?: string | null
  catalogsHasMore?: boolean
  searchCatalogs?: (query: string) => Promise<void>
  loadMoreCatalogs?: () => Promise<void>
  entities?: Array<{ type: string; name: string; fields: string[] }>
  entitiesLoading?: boolean
  entitiesError?: string | null
  customDataNamespaces?: string[]
  customDataNamespacesLoading?: boolean
  customDataKeysByNamespace?: Record<string, string[]>
  customDataKeysLoadingByNamespace?: Record<string, boolean>
  fetchCustomDataKeys?: (namespace: string) => Promise<void>
  index: number
  mode: DesignerMode
  onChange: (updated: InputBlock) => void
  onAddOption: () => void
  onUpdateOption: (optIndex: number, partial: Partial<InputOption>) => void
  onRemoveOption: (optIndex: number) => void
  'data-testid': string
}

type OptionsSource = 'manual' | 'catalog' | 'entity' | 'custom_data'

export const FormFieldOptionsSection: React.FC<FormFieldOptionsSectionProps> = ({
  field,
  catalogs,
  catalogsLoading,
  catalogsError,
  catalogsHasMore,
  searchCatalogs,
  loadMoreCatalogs,
  entities,
  entitiesLoading,
  entitiesError,
  customDataNamespaces,
  customDataNamespacesLoading,
  customDataKeysByNamespace,
  customDataKeysLoadingByNamespace,
  fetchCustomDataKeys,
  index,
  mode,
  onChange,
  onAddOption,
  onUpdateOption,
  onRemoveOption,
  'data-testid': testId
}) => {
  const usesCatalog = field.dataSource?.type === 'CATALOG'
  const usesEntity = field.dataSource?.type === 'ENTITY'
  const usesCustomData = field.dataSource?.type === 'CUSTOM_DATA'
  const canUseCatalog = field.type === InputType.SELECT || field.type === InputType.MULTISELECT
  const canUseExternalSource = canUseCatalog
  const showSourcePicker = canUseExternalSource

  const source: OptionsSource = usesCatalog
    ? 'catalog'
    : usesEntity
      ? 'entity'
      : usesCustomData
        ? 'custom_data'
        : 'manual'

  const sourceDescription =
    source === 'catalog'
      ? 'Options are loaded from a reference catalog.'
      : source === 'entity'
        ? 'Options are loaded from an entity type.'
        : source === 'custom_data'
          ? 'Options are loaded from custom data sources.'
          : 'Options are defined manually in this form.'

  const setSource = (next: OptionsSource) => {
    if (next === 'manual') {
      onChange({ ...field, dataSource: undefined })
      return
    }
    if (next === 'catalog') {
      onChange({
        ...field,
        options: undefined,
        dataSource: {
          type: 'CATALOG',
          catalog: field.dataSource?.type === 'CATALOG' ? field.dataSource.catalog : '',
          valueField: field.dataSource?.valueField ?? 'code',
          labelField: field.dataSource?.labelField ?? 'value'
        } as DataSource
      })
      return
    }
    if (next === 'entity') {
      onChange({
        ...field,
        options: undefined,
        dataSource: {
          type: 'ENTITY',
          entity: field.dataSource?.type === 'ENTITY' ? field.dataSource.entity : '',
          valueField: field.dataSource?.valueField ?? 'id',
          labelField: field.dataSource?.labelField ?? 'displayName'
        } as DataSource
      })
      return
    }
    // custom_data
    onChange({
      ...field,
      options: undefined,
      dataSource: {
        type: 'CUSTOM_DATA',
        namespace: field.dataSource?.type === 'CUSTOM_DATA' ? field.dataSource.namespace : 'default',
        key: field.dataSource?.type === 'CUSTOM_DATA' ? field.dataSource.key : '',
        valueField: field.dataSource?.valueField ?? 'code',
        labelField: field.dataSource?.labelField ?? 'value'
      } as DataSource
    })
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-2">
      {showSourcePicker ? (
        <>
          <Label className="gba:text-[10px] gba:font-medium gba:text-muted-foreground">Options source</Label>
          <div className="gba:grid gba:grid-cols-2 gba:gap-2" data-testid={`${testId}-${index}-options-source`}>
            {(
              [
                { id: 'manual' as const, Icon: List, title: 'Manual', desc: 'Enter the option list here.' },
                { id: 'catalog' as const, Icon: Database, title: 'Catalog', desc: 'Use reference data (recommended).' },
                { id: 'entity' as const, Icon: Database, title: 'Entity', desc: 'Use an entity type as source.' },
                {
                  id: 'custom_data' as const,
                  Icon: Database,
                  title: 'Custom data',
                  desc: 'Use namespace-scoped custom data.'
                }
              ] satisfies Array<{
                id: OptionsSource
                Icon: React.FC<{ className?: string }>
                title: string
                desc: string
              }>
            ).map(opt => {
              const selected = source === opt.id
              return (
                <Button
                  key={opt.id}
                  type="button"
                  variant="outline"
                  onClick={() => setSource(opt.id)}
                  className={[
                    'gba:h-auto gba:py-3 gba:px-3 gba:justify-start gba:items-start gba:flex gba:flex-col gba:gap-1 gba:bg-background',
                    selected ? 'gba:border-primary gba:ring-1 gba:ring-ring' : 'gba:border-border'
                  ].join(' ')}
                  data-testid={`${testId}-${index}-options-source-${opt.id}`}
                >
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <opt.Icon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                    <span className="gba:text-xs gba:font-semibold gba:text-foreground">{opt.title}</span>
                  </div>
                  <span className="gba:text-[11px] gba:text-muted-foreground gba:line-clamp-2">{opt.desc}</span>
                </Button>
              )
            })}
          </div>
          <p className="gba:text-xs gba:text-muted-foreground" data-testid={`${testId}-${index}-options-source-desc`}>
            {sourceDescription}
          </p>
        </>
      ) : (
        <Label className="gba:text-[10px] gba:font-medium gba:text-muted-foreground">Options</Label>
      )}

      {source === 'catalog' ? (
        <CatalogSourceSection
          field={field}
          catalogs={catalogs}
          catalogsLoading={catalogsLoading}
          catalogsError={catalogsError}
          catalogsHasMore={catalogsHasMore}
          onSearchCatalogs={searchCatalogs}
          onLoadMoreCatalogs={loadMoreCatalogs}
          showFieldMapping={mode === 'advanced'}
          index={index}
          onChange={onChange}
          testId={testId}
        />
      ) : source === 'entity' ? (
        <EntitySourceSection
          field={field}
          entities={entities}
          entitiesLoading={entitiesLoading}
          entitiesError={entitiesError}
          showFieldMapping={mode === 'advanced'}
          index={index}
          onChange={onChange}
          testId={testId}
        />
      ) : source === 'custom_data' ? (
        <CustomDataSourceSection
          field={field}
          namespaces={customDataNamespaces}
          namespacesLoading={customDataNamespacesLoading}
          keysByNamespace={customDataKeysByNamespace}
          keysLoadingByNamespace={customDataKeysLoadingByNamespace}
          fetchKeys={fetchCustomDataKeys}
          showFieldMapping={mode === 'advanced'}
          index={index}
          onChange={onChange}
          testId={testId}
        />
      ) : (
        <>
          <Label className="gba:text-[10px] gba:font-medium gba:text-muted-foreground">Options</Label>
          {(field.options ?? []).map((opt, oi) => (
            <div key={`opt-${oi}`} className="gba:flex gba:items-center gba:gap-1.5">
              <Input
                value={opt.label}
                onChange={e => onUpdateOption(oi, { label: e.target.value })}
                placeholder="Label"
                className="gba:flex-1"
                data-testid={`${testId}-${index}-opt-label-${oi}`}
              />
              <Input
                value={opt.value}
                onChange={e => onUpdateOption(oi, { value: e.target.value })}
                placeholder="Value"
                className="gba:w-24"
                data-testid={`${testId}-${index}-opt-value-${oi}`}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveOption(oi)}
                data-testid={`${testId}-${index}-opt-remove-${oi}`}
              >
                <X className="gba:h-3 gba:w-3" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={onAddOption} data-testid={`${testId}-${index}-opt-add`}>
            <Plus className="gba:h-3 gba:w-3 gba:mr-1" />
            Add option
          </Button>
        </>
      )}
    </div>
  )
}
