import React, { useState, useCallback, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  PageLayout,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Alert,
  AlertDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import {
  Database,
  Plus,
  FileSpreadsheet,
  Table2,
  Settings,
  ArrowLeft,
  Download,
  Rocket,
  Edit2,
  Sparkles,
  Link as LinkIcon
} from 'lucide-react'

import { useDefinitions } from './hooks/useDefinitions'
import { useSpreadsheetData } from './hooks/useSpreadsheetData'
import { useCustomDataClient } from './hooks/useCustomDataClient'
import { DefinitionsTable, BulkAction } from './components/DefinitionsTable'
import { DefinitionForm } from './components/DefinitionForm'
import { SpreadsheetGrid } from './components/SpreadsheetGrid'
import { SchemaPreview } from './components/SchemaPreview'
import { ImportExportDialog } from './components/ImportExportDialog'
import { PromoteDialog } from './components/PromoteDialog'
import { BulkActionDialog } from './components/BulkActionDialog'
import { AiSchemaGeneratorDialog } from './components/AiSchemaGeneratorDialog'
import { RelationshipManager } from './components/RelationshipManager'
import {
  CustomDataDefinition,
  CreateDefinitionDto,
  UpdateDefinitionDto,
  EntitySchemaProposal,
  BatchCreationResult,
  EntityRelationship
} from './types'

interface CustomDataManagerProps extends BusinessAppContextProps {
  'data-testid'?: string
}

/**
 * Custom Data Manager App
 * Manages custom data definitions (spreadsheets and entities)
 */
export const CustomDataManager: React.FC<CustomDataManagerProps> = ({
  accessToken,
  'data-testid': testId = 'custom-data-manager'
}) => {
  const client = useCustomDataClient(accessToken)

  // Namespace state
  const [currentNamespace, setCurrentNamespace] = useState<string>('default')
  const [availableNamespaces, setAvailableNamespaces] = useState<string[]>(['default'])

  // Definitions state
  const {
    definitions,
    isLoading: isLoadingDefinitions,
    error: definitionsError,
    selectedDefinition,
    selectDefinition,
    createDefinition,
    updateDefinition,
    refetch: refetchDefinitions,
    filterKind,
    setFilterKind
  } = useDefinitions(accessToken, currentNamespace)

  // Extract available namespaces from definitions
  useEffect(() => {
    const namespaces = [...new Set(definitions.map(d => d.namespace || 'default'))]
    setAvailableNamespaces(namespaces.length > 0 ? namespaces : ['default'])
  }, [definitions])

  // Spreadsheet data state (only when a definition is selected)
  const {
    rows,
    total: totalRows,
    isLoading: isLoadingRows,
    error: rowsError,
    page,
    pageSize,
    setPage,
    setPageSize,
    refetch: refetchRows,
    createRow,
    updateRow,
    deleteRow
  } = useSpreadsheetData(accessToken, selectedDefinition?.kind === 'SPREADSHEET' ? selectedDefinition.key : null)

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingDefinition, setEditingDefinition] = useState<CustomDataDefinition | null>(null)
  const [isImportExportOpen, setIsImportExportOpen] = useState(false)
  const [promoteDefinition, setPromoteDefinition] = useState<CustomDataDefinition | null>(null)
  const [isAiGeneratorOpen, setIsAiGeneratorOpen] = useState(false)

  // Bulk action state
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null)

  // Detail view tab
  const [detailTab, setDetailTab] = useState<'data' | 'schema' | 'relationships' | 'settings'>('data')

  // Reset detail tab when selected definition changes
  useEffect(() => {
    if (selectedDefinition) {
      // For ENTITY types, default to 'schema' tab since they don't have a 'data' tab
      // For SPREADSHEET types, default to 'data' tab
      setDetailTab(selectedDefinition.kind === 'SPREADSHEET' ? 'data' : 'schema')
    }
  }, [selectedDefinition?.id, selectedDefinition?.kind])

  // Handlers
  const handleCreateNew = useCallback(() => {
    setEditingDefinition(null)
    setIsFormOpen(true)
  }, [])

  const handleEdit = useCallback((definition: CustomDataDefinition) => {
    setEditingDefinition(definition)
    setIsFormOpen(true)
  }, [])

  const handleSaveDefinition = useCallback(
    async (dto: CreateDefinitionDto | UpdateDefinitionDto, id?: string, initialRows?: Record<string, any>[]) => {
      if (id) {
        await updateDefinition(id, dto as UpdateDefinitionDto)
      } else {
        const newDefinition = await createDefinition(dto as CreateDefinitionDto)

        // If initial rows are provided (from file import), import them
        if (initialRows && initialRows.length > 0 && newDefinition) {
          try {
            // Import rows in batches to avoid overwhelming the API
            const batchSize = 50
            for (let i = 0; i < initialRows.length; i += batchSize) {
              const batch = initialRows.slice(i, i + batchSize)
              await Promise.all(
                batch.map(rowValues => client.createSpreadsheetRow(newDefinition.key, { values: rowValues }))
              )
            }
          } catch (importError) {
            console.error('Failed to import initial rows:', importError)
            // Don't throw - definition was created, rows can be imported manually
          }
        }
      }
      await refetchDefinitions()
    },
    [createDefinition, updateDefinition, refetchDefinitions, client]
  )

  const handlePromote = useCallback(
    async (definitionId: string) => {
      const promoted = await client.promoteEntity(definitionId)
      await refetchDefinitions()
      if (selectedDefinition?.id === definitionId) {
        selectDefinition(promoted)
      }
      return promoted
    },
    [client, refetchDefinitions, selectedDefinition, selectDefinition]
  )

  const handleImportRows = useCallback(
    async (rowsToImport: Record<string, any>[]) => {
      for (const rowValues of rowsToImport) {
        await createRow(rowValues)
      }
      await refetchRows()
    },
    [createRow, refetchRows]
  )

  const handleBack = useCallback(() => {
    selectDefinition(null)
    setDetailTab('data')
  }, [selectDefinition])

  // Bulk action handler
  const handleBulkAction = useCallback((action: BulkAction) => {
    setBulkAction(action)
  }, [])

  // AI Schema Generator handlers
  const handleAiGenerate = useCallback(
    async (description: string): Promise<EntitySchemaProposal> => {
      return await client.generateSchemaFromNaturalLanguage(description)
    },
    [client]
  )

  const handleAiCreate = useCallback(
    async (proposal: EntitySchemaProposal): Promise<BatchCreationResult> => {
      const result = await client.createEntitiesFromProposal(proposal)
      return result
    },
    [client]
  )

  const handleAiSuccess = useCallback(() => {
    refetchDefinitions()
  }, [refetchDefinitions])

  // Relationship handler
  const handleCreateRelationship = useCallback(
    async (relationship: EntityRelationship) => {
      await client.createRelationship(relationship)
      await refetchDefinitions()
    },
    [client, refetchDefinitions]
  )

  // Execute bulk promote
  const executeBulkPromote = useCallback(async () => {
    if (bulkAction?.type !== 'promote') return

    const results: { success: CustomDataDefinition[]; failed: string[] } = { success: [], failed: [] }

    for (const def of bulkAction.definitions) {
      try {
        const promoted = await client.promoteEntity(def.id)
        results.success.push(promoted)
      } catch (err) {
        results.failed.push(def.display_name || def.key)
        console.error(`Failed to promote ${def.key}:`, err)
      }
    }

    await refetchDefinitions()
    setBulkAction(null)
    return results
  }, [bulkAction, client, refetchDefinitions])

  // Execute bulk delete
  const executeBulkDelete = useCallback(async () => {
    if (bulkAction?.type !== 'delete') return

    const results: { success: string[]; failed: string[] } = { success: [], failed: [] }

    for (const def of bulkAction.definitions) {
      try {
        await client.deleteDefinition(def.id)
        results.success.push(def.display_name || def.key)
      } catch (err) {
        results.failed.push(def.display_name || def.key)
        console.error(`Failed to delete ${def.key}:`, err)
      }
    }

    await refetchDefinitions()
    setBulkAction(null)
    return results
  }, [bulkAction, client, refetchDefinitions])

  // Execute bulk export
  const executeBulkExport = useCallback(() => {
    if (bulkAction?.type !== 'export') return

    // Export definitions as JSON
    const exportData = bulkAction.definitions.map(def => ({
      key: def.key,
      kind: def.kind,
      display_name: def.display_name,
      description: def.description,
      columns_json: def.columns_json,
      publish_state: def.publish_state
    }))

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `custom-data-definitions-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)

    setBulkAction(null)
  }, [bulkAction])

  // Stats
  const spreadsheetCount = definitions.filter(d => d.kind === 'SPREADSHEET').length
  const entityCount = definitions.filter(d => d.kind === 'ENTITY').length
  const promotedCount = definitions.filter(d => d.publish_state === 'PROMOTED_TRACKED').length

  return (
    <div data-testid={testId} className="gba:min-h-screen gba:bg-background">
      {selectedDefinition ? (
        /* Detail View */
        <PageLayout
          headerIcon={selectedDefinition.kind === 'SPREADSHEET' ? FileSpreadsheet : Database}
          headerTitle={selectedDefinition.display_name || selectedDefinition.key}
          headerDescription={selectedDefinition.description || `${selectedDefinition.kind} definition`}
          className="gba:min-h-screen"
        >
          <div className="gba:max-w-7xl gba:mx-auto gba:px-4 gba:sm:px-6 gba:lg:px-8 gba:py-6">
            {/* Back Button and Actions */}
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
              <Button variant="ghost" size="sm" onClick={handleBack} data-testid={`${testId}-back`}>
                <ArrowLeft className="gba:h-4 gba:w-4 gba:mr-2" />
                Back to Definitions
              </Button>
              <div className="gba:flex gba:items-center gba:gap-2">
                <Badge variant={selectedDefinition.kind === 'SPREADSHEET' ? 'info' : 'secondary'} className="gba:gap-1">
                  {selectedDefinition.kind === 'SPREADSHEET' ? (
                    <FileSpreadsheet className="gba:h-3 gba:w-3" />
                  ) : (
                    <Database className="gba:h-3 gba:w-3" />
                  )}
                  {selectedDefinition.kind}
                </Badge>
                <Badge variant={selectedDefinition.publish_state === 'PROMOTED_TRACKED' ? 'success' : 'warning'}>
                  {selectedDefinition.publish_state === 'PROMOTED_TRACKED' ? 'Promoted' : 'Draft'}
                </Badge>
              </div>
            </div>

            {/* Detail Tabs */}
            <Tabs value={detailTab} onValueChange={val => setDetailTab(val as any)}>
              <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
                <TabsList>
                  {selectedDefinition.kind === 'SPREADSHEET' && (
                    <TabsTrigger value="data" className="gba:flex gba:items-center gba:gap-1">
                      <Table2 className="gba:h-4 gba:w-4" />
                      Data
                      {totalRows > 0 && (
                        <Badge variant="secondary" className="gba:ml-1 gba:text-xs">
                          {totalRows}
                        </Badge>
                      )}
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="schema" className="gba:flex gba:items-center gba:gap-1">
                    <Database className="gba:h-4 gba:w-4" />
                    Schema
                  </TabsTrigger>
                  {selectedDefinition.kind === 'ENTITY' && (
                    <TabsTrigger value="relationships" className="gba:flex gba:items-center gba:gap-1">
                      <LinkIcon className="gba:h-4 gba:w-4" />
                      Relationships
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="settings" className="gba:flex gba:items-center gba:gap-1">
                    <Settings className="gba:h-4 gba:w-4" />
                    Settings
                  </TabsTrigger>
                </TabsList>

                {/* Tab Actions */}
                <div className="gba:flex gba:items-center gba:gap-2">
                  {detailTab === 'data' && selectedDefinition.kind === 'SPREADSHEET' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsImportExportOpen(true)}
                      data-testid={`${testId}-import-export`}
                    >
                      <Download className="gba:h-4 gba:w-4 gba:mr-1" />
                      Import/Export
                    </Button>
                  )}
                  {detailTab === 'settings' &&
                    selectedDefinition.kind === 'ENTITY' &&
                    selectedDefinition.publish_state !== 'PROMOTED_TRACKED' && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setPromoteDefinition(selectedDefinition)}
                        data-testid={`${testId}-promote`}
                      >
                        <Rocket className="gba:h-4 gba:w-4 gba:mr-1" />
                        Promote
                      </Button>
                    )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(selectedDefinition)}
                    data-testid={`${testId}-edit`}
                  >
                    <Edit2 className="gba:h-4 gba:w-4 gba:mr-1" />
                    Edit
                  </Button>
                </div>
              </div>

              {/* Data Tab - Spreadsheet Only */}
              {selectedDefinition.kind === 'SPREADSHEET' && (
                <TabsContent value="data" className="gba:mt-0">
                  <Card>
                    <CardContent className="gba:pt-6">
                      <SpreadsheetGrid
                        columns={selectedDefinition.columns_json || []}
                        rows={rows}
                        total={totalRows}
                        isLoading={isLoadingRows}
                        error={rowsError}
                        page={page}
                        pageSize={pageSize}
                        onPageChange={setPage}
                        onPageSizeChange={setPageSize}
                        onCreate={createRow}
                        onUpdate={updateRow}
                        onDelete={deleteRow}
                        onRefresh={refetchRows}
                        data-testid={`${testId}-grid`}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Schema Tab */}
              <TabsContent value="schema" className="gba:mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="gba:text-lg">Schema Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SchemaPreview
                      columns={selectedDefinition.columns_json || []}
                      data-testid={`${testId}-schema-preview`}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Relationships Tab - Entity Only */}
              {selectedDefinition.kind === 'ENTITY' && (
                <TabsContent value="relationships" className="gba:mt-0">
                  <RelationshipManager
                    currentEntity={selectedDefinition}
                    availableEntities={definitions}
                    onCreateRelationship={handleCreateRelationship}
                    data-testid={`${testId}-relationship-manager`}
                  />
                </TabsContent>
              )}

              {/* Settings Tab */}
              <TabsContent value="settings" className="gba:mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="gba:text-lg">Definition Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="gba:space-y-4">
                    <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                      <div className="gba:space-y-1">
                        <span className="gba:text-sm gba:text-muted-foreground">Key</span>
                        <p className="gba:font-mono gba:text-sm">{selectedDefinition.key}</p>
                      </div>
                      <div className="gba:space-y-1">
                        <span className="gba:text-sm gba:text-muted-foreground">Type</span>
                        <p className="gba:text-sm">{selectedDefinition.kind}</p>
                      </div>
                      <div className="gba:space-y-1">
                        <span className="gba:text-sm gba:text-muted-foreground">Status</span>
                        <p className="gba:text-sm">{selectedDefinition.publish_state}</p>
                      </div>
                      <div className="gba:space-y-1">
                        <span className="gba:text-sm gba:text-muted-foreground">Columns</span>
                        <p className="gba:text-sm">{selectedDefinition.columns_json?.length || 0} fields</p>
                      </div>
                      <div className="gba:space-y-1">
                        <span className="gba:text-sm gba:text-muted-foreground">Created</span>
                        <p className="gba:text-sm">{new Date(selectedDefinition.created_at).toLocaleString()}</p>
                      </div>
                      <div className="gba:space-y-1">
                        <span className="gba:text-sm gba:text-muted-foreground">Updated</span>
                        <p className="gba:text-sm">{new Date(selectedDefinition.updated_at).toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Entity Promotion Section */}
                    {selectedDefinition.kind === 'ENTITY' && (
                      <div className="gba:pt-4 gba:border-t gba:border-border">
                        <h4 className="gba:text-sm gba:font-medium gba:mb-3">PostgreSQL Deployment</h4>
                        {selectedDefinition.publish_state === 'PROMOTED_TRACKED' ? (
                          <Alert className="gba:bg-success-secondary gba:border-success">
                            <AlertDescription className="gba:text-success-secondary-foreground">
                              <div className="gba:space-y-1">
                                <p className="gba:font-medium">Entity is deployed</p>
                                <p className="gba:text-xs">
                                  Table:{' '}
                                  <span className="gba:font-mono">{selectedDefinition.deploy_state?.tableName}</span>
                                </p>
                                {selectedDefinition.deploy_state?.deployedAt && (
                                  <p className="gba:text-xs">
                                    Deployed: {new Date(selectedDefinition.deploy_state.deployedAt).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <div className="gba:flex gba:items-center gba:justify-between gba:bg-muted/50 gba:rounded-lg gba:p-4">
                            <div>
                              <p className="gba:text-sm gba:font-medium">Ready to deploy</p>
                              <p className="gba:text-xs gba:text-muted-foreground">
                                Promote this entity to create a native PostgreSQL table
                              </p>
                            </div>
                            <Button
                              onClick={() => setPromoteDefinition(selectedDefinition)}
                              data-testid={`${testId}-settings-promote`}
                            >
                              <Rocket className="gba:h-4 gba:w-4 gba:mr-2" />
                              Promote
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </PageLayout>
      ) : (
        /* List View */
        <PageLayout
          headerIcon={Database}
          headerTitle={getTranslationFromI18nKeyAndLabel('customData.title', 'Custom Data Manager')}
          headerDescription="Create and manage custom data schemas"
          className="gba:min-h-screen"
        >
          <div className="gba:max-w-7xl gba:mx-auto gba:px-4 gba:sm:px-6 gba:lg:px-8 gba:py-6">
            {/* Stats */}
            <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4 gba:mb-6">
              <Card>
                <CardContent className="gba:pt-6">
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <div>
                      <p className="gba:text-2xl gba:font-bold">{spreadsheetCount}</p>
                      <p className="gba:text-sm gba:text-muted-foreground">Spreadsheets</p>
                    </div>
                    <FileSpreadsheet className="gba:h-8 gba:w-8 gba:text-info" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="gba:pt-6">
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <div>
                      <p className="gba:text-2xl gba:font-bold">{entityCount}</p>
                      <p className="gba:text-sm gba:text-muted-foreground">Entities</p>
                    </div>
                    <Database className="gba:h-8 gba:w-8 gba:text-secondary" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="gba:pt-6">
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <div>
                      <p className="gba:text-2xl gba:font-bold">{promotedCount}</p>
                      <p className="gba:text-sm gba:text-muted-foreground">Promoted</p>
                    </div>
                    <Rocket className="gba:h-8 gba:w-8 gba:text-success" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Header Actions */}
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
              <div className="gba:flex gba:items-center gba:gap-4">
                <h2 className="gba:text-lg gba:font-semibold">Definitions</h2>
                <Select value={currentNamespace} onValueChange={setCurrentNamespace}>
                  <SelectTrigger className="gba:w-64" data-testid={`${testId}-namespace-selector`}>
                    <SelectValue placeholder="Select namespace" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableNamespaces.map(ns => (
                      <SelectItem key={ns} value={ns}>
                        {ns}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="gba:flex gba:gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsAiGeneratorOpen(true)}
                  data-testid={`${testId}-ai-generator`}
                >
                  <Sparkles className="gba:h-4 gba:w-4 gba:mr-2" />
                  Generate with AI
                </Button>
                <Button onClick={handleCreateNew} data-testid={`${testId}-create-new`}>
                  <Plus className="gba:h-4 gba:w-4 gba:mr-2" />
                  New Definition
                </Button>
              </div>
            </div>

            {/* Error */}
            {definitionsError && (
              <Alert variant="destructive" className="gba:mb-4">
                <AlertDescription>{definitionsError}</AlertDescription>
              </Alert>
            )}

            {/* Namespace Migration Info Banner */}
            {definitions.some(d => d.namespace === 'default') && definitions.length > 0 && (
              <Alert variant="info" className="gba:mb-4" data-testid={`${testId}-namespace-info`}>
                <AlertDescription>
                  <div className="gba:flex gba:items-start gba:gap-3">
                    <Database className="gba:h-5 gba:w-5 gba:text-info-foreground gba:flex-shrink-0 gba:mt-0.5" />
                    <div>
                      <p className="gba:font-medium gba:text-info-foreground gba:mb-1">
                        Namespace Support Now Available
                      </p>
                      <p className="gba:text-sm gba:text-info-secondary-foreground">
                        Your existing data sources have been migrated to the{' '}
                        <Badge variant="secondary" className="gba:mx-1">
                          default
                        </Badge>{' '}
                        namespace. You can now organize data sources using namespaces for better isolation. Use the
                        namespace selector above to filter by namespace, or create new definitions in custom namespaces.
                      </p>
                      <ul className="gba:list-disc gba:ml-4 gba:mt-2 gba:text-sm gba:text-info-secondary-foreground gba:space-y-1">
                        <li>Keys must be unique within a namespace (same key allowed in different namespaces)</li>
                        <li>
                          Use reverse domain notation: <code className="gba:text-xs">com.company.department</code>
                        </li>
                        <li>Namespaces provide isolation for multi-tenant or multi-project scenarios</li>
                      </ul>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Definitions Table */}
            <Card>
              <CardContent className="gba:pt-6">
                <DefinitionsTable
                  definitions={definitions}
                  isLoading={isLoadingDefinitions}
                  filterKind={filterKind}
                  onFilterChange={setFilterKind}
                  onSelect={selectDefinition}
                  onEdit={handleEdit}
                  onPromote={def => setPromoteDefinition(def)}
                  onBulkAction={handleBulkAction}
                  data-testid={`${testId}-definitions-table`}
                />
              </CardContent>
            </Card>
          </div>
        </PageLayout>
      )}

      {/* Dialogs */}
      <DefinitionForm
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingDefinition(null)
        }}
        definition={editingDefinition}
        onSave={handleSaveDefinition}
        data-testid={`${testId}-definition-form`}
      />

      <ImportExportDialog
        open={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        columns={selectedDefinition?.columns_json || []}
        rows={rows}
        onImport={handleImportRows}
        data-testid={`${testId}-import-export-dialog`}
      />

      <PromoteDialog
        open={!!promoteDefinition}
        onClose={() => setPromoteDefinition(null)}
        definition={promoteDefinition}
        onPromote={handlePromote}
        data-testid={`${testId}-promote-dialog`}
      />

      <BulkActionDialog
        open={!!bulkAction}
        onClose={() => setBulkAction(null)}
        action={bulkAction}
        onConfirmPromote={executeBulkPromote}
        onConfirmDelete={executeBulkDelete}
        onConfirmExport={executeBulkExport}
        data-testid={`${testId}-bulk-action-dialog`}
      />

      <AiSchemaGeneratorDialog
        open={isAiGeneratorOpen}
        onClose={() => setIsAiGeneratorOpen(false)}
        onSuccess={handleAiSuccess}
        onGenerate={handleAiGenerate}
        onCreate={handleAiCreate}
        data-testid={`${testId}-ai-generator-dialog`}
      />
    </div>
  )
}

export default CustomDataManager
