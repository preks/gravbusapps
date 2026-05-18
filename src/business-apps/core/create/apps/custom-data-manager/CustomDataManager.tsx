import React, { useState, useCallback, useEffect } from 'react'
import { CreateLayout, Tabs, TabsList, TabsTrigger } from '@newwork/nw-design-system'
import { Database, Terminal, GitBranch } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

import { useDefinitions } from './hooks/useDefinitions'
import { useNamespaces } from './hooks/useNamespaces'
import { useNamespaceAggregate } from './hooks/useNamespaceAggregate'
import { useCustomDataClient } from './hooks/useCustomDataClient'
import { PromoteDialog } from './components/PromoteDialog'
import { PromoteNamespaceDialog } from './components/PromoteNamespaceDialog'
import { CreateNamespaceDialog } from './components/CreateNamespaceDialog'
import { CustomDataManagerListView } from './CustomDataManagerListView'
import { EntityRelationCanvas } from './components/canvas/EntityRelationCanvas'
import { EntityDetailPanel } from './components/EntityDetailPanel'
import { CustomDataChatPanel } from './components/CustomDataChatPanel'
import { GraphiQLPanel } from './components/GraphiQLPanel'
import { InternalEntityInfoPanel } from './components/InternalEntityInfoPanel'
import { RelationshipInfoPanel, type SelectedRelationshipData } from './components/RelationshipInfoPanel'
import type { DataInternalEntityNodeData as InternalEntityNodeData } from '@/common/components/flow/data-viewer'
import { createInitialColumns, stripColumnUiIds } from './utils/columnUiIds'
import type {
  CustomDataDefinition,
  CustomDataSuggestionApplyResult,
  CustomDataSuggestionRequest,
  CustomDataSuggestionStreamEvent,
  EntitySchemaProposal,
  UpdateDefinitionDto
} from './types'

type View = 'list' | 'canvas'
type CanvasMode = 'graph' | 'graphql'

interface CustomDataManagerProps extends BusinessAppContextProps {
  'data-testid'?: string
}

