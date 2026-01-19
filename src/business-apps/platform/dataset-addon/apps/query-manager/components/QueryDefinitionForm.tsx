import React, { useEffect, useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Switch,
  Alert,
  toast
} from '@newwork/nw-design-system'
import { FloppyDiskIcon, XIcon, PlusIcon, TrashIcon, PaintBrushIcon } from '@phosphor-icons/react'
import {
  QueryDefinition,
  QueryType,
  QueryStatus,
  ParameterType,
  QueryParameter,
  AdditionalColumn,
  Services
} from '@/common/network/dataset'

// Simple SQL formatter function
const formatSQL = (sql: string): string => {
  if (!sql || typeof sql !== 'string') return ''

  return sql
    .replace(
      /\b(SELECT|FROM|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|WHERE|GROUP BY|HAVING|ORDER BY|UNION|LIMIT|OFFSET)\b/gi,
      '\n$1'
    )
    .replace(/\b(AND|OR)\b(?![^(]*\))/gi, '\n  $1')
    .replace(/\n\s*\n/g, '\n')
    .trim()
    .split('\n')
    .map((line, index) => {
      const trimmed = line.trim()
      if (trimmed.match(/^(AND|OR)/i)) {
        return '  ' + trimmed
      }
      if (
        trimmed.match(
          /^(SELECT|FROM|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|WHERE|GROUP BY|HAVING|ORDER BY|UNION|LIMIT|OFFSET)/i
        )
      ) {
        return trimmed
      }
      if (index > 0 && trimmed) {
        return '  ' + trimmed
      }
      return trimmed
    })
    .join('\n')
}

interface QueryDefinitionFormProps {
  query: QueryDefinition | null
  visible: boolean
  onSave: (query: Omit<QueryDefinition, 'id' | 'createdAt' | 'updatedAt'>, validate?: boolean) => void
  onCancel: () => void
  isLoading: boolean
  defaultQueryType?: QueryType
  currentService: Services
}

