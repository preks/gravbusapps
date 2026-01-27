import React, { useState, useCallback, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

import { useDefinitions } from './hooks/useDefinitions'
import { useNamespaces } from './hooks/useNamespaces'
import { useCustomDataClient } from './hooks/useCustomDataClient'
import { BulkAction } from './components/DefinitionsTable'
import { DefinitionForm } from './components/DefinitionForm'
import { PromoteDialog } from './components/PromoteDialog'
import { BulkActionDialog } from './components/BulkActionDialog'
import { AiSchemaGeneratorDialog } from './components/AiSchemaGeneratorDialog'
import { CreateNamespaceDialog } from './components/CreateNamespaceDialog'
import { CustomDataManagerDetailView } from './CustomDataManagerDetailView'
import { CustomDataManagerListView } from './CustomDataManagerListView'
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
 * Manages custom data definitions (entities)
 */
export const CustomDataManager: React.FC<CustomDataManagerProps> = ({
  accessToken,
  'data-testid': testId = 'custom-data-manager'
}) => {
  const client = useCustomDataClient(accessToken)

  // Namespace state
  const [currentNamespace, setCurrentNamespace] = useState<string>('default')
  const [isCreateNamespaceOpen, setIsCreateNamespaceOpen] = useState(false)

  const { namespaces, createNamespace: createNamespaceApi } = useNamespaces(accessToken)
  const availableNamespaces = namespaces.length > 0 ? namespaces.map(n => n.namespace) : ['default']

  // Definitions state
  const {
    definitions,
    isLoading: isLoadingDefinitions,
    error: definitionsError,
    selectedDefinition,
    selectDefinition,
    createDefinition,
    updateDefinition,
    refetch: refetchDefinitions
  } = useDefinitions(accessToken, currentNamespace)

  // Ensure current namespace stays valid when registry updates
  useEffect(() => {
    if (!availableNamespaces || availableNamespaces.length === 0) return
    if (!availableNamespaces.includes(currentNamespace)) {
      setCurrentNamespace(availableNamespaces.includes('default') ? 'default' : availableNamespaces[0])
    }
  }, [availableNamespaces, currentNamespace])

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingDefinition, setEditingDefinition] = useState<CustomDataDefinition | null>(null)
  const [promoteDefinition, setPromoteDefinition] = useState<CustomDataDefinition | null>(null)
  const [isAiGeneratorOpen, setIsAiGeneratorOpen] = useState(false)

  // Bulk action state
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null)

  // Detail view tab
  const [detailTab, setDetailTab] = useState<'schema' | 'relationships' | 'settings'>('schema')

  // Reset detail tab when selected definition changes
  useEffect(() => {
    if (selectedDefinition) {
      setDetailTab('schema')
    }
  }, [selectedDefinition?.id])

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
    async (dto: CreateDefinitionDto | UpdateDefinitionDto, id?: string) => {
      if (id) {
        await updateDefinition(id, dto as UpdateDefinitionDto)
      } else {
        await createDefinition(dto as CreateDefinitionDto)
      }
      await refetchDefinitions()
    },
    [createDefinition, updateDefinition, refetchDefinitions]
  )

  const handleCreateNamespace = useCallback(
    async (dto: { namespace: string; display_name?: string; description?: string }) => {
      const created = await createNamespaceApi(dto)
      setCurrentNamespace(created.namespace)
      // definitions hook will refetch due to namespace change, but do an explicit refetch for safety
      await refetchDefinitions()
    },
    [createNamespaceApi, refetchDefinitions]
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

  const handleBack = useCallback(() => {
    selectDefinition(null)
    setDetailTab('schema')
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
  const entityCount = definitions.filter(d => d.kind === 'ENTITY').length
  const promotedCount = definitions.filter(d => d.publish_state === 'PROMOTED_TRACKED').length

  return (
    <div data-testid={testId} className="gba:min-h-screen gba:bg-background">
      {selectedDefinition ? (
        <CustomDataManagerDetailView
          definition={selectedDefinition}
          definitions={definitions}
          detailTab={detailTab}
          onChangeTab={setDetailTab}
          onBack={handleBack}
          onEdit={() => handleEdit(selectedDefinition)}
          onOpenPromote={() => setPromoteDefinition(selectedDefinition)}
          onCreateRelationship={handleCreateRelationship}
          data-testid={`${testId}-detail`}
        />
      ) : (
        <CustomDataManagerListView
          definitions={definitions}
          isLoadingDefinitions={isLoadingDefinitions}
          definitionsError={definitionsError}
          entityCount={entityCount}
          promotedCount={promotedCount}
          currentNamespace={currentNamespace}
          availableNamespaces={availableNamespaces}
          onChangeNamespace={setCurrentNamespace}
          onOpenCreateNamespace={() => setIsCreateNamespaceOpen(true)}
          onOpenAiGenerator={() => setIsAiGeneratorOpen(true)}
          onCreateNew={handleCreateNew}
          onSelectDefinition={selectDefinition}
          onEditDefinition={handleEdit}
          onOpenPromote={def => setPromoteDefinition(def)}
          onBulkAction={handleBulkAction}
          data-testid={`${testId}-list`}
        />
      )}

      {/* Dialogs */}
      <DefinitionForm
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingDefinition(null)
        }}
        definition={editingDefinition}
        availableNamespaces={availableNamespaces}
        onOpenCreateNamespace={() => setIsCreateNamespaceOpen(true)}
        onSave={handleSaveDefinition}
        data-testid={`${testId}-definition-form`}
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
