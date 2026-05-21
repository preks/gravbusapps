import React, { useCallback, useEffect, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@newwork/nw-design-system'
import type {
  GlobalSearchClient,
  GlobalSearchEntitySeedMode,
  GlobalSearchEntityType
} from '@/common/network/global-search/GlobalSearchClient'
import { buildEntityPayload, entityStatusBadgeVariant, entityToFormValues, type EntityFormValues } from '../utils'
import { EntityDialog, type EntityDialogMode } from './EntityDialog'

interface EntitiesTabProps {
  client: GlobalSearchClient
}

export const EntitiesTab: React.FC<EntitiesTabProps> = ({ client }) => {
  const [entities, setEntities] = useState<GlobalSearchEntityType[]>([])
  const [entitySeedMode, setEntitySeedMode] = useState<GlobalSearchEntitySeedMode>('UPSERT')
  const [dialogMode, setDialogMode] = useState<EntityDialogMode>('create')
  const [isEntityDialogOpen, setIsEntityDialogOpen] = useState(false)
  const [formValues, setFormValues] = useState<EntityFormValues>(entityToFormValues())
  const [selectedEntity, setSelectedEntity] = useState<GlobalSearchEntityType | null>(null)
  const [viewEntity, setViewEntity] = useState<GlobalSearchEntityType | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const loadEntities = useCallback(async () => {
    setErrorMessage(null)
    try {
      const response = await client.getEntityTypes()
      setEntities(response.data)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Loading entities failed')
    }
  }, [client])

  useEffect(() => {
    loadEntities().catch(() => undefined)
  }, [loadEntities])

  const updateField = <K extends keyof EntityFormValues>(field: K, value: EntityFormValues[K]) => {
    setFormValues(current => ({ ...current, [field]: value }))
  }

  const openCreateDialog = () => {
    setDialogMode('create')
    setSelectedEntity(null)
    setFormValues(entityToFormValues())
    setIsEntityDialogOpen(true)
  }

  const openEditDialog = async (entityType: string) => {
    try {
      const entity = await client.getEntityType(entityType)
      setDialogMode('edit')
      setSelectedEntity(entity)
      setFormValues(entityToFormValues(entity))
      setIsEntityDialogOpen(true)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Loading entity failed')
    }
  }

  const submitEntity = async () => {
    try {
      const payload = buildEntityPayload(formValues)
      if (dialogMode === 'create') {
        await client.createEntityType(payload)
        setStatusMessage(`Created ${payload.entityType}`)
      } else if (selectedEntity) {
        const updatePayload = {
          entityTypeLabel: payload.entityTypeLabel,
          categoryKey: payload.categoryKey,
          categoryLabel: payload.categoryLabel,
          kind: payload.kind,
          icon: payload.icon,
          searchConfig: payload.searchConfig,
          actionConfig: payload.actionConfig,
          accessControlType: payload.accessControlType,
          active: payload.active,
          sortOrder: payload.sortOrder
        }
        await client.updateEntityType(selectedEntity.entityType, updatePayload)
        setStatusMessage(`Updated ${selectedEntity.entityType}`)
      }
      setSelectedEntity(null)
      setIsEntityDialogOpen(false)
      await loadEntities()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Saving entity failed')
    }
  }

  const deleteEntity = async (entityType: string) => {
    if (!globalThis.confirm(`Delete entity type "${entityType}"?`)) return
    try {
      await client.deleteEntityType(entityType)
      setStatusMessage(`Deleted ${entityType}`)
      await loadEntities()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Deleting entity failed')
    }
  }

  const seedEntities = async () => {
    if (
      entitySeedMode === 'RESET' &&
      !globalThis.confirm('RESET deletes existing entity defaults before inserting. Continue?')
    )
      return
    try {
      const result = await client.seedEntityTypes(entitySeedMode)
      setStatusMessage(
        `Seed complete: ${result.inserted} inserted, ${result.updated} updated, ${result.deleted} deleted`
      )
      await loadEntities()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Seeding entities failed')
    }
  }

  return (
    <Card data-testid="global-search-manager-entities-tab">
      <CardContent className="gba:space-y-4 gba:pt-6">
        <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-3">
          <div className="gba:flex gba:flex-wrap gba:gap-2">
            <Select
              value={entitySeedMode}
              onValueChange={value => setEntitySeedMode(value as GlobalSearchEntitySeedMode)}
            >
              <SelectTrigger className="gba:w-44">
                <SelectValue placeholder="Seed mode" />
              </SelectTrigger>
              <SelectContent>
                {(['FILL', 'UPSERT', 'RESET'] as GlobalSearchEntitySeedMode[]).map(mode => (
                  <SelectItem key={mode} value={mode}>
                    {mode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => seedEntities().catch(() => undefined)}>
              Seed Defaults
            </Button>
          </div>
          <div className="gba:flex gba:gap-2">
            <Button variant="outline" onClick={() => loadEntities().catch(() => undefined)}>
              Reload
            </Button>
            <Button onClick={openCreateDialog}>Create</Button>
          </div>
        </div>

        {statusMessage && <p className="gba:text-sm gba:text-muted-foreground">{statusMessage}</p>}
        {errorMessage && <p className="gba:text-sm gba:text-destructive">{errorMessage}</p>}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>ACL</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {entities.map(entity => (
              <TableRow key={entity.entityType}>
                <TableCell className="gba:font-mono">{entity.entityType}</TableCell>
                <TableCell>{entity.entityTypeLabel}</TableCell>
                <TableCell>{entity.categoryKey}</TableCell>
                <TableCell>
                  <Badge variant={entityStatusBadgeVariant(entity.active)}>
                    {entity.active ? 'active' : 'inactive'}
                  </Badge>
                </TableCell>
                <TableCell>{entity.kind}</TableCell>
                <TableCell>{entity.accessControlType}</TableCell>
                <TableCell>
                  <div className="gba:flex gba:flex-wrap gba:justify-end gba:gap-2">
                    <Button size="sm" variant="outline" onClick={() => setViewEntity(entity)}>
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(entity.entityType).catch(() => undefined)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteEntity(entity.entityType).catch(() => undefined)}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <EntityDialog
        mode={dialogMode}
        open={isEntityDialogOpen}
        values={formValues}
        onOpenChange={open => {
          setIsEntityDialogOpen(open)
          if (!open) setSelectedEntity(null)
        }}
        onChange={updateField}
        onSubmit={() => submitEntity().catch(() => undefined)}
      />

      <Dialog open={!!viewEntity} onOpenChange={() => setViewEntity(null)}>
        <DialogContent className="gba:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{viewEntity?.entityType}</DialogTitle>
          </DialogHeader>
          <pre className="gba:max-h-96 gba:overflow-auto gba:rounded-md gba:bg-muted gba:p-3 gba:text-xs">
            {JSON.stringify(viewEntity, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
