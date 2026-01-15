import React, { useState, useEffect, useRef, useCallback } from 'react'
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
import { Save, FileSpreadsheet, Database, Eye, Settings, Upload, FileText, Check, X, Table2 } from 'lucide-react'
import {
  CustomDataDefinition,
  CreateDefinitionDto,
  UpdateDefinitionDto,
  DefinitionKind,
  ColumnDefinition,
  InputType
} from '../types'
import { ColumnEditor } from './ColumnEditor'
import { SchemaPreview } from './SchemaPreview'
import { parseFile, generateKeyFromFilename, ParsedFileResult } from '../utils/fileParser'

interface DefinitionFormProps {
  open: boolean
  onClose: () => void
  definition?: CustomDataDefinition | null
  onSave: (
    dto: CreateDefinitionDto | UpdateDefinitionDto,
    id?: string,
    initialRows?: Record<string, any>[]
  ) => Promise<void>
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
  'data-testid': testId = 'definition-form'
}) => {
  const isEdit = !!definition
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('general')

  // Form state
  const [namespace, setNamespace] = useState('default')
  const [key, setKey] = useState('')
  const [kind, setKind] = useState<DefinitionKind>('SPREADSHEET')
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [columns, setColumns] = useState<ColumnDefinition[]>([])

  // File import state
  const [parsedFile, setParsedFile] = useState<ParsedFileResult | null>(null)
  const [isParsingFile, setIsParsingFile] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize form when definition changes
  useEffect(() => {
    if (definition) {
      setNamespace(definition.namespace || 'default')
      setKey(definition.key)
      setKind(definition.kind)
      setDisplayName(definition.display_name || '')
      setDescription(definition.description || '')
      setColumns(definition.columns_json || [])
    } else {
      // Reset form for new definition
      setNamespace('default')
      setKey('')
      setKind('SPREADSHEET')
      setDisplayName('')
      setDescription('')
      setColumns([{ type: InputType.TEXT, name: 'name', label: 'Name', required: true }])
    }
    setActiveTab('general')
    setError(null)
    setParsedFile(null)
    setFileError(null)
  }, [definition, open])

  // Handle file upload
  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      setIsParsingFile(true)
      setFileError(null)

      try {
        const result = await parseFile(file)
        setParsedFile(result)

        // Auto-fill form fields from file
        const suggestedKey = generateKeyFromFilename(file.name)
        if (!key) setKey(suggestedKey)
        if (!displayName) setDisplayName(file.name.replace(/\.(csv|xlsx|xls)$/i, ''))

        // Set columns from parsed file
        setColumns(result.columns)

        // Switch to columns tab to show the extracted schema
        setActiveTab('columns')
      } catch (err) {
        setFileError(err instanceof Error ? err.message : 'Failed to parse file')
        setParsedFile(null)
      } finally {
        setIsParsingFile(false)
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    },
    [key, displayName]
  )

  // Clear uploaded file
  const handleClearFile = useCallback(() => {
    setParsedFile(null)
    setFileError(null)
    setColumns([{ type: InputType.TEXT, name: 'name', label: 'Name', required: true }])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleKeyChange = (value: string) => {
    // Convert to valid key format: lowercase, underscores instead of spaces
    const sanitized = value
      .toLowerCase()
      .replaceAll(/\s+/g, '_')
      .replaceAll(/[^a-z0-9_]/g, '')
    setKey(sanitized)
  }

  const validateForm = (): string | null => {
    if (!key.trim()) return 'Key is required'
    if (key.length < 3) return 'Key must be at least 3 characters'
    if (!/^[a-z][a-z0-9_]*$/.test(key))
      return 'Key must start with a letter and contain only lowercase letters, numbers, and underscores'
    if (columns.length === 0) return 'At least one column is required'

    // Validate each column
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i]
      if (!col.name.trim()) return `Column ${i + 1}: Name is required`
      if (!col.label.trim()) return `Column ${i + 1}: Label is required`
      if (!/^[a-z][a-z0-9_]*$/.test(col.name)) {
        return `Column ${i + 1}: Name must start with a letter and contain only lowercase letters, numbers, and underscores`
      }
    }

    // Check for duplicate column names
    const names = columns.map(c => c.name)
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index)
    if (duplicates.length > 0) {
      return `Duplicate column name: ${duplicates[0]}`
    }

    return null
  }

  const handleSubmit = async () => {
    const validationError = validateForm()
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
          key,
          kind,
          display_name: displayName || undefined,
          description: description || undefined,
          columns_json: columns
        }
        // Pass initial rows from parsed file for import after creation
        const initialRows = parsedFile?.rows || undefined
        await onSave(dto, undefined, initialRows)
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
            {kind === 'SPREADSHEET' ? (
              <FileSpreadsheet className="gba:h-5 gba:w-5 gba:text-info" />
            ) : (
              <Database className="gba:h-5 gba:w-5 gba:text-secondary" />
            )}
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
                <Select value={namespace} onValueChange={setNamespace} disabled={isEdit}>
                  <SelectTrigger data-testid={`${testId}-namespace`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">default</SelectItem>
                    <SelectItem value="com.mycompany.hr">com.mycompany.hr</SelectItem>
                    <SelectItem value="com.mycompany.finance">com.mycompany.finance</SelectItem>
                    <SelectItem value="com.mycompany.platform">com.mycompany.platform</SelectItem>
                  </SelectContent>
                </Select>
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
                    id={`${testId}-key`}
                    value={key}
                    onChange={e => handleKeyChange(e.target.value)}
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
                  <Label htmlFor={`${testId}-kind`}>
                    Type <span className="gba:text-destructive">*</span>
                  </Label>
                  <Select value={kind} onValueChange={value => setKind(value as DefinitionKind)} disabled={isEdit}>
                    <SelectTrigger data-testid={`${testId}-kind`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SPREADSHEET">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <FileSpreadsheet className="gba:h-4 gba:w-4" />
                          Spreadsheet
                        </div>
                      </SelectItem>
                      <SelectItem value="ENTITY">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Database className="gba:h-4 gba:w-4" />
                          Entity
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="gba:text-xs gba:text-muted-foreground">
                    {kind === 'SPREADSHEET'
                      ? 'Flexible storage in generic schema'
                      : 'Native PostgreSQL table (requires promotion)'}
                  </p>
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

              {/* File Upload - Only for new SPREADSHEET definitions */}
              {!isEdit && kind === 'SPREADSHEET' && (
                <div className="gba:space-y-3 gba:pt-4 gba:border-t gba:border-border">
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <div>
                      <Label className="gba:text-base gba:font-medium">Import from File</Label>
                      <p className="gba:text-sm gba:text-muted-foreground">
                        Upload a CSV or Excel file to automatically extract columns and data
                      </p>
                    </div>
                    <Badge variant="secondary">Optional</Badge>
                  </div>

                  {parsedFile ? (
                    <div className="gba:bg-success-secondary gba:border gba:border-success gba:rounded-lg gba:p-4">
                      <div className="gba:flex gba:items-start gba:justify-between">
                        <div className="gba:flex gba:items-start gba:gap-3">
                          <div className="gba:bg-success gba:rounded-full gba:p-1.5">
                            <Check className="gba:h-4 gba:w-4 gba:text-success-foreground" />
                          </div>
                          <div>
                            <p className="gba:font-medium gba:text-success-secondary-foreground">
                              File parsed successfully
                            </p>
                            <div className="gba:flex gba:items-center gba:gap-4 gba:mt-1 gba:text-sm gba:text-success-secondary-foreground/80">
                              <span className="gba:flex gba:items-center gba:gap-1">
                                <FileText className="gba:h-3.5 gba:w-3.5" />
                                {parsedFile.fileName}
                              </span>
                              <span className="gba:flex gba:items-center gba:gap-1">
                                <Table2 className="gba:h-3.5 gba:w-3.5" />
                                {parsedFile.columns.length} columns
                              </span>
                              <span className="gba:flex gba:items-center gba:gap-1">
                                <Database className="gba:h-3.5 gba:w-3.5" />
                                {parsedFile.rowCount} rows to import
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleClearFile}
                          className="gba:text-success-secondary-foreground gba:hover:bg-success/20"
                          data-testid={`${testId}-clear-file`}
                        >
                          <X className="gba:h-4 gba:w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={`gba:w-full gba:border-2 gba:border-dashed gba:rounded-lg gba:p-6 gba:text-center gba:transition-colors gba:cursor-pointer gba:bg-transparent ${
                        isParsingFile
                          ? 'gba:border-primary gba:bg-primary/5'
                          : 'gba:border-border gba:hover:border-primary gba:hover:bg-muted/50'
                      }`}
                      onClick={() => !isParsingFile && fileInputRef.current?.click()}
                      disabled={isParsingFile}
                      data-testid={`${testId}-file-upload-area`}
                    >
                      {isParsingFile ? (
                        <>
                          <Spinner size="md" className="gba:mx-auto gba:mb-2" />
                          <p className="gba:text-sm gba:font-medium">Parsing file...</p>
                        </>
                      ) : (
                        <>
                          <Upload className="gba:h-8 gba:w-8 gba:mx-auto gba:mb-2 gba:text-muted-foreground" />
                          <p className="gba:text-sm gba:font-medium">Click to upload CSV or Excel file</p>
                          <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                            Supports .csv, .xlsx, .xls files
                          </p>
                        </>
                      )}
                    </button>
                  )}

                  {fileError && (
                    <Alert variant="destructive">
                      <AlertDescription>{fileError}</AlertDescription>
                    </Alert>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="gba:hidden"
                    data-testid={`${testId}-file-input`}
                  />
                </div>
              )}
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