export const QueryDefinitionForm: React.FC<QueryDefinitionFormProps> = ({
  query,
  visible,
  onSave,
  onCancel,
  isLoading,
  defaultQueryType
}) => {
  const [formValues, setFormValues] = useState({
    name: '',
    description: '',
    query: '',
    queryType: defaultQueryType || QueryType.DATASET,
    status: QueryStatus.DRAFT
  })
  const [parameters, setParameters] = useState<QueryParameter[]>([])
  const [additionalColumns, setAdditionalColumns] = useState<AdditionalColumn[]>([])
  const [isJsonMode, setIsJsonMode] = useState(false)
  const [jsonValue, setJsonValue] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [validateQuery, setValidateQuery] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isEditing = !!query

  // Format SQL function
  const handleFormatSQL = () => {
    if (formValues.query) {
      const formattedSQL = formatSQL(formValues.query)
      setFormValues(prev => ({ ...prev, query: formattedSQL }))
      toast.success('SQL query formatted successfully')
    }
  }

  // Default template
  const getDefaultJsonTemplate = () => ({
    name: '',
    description: '',
    query: 'SELECT * FROM your_table WHERE date >= :startDate',
    queryType: defaultQueryType || QueryType.DATASET,
    status: QueryStatus.DRAFT,
    parameters: [
      {
        name: 'startDate',
        type: ParameterType.DATE,
        description: 'Start date for filtering',
        required: true,
        defaultValue: undefined,
        allowedValues: undefined
      }
    ],
    additionalColumns: []
  })

  // Convert form data to JSON
  const formDataToJson = useMemo(
    () => ({
      name: formValues.name || '',
      description: formValues.description || '',
      query: formValues.query || '',
      queryType: formValues.queryType,
      status: formValues.status,
      parameters: parameters,
      additionalColumns: additionalColumns
    }),
    [formValues, parameters, additionalColumns]
  )

  // Initialize form
  useEffect(() => {
    if (visible && query) {
      // Editing existing query
      const formattedQuery = query.query ? formatSQL(query.query) : ''
      setFormValues({
        name: query.name,
        description: query.description,
        query: formattedQuery,
        queryType: query.queryType,
        status: query.status
      })
      setParameters(query.parameters || [])
      setAdditionalColumns(query.additionalColumns || [])
      setJsonValue(
        JSON.stringify(
          {
            name: query.name,
            description: query.description,
            query: formattedQuery,
            queryType: query.queryType,
            status: query.status,
            parameters: query.parameters || [],
            additionalColumns: query.additionalColumns || []
          },
          null,
          2
        )
      )
    } else if (visible) {
      // Creating new query
      const defaultTemplate = getDefaultJsonTemplate()
      setFormValues({
        name: defaultTemplate.name,
        description: defaultTemplate.description,
        query: defaultTemplate.query,
        queryType: defaultTemplate.queryType,
        status: defaultTemplate.status
      })
      setParameters(defaultTemplate.parameters)
      setAdditionalColumns(defaultTemplate.additionalColumns)
      setJsonValue(JSON.stringify(defaultTemplate, null, 2))
    }
  }, [visible, query, defaultQueryType])

  // Update JSON when form changes
  useEffect(() => {
    if (!isJsonMode) {
      setJsonValue(JSON.stringify(formDataToJson, null, 2))
    }
  }, [formDataToJson, isJsonMode])

  // Handle JSON change
  const handleJsonChange = (value: string) => {
    setJsonValue(value)
    setJsonError(null)

    try {
      const parsed = JSON.parse(value)
      setFormValues({
        name: parsed.name || '',
        description: parsed.description || '',
        query: parsed.query || '',
        queryType: parsed.queryType || QueryType.DATASET,
        status: parsed.status || QueryStatus.DRAFT
      })
      setParameters(parsed.parameters || [])
      setAdditionalColumns(parsed.additionalColumns || [])
    } catch {
      setJsonError('Invalid JSON format')
    }
  }

  // Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formValues.name.trim()) {
      newErrors.name = 'Query name is required'
    } else if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(formValues.name)) {
      newErrors.name = 'Name must start with letter and contain only letters, numbers, and underscores'
    }

    if (!formValues.description.trim()) {
      newErrors.description = 'Description is required'
    }

    if (!formValues.query.trim()) {
      newErrors.query = 'SQL query is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle save
  const handleSave = () => {
    if (isJsonMode) {
      if (jsonError) {
        toast.error('Please fix JSON errors before saving')
        return
      }
      try {
        const parsed = JSON.parse(jsonValue)
        onSave(parsed, validateQuery)
      } catch {
        toast.error('Invalid JSON format')
        return
      }
    } else {
      if (!validateForm()) {
        toast.error('Please fix form errors before saving')
        return
      }
      onSave(formDataToJson, validateQuery)
    }
  }

  // Handle input change
  const handleInputChange = (field: string, value: any) => {
    setFormValues(prev => ({ ...prev, [field]: value }))

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // Add parameter
  const addParameter = () => {
    const newParam: QueryParameter = {
      name: `param${parameters.length + 1}`,
      type: ParameterType.STRING,
      description: '',
      required: false,
      defaultValue: undefined,
      allowedValues: undefined
    }
    setParameters([...parameters, newParam])
  }

  // Remove parameter
  const removeParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index))
  }

  // Update parameter
  const updateParameter = (index: number, field: string, value: any) => {
    const updated = [...parameters]
    updated[index] = { ...updated[index], [field]: value }
    setParameters(updated)
  }

  // Environment-specific dialog content styling
  const getDialogContentProps = () => {
    // Use consistent sizing and let the design system handle centering/portal positioning
    return {
      className: 'gba:max-w-[90vw] gba:w-[90vw] gba:max-h-[90vh] gba:overflow-y-auto',
      style: {
        maxWidth: '1200px',
        width: '90vw',
        maxHeight: '90vh'
      }
    }
  }

  return (
    <Dialog open={visible} onOpenChange={open => !open && onCancel()}>
      <DialogContent {...getDialogContentProps()}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center" style={{ gap: 'var(--nw-spacing-2)' }}>
            <FloppyDiskIcon />
            <span>{isEditing ? 'Edit Query Definition' : 'Create Query Definition'}</span>
          </DialogTitle>
        </DialogHeader>

        <div
          className="gba:overflow-y-auto"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--nw-spacing-6)',
            maxHeight: '60vh',
            overflowY: 'auto'
          }}
        >
          {/* Mode Toggle */}
          <Card>
            <CardHeader style={{ paddingBottom: 'var(--nw-spacing-3)' }}>
              <CardTitle className="gba:text-base gba:flex gba:items-center" style={{ gap: 'var(--nw-spacing-2)' }}>
                Mode Settings
              </CardTitle>
            </CardHeader>
            <CardContent
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--nw-spacing-4)'
              }}
            >
              <div className="gba:flex gba:flex-col" style={{ gap: 'var(--nw-spacing-3)' }}>
                <div className="gba:flex gba:items-center gba:justify-between" style={{ gap: 'var(--nw-spacing-2)' }}>
                  <Label htmlFor="json-mode-switch" style={{ fontWeight: '500' }}>
                    JSON Mode
                  </Label>
                  <Switch
                    id="json-mode-switch"
                    checked={isJsonMode}
                    onCheckedChange={setIsJsonMode}
                    data-testid="json-mode-switch"
                  />
                </div>
                <div className="gba:flex gba:items-center gba:justify-between" style={{ gap: 'var(--nw-spacing-2)' }}>
                  <Label htmlFor="validate-query-switch" style={{ fontWeight: '500' }}>
                    Validate Query
                  </Label>
                  <Switch
                    id="validate-query-switch"
                    checked={validateQuery}
                    onCheckedChange={setValidateQuery}
                    data-testid="validate-query-switch"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {isJsonMode ? (
            /* JSON Mode */
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--nw-spacing-4)'
              }}
            >
              {jsonError && (
                <Alert>
                  <h4
                    style={{
                      color: 'var(--nw-color-destructive)',
                      margin: 'var(--nw-spacing-0)'
                    }}
                  >
                    JSON Validation Error
                  </h4>
                  <p style={{ margin: 'var(--nw-spacing-0)' }}>{jsonError}</p>
                </Alert>
              )}
              <Card>
                <CardHeader>
                  <CardTitle>JSON Editor</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={jsonValue}
                    onChange={e => handleJsonChange(e.target.value)}
                    rows={20}
                    className="gba:font-mono gba:text-sm"
                    placeholder="Enter query definition JSON..."
                  />
                </CardContent>
              </Card>
              <div
                style={{
                  padding: 'var(--nw-spacing-4)',
                  backgroundColor: 'var(--nw-color-muted)',
                  borderRadius: 'var(--nw-border-radius-md)',
                  fontSize: '0.875rem'
                }}
              >
                <strong>Required fields:</strong> name, description, query
                <br />
                <strong>Optional fields:</strong> queryType (DATASET|TIMESERIES), status (DRAFT|ACTIVE), parameters,
                additionalColumns
              </div>
            </div>
          ) : (
            /* Form Mode */
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--nw-spacing-6)'
              }}
            >
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--nw-spacing-4)'
                  }}
                >
                  <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2" style={{ gap: 'var(--nw-spacing-4)' }}>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--nw-spacing-2)'
                      }}
                    >
                      <Label>Query Name *</Label>
                      <Input
                        value={formValues.name}
                        onChange={e => handleInputChange('name', e.target.value)}
                        placeholder="Enter unique query name"
                        style={errors.name ? { borderColor: 'var(--nw-color-destructive)' } : {}}
                      />
                      {errors.name && (
                        <p
                          className="gba:text-sm"
                          style={{
                            color: 'var(--nw-color-destructive)',
                            margin: 'var(--nw-spacing-0)'
                          }}
                        >
                          {errors.name}
                        </p>
                      )}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--nw-spacing-2)'
                      }}
                    >
                      <Label>Query Type *</Label>
                      <Select
                        value={formValues.queryType}
                        onValueChange={value => handleInputChange('queryType', value)}
                      >
                        <SelectTrigger style={{ width: '200px' }}>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent style={{ zIndex: 10000 }}>
                          <SelectItem value={QueryType.DATASET}>Dataset</SelectItem>
                          <SelectItem value={QueryType.TIMESERIES}>Timeseries</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2" style={{ gap: 'var(--nw-spacing-4)' }}>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--nw-spacing-2)'
                      }}
                    >
                      <Label>Status *</Label>
                      <Select value={formValues.status} onValueChange={value => handleInputChange('status', value)}>
                        <SelectTrigger style={{ width: '200px' }}>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent style={{ zIndex: 10000 }}>
                          <SelectItem value={QueryStatus.DRAFT}>Draft</SelectItem>
                          <SelectItem value={QueryStatus.ACTIVE}>Active</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--nw-spacing-2)'
                    }}
                  >
                    <Label>Description *</Label>
                    <Textarea
                      value={formValues.description}
                      onChange={e => handleInputChange('description', e.target.value)}
                      placeholder="Describe what this query does..."
                      rows={3}
                      style={errors.description ? { borderColor: 'var(--nw-color-destructive)' } : {}}
                    />
                    {errors.description && (
                      <p
                        className="gba:text-sm"
                        style={{
                          color: 'var(--nw-color-destructive)',
                          margin: 'var(--nw-spacing-0)'
                        }}
                      >
                        {errors.description}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* SQL Query */}
              <Card>
                <CardHeader
                  className="gba:flex gba:flex-row gba:items-center gba:justify-between"
                  style={{ rowGap: '0' }}
                >
                  <CardTitle>SQL Query</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleFormatSQL}
                    className="gba:flex gba:items-center"
                    style={{ gap: 'var(--nw-spacing-2)' }}
                  >
                    <PaintBrushIcon />
                    Format SQL
                  </Button>
                </CardHeader>
                <CardContent>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--nw-spacing-2)'
                    }}
                  >
                    <Textarea
                      value={formValues.query}
                      onChange={e => handleInputChange('query', e.target.value)}
                      placeholder="Enter your SQL query..."
                      rows={12}
                      style={errors.query ? { borderColor: 'var(--nw-color-destructive)' } : {}}
                    />
                    {errors.query && (
                      <p
                        className="gba:text-sm"
                        style={{
                          color: 'var(--nw-color-destructive)',
                          margin: 'var(--nw-spacing-0)'
                        }}
                      >
                        {errors.query}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Query Parameters */}
              <Card>
                <CardHeader
                  className="gba:flex gba:flex-row gba:items-center gba:justify-between"
                  style={{ rowGap: '0' }}
                >
                  <CardTitle>Query Parameters</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addParameter}
                    className="gba:flex gba:items-center"
                    style={{ gap: 'var(--nw-spacing-2)' }}
                  >
                    <PlusIcon />
                    Add Parameter
                  </Button>
                </CardHeader>
                <CardContent>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--nw-spacing-4)'
                    }}
                  >
                    <div
                      className="gba:flex gba:items-center gba:justify-between"
                      style={{ marginBottom: 'var(--nw-spacing-4)' }}
                    >
                      <p
                        style={{
                          color: 'var(--nw-color-muted-foreground)',
                          fontSize: '0.875rem',
                          margin: 'var(--nw-spacing-0)'
                        }}
                      >
                        Define parameters that can be passed to your query at execution time.
                      </p>
                    </div>

                    {parameters.length === 0 ? (
                      <p
                        className="gba:text-center"
                        style={{
                          color: 'var(--nw-color-muted-foreground)',
                          margin: 'var(--nw-spacing-0)'
                        }}
                      >
                        No parameters defined. Click "Add Parameter" to create one.
                      </p>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 'var(--nw-spacing-4)'
                        }}
                      >
                        {parameters.map((param, index) => (
                          <div
                            key={index}
                            className="gba:border gba:rounded-md"
                            style={{ padding: 'var(--nw-spacing-4)' }}
                          >
                            <div
                              className="gba:flex gba:items-center gba:justify-between"
                              style={{ marginBottom: 'var(--nw-spacing-4)' }}
                            >
                              <h4 className="gba:font-medium" style={{ margin: 'var(--nw-spacing-0)' }}>
                                Parameter {index + 1}
                              </h4>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeParameter(index)}
                                className="gba:flex gba:items-center"
                                style={{ gap: 'var(--nw-spacing-1)' }}
                              >
                                <TrashIcon />
                                Remove
                              </Button>
                            </div>

                            <div
                              className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2"
                              style={{ gap: 'var(--nw-spacing-4)' }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 'var(--nw-spacing-2)'
                                }}
                              >
                                <Label>Name *</Label>
                                <Input
                                  value={param.name}
                                  onChange={e => updateParameter(index, 'name', e.target.value)}
                                  placeholder="Parameter name"
                                />
                              </div>
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 'var(--nw-spacing-2)'
                                }}
                              >
                                <Label>Type *</Label>
                                <Select
                                  value={param.type}
                                  onValueChange={value => updateParameter(index, 'type', value)}
                                >
                                  <SelectTrigger style={{ width: '200px' }}>
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                  <SelectContent style={{ zIndex: 10000 }}>
                                    <SelectItem value="string">String</SelectItem>
                                    <SelectItem value="number">Number</SelectItem>
                                    <SelectItem value="boolean">Boolean</SelectItem>
                                    <SelectItem value="date">Date</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 'var(--nw-spacing-2)',
                                marginTop: 'var(--nw-spacing-4)'
                              }}
                            >
                              <Label>Description</Label>
                              <Input
                                value={param.description || ''}
                                onChange={e => updateParameter(index, 'description', e.target.value)}
                                placeholder="Parameter description"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="gba:flex gba:justify-end" style={{ gap: 'var(--nw-spacing-2)' }}>
            <Button variant="outline" onClick={onCancel}>
              <XIcon style={{ marginRight: 'var(--nw-spacing-2)' }} />
              Cancel
            </Button>
            <Button variant="default" onClick={handleSave} disabled={isLoading}>
              <FloppyDiskIcon style={{ marginRight: 'var(--nw-spacing-2)' }} />
              {isLoading ? 'Saving...' : isEditing ? 'Update Query' : 'Create Query'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
