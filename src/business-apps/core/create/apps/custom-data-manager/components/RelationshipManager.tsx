import React, { useState, useCallback, useEffect, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Alert,
  AlertDescription,
  Badge,
  Combobox,
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
import { useInternalEntityTypes } from '../hooks/useInternalEntityTypes'

interface RelationshipManagerProps {
  currentEntity: CustomDataDefinition
  availableEntities: CustomDataDefinition[]
  accessToken: string
  onCreateRelationship: (relationship: EntityRelationship) => Promise<void>
  'data-testid'?: string
}

export const RelationshipManager: React.FC<RelationshipManagerProps> = ({
  currentEntity,
  availableEntities,
  accessToken,
  onCreateRelationship,
  'data-testid': testId = 'relationship-manager'
}) => {
  const { internalEntityTypes } = useInternalEntityTypes(accessToken)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [relationType, setRelationType] = useState<'parent' | 'child'>('parent')
  const [selectedEntityKey, setSelectedEntityKey] = useState<string>('')
  const [foreignKeyColumn, setForeignKeyColumn] = useState<string>('')
  const [cascadeDelete, setCascadeDelete] = useState(false)

  // Filter out current entity and non-promoted entities
  const selectableEntities = availableEntities.filter(
    e => e.id !== currentEntity.id && e.publish_state === 'PROMOTED_TRACKED'
  )

  const isEntityRefColumn = (col: { type: string; dataSource?: { type: string } }) =>
    col.type === 'SELECT' && (col.dataSource?.type === 'CUSTOM_ENTITY' || col.dataSource?.type === 'INTERNAL_ENTITY')

  // Find foreign key columns based on relationship type
  const currentEntityForeignKeyColumns = currentEntity.columns_json.filter(isEntityRefColumn)

  const isCustomEntity = selectableEntities.some(e => e.key === selectedEntityKey)
  const isInternalEntitySelected = selectedEntityKey.length > 0 && !isCustomEntity

  // Get foreign key columns from selected entity (for when current entity is parent)
  const selectedEntity = availableEntities.find(e => e.key === selectedEntityKey)
  const selectedEntityForeignKeyColumns = selectedEntity?.columns_json.filter(isEntityRefColumn) || []

  const entityComboboxOptions = useMemo(() => {
    const customOptions = selectableEntities.map(entity => ({
      value: entity.key,
      label: (
        <div className="gba:flex gba:flex-col gba:min-w-0 gba:w-full">
          <div className="gba:text-sm gba:font-medium gba:truncate">{entity.display_name || entity.key}</div>
          <div className="gba:text-xs gba:text-muted-foreground gba:truncate">Custom Entity</div>
        </div>
      )
    }))

    const internalOptions = (relationType === 'parent' ? internalEntityTypes : []).map(entity => ({
      value: entity.name,
      label: (
        <div className="gba:flex gba:flex-col gba:min-w-0 gba:w-full">
          <div className="gba:text-sm gba:font-medium gba:truncate">{entity.displayName || entity.name}</div>
          <div className="gba:text-xs gba:text-muted-foreground gba:truncate">Internal Entity</div>
        </div>
      )
    }))

    return [...customOptions, ...internalOptions]
  }, [selectableEntities, relationType, internalEntityTypes])

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
      const isInternal = isInternalEntitySelected
      const targetKind = isInternal ? ('INTERNAL_ENTITY' as const) : undefined

      let relationship: EntityRelationship
      if (relationType === 'parent') {
        relationship = {
          type: 'ONE_TO_MANY',
          sourceEntity: selectedEntityKey,
          targetEntity: currentEntity.key,
          foreignKeyColumn: foreignKeyColumn,
          cascadeDelete,
          targetKind
        }
      } else {
        relationship = {
          type: 'ONE_TO_MANY',
          sourceEntity: currentEntity.key,
          targetEntity: selectedEntityKey,
          foreignKeyColumn: foreignKeyColumn,
          cascadeDelete,
          targetKind
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
            <Button variant="outline" size="sm" onClick={handleOpenDialog} data-testid={`${testId}-add-button`}>
              <Plus className="gba:h-4 gba:w-4 gba:mr-2" />
              Add Relationship
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="gba:space-y-4">
            {currentEntityForeignKeyColumns.length > 0 && (
              <div className="gba:text-sm gba:text-muted-foreground">
                <p>Foreign key columns in this entity:</p>
                <div className="gba:mt-2 gba:space-y-2">
                  {currentEntityForeignKeyColumns.map((col, idx) => (
                    <div key={idx} className="gba:flex gba:items-center gba:gap-2 gba:p-2 gba:bg-muted gba:rounded-md">
                      <Badge variant="outline">{col.label}</Badge>
                      <span className="gba:text-xs">→</span>
                      <code className="gba:text-xs">{col.dataSource?.entity}</code>
                      {col.dataSource?.type === 'INTERNAL_ENTITY' && (
                        <Badge variant="secondary" className="gba:text-xs">
                          internal
                        </Badge>
                      )}
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
              <Combobox
                className="gba:w-full"
                options={entityComboboxOptions}
                value={selectedEntityKey}
                onValueChange={value => setSelectedEntityKey(value ?? '')}
                placeholder="Search entities..."
                searchPlaceholder="Type to search..."
                emptyText="No matching entities"
                data-testid={`${testId}-entity-select`}
              />
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

                    let columns: typeof currentEntityForeignKeyColumns
                    if (relationType === 'parent' && isInternalEntitySelected) {
                      columns = currentEntityForeignKeyColumns.filter(
                        col =>
                          col.dataSource?.type === 'INTERNAL_ENTITY' && col.dataSource?.entity === selectedEntityKey
                      )
                    } else if (relationType === 'parent') {
                      columns = currentEntityForeignKeyColumns.filter(
                        col => col.dataSource?.entity === selectedEntityKey
                      )
                    } else {
                      columns = selectedEntityForeignKeyColumns.filter(
                        col => col.dataSource?.entity === currentEntity.key
                      )
                    }

                    if (columns.length === 0) {
                      return (
                        <div className="gba:p-2 gba:text-xs gba:text-muted-foreground">
                          No matching foreign key columns found
                        </div>
                      )
                    }

                    return columns.map((col, idx) => (
                      <SelectItem key={`${col.name}-${idx}`} value={col.name}>
                        {col.label} ({col.name})
                      </SelectItem>
                    ))
                  })()}
                </SelectContent>
              </Select>
              <p className="gba:text-xs gba:text-muted-foreground">
                {relationType === 'parent'
                  ? `The column in ${currentEntity.display_name || currentEntity.key} that references ${isInternalEntitySelected ? selectedEntityKey + ' (internal)' : selectedEntity?.display_name || selectedEntityKey}`
                  : `The column in ${selectedEntity?.display_name || selectedEntityKey} that references ${currentEntity.display_name || currentEntity.key}`}
              </p>

              {relationType === 'child' &&
                selectedEntityForeignKeyColumns.filter(col => col.dataSource?.entity === currentEntity.key).length ===
                  0 &&
                selectedEntityKey && (
                  <Alert variant="destructive" className="gba:mt-2">
                    <AlertCircle className="gba:h-4 gba:w-4" />
                    <AlertDescription className="gba:text-xs">
                      The selected entity "{selectedEntity?.display_name || selectedEntityKey}" has no Dropdown column
                      with data source referencing "{currentEntity.display_name || currentEntity.key}". Add one in the
                      child entity first.
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
                      This entity has no Dropdown column with data source referencing "{selectedEntityKey}". Add a
                      Dropdown column with {isInternalEntitySelected ? 'Internal Entity' : 'Custom Entity'} data source
                      (referencing {selectedEntityKey}) in this entity first.
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
