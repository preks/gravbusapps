/**
 * SpreadsheetAppEditor Component
 *
 * A visual low-code editor for customizing spreadsheet apps.
 * Allows editing columns, views, settings, and app metadata.
 */

import React, { useState, useCallback, useMemo } from 'react'
import {
  Card,
  Button,
  Input,
  Label,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Switch,
  Separator,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  useTranslation
} from '@newwork/nw-design-system'
import {
  Save,
  X,
  Plus,
  Trash2,
  GripVertical,
  Eye,
  EyeOff,
  Settings,
  Columns,
  LayoutDashboard,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Pencil,
  Database,
  RefreshCw,
  Filter,
  Unplug
} from 'lucide-react'
import { ColumnTypeEditor } from './components/ColumnTypeEditor'
import { EntityDataSourceDialog } from './components/EntityDataSourceDialog'
import {
  APP_ICONS,
  getIconByName,
  DEFAULT_APP_ICON,
  getIconCategories,
  getIconsByCategory,
  type AppIconConfig
} from './utils/appIcons'
import type { EntityDataSource, EntityFilterCondition, EntityFieldMapping } from './types/entityDataSource'
import type { SpreadsheetApp, SpreadsheetSheet, SpreadsheetColumn, SheetView, ViewType } from './types'
import translations from './_i18n'

const DefaultAppIcon = DEFAULT_APP_ICON

export interface SpreadsheetAppEditorProps {
  app: SpreadsheetApp
  onSave: (app: SpreadsheetApp) => Promise<void>
  onCancel: () => void
  accessToken?: string
  userId?: string
  'data-testid'?: string
}

/**
 * SpreadsheetAppEditor Component
 */
