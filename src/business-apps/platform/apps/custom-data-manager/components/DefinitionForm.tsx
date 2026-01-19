import React, { useRef, useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Alert,
  AlertDescription,
  Spinner,
  Badge
} from '@newwork/nw-design-system'
import { Save, Database, Eye, Settings } from 'lucide-react'
import { CustomDataDefinition, CreateDefinitionDto, UpdateDefinitionDto } from '../types'
import { ColumnEditor } from './ColumnEditor'
import { SchemaPreview } from './SchemaPreview'
import { sanitizeDefinitionKey, validateDefinitionForm } from '../utils/definitionFormUtils'
import { createInitialColumns, ensureColumnUiIds, stripColumnUiIds, UiColumnDefinition } from '../utils/columnUiIds'

interface DefinitionFormProps {
  open: boolean
  onClose: () => void
  definition?: CustomDataDefinition | null
  onSave: (dto: CreateDefinitionDto | UpdateDefinitionDto, id?: string) => Promise<void>
  availableNamespaces?: string[]
  onOpenCreateNamespace?: () => void
  'data-testid'?: string
}

/**
 * Definition Form Dialog
 * Create or edit a custom data definition with columns
 */
export const DefinitionForm: React.FC<DefinitionFormProps> = ({
  open,
  onClose,
  definition,
  onSave,
  availableNamespaces,
  onOpenCreateNamespace,
  'data-testid': testId = 'definition-form'
}) => {
  const isEdit = !!definition
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('general')

  const keyInputRef = useRef<HTMLInputElement | null>(null)

  // Form state
  const [namespace, setNamespace] = useState('default')
  const [key, setKey] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [columns, setColumns] = useState<UiColumnDefinition[]>([])

  // Initialize form when definition changes
  useEffect(() => {
    if (definition) {
      setNamespace(definition.namespace || 'default')
      setKey(definition.key)
      setDisplayName(definition.display_name || '')
      setDescription(definition.description || '')
      setColumns(ensureColumnUiIds(definition.columns_json || []))
    } else {
      // Reset form for new definition
      setNamespace('default')
      setKey('')
      setDisplayName('')
      setDescription('')
      setColumns(createInitialColumns())
    }
    setActiveTab('general')
    setError(null)
  }, [definition, open])

  const handleKeyChange = (value: string) => {
    // Keep raw input while typing to avoid focus/cursor issues; normalize on blur/submit.
    setKey(value)
    // Workaround: some dialog/input combinations can drop focus on controlled updates.
    // Re-focus on next frame if needed.
    requestAnimationFrame(() => {
      if (keyInputRef.current && document.activeElement !== keyInputRef.current) {
        keyInputRef.current.focus()
      }
    })
  }

  const handleKeyBlur = () => {
    setKey(prev => sanitizeDefinitionKey(prev))
  }

  const handleSubmit = async () => {
    const normalizedKey = sanitizeDefinitionKey(key)
    if (normalizedKey !== key) {
      setKey(normalizedKey)
    }

    const validationError = validateDefinitionForm({ key: normalizedKey, columns })
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      if (isEdit) {
        const dto: UpdateDefinitionDto = {
          display_name: displayName || undefined,
          description: description || undefined,
          columns_json: columns
        }
        await onSave(dto, definition.id)
      } else {
        const dto: CreateDefinitionDto = {
          namespace,
          key: normalizedKey,
          kind: 'ENTITY',
          display_name: displayName || undefined,
          description: description || undefined,
          columns_json: stripColumnUiIds(columns)
        }
        await onSave(dto)
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save definition')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent
        className="gba:max-w-4xl gba:max-h-[90vh] gba:overflow-hidden gba:flex gba:flex-col"
        data-testid={testId}
      >
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Database className="gba:h-5 gba:w-5 gba:text-secondary" />
            {isEdit ? 'Edit Definition' : 'Create New Definition'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Editing "${definition?.display_name || definition?.key}"`
              : 'Define a new custom data schema with columns'}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="gba:flex-1 gba:overflow-hidden gba:flex gba:flex-col"
        >
          <TabsList className="gba:grid gba:grid-cols-3">
            <TabsTrigger value="general" className="gba:flex gba:items-center gba:gap-1">
              <Settings className="gba:h-4 gba:w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="columns" className="gba:flex gba:items-center gba:gap-1">
              <Database className="gba:h-4 gba:w-4" />
              Columns ({columns.length})
            </TabsTrigger>
            <TabsTrigger value="preview" className="gba:flex gba:items-center gba:gap-1">
              <Eye className="gba:h-4 gba:w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <div className="gba:flex-1 gba:overflow-auto gba:py-4">
            {/* General Tab */}
            <TabsContent value="general" className="gba:space-y-4 gba:mt-0">
              {/* Namespace */}
              <div className="gba:space-y-2">
                <Label htmlFor={`${testId}-namespace`}>
                  Namespace <span className="gba:text-destructive">*</span>
                </Label>
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Select value={namespace} onValueChange={setNamespace} disabled={isEdit}>
                    <SelectTrigger className="gba:flex-1" data-testid={`${testId}-namespace`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(availableNamespaces && availableNamespaces.length > 0 ? availableNamespaces : ['default']).map(
                        ns => (
                          <SelectItem key={ns} value={ns}>
                            {ns}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                  {!isEdit && onOpenCreateNamespace && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onOpenCreateNamespace}
                      data-testid={`${testId}-namespace-create`}
                    >
                      Create
                    </Button>
                  )}
                </div>
                <p className="gba:text-xs gba:text-muted-foreground">
                  Namespace isolates your data sources. Keys must be unique within a namespace.
                </p>
              </div>

              <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                {/* Key */}
                <div className="gba:space-y-2">
                  <Label htmlFor={`${testId}-key`}>
                    Key <span className="gba:text-destructive">*</span>
                  </Label>
                  <Input
                    ref={keyInputRef}
                    id={`${testId}-key`}
                    value={key}
                    onChange={e => handleKeyChange(e.target.value)}
                    onBlur={handleKeyBlur}
                    placeholder="my_data_table"
                    disabled={isEdit}
                    className="gba:font-mono"
                    data-testid={`${testId}-key`}
                  />
                  <p className="gba:text-xs gba:text-muted-foreground">
                    Unique within namespace (cannot be changed after creation)
                  </p>
                </div>

                {/* Type */}
                <div className="gba:space-y-2">
                  <Label>Type</Label>
                  <Badge variant="secondary" className="gba:gap-2 gba:w-fit">
                    <Database className="gba:h-4 gba:w-4" />
                    Entity
                  </Badge>
                  <p className="gba:text-xs gba:text-muted-foreground">Native PostgreSQL table (requires promotion)</p>
                </div>
              </div>

              {/* Display Name */}
              <div className="gba:space-y-2">
                <Label htmlFor={`${testId}-display-name`}>Display Name</Label>
                <Input
                  id={`${testId}-display-name`}
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="My Data Table"
                  data-testid={`${testId}-display-name`}
                />
              </div>

              {/* Description */}
              <div className="gba:space-y-2">
                <Label htmlFor={`${testId}-description`}>Description</Label>
                <Textarea
                  id={`${testId}-description`}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe what this data table is used for..."
                  rows={3}
                  data-testid={`${testId}-description`}
                />
              </div>

              {/* Spreadsheet import removed: spreadsheets are managed by a dedicated service */}
            </TabsContent>

            {/* Columns Tab */}
            <TabsContent value="columns" className="gba:mt-0">
              <ColumnEditor columns={columns} onChange={setColumns} data-testid={`${testId}-column-editor`} />
            </TabsContent>

            {/* Preview Tab */}
            <TabsContent value="preview" className="gba:mt-0">
              <SchemaPreview columns={columns} data-testid={`${testId}-preview`} />
            </TabsContent>
          </div>
        </Tabs>

        {error && (
          <Alert variant="destructive" className="gba:mt-2">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} data-testid={`${testId}-cancel`}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} data-testid={`${testId}-save`}>
            {isSubmitting ? (
              <>
                <Spinner size="sm" className="gba:mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="gba:h-4 gba:w-4 gba:mr-2" />
                {isEdit ? 'Save Changes' : 'Create Definition'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
