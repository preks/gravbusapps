/**
 * EntityDataSourceDialog Component
 *
 * A dialog for configuring entity data sources for spreadsheet sheets.
 * Allows selecting entities, configuring filters, and mapping fields.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Checkbox,
  Separator,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  ScrollArea,
  useTranslation
} from '@newwork/nw-design-system'
import {
  Database,
  Plus,
  Trash2,
  RefreshCw,
  Filter,
  Columns,
  Settings,
  Search,
  Building2,
  Users,
  Target,
  Briefcase,
  FileText,
  DollarSign,
  Check,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { useEntityDataSource } from '../hooks/useEntityDataSource'
import type {
  EntityDataSource,
  EntityFilterCondition,
  EntityFilterGroup,
  EntitySortConfig,
  EntityFieldMapping,
  EntityFilterOperator
} from '../types/entityDataSource'
import translations from '../_i18n'

/**
 * Props for EntityDataSourceDialog
 */
export interface EntityDataSourceDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean
  /** Callback when dialog should close */
  onClose: () => void
  /** Current data source configuration (null for new) */
  dataSource: EntityDataSource | null
  /** Callback when configuration is saved */
  onSave: (dataSource: EntityDataSource) => void
  /** Access token for API calls */
  accessToken: string
  /** Current user ID */
  userId?: string
  /** Test ID for testing */
  'data-testid'?: string
}

/**
 * Entity icon mapping
 */
const ENTITY_ICONS: Record<string, React.ElementType> = {
  account: Building2,
  lead: Target,
  contact: Users,
  opportunity: Briefcase,
  employee: Users,
  invoice: FileText,
  expense: DollarSign,
  default: Database
}

/**
 * Get icon for entity type
 */
function getEntityIcon(entityType: string): React.ElementType {
  const lowerType = entityType.toLowerCase()
  return ENTITY_ICONS[lowerType] || ENTITY_ICONS.default
}

/**
 * Filter operators with labels
 */
const FILTER_OPERATORS: Array<{ value: EntityFilterOperator; label: string; description: string }> = [
  { value: 'eq', label: 'Equals', description: 'Exact match' },
  { value: 'neq', label: 'Not Equals', description: 'Does not equal' },
  { value: 'gt', label: 'Greater Than', description: 'Numeric/date greater than' },
  { value: 'gte', label: 'Greater or Equal', description: 'Greater than or equal to' },
  { value: 'lt', label: 'Less Than', description: 'Numeric/date less than' },
  { value: 'lte', label: 'Less or Equal', description: 'Less than or equal to' },
  { value: 'in', label: 'In List', description: 'Value is in array' },
  { value: 'ilike', label: 'Contains', description: 'Case-insensitive contains' },
  { value: 'isNull', label: 'Is Empty', description: 'Field is null/empty' },
  { value: 'isNotNull', label: 'Is Not Empty', description: 'Field has value' }
]

/**
 * EntityDataSourceDialog Component
 */