export const SpreadsheetAppEditor: React.FC<SpreadsheetAppEditorProps> = ({
  app: initialApp,
  onSave,
  onCancel,
  accessToken = '',
  userId,
  'data-testid': testId = 'spreadsheet-app-editor'
}) => {
  const { t } = useTranslation(translations)
  const [app, setApp] = useState<SpreadsheetApp>(initialApp)
  const [activeSheetId, setActiveSheetId] = useState(app.sheets[0]?.id || '')
  const [isSaving, setIsSaving] = useState(false)
  const [editingColumn, setEditingColumn] = useState<SpreadsheetColumn | null>(null)
  const [isAddViewDialogOpen, setIsAddViewDialogOpen] = useState(false)
  const [isDataSourceDialogOpen, setIsDataSourceDialogOpen] = useState(false)
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false)

  // Get active sheet
  const activeSheet = useMemo(
    () => app.sheets.find((s: SpreadsheetSheet) => s.id === activeSheetId) || app.sheets[0],
    [app.sheets, activeSheetId]
  )

  const AppIconComponent = useMemo(() => (app.icon ? getIconByName(app.icon) : null), [app.icon])
  const iconButtonLabel = useMemo(() => {
    if (!app.icon) return t('settings-select-icon')
    return APP_ICONS.find((i: AppIconConfig) => i.name === app.icon)?.name ?? t('settings-select-icon')
  }, [app.icon, t])

  /**
   * Update app property
   */
  const updateApp = useCallback(<K extends keyof SpreadsheetApp>(key: K, value: SpreadsheetApp[K]) => {
    setApp((prev: SpreadsheetApp) => ({ ...prev, [key]: value }))
  }, [])

  /**
   * Update sheet property
   */
  const updateSheet = useCallback(
    <K extends keyof SpreadsheetSheet>(sheetId: string, key: K, value: SpreadsheetSheet[K]) => {
      setApp((prev: SpreadsheetApp) => ({
        ...prev,
        sheets: prev.sheets.map((sheet: SpreadsheetSheet) =>
          sheet.id === sheetId ? { ...sheet, [key]: value } : sheet
        )
      }))
    },
    []
  )

  /**
   * Update column
   */
  const updateColumn = useCallback((sheetId: string, column: SpreadsheetColumn) => {
    setApp((prev: SpreadsheetApp) => ({
      ...prev,
      sheets: prev.sheets.map((sheet: SpreadsheetSheet) =>
        sheet.id === sheetId ? { ...sheet, columns: replaceColumnInList(sheet.columns, column) } : sheet
      )
    }))
    setEditingColumn(null)
  }, [])

  /**
   * Move column up/down
   */
  const moveColumn = useCallback((sheetId: string, columnId: string, direction: 'up' | 'down') => {
    setApp((prev: SpreadsheetApp) => ({
      ...prev,
      sheets: prev.sheets.map((sheet: SpreadsheetSheet) =>
        sheet.id === sheetId ? reorderColumnInSheet(sheet, columnId, direction) : sheet
      )
    }))
  }, [])

  /**
   * Toggle column visibility
   */
  const toggleColumnVisibility = useCallback((sheetId: string, columnId: string) => {
    setApp((prev: SpreadsheetApp) => ({
      ...prev,
      sheets: prev.sheets.map((sheet: SpreadsheetSheet) =>
        sheet.id === sheetId ? { ...sheet, columns: toggleVisibilityInColumns(sheet.columns, columnId) } : sheet
      )
    }))
  }, [])

  /**
   * Add new column
   */
  const addColumn = useCallback(
    (sheetId: string) => {
      const newColumn: SpreadsheetColumn = {
        id: `col_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        name: `new_column_${Date.now()}`,
        label: t('editor-new-column-label'),
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        order: activeSheet?.columns.length || 0
      }

      setApp((prev: SpreadsheetApp) => ({
        ...prev,
        sheets: prev.sheets.map((sheet: SpreadsheetSheet) =>
          sheet.id === sheetId ? { ...sheet, columns: [...sheet.columns, newColumn] } : sheet
        )
      }))

      setEditingColumn(newColumn)
    },
    [activeSheet, t]
  )

  /**
   * Delete column
   */
  const deleteColumn = useCallback((sheetId: string, columnId: string) => {
    setApp((prev: SpreadsheetApp) => ({
      ...prev,
      sheets: prev.sheets.map((sheet: SpreadsheetSheet) =>
        sheet.id === sheetId ? { ...sheet, columns: removeColumnById(sheet.columns, columnId) } : sheet
      )
    }))
  }, [])

  /**
   * Add new view
   */
  const addView = useCallback(
    (sheetId: string, viewType: ViewType, name: string) => {
      const newView: SheetView = {
        id: `view_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        name,
        type: viewType,
        isDefault: false,
        config: getDefaultViewConfig(viewType, activeSheet?.columns || [])
      }

      setApp((prev: SpreadsheetApp) => ({
        ...prev,
        sheets: prev.sheets.map((sheet: SpreadsheetSheet) =>
          sheet.id === sheetId ? { ...sheet, views: [...sheet.views, newView] } : sheet
        )
      }))

      setIsAddViewDialogOpen(false)
    },
    [activeSheet]
  )

  /**
   * Delete view
   */
  const deleteView = useCallback((sheetId: string, viewId: string) => {
    setApp((prev: SpreadsheetApp) => ({
      ...prev,
      sheets: prev.sheets.map((sheet: SpreadsheetSheet) =>
        sheet.id === sheetId ? removeViewFromSheet(sheet, viewId) : sheet
      )
    }))
  }, [])

  /**
   * Set default view
   */
  const setDefaultView = useCallback((sheetId: string, viewId: string) => {
    setApp((prev: SpreadsheetApp) => ({
      ...prev,
      sheets: prev.sheets.map((sheet: SpreadsheetSheet) =>
        sheet.id === sheetId ? { ...sheet, views: applyDefaultView(sheet.views, viewId) } : sheet
      )
    }))
  }, [])

  /**
   * Update entity data source for a sheet
   */
  const updateEntityDataSource = useCallback((sheetId: string, dataSource: EntityDataSource | undefined) => {
    setApp((prev: SpreadsheetApp) => ({
      ...prev,
      sheets: prev.sheets.map((sheet: SpreadsheetSheet) =>
        sheet.id === sheetId ? { ...sheet, entityDataSource: dataSource } : sheet
      )
    }))
  }, [])

  /**
   * Remove entity data source from a sheet
   */
  const removeEntityDataSource = useCallback(
    (sheetId: string) => {
      updateEntityDataSource(sheetId, undefined)
    },
    [updateEntityDataSource]
  )

  /**
   * Handle save
   */
  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      await onSave(app)
    } finally {
      setIsSaving(false)
    }
  }, [app, onSave])

  return (
    <div className="gba:flex gba:flex-col gba:h-full" data-testid={testId}>
      {/* Header */}
      <div className="gba:border-b gba:bg-card gba:px-6 gba:py-4">
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-4">
            <Button variant="ghost" onClick={onCancel}>
              <X className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('checkpoint-cancel')}
            </Button>
            <Separator orientation="vertical" className="gba:h-6" />
            <div className="gba:flex gba:items-center gba:gap-3">
              <div className="gba:w-10 gba:h-10 gba:rounded-xl gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
                {AppIconComponent ? (
                  <AppIconComponent className="gba:w-5 gba:h-5 gba:text-primary" />
                ) : (
                  <DefaultAppIcon className="gba:w-5 gba:h-5 gba:text-primary" />
                )}
              </div>
              <Input
                value={app.name}
                onChange={e => updateApp('name', e.target.value)}
                className="gba:text-lg gba:font-semibold gba:border-none gba:bg-transparent gba:p-0 gba:h-auto gba:focus:ring-0"
                placeholder={t('editor-app-name-placeholder')}
              />
            </div>
          </div>

          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="gba:w-4 gba:h-4 gba:mr-2" />
            {isSaving ? t('checkpoint-saving') : t('editor-save-changes')}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="gba:flex-1 gba:flex gba:overflow-hidden">
        {/* Sidebar - Sheet selector */}
        <div className="gba:w-64 gba:border-r gba:bg-muted/30 gba:p-4 gba:space-y-4">
          <div className="gba:flex gba:items-center gba:justify-between">
            <h3 className="gba:font-medium gba:text-foreground">{t('editor-sheets')}</h3>
            <Badge variant="secondary">{app.sheets.length}</Badge>
          </div>

          <div className="gba:space-y-2">
            {app.sheets.map((sheet: SpreadsheetSheet) => (
              <button
                key={sheet.id}
                type="button"
                className={`gba:w-full gba:text-left gba:px-3 gba:py-2 gba:rounded-lg gba:transition-colors ${
                  sheet.id === activeSheetId
                    ? 'gba:bg-primary/10 gba:text-primary'
                    : 'gba:text-foreground gba:hover:bg-muted'
                }`}
                onClick={() => setActiveSheetId(sheet.id)}
              >
                <div className="gba:flex gba:items-center gba:justify-between">
                  <span className="gba:font-medium">{sheet.name}</span>
                  <Badge variant="outline" className="gba:text-xs">
                    {t('settings-cols-count', { count: sheet.columns.length })}
                  </Badge>
                </div>
              </button>
            ))}
          </div>

          <Separator />

          {/* App Settings */}
          <div className="gba:space-y-4">
            <h3 className="gba:font-medium gba:text-foreground">{t('settings-app-settings')}</h3>

            <div className="gba:space-y-2">
              <Label htmlFor="description">{t('settings-description')}</Label>
              <Input
                id="description"
                value={app.description || ''}
                onChange={e => updateApp('description', e.target.value)}
                placeholder={t('settings-description-placeholder')}
              />
            </div>

            <div className="gba:space-y-2">
              <Label>{t('settings-icon')}</Label>
              <Button
                variant="outline"
                className="gba:w-full gba:justify-start gba:gap-3"
                onClick={() => setIsIconPickerOpen(true)}
              >
                {AppIconComponent ? (
                  <AppIconComponent className="gba:w-5 gba:h-5 gba:text-primary" />
                ) : (
                  <DefaultAppIcon className="gba:w-5 gba:h-5 gba:text-muted-foreground" />
                )}
                <span className="gba:text-sm">{iconButtonLabel}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Main editor area */}
        <div className="gba:flex-1 gba:overflow-auto gba:p-6">
          {activeSheet && (
            <Tabs defaultValue="columns" className="gba:space-y-6">
              <TabsList>
                <TabsTrigger value="columns">
                  <Columns className="gba:w-4 gba:h-4 gba:mr-2" />
                  {t('settings-columns-tab')}
                </TabsTrigger>
                <TabsTrigger value="datasource">
                  <Database className="gba:w-4 gba:h-4 gba:mr-2" />
                  {t('settings-datasource-tab')}
                  {activeSheet.entityDataSource?.enabled && (
                    <Badge variant="default" className="gba:ml-2 gba:h-5 gba:px-1.5">
                      <RefreshCw className="gba:w-3 gba:h-3" />
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="views">
                  <LayoutDashboard className="gba:w-4 gba:h-4 gba:mr-2" />
                  {t('settings-views-tab')}
                </TabsTrigger>
                <TabsTrigger value="settings">
                  <Settings className="gba:w-4 gba:h-4 gba:mr-2" />
                  {t('settings-settings-tab')}
                </TabsTrigger>
              </TabsList>

              {/* Columns Tab */}
              <TabsContent value="columns" className="gba:space-y-4">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <div>
                    <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">{t('settings-columns-title')}</h2>
                    <p className="gba:text-sm gba:text-muted-foreground">{t('settings-columns-desc')}</p>
                  </div>
                  <Button onClick={() => addColumn(activeSheet.id)}>
                    <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
                    {t('add-column-title')}
                  </Button>
                </div>

                <Card className="gba:overflow-hidden">
                  <table className="gba:w-full">
                    <thead>
                      <tr className="gba:bg-muted/50">
                        <th className="gba:w-12 gba:px-4 gba:py-3"></th>
                        <th className="gba:px-4 gba:py-3 gba:text-left gba:text-xs gba:font-medium gba:text-muted-foreground">
                          {t('settings-column-header')}
                        </th>
                        <th className="gba:px-4 gba:py-3 gba:text-left gba:text-xs gba:font-medium gba:text-muted-foreground">
                          {t('settings-type-header')}
                        </th>
                        <th className="gba:px-4 gba:py-3 gba:text-center gba:text-xs gba:font-medium gba:text-muted-foreground">
                          {t('settings-required-header')}
                        </th>
                        <th className="gba:px-4 gba:py-3 gba:text-center gba:text-xs gba:font-medium gba:text-muted-foreground">
                          {t('settings-visible-header')}
                        </th>
                        <th className="gba:w-32 gba:px-4 gba:py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...activeSheet.columns]
                        .sort((a: SpreadsheetColumn, b: SpreadsheetColumn) => a.order - b.order)
                        .map((column: SpreadsheetColumn, index: number) => (
                          <tr key={column.id} className="gba:border-t gba:border-border">
                            <td className="gba:px-4 gba:py-3">
                              <div className="gba:flex gba:flex-col gba:items-center gba:gap-1">
                                <button
                                  type="button"
                                  className="gba:p-1 gba:rounded gba:hover:bg-muted gba:disabled:opacity-30"
                                  disabled={index === 0}
                                  onClick={() => moveColumn(activeSheet.id, column.id, 'up')}
                                >
                                  <ChevronUp className="gba:w-4 gba:h-4" />
                                </button>
                                <GripVertical className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                                <button
                                  type="button"
                                  className="gba:p-1 gba:rounded gba:hover:bg-muted gba:disabled:opacity-30"
                                  disabled={index === activeSheet.columns.length - 1}
                                  onClick={() => moveColumn(activeSheet.id, column.id, 'down')}
                                >
                                  <ChevronDown className="gba:w-4 gba:h-4" />
                                </button>
                              </div>
                            </td>
                            <td className="gba:px-4 gba:py-3">
                              <div>
                                <p className="gba:font-medium gba:text-foreground">{column.label}</p>
                                <p className="gba:text-xs gba:text-muted-foreground">{column.name}</p>
                              </div>
                            </td>
                            <td className="gba:px-4 gba:py-3">
                              <Badge variant="secondary" className="gba:capitalize">
                                {column.type}
                              </Badge>
                            </td>
                            <td className="gba:px-4 gba:py-3 gba:text-center">
                              {column.isRequired ? (
                                <Badge variant="default">{t('settings-yes')}</Badge>
                              ) : (
                                <span className="gba:text-muted-foreground">{t('settings-no')}</span>
                              )}
                            </td>
                            <td className="gba:px-4 gba:py-3 gba:text-center">
                              <button
                                type="button"
                                onClick={() => toggleColumnVisibility(activeSheet.id, column.id)}
                                className="gba:p-2 gba:rounded gba:hover:bg-muted"
                              >
                                {column.isVisible ? (
                                  <Eye className="gba:w-4 gba:h-4 gba:text-success" />
                                ) : (
                                  <EyeOff className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                                )}
                              </button>
                            </td>
                            <td className="gba:px-4 gba:py-3">
                              <div className="gba:flex gba:items-center gba:gap-1 gba:justify-end">
                                <Button variant="ghost" size="sm" onClick={() => setEditingColumn(column)}>
                                  <Pencil className="gba:w-4 gba:h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteColumn(activeSheet.id, column.id)}
                                >
                                  <Trash2 className="gba:w-4 gba:h-4 gba:text-destructive" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </Card>
              </TabsContent>

              {/* Data Source Tab */}
              <TabsContent value="datasource" className="gba:space-y-4">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <div>
                    <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">
                      {t('settings-datasource-title')}
                    </h2>
                    <p className="gba:text-sm gba:text-muted-foreground">{t('settings-datasource-desc')}</p>
                  </div>
                  {!activeSheet.entityDataSource && (
                    <Button onClick={() => setIsDataSourceDialogOpen(true)}>
                      <Database className="gba:w-4 gba:h-4 gba:mr-2" />
                      {t('settings-connect-entity')}
                    </Button>
                  )}
                </div>

                {activeSheet.entityDataSource ? (
                  <Card className="gba:p-6">
                    <div className="gba:flex gba:items-start gba:justify-between gba:mb-4">
                      <div className="gba:flex gba:items-center gba:gap-3">
                        <div className="gba:w-12 gba:h-12 gba:rounded-xl gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
                          <Database className="gba:w-6 gba:h-6 gba:text-primary" />
                        </div>
                        <div>
                          <h3 className="gba:font-semibold gba:text-foreground">
                            {activeSheet.entityDataSource.entityDisplayName}
                          </h3>
                          <p className="gba:text-sm gba:text-muted-foreground">
                            {t('editor-entity-label', { entity: activeSheet.entityDataSource.entityType })}
                          </p>
                        </div>
                      </div>
                      <div className="gba:flex gba:gap-2">
                        <Button variant="outline" size="sm" onClick={() => setIsDataSourceDialogOpen(true)}>
                          <Pencil className="gba:w-4 gba:h-4 gba:mr-1" />
                          {t('settings-edit')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeEntityDataSource(activeSheet.id)}
                          className="gba:text-destructive gba:hover:text-destructive"
                        >
                          <Unplug className="gba:w-4 gba:h-4 gba:mr-1" />
                          {t('settings-disconnect')}
                        </Button>
                      </div>
                    </div>

                    <Separator className="gba:my-4" />

                    <div className="gba:grid gba:grid-cols-2 gba:md:grid-cols-4 gba:gap-4">
                      <div>
                        <p className="gba:text-sm gba:text-muted-foreground">{t('editor-filters')}</p>
                        <p className="gba:font-medium gba:text-foreground">
                          {
                            activeSheet.entityDataSource.filters.conditions.filter(
                              (c: EntityFilterCondition) => c.isActive
                            ).length
                          }{' '}
                          {t('editor-active')}
                        </p>
                      </div>
                      <div>
                        <p className="gba:text-sm gba:text-muted-foreground">{t('editor-fields')}</p>
                        <p className="gba:font-medium gba:text-foreground">
                          {
                            activeSheet.entityDataSource.fieldMappings.filter((f: EntityFieldMapping) => f.include)
                              .length
                          }{' '}
                          {t('editor-selected')}
                        </p>
                      </div>
                      <div>
                        <p className="gba:text-sm gba:text-muted-foreground">{t('editor-limit')}</p>
                        <p className="gba:font-medium gba:text-foreground">
                          {activeSheet.entityDataSource.limit > 0
                            ? activeSheet.entityDataSource.limit.toLocaleString()
                            : t('editor-no-limit')}
                        </p>
                      </div>
                      <div>
                        <p className="gba:text-sm gba:text-muted-foreground">{t('editor-refresh-mode')}</p>
                        <p className="gba:font-medium gba:text-foreground gba:capitalize">
                          {activeSheet.entityDataSource.refreshMode
                            .split(/(?=[A-Z])/)
                            .join(' ')
                            .trim()}
                        </p>
                      </div>
                    </div>

                    {activeSheet.entityDataSource.lastSyncAt && (
                      <>
                        <Separator className="gba:my-4" />
                        <div className="gba:flex gba:items-center gba:justify-between gba:text-sm">
                          <span className="gba:text-muted-foreground">
                            {t('editor-last-synced', {
                              date: new Date(activeSheet.entityDataSource.lastSyncAt).toLocaleString()
                            })}
                          </span>
                          {activeSheet.entityDataSource.lastSyncCount !== undefined && (
                            <Badge variant="secondary">
                              {t('editor-records', { count: activeSheet.entityDataSource.lastSyncCount })}
                            </Badge>
                          )}
                        </div>
                      </>
                    )}

                    {activeSheet.entityDataSource.lastSyncError && (
                      <div className="gba:mt-4 gba:p-3 gba:rounded-lg gba:bg-destructive/10 gba:text-destructive gba:text-sm">
                        {t('editor-last-sync-error', { error: activeSheet.entityDataSource.lastSyncError })}
                      </div>
                    )}

                    {/* Filter conditions preview */}
                    {activeSheet.entityDataSource.filters.conditions.some((c: EntityFilterCondition) => c.isActive) && (
                      <>
                        <Separator className="gba:my-4" />
                        <div>
                          <h4 className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-2 gba:flex gba:items-center gba:gap-2">
                            <Filter className="gba:w-4 gba:h-4" />
                            {t('editor-active-filters')}
                          </h4>
                          <div className="gba:flex gba:flex-wrap gba:gap-2">
                            {activeSheet.entityDataSource.filters.conditions
                              .filter((c: EntityFilterCondition) => c.isActive)
                              .map((condition: EntityFilterCondition) => (
                                <Badge key={condition.id} variant="outline" className="gba:font-normal">
                                  {condition.fieldLabel} {condition.operator} {String(condition.value)}
                                </Badge>
                              ))}
                          </div>
                        </div>
                      </>
                    )}
                  </Card>
                ) : (
                  <Card className="gba:p-8 gba:text-center">
                    <Database className="gba:w-12 gba:h-12 gba:mx-auto gba:mb-4 gba:text-muted-foreground/50" />
                    <h3 className="gba:font-semibold gba:text-foreground gba:mb-2">{t('settings-no-datasource')}</h3>
                    <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">{t('settings-no-datasource-desc')}</p>
                    <Button onClick={() => setIsDataSourceDialogOpen(true)}>
                      <Database className="gba:w-4 gba:h-4 gba:mr-2" />
                      {t('settings-connect-entity')}
                    </Button>
                  </Card>
                )}
              </TabsContent>

              {/* Views Tab */}
              <TabsContent value="views" className="gba:space-y-4">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <div>
                    <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">{t('settings-views-title')}</h2>
                    <p className="gba:text-sm gba:text-muted-foreground">{t('settings-views-desc')}</p>
                  </div>
                  <Button onClick={() => setIsAddViewDialogOpen(true)}>
                    <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
                    {t('settings-add-view')}
                  </Button>
                </div>

                <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-4">
                  {activeSheet.views.map((view: SheetView) => (
                    <Card key={view.id} className="gba:p-4">
                      <div className="gba:flex gba:items-start gba:justify-between gba:mb-3">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Badge variant="secondary" className="gba:capitalize">
                            {view.type}
                          </Badge>
                          {view.isDefault && <Badge variant="default">{t('settings-default')}</Badge>}
                        </div>
                        <div className="gba:flex gba:gap-1">
                          {!view.isDefault && (
                            <Button variant="ghost" size="sm" onClick={() => setDefaultView(activeSheet.id, view.id)}>
                              <Sparkles className="gba:w-4 gba:h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteView(activeSheet.id, view.id)}
                            disabled={activeSheet.views.length <= 1}
                          >
                            <Trash2 className="gba:w-4 gba:h-4 gba:text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <h3 className="gba:font-medium gba:text-foreground">{view.name}</h3>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="gba:space-y-6">
                <div>
                  <h2 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-4">
                    {t('settings-sheet-settings')}
                  </h2>
                  <Card className="gba:p-6 gba:space-y-4">
                    <div className="gba:flex gba:items-center gba:justify-between">
                      <div>
                        <p className="gba:font-medium gba:text-foreground">{t('settings-allow-adding-rows')}</p>
                        <p className="gba:text-sm gba:text-muted-foreground">{t('settings-allow-adding-rows-desc')}</p>
                      </div>
                      <Switch
                        checked={activeSheet.settings.allowAdd}
                        onCheckedChange={checked =>
                          updateSheet(activeSheet.id, 'settings', {
                            ...activeSheet.settings,
                            allowAdd: checked
                          })
                        }
                      />
                    </div>

                    <Separator />

                    <div className="gba:flex gba:items-center gba:justify-between">
                      <div>
                        <p className="gba:font-medium gba:text-foreground">{t('settings-allow-editing')}</p>
                        <p className="gba:text-sm gba:text-muted-foreground">{t('settings-allow-editing-desc')}</p>
                      </div>
                      <Switch
                        checked={activeSheet.settings.allowEdit}
                        onCheckedChange={checked =>
                          updateSheet(activeSheet.id, 'settings', {
                            ...activeSheet.settings,
                            allowEdit: checked
                          })
                        }
                      />
                    </div>

                    <Separator />

                    <div className="gba:flex gba:items-center gba:justify-between">
                      <div>
                        <p className="gba:font-medium gba:text-foreground">{t('settings-allow-deletion')}</p>
                        <p className="gba:text-sm gba:text-muted-foreground">{t('settings-allow-deletion-desc')}</p>
                      </div>
                      <Switch
                        checked={activeSheet.settings.allowDelete}
                        onCheckedChange={checked =>
                          updateSheet(activeSheet.id, 'settings', {
                            ...activeSheet.settings,
                            allowDelete: checked
                          })
                        }
                      />
                    </div>

                    <Separator />

                    <div className="gba:flex gba:items-center gba:justify-between">
                      <div>
                        <p className="gba:font-medium gba:text-foreground">{t('settings-allow-export')}</p>
                        <p className="gba:text-sm gba:text-muted-foreground">{t('settings-allow-export-desc')}</p>
                      </div>
                      <Switch
                        checked={activeSheet.settings.allowExport}
                        onCheckedChange={checked =>
                          updateSheet(activeSheet.id, 'settings', {
                            ...activeSheet.settings,
                            allowExport: checked
                          })
                        }
                      />
                    </div>

                    <Separator />

                    <div className="gba:flex gba:items-center gba:justify-between">
                      <div>
                        <p className="gba:font-medium gba:text-foreground">{t('settings-show-row-numbers')}</p>
                        <p className="gba:text-sm gba:text-muted-foreground">{t('settings-show-row-numbers-desc')}</p>
                      </div>
                      <Switch
                        checked={activeSheet.settings.showRowNumbers}
                        onCheckedChange={checked =>
                          updateSheet(activeSheet.id, 'settings', {
                            ...activeSheet.settings,
                            showRowNumbers: checked
                          })
                        }
                      />
                    </div>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {/* Column Editor Dialog */}
      {editingColumn && (
        <Dialog open={!!editingColumn} onOpenChange={() => setEditingColumn(null)}>
          <DialogContent className="gba:max-w-2xl">
            <ColumnTypeEditor
              column={editingColumn}
              availableSheets={app.sheets.map((s: SpreadsheetSheet) => ({
                id: s.id,
                name: s.name,
                columns: s.columns.map((c: SpreadsheetColumn) => ({ id: c.id, name: c.name }))
              }))}
              onSave={(column: SpreadsheetColumn) => updateColumn(activeSheet.id, column)}
              onCancel={() => setEditingColumn(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Add View Dialog */}
      <AddViewDialog
        isOpen={isAddViewDialogOpen}
        onClose={() => setIsAddViewDialogOpen(false)}
        onAdd={(type, name) => addView(activeSheet.id, type, name)}
      />

      {/* Entity Data Source Dialog */}
      <EntityDataSourceDialog
        isOpen={isDataSourceDialogOpen}
        onClose={() => setIsDataSourceDialogOpen(false)}
        dataSource={activeSheet?.entityDataSource || null}
        onSave={(dataSource: EntityDataSource) => {
          if (activeSheet) {
            updateEntityDataSource(activeSheet.id, dataSource)
          }
          setIsDataSourceDialogOpen(false)
        }}
        accessToken={accessToken}
        userId={userId}
        data-testid={`${testId}-data-source-dialog`}
      />

      {/* Icon Picker Dialog */}
      <Dialog open={isIconPickerOpen} onOpenChange={setIsIconPickerOpen}>
        <DialogContent className="gba:max-w-2xl gba:max-h-[80vh] gba:flex gba:flex-col">
          <DialogHeader>
            <DialogTitle>{t('editor-select-app-icon')}</DialogTitle>
          </DialogHeader>

          <div className="gba:flex-1 gba:overflow-y-auto gba:py-4">
            {/* Group icons by category */}
            {getIconCategories().map((category: string) => (
              <div key={category} className="gba:mb-6">
                <h4 className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-3">{category}</h4>
                <div className="gba:grid gba:grid-cols-8 gba:gap-2">
                  {getIconsByCategory(category).map((iconConfig: AppIconConfig) => {
                    const IconComponent = iconConfig.icon
                    const isSelected = app.icon === iconConfig.name
                    return (
                      <button
                        key={iconConfig.name}
                        type="button"
                        className={`gba:p-3 gba:rounded-lg gba:transition-all gba:border gba:flex gba:items-center gba:justify-center ${
                          isSelected
                            ? 'gba:bg-primary gba:text-primary-foreground gba:border-primary'
                            : 'gba:bg-background gba:hover:bg-muted gba:border-border gba:text-foreground'
                        }`}
                        onClick={() => {
                          updateApp('icon', iconConfig.name)
                          setIsIconPickerOpen(false)
                        }}
                        title={iconConfig.name}
                      >
                        <IconComponent className="gba:w-5 gba:h-5" />
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsIconPickerOpen(false)}>
              {t('checkpoint-cancel')}
            </Button>
            {app.icon && (
              <Button
                variant="destructive"
                onClick={() => {
                  updateApp('icon', '')
                  setIsIconPickerOpen(false)
                }}
              >
                {t('editor-clear-icon')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/**
 * Add View Dialog Component
 */
interface AddViewDialogProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (type: ViewType, name: string) => void
}

const AddViewDialog: React.FC<AddViewDialogProps> = ({ isOpen, onClose, onAdd }) => {
  const { t } = useTranslation(translations)
  const [viewType, setViewType] = useState<ViewType>('table')
  const [viewName, setViewName] = useState('')

  const viewTypes: Array<{ type: ViewType; label: string; description: string }> = [
    { type: 'table', label: t('editor-view-type-table'), description: t('editor-view-type-table-desc') },
    { type: 'form', label: t('editor-view-type-form'), description: t('editor-view-type-form-desc') },
    {
      type: 'dashboard',
      label: t('editor-view-type-dashboard'),
      description: t('editor-view-type-dashboard-desc')
    },
    { type: 'kanban', label: t('editor-view-type-kanban'), description: t('editor-view-type-kanban-desc') },
    { type: 'calendar', label: t('editor-view-type-calendar'), description: t('editor-view-type-calendar-desc') }
  ]

  const handleAdd = () => {
    if (viewName.trim()) {
      onAdd(viewType, viewName.trim())
      setViewName('')
      setViewType('table')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('editor-add-new-view')}</DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4 gba:py-4">
          <div className="gba:space-y-2">
            <Label htmlFor="viewName">{t('editor-view-name')}</Label>
            <Input
              id="viewName"
              value={viewName}
              onChange={e => setViewName(e.target.value)}
              placeholder={t('editor-view-name-placeholder')}
            />
          </div>

          <div className="gba:space-y-2">
            <Label>{t('editor-view-type')}</Label>
            <div className="gba:grid gba:grid-cols-2 gba:gap-2">
              {viewTypes.map(vt => (
                <button
                  key={vt.type}
                  type="button"
                  className={`gba:p-3 gba:text-left gba:rounded-lg gba:border gba:transition-colors ${
                    viewType === vt.type
                      ? 'gba:border-primary gba:bg-primary/5'
                      : 'gba:border-border gba:hover:bg-muted/50'
                  }`}
                  onClick={() => setViewType(vt.type)}
                >
                  <p className="gba:font-medium gba:text-foreground">{vt.label}</p>
                  <p className="gba:text-xs gba:text-muted-foreground">{vt.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('checkpoint-cancel')}
          </Button>
          <Button onClick={handleAdd} disabled={!viewName.trim()}>
            {t('settings-add-view')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function replaceColumnInList(columns: SpreadsheetColumn[], targetColumn: SpreadsheetColumn): SpreadsheetColumn[] {
  return columns.map(col => (col.id === targetColumn.id ? targetColumn : col))
}

function reorderColumnInSheet(sheet: SpreadsheetSheet, columnId: string, direction: 'up' | 'down'): SpreadsheetSheet {
  const columns = [...sheet.columns]
  const index = columns.findIndex(c => c.id === columnId)

  if ((direction === 'up' && index <= 0) || (direction === 'down' && index >= columns.length - 1)) {
    return sheet
  }

  const newIndex = direction === 'up' ? index - 1 : index + 1
  const [removed] = columns.splice(index, 1)
  columns.splice(newIndex, 0, removed)

  columns.forEach((col, i) => {
    col.order = i
  })

  return { ...sheet, columns }
}

function toggleVisibilityInColumns(columns: SpreadsheetColumn[], columnId: string): SpreadsheetColumn[] {
  return columns.map(col => (col.id === columnId ? { ...col, isVisible: !col.isVisible } : col))
}

function removeColumnById(columns: SpreadsheetColumn[], columnId: string): SpreadsheetColumn[] {
  return columns.filter(col => col.id !== columnId)
}

function removeViewFromSheet(sheet: SpreadsheetSheet, viewId: string): SpreadsheetSheet {
  const views = sheet.views.filter(v => v.id !== viewId)
  if (views.length > 0 && !views.some(v => v.isDefault)) {
    views[0].isDefault = true
  }
  return { ...sheet, views }
}

function applyDefaultView(views: SheetView[], viewId: string): SheetView[] {
  return views.map(view => ({
    ...view,
    isDefault: view.id === viewId
  }))
}

/**
 * Get default view configuration for a type
 */
function getDefaultViewConfig(type: ViewType, columns: SpreadsheetColumn[]): any {
  switch (type) {
    case 'table':
      return {
        type: 'table',
        columns: columns.map(c => c.id)
      }
    case 'form':
      return {
        type: 'form',
        fields: columns.map(c => c.id),
        layout: 'single'
      }
    case 'dashboard':
      return {
        type: 'dashboard',
        widgets: []
      }
    case 'kanban': {
      const statusCol = columns.find(c => c.type === 'select')
      const titleCol = columns.find(c => c.type === 'text')
      return {
        type: 'kanban',
        statusColumn: statusCol?.id || '',
        titleColumn: titleCol?.id || ''
      }
    }
    case 'calendar': {
      const dateCol = columns.find(c => ['date', 'datetime'].includes(c.type))
      const nameCol = columns.find(c => c.type === 'text')
      return {
        type: 'calendar',
        dateColumn: dateCol?.id || '',
        titleColumn: nameCol?.id || ''
      }
    }
    default:
      return { type }
  }
}