export const CustomDataManager: React.FC<CustomDataManagerProps> = ({
  accessToken,
  'data-testid': testId = 'custom-data-manager'
}) => {
  const client = useCustomDataClient(accessToken)
  const [view, setView] = useState<View>('list')
  const [canvasMode, setCanvasMode] = useState<CanvasMode>('graph')
  const [selectedNamespace, setSelectedNamespace] = useState<string>('default')
  const [isCreateNamespaceOpen, setIsCreateNamespaceOpen] = useState(false)
  const [chatPanelCollapsed, setChatPanelCollapsed] = useState(false)

  const { namespaces, createNamespace: createNamespaceApi } = useNamespaces(accessToken)
  const allNamespaces = namespaces.length > 0 ? namespaces : [{ namespace: 'default', createdAt: '', updatedAt: '' }]

  const { definitions, createDefinition, updateDefinition, refetch: refetchDefinitions } = useDefinitions(accessToken)
  const { aggregate: selectedNamespaceAggregate, refetch: refetchNamespaceAggregate } = useNamespaceAggregate(
    accessToken,
    selectedNamespace
  )

  const [selectedEntity, setSelectedEntity] = useState<CustomDataDefinition | null>(null)
  const [selectedInternalEntity, setSelectedInternalEntity] = useState<InternalEntityNodeData | null>(null)
  const [selectedRelationship, setSelectedRelationship] = useState<SelectedRelationshipData | null>(null)
  const [promoteDefinition, setPromoteDefinition] = useState<CustomDataDefinition | null>(null)
  const [isPromoteNamespaceOpen, setIsPromoteNamespaceOpen] = useState(false)

  useEffect(() => {
    setSelectedEntity(null)
    setSelectedInternalEntity(null)
    setSelectedRelationship(null)
  }, [selectedNamespace])

  const handleSelectNamespace = useCallback((ns: string) => {
    setSelectedNamespace(ns)
    setView('canvas')
  }, [])

  const handleBackToList = useCallback(() => {
    setView('list')
    setSelectedEntity(null)
  }, [])

  const handleSelectEntity = useCallback((def: CustomDataDefinition | null) => {
    setSelectedEntity(def)
    setSelectedInternalEntity(null)
    setSelectedRelationship(null)
  }, [])

  const handleSelectInternalEntity = useCallback((data: InternalEntityNodeData) => {
    setSelectedInternalEntity(data)
    setSelectedEntity(null)
    setSelectedRelationship(null)
  }, [])

  const handleSelectRelationship = useCallback((data: SelectedRelationshipData) => {
    setSelectedRelationship(data)
    setSelectedEntity(null)
    setSelectedInternalEntity(null)
  }, [])

  const handleAddEntity = useCallback(async () => {
    try {
      const created = await createDefinition({
        namespace: selectedNamespace,
        entityName: 'NewEntity',
        kind: 'CUSTOM_ENTITY',
        displayName: 'New Entity',
        columns: stripColumnUiIds(createInitialColumns())
      })
      await refetchDefinitions()
      await refetchNamespaceAggregate()
      setSelectedEntity(created)
      setSelectedInternalEntity(null)
    } catch (err) {
      console.error('Failed to create entity:', err)
    }
  }, [createDefinition, refetchDefinitions, refetchNamespaceAggregate, selectedNamespace])

  const handleSaveEntity = useCallback(
    async (dto: UpdateDefinitionDto, definition: CustomDataDefinition) => {
      const updatedDefinition = await updateDefinition(definition, dto)
      await refetchDefinitions()
      await refetchNamespaceAggregate()
      setSelectedEntity(updatedDefinition)
    },
    [updateDefinition, refetchDefinitions, refetchNamespaceAggregate]
  )

  const handleDeleteEntity = useCallback(
    async (definition: CustomDataDefinition) => {
      await client.deleteDefinition(definition.namespace, definition.entityName)
      await refetchDefinitions()
      await refetchNamespaceAggregate()
      setSelectedEntity(null)
      setSelectedInternalEntity(null)
      setSelectedRelationship(null)
    },
    [client, refetchDefinitions, refetchNamespaceAggregate]
  )

  const handleCreateNamespace = useCallback(
    async (dto: { namespace: string; displayName?: string; description?: string }) => {
      const created = await createNamespaceApi(dto)
      setSelectedNamespace(created.namespace)
      setView('canvas')
    },
    [createNamespaceApi]
  )

  const handlePromote = useCallback(
    async (definition: CustomDataDefinition) => {
      const promoted = await client.promoteEntity(definition.namespace, definition.entityName)
      await refetchDefinitions()
      await refetchNamespaceAggregate()
      if (selectedEntity?.id === definition.id) setSelectedEntity(promoted)
      return promoted
    },
    [client, refetchDefinitions, refetchNamespaceAggregate, selectedEntity]
  )

  const handlePromoteNamespace = useCallback(async () => {
    const result = await client.promoteNamespace(selectedNamespace)
    await refetchDefinitions()
    await refetchNamespaceAggregate()
    setSelectedEntity(null)
    setSelectedInternalEntity(null)
    setSelectedRelationship(null)
    return result
  }, [client, refetchDefinitions, refetchNamespaceAggregate, selectedNamespace])

  const handleAiGenerate = useCallback(
    (
      request: CustomDataSuggestionRequest,
      options: {
        onEvent: (event: CustomDataSuggestionStreamEvent) => void
        signal?: AbortSignal
      }
    ): Promise<void> => client.streamCustomEntitySuggestion(selectedNamespace, request, options),
    [client, selectedNamespace]
  )
  const handleAiCreate = useCallback(
    (proposal: EntitySchemaProposal): Promise<CustomDataSuggestionApplyResult> =>
      client.applySuggestedModel(selectedNamespace, proposal),
    [client, selectedNamespace]
  )
  const handleAiSuccess = useCallback(() => {
    void refetchDefinitions()
    void refetchNamespaceAggregate()
    setSelectedEntity(null)
    setSelectedInternalEntity(null)
    setSelectedRelationship(null)
  }, [refetchDefinitions, refetchNamespaceAggregate])

  const handleOpenAiGenerator = useCallback(() => {
    if (view === 'list') {
      setView('canvas')
    }
    setChatPanelCollapsed(false)
  }, [view])

  const nsInfo = selectedNamespaceAggregate ?? allNamespaces.find(n => n.namespace === selectedNamespace)
  const namespaceEntities = selectedNamespaceAggregate?.customEntities ?? []

  return (
    <div data-testid={testId} className="gba:h-full gba:w-full gba:flex gba:flex-col gba:bg-background">
      {view === 'canvas' ? (
        <CreateLayout
          heroVariant="editor"
          heroIcon={<Database className="gba:w-5 gba:h-5 gba:text-white" />}
          heroTitle={nsInfo?.displayName || selectedNamespace}
          heroSubtitle={nsInfo?.description || `Namespace: ${selectedNamespace}`}
          onBack={handleBackToList}
          heroBackLabel="Back to Namespaces"
          chatPanel={
            <CustomDataChatPanel
              onGenerate={handleAiGenerate}
              onCreate={handleAiCreate}
              onSuccess={handleAiSuccess}
              onClose={() => setChatPanelCollapsed(true)}
              data-testid={`${testId}-chat`}
            />
          }
          canvasPanel={
            <div className="gba:relative gba:h-full gba:w-full gba:flex gba:flex-col">
              <div className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-1.5 gba:border-b gba:border-border gba:bg-background/80 gba:backdrop-blur-sm gba:shrink-0 gba:z-10">
                <Tabs value={canvasMode} onValueChange={v => setCanvasMode(v as CanvasMode)}>
                  <TabsList>
                    <TabsTrigger value="graph" startIcon={<GitBranch className="gba:h-3.5 gba:w-3.5" />}>
                      ERD
                    </TabsTrigger>
                    <TabsTrigger value="graphql" startIcon={<Terminal className="gba:h-3.5 gba:w-3.5" />}>
                      GraphQL
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className="gba:flex-1 gba:min-h-0 gba:relative">
                {canvasMode === 'graph' ? (
                  <EntityRelationCanvas
                    definitions={namespaceEntities}
                    namespaceAggregate={selectedNamespaceAggregate}
                    selectedEntity={selectedEntity}
                    onSelectEntity={handleSelectEntity}
                    onSelectInternalEntity={handleSelectInternalEntity}
                    onSelectRelationship={handleSelectRelationship}
                    onAddEntity={handleAddEntity}
                    onPromoteNamespace={() => setIsPromoteNamespaceOpen(true)}
                    rightPanel={
                      selectedEntity ? (
                        <EntityDetailPanel
                          definition={selectedEntity}
                          allDefinitions={definitions}
                          accessToken={accessToken}
                          onClose={() => setSelectedEntity(null)}
                          onSave={(dto, definition) => handleSaveEntity(dto, definition)}
                          onDelete={handleDeleteEntity}
                          onOpenPromote={() => setPromoteDefinition(selectedEntity)}
                          onCreateRow={client.createRow}
                          onUpdateRow={client.updateRow}
                          onDeleteRow={client.deleteRow}
                          data-testid={`${testId}-detail-panel`}
                        />
                      ) : selectedInternalEntity ? (
                        <InternalEntityInfoPanel
                          data={selectedInternalEntity}
                          onClose={() => setSelectedInternalEntity(null)}
                          data-testid={`${testId}-internal-panel`}
                        />
                      ) : selectedRelationship ? (
                        <RelationshipInfoPanel
                          data={selectedRelationship}
                          onClose={() => setSelectedRelationship(null)}
                          onNavigateToSource={() => {
                            const def = namespaceEntities.find(
                              d => d.entityName === selectedRelationship.sourceEntityKey
                            )
                            if (def) handleSelectEntity(def)
                          }}
                          onNavigateToTarget={() => {
                            const def = namespaceEntities.find(
                              d => d.entityName === selectedRelationship.targetEntityKey
                            )
                            if (def) handleSelectEntity(def)
                          }}
                          data-testid={`${testId}-relationship-panel`}
                        />
                      ) : undefined
                    }
                    data-testid={`${testId}-canvas`}
                  />
                ) : (
                  <GraphiQLPanel
                    accessToken={accessToken}
                    namespace={selectedNamespace}
                    data-testid={`${testId}-graphql`}
                  />
                )}
              </div>
            </div>
          }
          chatPanelCollapsed={chatPanelCollapsed}
          onChatPanelCollapseChange={setChatPanelCollapsed}
          data-testid={`${testId}-layout`}
        />
      ) : (
        <CustomDataManagerListView
          namespaces={allNamespaces}
          onSelectNamespace={handleSelectNamespace}
          onOpenCreateNamespace={() => setIsCreateNamespaceOpen(true)}
          onOpenAiGenerator={handleOpenAiGenerator}
          data-testid={`${testId}-list`}
        />
      )}

      <PromoteDialog
        open={!!promoteDefinition}
        onClose={() => setPromoteDefinition(null)}
        definition={promoteDefinition}
        onPromote={definition => handlePromote(definition)}
        data-testid={`${testId}-promote-dialog`}
      />

      <PromoteNamespaceDialog
        open={isPromoteNamespaceOpen}
        onClose={() => setIsPromoteNamespaceOpen(false)}
        namespace={selectedNamespace}
        entityCount={namespaceEntities.length}
        onPromote={handlePromoteNamespace}
        data-testid={`${testId}-promote-namespace-dialog`}
      />

      <CreateNamespaceDialog
        open={isCreateNamespaceOpen}
        onClose={() => setIsCreateNamespaceOpen(false)}
        onCreate={handleCreateNamespace}
        data-testid={`${testId}-create-namespace`}
      />
    </div>
  )
}

export default CustomDataManager
