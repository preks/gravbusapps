import React, { useState, useCallback, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Alert,
  AlertDescription,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch
} from '@newwork/nw-design-system'
import { Plus, Link as LinkIcon, AlertCircle, Check } from 'lucide-react'
import { CustomDataDefinition, EntityRelationship } from '../types'

interface RelationshipManagerProps {
  currentEntity: CustomDataDefinition
  availableEntities: CustomDataDefinition[]
  onCreateRelationship: (relationship: EntityRelationship) => Promise<void>
  'data-testid'?: string
}

export const RelationshipManager: React.FC<RelationshipManagerProps> = ({
  currentEntity,
  availableEntities,
  onCreateRelationship,
  'data-testid': testId = 'relationship-manager'
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [relationType, setRelationType] = useState<'parent' | 'child'>('parent')
  const [selectedEntityKey, setSelectedEntityKey] = useState<string>('')
  const [foreignKeyColumn, setForeignKeyColumn] = useState<string>('')
  const [cascadeDelete, setCascadeDelete] = useState(false)

  // Filter out current entity and non-promoted entities
  const selectableEntities = availableEntities.filter(
    e => e.id !== currentEntity.id && e.publish_state === 'PROMOTED_TRACKED'
  )

  // Find foreign key columns based on relationship type
  // If current is child (has parent), FK is in current entity
  // If current is parent (has children), FK is in the selected child entity
  const currentEntityForeignKeyColumns = currentEntity.columns_json.filter(
    col => col.type === 'SELECT' && col.dataSource?.type === 'ENTITY'
  )

  // Get foreign key columns from selected entity (for when current entity is parent)
  const selectedEntity = availableEntities.find(e => e.key === selectedEntityKey)
  const selectedEntityForeignKeyColumns =
    selectedEntity?.columns_json.filter(col => col.type === 'SELECT' && col.dataSource?.type === 'ENTITY') || []

  const handleOpenDialog = useCallback(() => {
    setError(null)
    setRelationType('parent')
    setSelectedEntityKey('')
    setForeignKeyColumn('')
    setCascadeDelete(false)
    setIsDialogOpen(true)
  }, [])

  // Reset foreign key column when relationship type or selected entity changes
  useEffect(() => {
    setForeignKeyColumn('')
  }, [relationType, selectedEntityKey])

  const handleCreateRelationship = useCallback(async () => {
    if (!selectedEntityKey || !foreignKeyColumn) {
      setError('Please fill in all required fields')
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      let relationship: EntityRelationship

      if (relationType === 'parent') {
        // Current entity is child, selected entity is parent
        // ONE_TO_MANY: parent -> current
        relationship = {
          type: 'ONE_TO_MANY',
          sourceEntity: selectedEntityKey,
          targetEntity: currentEntity.key,
          foreignKeyColumn: foreignKeyColumn,
          cascadeDelete
        }
      } else {
        // Current entity is parent, selected entity is child
        // ONE_TO_MANY: current -> child
        // The foreign key must be in the selected (child) entity
        relationship = {
          type: 'ONE_TO_MANY',
          sourceEntity: currentEntity.key,
          targetEntity: selectedEntityKey,
          foreignKeyColumn: foreignKeyColumn,
          cascadeDelete
        }
      }

      await onCreateRelationship(relationship)
      setIsDialogOpen(false)
    } catch (err: any) {
      setError(err.message || 'Failed to create relationship')
    } finally {
      setIsCreating(false)
    }
  }, [relationType, selectedEntityKey, foreignKeyColumn, cascadeDelete, currentEntity, onCreateRelationship])

  if (currentEntity.publish_state !== 'PROMOTED_TRACKED') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <LinkIcon className="gba:h-5 gba:w-5" />
            Relationships
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="gba:h-4 gba:w-4" />
            <AlertDescription>This entity must be promoted before you can create relationships.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card data-testid={testId}>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <LinkIcon className="gba:h-5 gba:w-5" />
              Relationships
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenDialog}
              disabled={selectableEntities.length === 0}
              data-testid={`${testId}-add-button`}
            >
              <Plus className="gba:h-4 gba:w-4 gba:mr-2" />
              Add Relationship
            </Button>
            {selectableEntities.length === 0 && (
              <p className="gba:text-xs gba:text-muted-foreground">No other promoted entities available</p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {selectableEntities.length === 0 ? (
            <Alert>
              <AlertDescription>
                No other promoted entities available. Create and promote other entities first to establish
                relationships.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="gba:space-y-4">
              {currentEntityForeignKeyColumns.length > 0 && (
                <div className="gba:text-sm gba:text-muted-foreground">
                  <p>Foreign key columns in this entity:</p>
                  <div className="gba:mt-2 gba:space-y-2">
                    {currentEntityForeignKeyColumns.map((col, idx) => (
                      <div
                        key={idx}
                        className="gba:flex gba:items-center gba:gap-2 gba:p-2 gba:bg-muted gba:rounded-md"
                      >
                        <Badge variant="outline">{col.label}</Badge>
                        <span className="gba:text-xs">→</span>
                        <code className="gba:text-xs">{col.dataSource?.entity}</code>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={currentEntityForeignKeyColumns.length > 0 ? 'gba:pt-4 gba:border-t' : ''}>
                <p className="gba:text-sm gba:font-medium gba:mb-2">How to create relationships:</p>
                <ol className="gba:text-sm gba:text-muted-foreground gba:space-y-1 gba:list-decimal gba:list-inside">
                  <li>Click "Add Relationship" button above</li>
                  <li>Choose whether this entity is the parent or child</li>
                  <li>Select the related entity</li>
                  <li>Select the foreign key column</li>
                  <li>The relationship will create PostgreSQL foreign keys and Hasura GraphQL relationships</li>
                </ol>
                <Alert className="gba:mt-4">
                  <AlertDescription className="gba:text-xs">
                    <strong>Note:</strong> If this entity is the <strong>parent</strong> (has children), the foreign key
                    column must exist in the <strong>child entity</strong>. If this entity is the <strong>child</strong>{' '}
                    (has a parent), the foreign key column must exist in <strong>this entity</strong>.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Relationship Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent data-testid={`${testId}-dialog`}>
          <DialogHeader>
            <DialogTitle>Create Relationship</DialogTitle>
            <DialogDescription>Create a one-to-many relationship between entities</DialogDescription>
          </DialogHeader>

          <div className="gba:space-y-4 gba:py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="gba:h-4 gba:w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="gba:space-y-2">
              <Label>Relationship Type</Label>
              <Select value={relationType} onValueChange={value => setRelationType(value as 'parent' | 'child')}>
                <SelectTrigger data-testid={`${testId}-type-select`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">This entity has a parent (current entity is the child)</SelectItem>
                  <SelectItem value="child">This entity has children (current entity is the parent)</SelectItem>
                </SelectContent>
              </Select>
              <p className="gba:text-xs gba:text-muted-foreground">
                {relationType === 'parent'
                  ? `${currentEntity.display_name || currentEntity.key} belongs to another entity`
                  : `${currentEntity.display_name || currentEntity.key} has many of another entity`}
              </p>
            </div>

            <div className="gba:space-y-2">
              <Label>Related Entity</Label>
              <Select value={selectedEntityKey} onValueChange={setSelectedEntityKey}>
                <SelectTrigger data-testid={`${testId}-entity-select`}>
                  <SelectValue placeholder="Select an entity..." />
                </SelectTrigger>
                <SelectContent>
                  {selectableEntities.map(entity => (
                    <SelectItem key={entity.id} value={entity.key}>
                      {entity.display_name || entity.key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="gba:space-y-2">
              <Label>Foreign Key Column</Label>
              <Select value={foreignKeyColumn} onValueChange={setForeignKeyColumn}>
                <SelectTrigger data-testid={`${testId}-column-select`}>
                  <SelectValue
                    placeholder={selectedEntityKey ? 'Select a foreign key column...' : 'Select an entity first'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    if (!selectedEntityKey) return null

                    const columns =
                      relationType === 'parent'
                        ? // Current entity is child, FK is in current entity pointing to selected parent
                          currentEntityForeignKeyColumns.filter(col => col.dataSource?.entity === selectedEntityKey)
                        : // Current entity is parent, FK is in selected child pointing to current entity
                          selectedEntityForeignKeyColumns.filter(col => col.dataSource?.entity === currentEntity.key)

                    if (columns.length === 0) {
                      return (
                        <div className="gba:p-2 gba:text-xs gba:text-muted-foreground">
                          No matching foreign key columns found
                        </div>
                      )
                    }

                    return columns.map(col => (
                      <SelectItem key={col.name} value={col.name}>
                        {col.label} ({col.name})
                      </SelectItem>
                    ))
                  })()}
                </SelectContent>
              </Select>
              <p className="gba:text-xs gba:text-muted-foreground">
                {relationType === 'parent'
                  ? `The column in ${currentEntity.display_name || currentEntity.key} that references ${selectedEntity?.display_name || selectedEntityKey}`
                  : `The column in ${selectedEntity?.display_name || selectedEntityKey} that references ${currentEntity.display_name || currentEntity.key}`}
              </p>

              {/* Debug information */}
              {selectedEntityKey && (
                <div className="gba:mt-2 gba:p-2 gba:bg-muted gba:rounded gba:text-xs gba:space-y-1">
                  <p className="gba:font-medium">Debug Info:</p>
                  {relationType === 'parent' ? (
                    <>
                      <p>
                        Looking for FK columns in: <strong>{currentEntity.key}</strong>
                      </p>
                      <p>
                        That reference: <strong>{selectedEntityKey}</strong>
                      </p>
                      <p>Current entity FK columns: {currentEntityForeignKeyColumns.length}</p>
                      <p>
                        Matching columns:{' '}
                        {
                          currentEntityForeignKeyColumns.filter(col => col.dataSource?.entity === selectedEntityKey)
                            .length
                        }
                      </p>
                      {currentEntityForeignKeyColumns.length > 0 && (
                        <details className="gba:mt-1">
                          <summary className="gba:cursor-pointer">View all FK columns</summary>
                          <ul className="gba:ml-4 gba:mt-1">
                            {currentEntityForeignKeyColumns.map(col => (
                              <li key={col.name}>
                                {col.name} → {col.dataSource?.entity || 'no target'}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </>
                  ) : (
                    <>
                      <p>
                        Looking for FK columns in: <strong>{selectedEntityKey}</strong>
                      </p>
                      <p>
                        That reference: <strong>{currentEntity.key}</strong>
                      </p>
                      <p>Selected entity FK columns: {selectedEntityForeignKeyColumns.length}</p>
                      <p>
                        Matching columns:{' '}
                        {
                          selectedEntityForeignKeyColumns.filter(col => col.dataSource?.entity === currentEntity.key)
                            .length
                        }
                      </p>
                      {selectedEntityForeignKeyColumns.length > 0 && (
                        <details className="gba:mt-1">
                          <summary className="gba:cursor-pointer">View all FK columns</summary>
                          <ul className="gba:ml-4 gba:mt-1">
                            {selectedEntityForeignKeyColumns.map(col => (
                              <li key={col.name}>
                                {col.name} → {col.dataSource?.entity || 'no target'}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </>
                  )}
                </div>
              )}

              {relationType === 'child' &&
                selectedEntityForeignKeyColumns.filter(col => col.dataSource?.entity === currentEntity.key).length ===
                  0 &&
                selectedEntityKey && (
                  <Alert variant="destructive" className="gba:mt-2">
                    <AlertCircle className="gba:h-4 gba:w-4" />
                    <AlertDescription className="gba:text-xs">
                      The selected entity "{selectedEntity?.display_name || selectedEntityKey}" has no foreign key
                      columns pointing to "{currentEntity.display_name || currentEntity.key}". Add a SELECT column with
                      ENTITY data source (referencing {currentEntity.key}) in the child entity first.
                    </AlertDescription>
                  </Alert>
                )}

              {relationType === 'parent' &&
                currentEntityForeignKeyColumns.filter(col => col.dataSource?.entity === selectedEntityKey).length ===
                  0 &&
                selectedEntityKey && (
                  <Alert variant="destructive" className="gba:mt-2">
                    <AlertCircle className="gba:h-4 gba:w-4" />
                    <AlertDescription className="gba:text-xs">
                      This entity "{currentEntity.display_name || currentEntity.key}" has no foreign key columns
                      pointing to "{selectedEntity?.display_name || selectedEntityKey}". Add a SELECT column with ENTITY
                      data source (referencing {selectedEntityKey}) in this entity first.
                    </AlertDescription>
                  </Alert>
                )}
            </div>

            <div className="gba:flex gba:items-center gba:gap-2">
              <Switch
                id="cascade-delete"
                checked={cascadeDelete}
                onCheckedChange={setCascadeDelete}
                data-testid={`${testId}-cascade-toggle`}
              />
              <Label htmlFor="cascade-delete" className="gba:cursor-pointer">
                Cascade Delete
              </Label>
            </div>
            <p className="gba:text-xs gba:text-muted-foreground">
              If enabled, deleting the parent will automatically delete all related child records
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isCreating}
              data-testid={`${testId}-cancel-button`}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateRelationship}
              disabled={isCreating || !selectedEntityKey || !foreignKeyColumn}
              data-testid={`${testId}-create-button`}
            >
              {isCreating ? (
                <>Creating...</>
              ) : (
                <>
                  <Check className="gba:h-4 gba:w-4 gba:mr-2" />
                  Create Relationship
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
