import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
  Switch,
  Separator,
  DialogDescription
} from '@newwork/nw-design-system'
import { PlayCircleIcon, XIcon } from '@phosphor-icons/react'
import dayjs from 'dayjs'
import { QueryDefinition, QueryExecutionParams, ParameterType } from '@/common/network/dataset'

interface QueryExecutionFormProps {
  query: QueryDefinition | null
  visible: boolean
  onExecute: (parameters: QueryExecutionParams) => void
  onCancel: () => void
  isExecuting: boolean
}

export const QueryExecutionForm: React.FC<QueryExecutionFormProps> = ({
  query,
  visible,
  onExecute,
  onCancel,
  isExecuting
}) => {
  const [formValues, setFormValues] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isPlatformEnvironment = typeof window !== 'undefined' && !window.location.href.includes('localhost')

  // Platform-specific positioning styles
  const platformModalStyles = isPlatformEnvironment
    ? {
        position: 'fixed' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 50,
        margin: 0
      }
    : {}

  // Initialize form values when query changes
  useEffect(() => {
    if (query) {
      const initialValues: Record<string, any> = {}
      query.parameters.forEach(param => {
        initialValues[param.name] = getInitialValue(param)
      })
      setFormValues(initialValues)
      setErrors({})
    }
  }, [query])

  const handleExecute = () => {
    if (!query) return

    // Validate required fields
    const newErrors: Record<string, string> = {}
    query.parameters.forEach(param => {
      if (param.required && (!formValues[param.name] || formValues[param.name] === '')) {
        newErrors[param.name] = `${param.name} is required`
      }
    })

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Convert form values to proper types
    const processedParams: QueryExecutionParams = {}

    Object.entries(formValues).forEach(([key, value]) => {
      const param = query.parameters.find(p => p.name === key)
      if (param && value !== undefined && value !== null && value !== '') {
        if (param.type === ParameterType.DATE && dayjs.isDayjs(value)) {
          processedParams[key] = value.format('YYYY-MM-DD')
        } else if (param.type === ParameterType.DATE_TIME && dayjs.isDayjs(value)) {
          processedParams[key] = value.format('YYYY-MM-DDTHH:mm:ss')
        } else if (param.type === ParameterType.LIST_STRING && typeof value === 'string') {
          processedParams[key] = value
        } else {
          processedParams[key] = String(value)
        }
      }
    })

    onExecute(processedParams)
  }

  const handleInputChange = (paramName: string, value: any) => {
    setFormValues(prev => ({
      ...prev,
      [paramName]: value
    }))

    // Clear error when user starts typing
    if (errors[paramName]) {
      setErrors(prev => ({
        ...prev,
        [paramName]: ''
      }))
    }
  }

  const renderParameterInput = (param: any) => {
    const value = formValues[param.name]
    const hasError = !!errors[param.name]

    switch (param.type) {
      case ParameterType.STRING:
        return (
          <Input
            value={value || ''}
            onChange={e => handleInputChange(param.name, e.target.value)}
            placeholder={param.description}
            data-testid={`parameter-input-${param.name}`}
            className="gba:w-full"
            style={hasError ? { borderColor: 'var(--nw-color-destructive)' } : {}}
          />
        )

      case ParameterType.NUMBER:
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={e => handleInputChange(param.name, Number(e.target.value))}
            placeholder={param.description}
            data-testid={`parameter-input-${param.name}`}
            className="gba:w-full"
            style={hasError ? { borderColor: 'var(--nw-color-destructive)' } : {}}
          />
        )

      case ParameterType.DATE:
        return (
          <Input
            type="date"
            value={value ? (dayjs.isDayjs(value) ? value.format('YYYY-MM-DD') : value) : ''}
            onChange={e => handleInputChange(param.name, e.target.value)}
            placeholder={param.description}
            data-testid={`parameter-input-${param.name}`}
            className="gba:w-full"
            style={hasError ? { borderColor: 'var(--nw-color-destructive)' } : {}}
          />
        )

      case ParameterType.DATE_TIME:
        return (
          <Input
            type="datetime-local"
            value={value ? (dayjs.isDayjs(value) ? value.format('YYYY-MM-DDTHH:mm') : value) : ''}
            onChange={e => handleInputChange(param.name, e.target.value)}
            placeholder={param.description}
            data-testid={`parameter-input-${param.name}`}
            className="gba:w-full"
            style={hasError ? { borderColor: 'var(--nw-color-destructive)' } : {}}
          />
        )

      case ParameterType.BOOLEAN:
        return (
          <Switch
            checked={value || false}
            onCheckedChange={checked => handleInputChange(param.name, checked)}
            data-testid={`parameter-input-${param.name}`}
          />
        )

      case ParameterType.CONTROL:
        return (
          <Select value={value || ''} onValueChange={newValue => handleInputChange(param.name, newValue)}>
            <SelectTrigger
              className="gba:w-full"
              data-testid={`parameter-input-${param.name}`}
              style={{
                width: '100%',
                ...(hasError ? { borderColor: 'var(--nw-color-destructive)' } : {})
              }}
            >
              <SelectValue placeholder={param.description} />
            </SelectTrigger>
            <SelectContent style={{ zIndex: 9999 }}>
              {param.allowedValues?.map((allowedValue: string) => (
                <SelectItem key={allowedValue} value={allowedValue}>
                  {allowedValue}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case ParameterType.LIST_STRING:
        return (
          <Input
            value={value || ''}
            onChange={e => handleInputChange(param.name, e.target.value)}
            placeholder={`${param.description} (comma-separated)`}
            data-testid={`parameter-input-${param.name}`}
            className="gba:w-full"
            style={hasError ? { borderColor: 'var(--nw-color-destructive)' } : {}}
          />
        )

      default:
        return (
          <Input
            value={value || ''}
            onChange={e => handleInputChange(param.name, e.target.value)}
            placeholder={param.description}
            data-testid={`parameter-input-${param.name}`}
            className="gba:w-full"
            style={hasError ? { borderColor: 'var(--nw-color-destructive)' } : {}}
          />
        )
    }
  }

  const getInitialValue = (param: any) => {
    if (param.defaultValue) {
      if (param.type === ParameterType.DATE || param.type === ParameterType.DATE_TIME) {
        return dayjs(param.defaultValue)
      }
      if (param.type === ParameterType.BOOLEAN) {
        return param.defaultValue === 'true'
      }
      if (param.type === ParameterType.NUMBER) {
        return Number(param.defaultValue)
      }
      return param.defaultValue
    }
    return undefined
  }

  return (
    <Dialog open={visible} onOpenChange={open => !open && onCancel()}>
      <DialogContent
        className="gba:max-w-[600px]"
        data-testid="query-execution-modal"
        style={{
          ...platformModalStyles,
          backgroundColor: 'var(--nw-color-background)',
          borderRadius: 'var(--nw-border-radius-lg)',
          border: '1px solid var(--nw-color-border)',
          boxShadow: 'var(--nw-shadow-lg)'
        }}
      >
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center" style={{ gap: 'var(--nw-spacing-2)' }}>
            <PlayCircleIcon size={20} />
            Execute Query: {query?.name}
          </DialogTitle>
          <DialogDescription>
            <p
              style={{
                margin: 'var(--nw-spacing-0)',
                color: 'var(--nw-color-muted-foreground)'
              }}
            >
              This query requires parameters. Please provide values below.
            </p>
          </DialogDescription>
        </DialogHeader>

        {query && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--nw-spacing-4)'
            }}
          >
            <div>
              <p
                style={{
                  margin: 'var(--nw-spacing-0)',
                  color: 'var(--nw-color-muted-foreground)'
                }}
              >
                {query.description}
              </p>
            </div>

            <Separator />

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--nw-spacing-4)'
              }}
              data-testid="query-execution-form"
            >
              {query.parameters.map(param => (
                <div
                  key={param.name}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--nw-spacing-2)'
                  }}
                >
                  <Label className="gba:flex gba:items-center" style={{ gap: 'var(--nw-spacing-2)' }}>
                    <span className="gba:font-bold">{param.name}</span>
                    {param.required && <span style={{ color: 'var(--nw-color-destructive)' }}>*</span>}
                    <span className="gba:text-xs" style={{ color: 'var(--nw-color-muted-foreground)' }}>
                      ({param.type})
                    </span>
                  </Label>
                  {renderParameterInput(param)}
                  {errors[param.name] && (
                    <p
                      className="gba:text-sm"
                      style={{
                        margin: 'var(--nw-spacing-0)',
                        color: 'var(--nw-color-destructive)'
                      }}
                    >
                      {errors[param.name]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <div className="gba:flex gba:justify-end" style={{ gap: 'var(--nw-spacing-2)' }}>
            <Button
              variant="outline"
              onClick={onCancel}
              className="gba:flex gba:items-center gba:min-w-[100px] gba:h-9"
              style={{
                gap: 'var(--nw-spacing-2)',
                fontSize: '14px',
                padding: 'var(--nw-spacing-2) var(--nw-spacing-4)'
              }}
            >
              <XIcon size={16} />
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleExecute}
              disabled={isExecuting}
              className="gba:flex gba:items-center"
              style={{ gap: 'var(--nw-spacing-2)' }}
            >
              <PlayCircleIcon size={16} />
              Execute Query
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