export const EntityDataSourceDialog: React.FC<EntityDataSourceDialogProps> = ({
  isOpen,
  onClose,
  dataSource: initialDataSource,
  onSave,
  accessToken,
  userId,
  'data-testid': testId = 'entity-data-source-dialog'
}) => {
  const { t } = useTranslation(translations)
  // Hook for entity data
  const {
    availableEntities,
    isLoadingEntities,
    entitiesError,
    fetchAvailableEntities,
    getEntityFields,
    loadData,
    state: loadState
  } = useEntityDataSource({ accessToken, userId })

  // Local state
  const [activeTab, setActiveTab] = useState('entity')
  const [selectedEntityType, setSelectedEntityType] = useState<string>('')
  const [filters, setFilters] = useState<EntityFilterGroup>({
    id: 'root',
    logic: 'AND',
    conditions: []
  })
  const [orderBy, setOrderBy] = useState<EntitySortConfig[]>([])
  const [limit, setLimit] = useState(100)
  const [fieldMappings, setFieldMappings] = useState<EntityFieldMapping[]>([])
  const [refreshMode, setRefreshMode] = useState<'manual' | 'onOpen'>('onOpen')
  const [searchQuery, setSearchQuery] = useState('')
  const [previewCount, setPreviewCount] = useState<number | null>(null)

  // Selected entity fields
  const selectedEntityFields = useMemo(() => {
    if (!selectedEntityType) return []
    return getEntityFields(selectedEntityType)
  }, [selectedEntityType, getEntityFields])

  // Filtered entity fields for search
  const filteredFields = useMemo(() => {
    if (!searchQuery.trim()) return selectedEntityFields
    const query = searchQuery.toLowerCase()
    return selectedEntityFields.filter(
      f => f.name.toLowerCase().includes(query) || f.displayName.toLowerCase().includes(query)
    )
  }, [selectedEntityFields, searchQuery])

  // Initialize from existing data source
  useEffect(() => {
    if (initialDataSource) {
      setSelectedEntityType(initialDataSource.entityType)
      setFilters(initialDataSource.filters)
      setOrderBy(initialDataSource.orderBy)
      setLimit(initialDataSource.limit)
      setFieldMappings(initialDataSource.fieldMappings)
      setRefreshMode(initialDataSource.refreshMode === 'periodic' ? 'manual' : initialDataSource.refreshMode)
    } else {
      // Reset to defaults
      setSelectedEntityType('')
      setFilters({
        id: 'root',
        logic: 'AND',
        conditions: [
          {
            id: 'default-not-deleted',
            field: 'isDeleted',
            fieldLabel: 'Is Deleted',
            operator: 'eq',
            value: false,
            isActive: true
          }
        ]
      })
      setOrderBy([{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])
      setLimit(100)
      setFieldMappings([])
      setRefreshMode('onOpen')
    }
  }, [initialDataSource, isOpen])

  // Fetch entities when dialog opens
  useEffect(() => {
    if (isOpen && availableEntities.length === 0) {
      fetchAvailableEntities()
    }
  }, [isOpen, availableEntities.length, fetchAvailableEntities]) // fetchAvailableEntities is stable from hook

  // Auto-generate field mappings when entity is selected
  useEffect(() => {
    if (selectedEntityType && fieldMappings.length === 0) {
      const entity = availableEntities.find(e => e.type === selectedEntityType)
      if (entity) {
        const mappings: EntityFieldMapping[] = entity.fields
          .filter(f => !['array', 'object'].includes(f.type))
          .slice(0, 20) // Limit initial fields
          .map(f => ({
            entityField: f.name,
            entityFieldLabel: f.displayName,
            entityFieldType: f.type as EntityFieldMapping['entityFieldType'],
            columnId: null,
            include: true
          }))
        setFieldMappings(mappings)
      }
    }
  }, [selectedEntityType, availableEntities, fieldMappings.length])

  /**
   * Add a new filter condition
   */
  const addFilterCondition = useCallback(() => {
    if (selectedEntityFields.length === 0) return

    const firstField = selectedEntityFields[0]
    const newCondition: EntityFilterCondition = {
      id: `cond_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      field: firstField.name,
      fieldLabel: firstField.displayName,
      operator: 'eq',
      value: '',
      isActive: true
    }

    setFilters(prev => ({
      ...prev,
      conditions: [...prev.conditions, newCondition]
    }))
  }, [selectedEntityFields])

  /**
   * Update a filter condition
   */
  const updateFilterCondition = useCallback((conditionId: string, updates: Partial<EntityFilterCondition>) => {
    setFilters(prev => ({
      ...prev,
      conditions: prev.conditions.map(c => (c.id === conditionId ? { ...c, ...updates } : c))
    }))
  }, [])

  /**
   * Remove a filter condition
   */
  const removeFilterCondition = useCallback((conditionId: string) => {
    setFilters(prev => ({
      ...prev,
      conditions: prev.conditions.filter(c => c.id !== conditionId)
    }))
  }, [])

  /**
   * Toggle field inclusion
   */
  const toggleFieldInclusion = useCallback((fieldName: string) => {
    setFieldMappings(prev => prev.map(m => (m.entityField === fieldName ? { ...m, include: !m.include } : m)))
  }, [])

  /**
   * Add sort configuration
   */
  const addSortConfig = useCallback(() => {
    if (selectedEntityFields.length === 0) return

    const firstField = selectedEntityFields[0]
    setOrderBy(prev => [...prev, { field: firstField.name, direction: 'ASC_NULLS_LAST' }])
  }, [selectedEntityFields])

  /**
   * Remove sort configuration
   */
  const removeSortConfig = useCallback((index: number) => {
    setOrderBy(prev => prev.filter((_, i) => i !== index))
  }, [])

  /**
   * Update sort configuration at index
   */
  const updateSortConfigAtIndex = useCallback((index: number, updates: Partial<EntitySortConfig>) => {
    setOrderBy(prev => prev.map((s, i) => (i === index ? { ...s, ...updates } : s)))
  }, [])

  /**
   * Preview data with current configuration
   */
  const handlePreview = useCallback(async () => {
    if (!selectedEntityType) return

    const entity = availableEntities.find(e => e.type === selectedEntityType)
    if (!entity) return

    const tempDataSource: EntityDataSource = {
      id: 'preview',
      enabled: true,
      entityType: selectedEntityType,
      entityDisplayName: entity.displayName,
      filters,
      orderBy,
      limit: 5, // Just get a few for preview
      fieldMappings,
      refreshMode: 'manual',
      syncMode: 'replace'
    }

    const result = await loadData(tempDataSource)
    if (result) {
      setPreviewCount(result.total)
    }
  }, [selectedEntityType, availableEntities, filters, orderBy, fieldMappings, loadData])

  /**
   * Save configuration
   */
  const handleSave = useCallback(() => {
    if (!selectedEntityType) return

    const entity = availableEntities.find(e => e.type === selectedEntityType)
    if (!entity) return

    const dataSource: EntityDataSource = {
      id: initialDataSource?.id || `eds_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      enabled: true,
      entityType: selectedEntityType,
      entityDisplayName: entity.displayName,
      entityIcon: entity.icon,
      filters,
      orderBy,
      limit,
      fieldMappings: fieldMappings.filter(m => m.include),
      refreshMode,
      syncMode: 'replace'
    }

    onSave(dataSource)
    onClose()
  }, [
    selectedEntityType,
    availableEntities,
    initialDataSource,
    filters,
    orderBy,
    limit,
    fieldMappings,
    refreshMode,
    onSave,
    onClose
  ])

  return (
    <Dialog
      open={isOpen}
      onOpenChange={open => {
        if (open) return
        onClose()
      }}
    >
      <DialogContent
        className="gba:max-w-4xl gba:max-h-[85vh] gba:overflow-hidden gba:flex gba:flex-col"
        data-testid={testId}
      >
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Database className="gba:h-5 gba:w-5" />
            {t('entity-ds-title')}
          </DialogTitle>
          <DialogDescription>{t('entity-ds-description')}</DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="gba:flex-1 gba:overflow-hidden gba:flex gba:flex-col"
        >
          <TabsList className="gba:w-full gba:justify-start">
            <TabsTrigger value="entity" className="gba:gap-2">
              <Database className="gba:h-4 gba:w-4" />
              {t('entity-ds-tab-entity')}
            </TabsTrigger>
            <TabsTrigger value="filters" className="gba:gap-2" disabled={!selectedEntityType}>
              <Filter className="gba:h-4 gba:w-4" />
              {t('entity-ds-tab-filters')}
            </TabsTrigger>
            <TabsTrigger value="fields" className="gba:gap-2" disabled={!selectedEntityType}>
              <Columns className="gba:h-4 gba:w-4" />
              {t('entity-ds-tab-fields')}
            </TabsTrigger>
            <TabsTrigger value="settings" className="gba:gap-2" disabled={!selectedEntityType}>
              <Settings className="gba:h-4 gba:w-4" />
              {t('entity-ds-tab-settings')}
            </TabsTrigger>
          </TabsList>

          <div className="gba:flex-1 gba:overflow-hidden gba:mt-4">
            <ScrollArea className="gba:h-[50vh]">
              {/* Entity Selection Tab */}
              <TabsContent value="entity" className="gba:m-0 gba:pr-4">
                <div className="gba:space-y-4">
                  <div>
                    <Label className="gba:text-sm gba:font-medium">{t('entity-ds-select-entity-type')}</Label>
                    <p className="gba:text-sm gba:text-muted-foreground gba:mb-3">
                      {t('entity-ds-select-entity-help')}
                    </p>
                  </div>

                  {isLoadingEntities && (
                    <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
                      <Loader2 className="gba:h-6 gba:w-6 gba:animate-spin gba:text-muted-foreground" />
                      <span className="gba:ml-2 gba:text-muted-foreground">{t('entity-ds-loading-entities')}</span>
                    </div>
                  )}
                  {!isLoadingEntities && entitiesError && (
                    <div className="gba:text-center gba:py-8">
                      <AlertCircle className="gba:h-8 gba:w-8 gba:mx-auto gba:mb-2 gba:text-destructive" />
                      <p className="gba:text-destructive gba:font-medium gba:mb-1">{t('entity-ds-load-failed')}</p>
                      <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">{entitiesError}</p>
                      <Button variant="outline" size="sm" onClick={fetchAvailableEntities}>
                        <RefreshCw className="gba:h-4 gba:w-4 gba:mr-2" />
                        {t('action-retry')}
                      </Button>
                    </div>
                  )}
                  {!isLoadingEntities && !entitiesError && availableEntities.length > 0 && (
                    <div className="gba:grid gba:grid-cols-2 gba:gap-3">
                      {availableEntities.map(entity => {
                        const Icon = getEntityIcon(entity.type)
                        const isSelected = selectedEntityType === entity.type

                        const iconWrapperClass = isSelected
                          ? 'gba:p-2 gba:rounded-lg gba:bg-primary gba:text-primary-foreground'
                          : 'gba:p-2 gba:rounded-lg gba:bg-muted'
                        return (
                          <button
                            key={entity.type}
                            type="button"
                            onClick={() => {
                              setSelectedEntityType(entity.type)
                              setFieldMappings([])
                            }}
                            className={`gba:flex gba:items-start gba:gap-3 gba:p-4 gba:rounded-lg gba:border gba:text-left gba:transition-colors ${
                              isSelected
                                ? 'gba:border-primary gba:bg-primary/5'
                                : 'gba:border-border gba:hover:border-primary/50 gba:hover:bg-accent/50'
                            }`}
                            data-testid={`${testId}-entity-${entity.type}`}
                          >
                            <div className={iconWrapperClass}>
                              <Icon className="gba:h-5 gba:w-5" />
                            </div>
                            <div className="gba:flex-1 gba:min-w-0">
                              <div className="gba:flex gba:items-center gba:gap-2">
                                <span className="gba:font-medium">{entity.displayName}</span>
                                {isSelected && <Check className="gba:h-4 gba:w-4 gba:text-primary" />}
                              </div>
                              <p className="gba:text-sm gba:text-muted-foreground gba:truncate">
                                {entity.description ??
                                  t('entity-ds-fields-available', { count: entity.fields?.length ?? 0 })}
                              </p>
                              {entity.category && (
                                <Badge variant="secondary" className="gba:mt-1">
                                  {entity.category}
                                </Badge>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                  {!isLoadingEntities && !entitiesError && availableEntities.length === 0 && (
                    <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
                      <AlertCircle className="gba:h-8 gba:w-8 gba:mx-auto gba:mb-2" />
                      <p>{t('entity-ds-no-entities')}</p>
                      <Button variant="outline" size="sm" onClick={fetchAvailableEntities} className="gba:mt-2">
                        <RefreshCw className="gba:h-4 gba:w-4 gba:mr-2" />
                        {t('action-retry')}
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Filters Tab */}
              <TabsContent value="filters" className="gba:m-0 gba:pr-4">
                <div className="gba:space-y-4">
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <div>
                      <Label className="gba:text-sm gba:font-medium">{t('entity-ds-filter-conditions')}</Label>
                      <p className="gba:text-sm gba:text-muted-foreground">{t('entity-ds-filter-conditions-help')}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addFilterCondition}
                      data-testid={`${testId}-add-filter`}
                    >
                      <Plus className="gba:h-4 gba:w-4 gba:mr-1" />
                      {t('entity-ds-add-filter')}
                    </Button>
                  </div>

                  {/* Logic toggle */}
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <span className="gba:text-sm gba:text-muted-foreground">{t('entity-ds-match')}</span>
                    <Button
                      variant={filters.logic === 'AND' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilters(prev => ({ ...prev, logic: 'AND' }))}
                    >
                      {t('entity-ds-all')}
                    </Button>
                    <Button
                      variant={filters.logic === 'OR' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilters(prev => ({ ...prev, logic: 'OR' }))}
                    >
                      {t('entity-ds-any')}
                    </Button>
                    <span className="gba:text-sm gba:text-muted-foreground">{t('entity-ds-conditions')}</span>
                  </div>

                  <Separator />

                  {/* Filter conditions list */}
                  <div className="gba:space-y-3">
                    {filters.conditions.map(condition => (
                      <div
                        key={condition.id}
                        className="gba:flex gba:items-center gba:gap-2 gba:p-3 gba:border gba:rounded-lg gba:bg-card"
                      >
                        {/* Field selector */}
                        <Select
                          value={condition.field}
                          onValueChange={value => {
                            const field = selectedEntityFields.find(f => f.name === value)
                            updateFilterCondition(condition.id, {
                              field: value,
                              fieldLabel: field?.displayName || value
                            })
                          }}
                        >
                          <SelectTrigger className="gba:w-[180px]">
                            <SelectValue placeholder={t('entity-ds-select-field')} />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedEntityFields.map(field => (
                              <SelectItem key={field.name} value={field.name}>
                                {field.displayName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Operator selector */}
                        <Select
                          value={condition.operator}
                          onValueChange={value =>
                            updateFilterCondition(condition.id, {
                              operator: value as EntityFilterOperator
                            })
                          }
                        >
                          <SelectTrigger className="gba:w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FILTER_OPERATORS.map(op => (
                              <SelectItem key={op.value} value={op.value}>
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Value input (hidden for isNull/isNotNull) */}
                        {!['isNull', 'isNotNull'].includes(condition.operator) && (
                          <Input
                            value={String(condition.value || '')}
                            onChange={e =>
                              updateFilterCondition(condition.id, {
                                value: e.target.value
                              })
                            }
                            placeholder={t('entity-ds-value-placeholder')}
                            className="gba:flex-1"
                          />
                        )}

                        {/* Active toggle */}
                        <Checkbox
                          checked={condition.isActive}
                          onCheckedChange={checked =>
                            updateFilterCondition(condition.id, {
                              isActive: checked === true
                            })
                          }
                        />

                        {/* Remove button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFilterCondition(condition.id)}
                          className="gba:text-destructive gba:hover:text-destructive"
                        >
                          <Trash2 className="gba:h-4 gba:w-4" />
                        </Button>
                      </div>
                    ))}

                    {filters.conditions.length === 0 && (
                      <div className="gba:text-center gba:py-6 gba:text-muted-foreground gba:border gba:border-dashed gba:rounded-lg">
                        <Filter className="gba:h-8 gba:w-8 gba:mx-auto gba:mb-2 gba:opacity-50" />
                        <p>{t('entity-ds-no-filters')}</p>
                        <p className="gba:text-sm">{t('entity-ds-all-records-loaded')}</p>
                      </div>
                    )}
                  </div>

                  {/* Preview button */}
                  <div className="gba:flex gba:items-center gba:gap-4 gba:pt-2">
                    <Button variant="outline" onClick={handlePreview} disabled={loadState.isLoading}>
                      {loadState.isLoading ? (
                        <Loader2 className="gba:h-4 gba:w-4 gba:mr-2 gba:animate-spin" />
                      ) : (
                        <Search className="gba:h-4 gba:w-4 gba:mr-2" />
                      )}
                      {t('entity-ds-preview-results')}
                    </Button>
                    {previewCount !== null && (
                      <span className="gba:text-sm gba:text-muted-foreground">
                        {t('entity-ds-preview-match-count', { count: previewCount.toLocaleString() })}
                      </span>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Fields Tab */}
              <TabsContent value="fields" className="gba:m-0 gba:pr-4">
                <div className="gba:space-y-4">
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <div>
                      <Label className="gba:text-sm gba:font-medium">{t('entity-ds-field-selection')}</Label>
                      <p className="gba:text-sm gba:text-muted-foreground">{t('entity-ds-field-selection-help')}</p>
                    </div>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFieldMappings(prev => prev.map(m => ({ ...m, include: true })))}
                      >
                        {t('entity-ds-select-all')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFieldMappings(prev => prev.map(m => ({ ...m, include: false })))}
                      >
                        {t('entity-ds-deselect-all')}
                      </Button>
                    </div>
                  </div>

                  {/* Search */}
                  <div className="gba:relative">
                    <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:h-4 gba:w-4 gba:text-muted-foreground" />
                    <Input
                      placeholder={t('entity-ds-search-fields')}
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="gba:pl-9"
                    />
                  </div>

                  <Separator />

                  {/* Fields list */}
                  <div className="gba:space-y-2">
                    {fieldMappings.map(mapping => {
                      const isFiltered = searchQuery && filteredFields.every(f => f.name !== mapping.entityField)
                      if (isFiltered) return null

                      return (
                        <div
                          key={mapping.entityField}
                          className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:border gba:rounded-lg gba:bg-card"
                        >
                          <Checkbox
                            checked={mapping.include}
                            onCheckedChange={() => toggleFieldInclusion(mapping.entityField)}
                          />
                          <div className="gba:flex-1">
                            <div className="gba:font-medium">{mapping.entityFieldLabel}</div>
                            <div className="gba:text-sm gba:text-muted-foreground">{mapping.entityField}</div>
                          </div>
                          <Badge variant="secondary">{mapping.entityFieldType}</Badge>
                        </div>
                      )
                    })}

                    {fieldMappings.length === 0 && (
                      <div className="gba:text-center gba:py-6 gba:text-muted-foreground">
                        <Columns className="gba:h-8 gba:w-8 gba:mx-auto gba:mb-2 gba:opacity-50" />
                        <p>{t('entity-ds-no-fields')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="gba:m-0 gba:pr-4">
                <div className="gba:space-y-6">
                  {/* Limit */}
                  <div className="gba:space-y-2">
                    <Label>{t('entity-ds-maximum-records')}</Label>
                    <p className="gba:text-sm gba:text-muted-foreground">{t('entity-ds-maximum-records-help')}</p>
                    <Input
                      type="number"
                      value={limit}
                      onChange={e => setLimit(Number(e.target.value) || 0)}
                      min={0}
                      max={10000}
                      className="gba:w-32"
                    />
                  </div>

                  <Separator />

                  {/* Sort configuration */}
                  <div className="gba:space-y-3">
                    <div className="gba:flex gba:items-center gba:justify-between">
                      <div>
                        <Label>{t('entity-ds-sort-order')}</Label>
                        <p className="gba:text-sm gba:text-muted-foreground">{t('entity-ds-sort-order-help')}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={addSortConfig}>
                        <Plus className="gba:h-4 gba:w-4 gba:mr-1" />
                        {t('entity-ds-add-sort')}
                      </Button>
                    </div>

                    {orderBy.map((sort, index) => (
                      <div key={index} className="gba:flex gba:items-center gba:gap-2">
                        <Select
                          value={sort.field}
                          onValueChange={value => updateSortConfigAtIndex(index, { field: value })}
                        >
                          <SelectTrigger className="gba:flex-1">
                            <SelectValue placeholder={t('entity-ds-select-field')} />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedEntityFields.map(field => (
                              <SelectItem key={field.name} value={field.name}>
                                {field.displayName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={sort.direction}
                          onValueChange={value =>
                            updateSortConfigAtIndex(index, { direction: value as EntitySortConfig['direction'] })
                          }
                        >
                          <SelectTrigger className="gba:w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ASC_NULLS_LAST">{t('entity-ds-ascending')}</SelectItem>
                            <SelectItem value="DESC_NULLS_LAST">{t('entity-ds-descending')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSortConfig(index)}
                          className="gba:text-destructive"
                        >
                          <Trash2 className="gba:h-4 gba:w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Refresh mode */}
                  <div className="gba:space-y-2">
                    <Label>{t('entity-ds-data-refresh')}</Label>
                    <p className="gba:text-sm gba:text-muted-foreground">{t('entity-ds-data-refresh-help')}</p>
                    <Select value={refreshMode} onValueChange={value => setRefreshMode(value as 'manual' | 'onOpen')}>
                      <SelectTrigger className="gba:w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="onOpen">{t('entity-ds-refresh-on-open')}</SelectItem>
                        <SelectItem value="manual">{t('entity-ds-refresh-manual')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
          </div>
        </Tabs>

        <DialogFooter className="gba:mt-4">
          <Button variant="outline" onClick={onClose}>
            {t('checkpoint-cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!selectedEntityType} data-testid={`${testId}-save`}>
            <Database className="gba:h-4 gba:w-4 gba:mr-2" />
            {initialDataSource ? t('entity-ds-update-connection') : t('settings-connect-entity')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
