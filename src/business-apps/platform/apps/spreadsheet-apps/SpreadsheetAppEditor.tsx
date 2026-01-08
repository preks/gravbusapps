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
  DialogFooter
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
import { APP_ICONS, getIconByName, DEFAULT_APP_ICON, getIconCategories, getIconsByCategory } from './utils/appIcons'
import type { EntityDataSource } from './types/entityDataSource'
import type { SpreadsheetApp, SpreadsheetSheet, SpreadsheetColumn, SheetView, ViewType } from './types'

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
  const [app, setApp] = useState<SpreadsheetApp>(initialApp)
  const [activeSheetId, setActiveSheetId] = useState(app.sheets[0]?.id || '')
  const [isSaving, setIsSaving] = useState(false)
  const [editingColumn, setEditingColumn] = useState<SpreadsheetColumn | null>(null)
  const [isAddViewDialogOpen, setIsAddViewDialogOpen] = useState(false)
  const [isDataSourceDialogOpen, setIsDataSourceDialogOpen] = useState(false)
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false)

  // Get active sheet
  const activeSheet = useMemo(
    () => app.sheets.find(s => s.id === activeSheetId) || app.sheets[0],
    [app.sheets, activeSheetId]
  )

  /**
   * Update app property
   */
  const updateApp = useCallback(<K extends keyof SpreadsheetApp>(key: K, value: SpreadsheetApp[K]) => {
    setApp(prev => ({ ...prev, [key]: value }))
  }, [])

  /**
   * Update sheet property
   */
  const updateSheet = useCallback(
    <K extends keyof SpreadsheetSheet>(sheetId: string, key: K, value: SpreadsheetSheet[K]) => {
      setApp(prev => ({
        ...prev,
        sheets: prev.sheets.map(sheet => (sheet.id === sheetId ? { ...sheet, [key]: value } : sheet))
      }))
    },
    []
  )

  /**
   * Update column
   */
  const updateColumn = useCallback((sheetId: string, column: SpreadsheetColumn) => {
    setApp(prev => ({
      ...prev,
      sheets: prev.sheets.map(sheet =>
        sheet.id === sheetId
          ? {
              ...sheet,
              columns: sheet.columns.map(col => (col.id === column.id ? column : col))
            }
          : sheet
      )
    }))
    setEditingColumn(null)
  }, [])

  /**
   * Move column up/down
   */
  const moveColumn = useCallback((sheetId: string, columnId: string, direction: 'up' | 'down') => {
    setApp(prev => ({
      ...prev,
      sheets: prev.sheets.map(sheet => {
        if (sheet.id !== sheetId) return sheet

        const columns = [...sheet.columns]
        const index = columns.findIndex(c => c.id === columnId)

        if ((direction === 'up' && index <= 0) || (direction === 'down' && index >= columns.length - 1)) {
          return sheet
        }

        const newIndex = direction === 'up' ? index - 1 : index + 1
        const [removed] = columns.splice(index, 1)
        columns.splice(newIndex, 0, removed)

        // Update order property
        columns.forEach((col, i) => {
          col.order = i
        })

        return { ...sheet, columns }
      })
    }))
  }, [])

  /**
   * Toggle column visibility
   */
  const toggleColumnVisibility = useCallback((sheetId: string, columnId: string) => {
    setApp(prev => ({
      ...prev,
      sheets: prev.sheets.map(sheet =>
        sheet.id === sheetId
          ? {
              ...sheet,
              columns: sheet.columns.map(col => (col.id === columnId ? { ...col, isVisible: !col.isVisible } : col))
            }
          : sheet
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
        label: 'New Column',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        order: activeSheet?.columns.length || 0
      }

      setApp(prev => ({
        ...prev,
        sheets: prev.sheets.map(sheet =>
          sheet.id === sheetId ? { ...sheet, columns: [...sheet.columns, newColumn] } : sheet
        )
      }))

      setEditingColumn(newColumn)
    },
    [activeSheet]
  )

  /**
   * Delete column
   */
  const deleteColumn = useCallback((sheetId: string, columnId: string) => {
    setApp(prev => ({
      ...prev,
      sheets: prev.sheets.map(sheet =>
        sheet.id === sheetId ? { ...sheet, columns: sheet.columns.filter(col => col.id !== columnId) } : sheet
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

      setApp(prev => ({
        ...prev,
        sheets: prev.sheets.map(sheet =>
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
    setApp(prev => ({
      ...prev,
      sheets: prev.sheets.map(sheet => {
        if (sheet.id !== sheetId) return sheet
        const views = sheet.views.filter(v => v.id !== viewId)
        // Ensure at least one default view
        if (views.length > 0 && !views.some(v => v.isDefault)) {
          views[0].isDefault = true
        }
        return { ...sheet, views }
      })
    }))
  }, [])

  /**
   * Set default view
   */
  const setDefaultView = useCallback((sheetId: string, viewId: string) => {
    setApp(prev => ({
      ...prev,
      sheets: prev.sheets.map(sheet =>
        sheet.id === sheetId
          ? {
              ...sheet,
              views: sheet.views.map(view => ({
                ...view,
                isDefault: view.id === viewId
              }))
            }
          : sheet
      )
    }))
  }, [])

  /**
   * Update entity data source for a sheet
   */
  const updateEntityDataSource = useCallback((sheetId: string, dataSource: EntityDataSource | undefined) => {
    setApp(prev => ({
      ...prev,
      sheets: prev.sheets.map(sheet => (sheet.id === sheetId ? { ...sheet, entityDataSource: dataSource } : sheet))
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
              Cancel
            </Button>
            <Separator orientation="vertical" className="gba:h-6" />
            <div className="gba:flex gba:items-center gba:gap-3">
              <div className="gba:w-10 gba:h-10 gba:rounded-xl gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
                {(() => {
                  const IconComponent = app.icon ? getIconByName(app.icon) : null
                  return IconComponent ? (
                    <IconComponent className="gba:w-5 gba:h-5 gba:text-primary" />
                  ) : (
                    <DEFAULT_APP_ICON className="gba:w-5 gba:h-5 gba:text-primary" />
                  )
                })()}
              </div>
              <Input
                value={app.name}
                onChange={e => updateApp('name', e.target.value)}
                className="gba:text-lg gba:font-semibold gba:border-none gba:bg-transparent gba:p-0 gba:h-auto gba:focus:ring-0"
                placeholder="App Name"
              />
            </div>
          </div>

          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="gba:w-4 gba:h-4 gba:mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="gba:flex-1 gba:flex gba:overflow-hidden">
        {/* Sidebar - Sheet selector */}
        <div className="gba:w-64 gba:border-r gba:bg-muted/30 gba:p-4 gba:space-y-4">
          <div className="gba:flex gba:items-center gba:justify-between">
            <h3 className="gba:font-medium gba:text-foreground">Sheets</h3>
            <Badge variant="secondary">{app.sheets.length}</Badge>
          </div>

          <div className="gba:space-y-2">
            {app.sheets.map(sheet => (
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
                    {sheet.columns.length} cols
                  </Badge>
                </div>
              </button>
            ))}
          </div>

          <Separator />

          {/* App Settings */}
          <div className="gba:space-y-4">
            <h3 className="gba:font-medium gba:text-foreground">App Settings</h3>

            <div className="gba:space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={app.description || ''}
                onChange={e => updateApp('description', e.target.value)}
                placeholder="App description"
              />
            </div>

            <div className="gba:space-y-2">
              <Label>Icon</Label>
              <Button
                variant="outline"
                className="gba:w-full gba:justify-start gba:gap-3"
                onClick={() => setIsIconPickerOpen(true)}
              >
                {app.icon ? (
                  (() => {
                    const IconComponent = getIconByName(app.icon)
                    return IconComponent ? (
                      <IconComponent className="gba:w-5 gba:h-5 gba:text-primary" />
                    ) : (
                      <DEFAULT_APP_ICON className="gba:w-5 gba:h-5 gba:text-muted-foreground" />
                    )
                  })()
                ) : (
                  <DEFAULT_APP_ICON className="gba:w-5 gba:h-5 gba:text-muted-foreground" />
                )}
                <span className="gba:text-sm">
                  {app.icon ? APP_ICONS.find(i => i.name === app.icon)?.name || 'Select icon' : 'Select icon'}
                </span>
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
                  Columns
                </TabsTrigger>
                <TabsTrigger value="datasource">
                  <Database className="gba:w-4 gba:h-4 gba:mr-2" />
                  Data Source
                  {activeSheet.entityDataSource?.enabled && (
                    <Badge variant="default" className="gba:ml-2 gba:h-5 gba:px-1.5">
                      <RefreshCw className="gba:w-3 gba:h-3" />
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="views">
                  <LayoutDashboard className="gba:w-4 gba:h-4 gba:mr-2" />
                  Views
                </TabsTrigger>
                <TabsTrigger value="settings">
                  <Settings className="gba:w-4 gba:h-4 gba:mr-2" />
                  Settings
                </TabsTrigger>
              </TabsList>

              {/* Columns Tab */}
              <TabsContent value="columns" className="gba:space-y-4">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <div>
                    <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">Columns</h2>
                    <p className="gba:text-sm gba:text-muted-foreground">
                      Configure column types, visibility, and order
                    </p>
                  </div>
                  <Button onClick={() => addColumn(activeSheet.id)}>
                    <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
                    Add Column
                  </Button>
                </div>

                <Card className="gba:overflow-hidden">
                  <table className="gba:w-full">
                    <thead>
                      <tr className="gba:bg-muted/50">
                        <th className="gba:w-12 gba:px-4 gba:py-3"></th>
                        <th className="gba:px-4 gba:py-3 gba:text-left gba:text-xs gba:font-medium gba:text-muted-foreground">
                          Column
                        </th>
                        <th className="gba:px-4 gba:py-3 gba:text-left gba:text-xs gba:font-medium gba:text-muted-foreground">
                          Type
                        </th>
                        <th className="gba:px-4 gba:py-3 gba:text-center gba:text-xs gba:font-medium gba:text-muted-foreground">
                          Required
                        </th>
                        <th className="gba:px-4 gba:py-3 gba:text-center gba:text-xs gba:font-medium gba:text-muted-foreground">
                          Visible
                        </th>
                        <th className="gba:w-32 gba:px-4 gba:py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeSheet.columns
                        .sort((a, b) => a.order - b.order)
                        .map((column, index) => (
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
                                <Badge variant="default">Yes</Badge>
                              ) : (
                                <span className="gba:text-muted-foreground">No</span>
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
                    <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">Data Source</h2>
                    <p className="gba:text-sm gba:text-muted-foreground">
                      Connect this sheet to real data from your NEWWORK system
                    </p>
                  </div>
                  {!activeSheet.entityDataSource && (
                    <Button onClick={() => setIsDataSourceDialogOpen(true)}>
                      <Database className="gba:w-4 gba:h-4 gba:mr-2" />
                      Connect Entity
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
                            Entity: {activeSheet.entityDataSource.entityType}
                          </p>
                        </div>
                      </div>
                      <div className="gba:flex gba:gap-2">
                        <Button variant="outline" size="sm" onClick={() => setIsDataSourceDialogOpen(true)}>
                          <Pencil className="gba:w-4 gba:h-4 gba:mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeEntityDataSource(activeSheet.id)}
                          className="gba:text-destructive gba:hover:text-destructive"
                        >
                          <Unplug className="gba:w-4 gba:h-4 gba:mr-1" />
                          Disconnect
                        </Button>
                      </div>
                    </div>

                    <Separator className="gba:my-4" />

                    <div className="gba:grid gba:grid-cols-2 gba:md:grid-cols-4 gba:gap-4">
                      <div>
                        <p className="gba:text-sm gba:text-muted-foreground">Filters</p>
                        <p className="gba:font-medium gba:text-foreground">
                          {activeSheet.entityDataSource.filters.conditions.filter(c => c.isActive).length} active
                        </p>
                      </div>
                      <div>
                        <p className="gba:text-sm gba:text-muted-foreground">Fields</p>
                        <p className="gba:font-medium gba:text-foreground">
                          {activeSheet.entityDataSource.fieldMappings.filter(f => f.include).length} selected
                        </p>
                      </div>
                      <div>
                        <p className="gba:text-sm gba:text-muted-foreground">Limit</p>
                        <p className="gba:font-medium gba:text-foreground">
                          {activeSheet.entityDataSource.limit > 0
                            ? activeSheet.entityDataSource.limit.toLocaleString()
                            : 'No limit'}
                        </p>
                      </div>
                      <div>
                        <p className="gba:text-sm gba:text-muted-foreground">Refresh Mode</p>
                        <p className="gba:font-medium gba:text-foreground gba:capitalize">
                          {activeSheet.entityDataSource.refreshMode.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                      </div>
                    </div>

                    {activeSheet.entityDataSource.lastSyncAt && (
                      <>
                        <Separator className="gba:my-4" />
                        <div className="gba:flex gba:items-center gba:justify-between gba:text-sm">
                          <span className="gba:text-muted-foreground">
                            Last synced: {new Date(activeSheet.entityDataSource.lastSyncAt).toLocaleString()}
                          </span>
                          {activeSheet.entityDataSource.lastSyncCount !== undefined && (
                            <Badge variant="secondary">{activeSheet.entityDataSource.lastSyncCount} records</Badge>
                          )}
                        </div>
                      </>
                    )}

                    {activeSheet.entityDataSource.lastSyncError && (
                      <div className="gba:mt-4 gba:p-3 gba:rounded-lg gba:bg-destructive/10 gba:text-destructive gba:text-sm">
                        Last sync error: {activeSheet.entityDataSource.lastSyncError}
                      </div>
                    )}

                    {/* Filter conditions preview */}
                    {activeSheet.entityDataSource.filters.conditions.filter(c => c.isActive).length > 0 && (
                      <>
                        <Separator className="gba:my-4" />
                        <div>
                          <h4 className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-2 gba:flex gba:items-center gba:gap-2">
                            <Filter className="gba:w-4 gba:h-4" />
                            Active Filters
                          </h4>
                          <div className="gba:flex gba:flex-wrap gba:gap-2">
                            {activeSheet.entityDataSource.filters.conditions
                              .filter(c => c.isActive)
                              .map(condition => (
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
                    <h3 className="gba:font-semibold gba:text-foreground gba:mb-2">No Data Source Connected</h3>
                    <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">
                      Connect this sheet to an entity from your NEWWORK system to load real data. You can filter by
                      status, type, owner, and more.
                    </p>
                    <Button onClick={() => setIsDataSourceDialogOpen(true)}>
                      <Database className="gba:w-4 gba:h-4 gba:mr-2" />
                      Connect Entity
                    </Button>
                  </Card>
                )}
              </TabsContent>

              {/* Views Tab */}
              <TabsContent value="views" className="gba:space-y-4">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <div>
                    <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">Views</h2>
                    <p className="gba:text-sm gba:text-muted-foreground">Configure how data is displayed</p>
                  </div>
                  <Button onClick={() => setIsAddViewDialogOpen(true)}>
                    <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
                    Add View
                  </Button>
                </div>

                <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-4">
                  {activeSheet.views.map(view => (
                    <Card key={view.id} className="gba:p-4">
                      <div className="gba:flex gba:items-start gba:justify-between gba:mb-3">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Badge variant="secondary" className="gba:capitalize">
                            {view.type}
                          </Badge>
                          {view.isDefault && <Badge variant="default">Default</Badge>}
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
                  <h2 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-4">Sheet Settings</h2>
                  <Card className="gba:p-6 gba:space-y-4">
                    <div className="gba:flex gba:items-center gba:justify-between">
                      <div>
                        <p className="gba:font-medium gba:text-foreground">Allow Adding Rows</p>
                        <p className="gba:text-sm gba:text-muted-foreground">Users can add new records</p>
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
                        <p className="gba:font-medium gba:text-foreground">Allow Editing</p>
                        <p className="gba:text-sm gba:text-muted-foreground">Users can modify existing records</p>
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
                        <p className="gba:font-medium gba:text-foreground">Allow Deletion</p>
                        <p className="gba:text-sm gba:text-muted-foreground">Users can delete records</p>
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
                        <p className="gba:font-medium gba:text-foreground">Allow Export</p>
                        <p className="gba:text-sm gba:text-muted-foreground">Users can export data to Excel</p>
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
                        <p className="gba:font-medium gba:text-foreground">Show Row Numbers</p>
                        <p className="gba:text-sm gba:text-muted-foreground">Display row index numbers</p>
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
              availableSheets={app.sheets.map(s => ({
                id: s.id,
                name: s.name,
                columns: s.columns.map(c => ({ id: c.id, name: c.name }))
              }))}
              onSave={column => updateColumn(activeSheet!.id, column)}
              onCancel={() => setEditingColumn(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Add View Dialog */}
      <AddViewDialog
        isOpen={isAddViewDialogOpen}
        onClose={() => setIsAddViewDialogOpen(false)}
        onAdd={(type, name) => addView(activeSheet!.id, type, name)}
      />

      {/* Entity Data Source Dialog */}
      <EntityDataSourceDialog
        isOpen={isDataSourceDialogOpen}
        onClose={() => setIsDataSourceDialogOpen(false)}
        dataSource={activeSheet?.entityDataSource || null}
        onSave={dataSource => {
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
            <DialogTitle>Select App Icon</DialogTitle>
          </DialogHeader>

          <div className="gba:flex-1 gba:overflow-y-auto gba:py-4">
            {/* Group icons by category */}
            {getIconCategories().map(category => (
              <div key={category} className="gba:mb-6">
                <h4 className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-3">{category}</h4>
                <div className="gba:grid gba:grid-cols-8 gba:gap-2">
                  {getIconsByCategory(category).map(iconConfig => {
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
              Cancel
            </Button>
            {app.icon && (
              <Button
                variant="destructive"
                onClick={() => {
                  updateApp('icon', '')
                  setIsIconPickerOpen(false)
                }}
              >
                Clear Icon
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
  const [viewType, setViewType] = useState<ViewType>('table')
  const [viewName, setViewName] = useState('')

  const viewTypes: Array<{ type: ViewType; label: string; description: string }> = [
    { type: 'table', label: 'Table', description: 'Spreadsheet-like data grid' },
    { type: 'form', label: 'Form Cards', description: 'Card-based record display' },
    { type: 'dashboard', label: 'Dashboard', description: 'Charts and KPIs' },
    { type: 'kanban', label: 'Kanban', description: 'Column-based board' },
    { type: 'calendar', label: 'Calendar', description: 'Date-based view' }
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
          <DialogTitle>Add New View</DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4 gba:py-4">
          <div className="gba:space-y-2">
            <Label htmlFor="viewName">View Name</Label>
            <Input
              id="viewName"
              value={viewName}
              onChange={e => setViewName(e.target.value)}
              placeholder="My Custom View"
            />
          </div>

          <div className="gba:space-y-2">
            <Label>View Type</Label>
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
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!viewName.trim()}>
            Add View
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
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
    case 'kanban':
      const statusCol = columns.find(c => c.type === 'select')
      const titleCol = columns.find(c => c.type === 'text')
      return {
        type: 'kanban',
        statusColumn: statusCol?.id || '',
        titleColumn: titleCol?.id || ''
      }
    case 'calendar':
      const dateCol = columns.find(c => ['date', 'datetime'].includes(c.type))
      const nameCol = columns.find(c => c.type === 'text')
      return {
        type: 'calendar',
        dateColumn: dateCol?.id || '',
        titleColumn: nameCol?.id || ''
      }
    default:
      return { type }
  }
}
