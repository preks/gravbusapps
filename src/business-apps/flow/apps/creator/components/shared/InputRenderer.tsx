import React from 'react'
import { DatePicker, Checkbox } from 'antd'
import {
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  RadioGroup,
  RadioGroupItem,
  Label,
  Badge,
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent
} from '@newwork/nw-design-system'
import { Database } from 'lucide-react'
import { InputType } from '@/common/network/flows/FlowTemplateClient'

interface InputRendererProps {
  input: any
  index: number
  testId?: string
  readOnly?: boolean
  value?: any
  onChange?: (value: any) => void
}

export const InputRenderer: React.FC<InputRendererProps> = ({
  input,
  index,
  testId = 'input-renderer',
  readOnly = false,
  value,
  onChange
}) => {
  // Local component for signature drawing on canvas
  const SignatureCanvas: React.FC<{
    width?: number
    height?: number
    value?: string
    readOnly?: boolean
    onChange?: (dataUrl: string | null) => void
  }> = ({ width, height = 180, value, readOnly, onChange }) => {
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
    const containerRef = React.useRef<HTMLDivElement | null>(null)
    const drawingRef = React.useRef<boolean>(false)
    const lastPosRef = React.useRef<{ x: number; y: number } | null>(null)

    // Initialize canvas size to container width
    React.useEffect(() => {
      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) return
      const dpr = window.devicePixelRatio || 1
      const w = Math.floor(width || container.clientWidth || 400)
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = w + 'px'
      canvas.style.height = height + 'px'
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.scale(dpr, dpr)
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.strokeStyle = 'var(--color-text-primary)'
      }
      // If we have an existing value, draw it
      if (value && value.startsWith('data:image')) {
        const img = new Image()
        img.onload = () => {
          if (!canvas) return
          const ctx2 = canvas.getContext('2d')
          if (!ctx2) return
          ctx2.drawImage(img, 0, 0, w, height)
        }
        img.src = value
      }
    }, [width, height, value])

    const getPos = (e: MouseEvent | TouchEvent) => {
      const canvas = canvasRef.current!
      const rect = canvas.getBoundingClientRect()
      if ('touches' in e) {
        const t = e.touches[0]
        return { x: t.clientX - rect.left, y: t.clientY - rect.top }
      }
      return { x: (e as MouseEvent).clientX - rect.left, y: (e as MouseEvent).clientY - rect.top }
    }

    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
      if (readOnly) return
      drawingRef.current = true
      const pos = 'nativeEvent' in e ? getPos((e as any).nativeEvent) : { x: 0, y: 0 }
      lastPosRef.current = pos
    }

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
      if (!drawingRef.current || readOnly) return
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const pos = 'nativeEvent' in e ? getPos((e as any).nativeEvent) : { x: 0, y: 0 }
      const last = lastPosRef.current || pos
      ctx.beginPath()
      ctx.moveTo(last.x, last.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
      lastPosRef.current = pos
      e.preventDefault()
    }

    const finishStroke = () => {
      if (!drawingRef.current) return
      drawingRef.current = false
      lastPosRef.current = null
      if (onChange && canvasRef.current) {
        onChange(canvasRef.current.toDataURL('image/png'))
      }
    }

    const handleClear = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      onChange?.(null)
    }

    return (
      <div ref={containerRef} className="gba:w-full">
        <div
          className="gba:w-full gba:rounded-md gba:mb-2"
          style={{
            borderWidth: 'var(--border-width-thin)',
            borderStyle: 'dashed',
            borderColor: 'var(--color-input)',
            backgroundColor: 'var(--color-surface-primary)',
            padding: 'var(--spacing-xs)'
          }}
        >
          <canvas
            ref={canvasRef}
            data-testid={`${testId}-input-${index}-signature-canvas`}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={finishStroke}
            onMouseLeave={finishStroke}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={finishStroke}
            style={{
              display: 'block',
              width: '100%',
              height: `${height}px`,
              cursor: readOnly ? 'not-allowed' : 'crosshair'
            }}
          />
        </div>
        <div className="gba:flex gba:items-center gba:justify-between">
          <span className="gba:text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Draw your signature above. Use Clear to reset.
          </span>
          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              data-testid={`${testId}-input-${index}-signature-clear-button`}
            >
              Clear
            </Button>
          )}
        </div>
      </div>
    )
  }

  const renderField = () => {
    switch (input.type) {
      case InputType.TEXTAREA:
        return (
          <div className="gba:mb-4">
            <label
              className="gba:block gba:text-sm gba:font-medium gba:mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {input.label}
            </label>
            <Textarea
              rows={4}
              placeholder={input.placeholder}
              data-testid={`${testId}-input-${index}`}
              disabled={readOnly}
              value={value || ''}
              onChange={e => onChange?.(e.target.value)}
            />
          </div>
        )

      case InputType.SELECT:
        return (
          <div className="gba:mb-4">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <label className="gba:block gba:text-sm gba:font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {input.label}
              </label>
              {/* Show catalog indicator if dataSource is present */}
              {input.dataSource?.type === 'CATALOG' && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="secondary"
                        className="gba:text-xs gba:bg-blue-100 gba:text-blue-800 gba:flex gba:items-center gba:gap-1"
                      >
                        <Database className="gba:h-3 gba:w-3" />
                        {input.dataSource.catalog}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="gba:text-xs">
                        Options from <strong>{input.dataSource.catalog}</strong> catalog
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {/* Show entity indicator if dataSource is present */}
              {input.dataSource?.type === 'ENTITY' && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="secondary"
                        className="gba:text-xs gba:bg-purple-100 gba:text-purple-800 gba:flex gba:items-center gba:gap-1"
                      >
                        <Database className="gba:h-3 gba:w-3" />
                        {input.dataSource.entity}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="gba:text-xs">
                        Options from <strong>{input.dataSource.entity}</strong> entities
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            {/* Error message if data source resolution failed */}
            {input._resolveError && (
              <div className="gba:mb-2 gba:p-2 gba:bg-destructive-secondary gba:border gba:border-destructive gba:rounded gba:text-xs gba:text-destructive">
                <strong>Failed to load options:</strong> {input._resolveError}
              </div>
            )}

            {/* Warning if no options available */}
            {!input._resolveError && input.dataSource && (!input.options || input.options.length === 0) && (
              <div className="gba:mb-2 gba:p-2 gba:bg-warning-secondary gba:border gba:border-warning gba:rounded gba:text-xs gba:text-warning-secondary-foreground">
                No options available from {input.dataSource.type === 'ENTITY' ? 'entity' : 'catalog'}:{' '}
                <strong>{input.dataSource.entity || input.dataSource.catalog}</strong>
              </div>
            )}

            <Select
              disabled={readOnly || !!input._resolveError}
              value={value || ''}
              onValueChange={newValue => {
                onChange?.(newValue)
              }}
            >
              <SelectTrigger data-testid={`${testId}-input-${index}`}>
                <SelectValue
                  placeholder={
                    input._resolveError ? 'Failed to load options' : input.placeholder || `Select ${input.label}`
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {input.options?.map((option: any, optIndex: number) => {
                  // Handle both string options and {label, value} objects
                  if (typeof option === 'string') {
                    return (
                      <SelectItem key={optIndex} value={option}>
                        {option}
                      </SelectItem>
                    )
                  } else if (option && typeof option === 'object' && option.value && option.label) {
                    return (
                      <SelectItem key={optIndex} value={option.value}>
                        {option.label}
                      </SelectItem>
                    )
                  }
                  return null
                })}
              </SelectContent>
            </Select>
          </div>
        )

      case InputType.MULTISELECT:
        return (
          <div className="gba:mb-4">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <label className="gba:block gba:text-sm gba:font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {input.label}
              </label>
              {/* Show catalog indicator if dataSource is present */}
              {input.dataSource?.type === 'CATALOG' && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="secondary"
                        className="gba:text-xs gba:bg-blue-100 gba:text-blue-800 gba:flex gba:items-center gba:gap-1"
                      >
                        <Database className="gba:h-3 gba:w-3" />
                        {input.dataSource.catalog}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="gba:text-xs">
                        Options from <strong>{input.dataSource.catalog}</strong> catalog
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {/* Show entity indicator if dataSource is present */}
              {input.dataSource?.type === 'ENTITY' && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="secondary"
                        className="gba:text-xs gba:bg-purple-100 gba:text-purple-800 gba:flex gba:items-center gba:gap-1"
                      >
                        <Database className="gba:h-3 gba:w-3" />
                        {input.dataSource.entity}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="gba:text-xs">
                        Options from <strong>{input.dataSource.entity}</strong> entities
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            {/* Error message if data source resolution failed */}
            {input._resolveError && (
              <div className="gba:mb-2 gba:p-2 gba:bg-destructive-secondary gba:border gba:border-destructive gba:rounded gba:text-xs gba:text-destructive">
                <strong>Failed to load options:</strong> {input._resolveError}
              </div>
            )}

            {/* Warning if no options available */}
            {!input._resolveError && input.dataSource && (!input.options || input.options.length === 0) && (
              <div className="gba:mb-2 gba:p-2 gba:bg-warning-secondary gba:border gba:border-warning gba:rounded gba:text-xs gba:text-warning-secondary-foreground">
                No options available from {input.dataSource.type === 'ENTITY' ? 'entity' : 'catalog'}:{' '}
                <strong>{input.dataSource.entity || input.dataSource.catalog}</strong>
              </div>
            )}

            <Select
              disabled={readOnly || !!input._resolveError}
              value={value || ''}
              onValueChange={newValue => {
                onChange?.(newValue)
              }}
            >
              <SelectTrigger data-testid={`${testId}-input-${index}`}>
                <SelectValue
                  placeholder={
                    input._resolveError ? 'Failed to load options' : input.placeholder || `Select ${input.label}`
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {input.options?.map((option: any, optIndex: number) => {
                  // Handle both string options and {label, value} objects
                  if (typeof option === 'string') {
                    return (
                      <SelectItem key={optIndex} value={option}>
                        {option}
                      </SelectItem>
                    )
                  } else if (option && typeof option === 'object' && option.value && option.label) {
                    return (
                      <SelectItem key={optIndex} value={option.value}>
                        {option.label}
                      </SelectItem>
                    )
                  }
                  return null
                })}
              </SelectContent>
            </Select>
          </div>
        )

      case InputType.DATE:
        return (
          <div className="gba:mb-4">
            <label
              className="gba:block gba:text-sm gba:font-medium gba:mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {input.label}
            </label>
            <DatePicker
              placeholder={input.placeholder || `Select ${input.label}`}
              data-testid={`${testId}-input-${index}`}
              disabled={readOnly}
              value={value}
              onChange={date => onChange?.(date)}
            />
          </div>
        )

      case InputType.DATETIME:
        return (
          <div className="gba:mb-4">
            <label
              className="gba:block gba:text-sm gba:font-medium gba:mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {input.label}
            </label>
            <DatePicker
              showTime={{ format: 'HH:mm' }}
              format="YYYY-MM-DD HH:mm"
              placeholder={input.placeholder || `Select ${input.label}`}
              data-testid={`${testId}-input-${index}`}
              disabled={readOnly}
              value={value}
              onChange={date => onChange?.(date)}
            />
          </div>
        )

      case InputType.SIGNATURE:
        return (
          <div className="gba:mb-4">
            <label
              className="gba:block gba:text-sm gba:font-medium gba:mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {input.label}
            </label>
            <SignatureCanvas
              value={typeof value === 'string' ? value : undefined}
              readOnly={readOnly}
              onChange={dataUrl => onChange?.(dataUrl)}
            />
          </div>
        )

      case InputType.NUMBER:
      case InputType.TEXT:
      default:
        return (
          <div className="gba:mb-4">
            <label
              className="gba:block gba:text-sm gba:font-medium gba:mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {input.label}
            </label>
            <Input
              type={input.type === InputType.NUMBER ? 'number' : 'text'}
              placeholder={input.placeholder}
              data-testid={`${testId}-input-${index}`}
              disabled={readOnly}
              value={value || ''}
              onChange={e => onChange?.(e.target.value)}
            />
          </div>
        )

      case InputType.RADIO:
      case 'radio': // Handle lowercase for backward compatibility
        return (
          <div className="gba:mb-4">
            <label
              className="gba:block gba:text-sm gba:font-medium gba:mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {input.label}
            </label>
            <RadioGroup
              value={value || ''}
              onValueChange={newValue => {
                onChange?.(newValue)
              }}
              disabled={readOnly}
              data-testid={`${testId}-input-${index}`}
            >
              {input.options?.map((option: any, optIndex: number) => {
                // Handle both string options and {label, value} objects
                const optionValue = typeof option === 'string' ? option : option.value
                const optionLabel = typeof option === 'string' ? option : option.label

                return (
                  <div key={optIndex} className="gba:flex gba:items-center gba:space-x-2 gba:mb-2">
                    <RadioGroupItem
                      value={optionValue}
                      id={`${testId}-input-${index}-option-${optIndex}`}
                      disabled={readOnly}
                      data-testid={`${testId}-input-${index}-option-${optIndex}-radio`}
                    />
                    <Label
                      htmlFor={`${testId}-input-${index}-option-${optIndex}`}
                      className="gba:text-sm gba:cursor-pointer"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {optionLabel}
                    </Label>
                  </div>
                )
              })}
            </RadioGroup>
          </div>
        )

      case InputType.CHECKBOX:
        // Handle checkbox group with options
        if (input.options && input.options.length > 0) {
          return (
            <div className="gba:mb-4">
              <label
                className="gba:block gba:text-sm gba:font-medium gba:mb-2"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {input.label}
              </label>
              <Checkbox.Group
                data-testid={`${testId}-input-${index}`}
                disabled={readOnly}
                value={value || []}
                onChange={checkedValues => onChange?.(checkedValues)}
              >
                {input.options.map((option: any, optIndex: number) => (
                  <div key={optIndex} style={{ marginBottom: '8px' }}>
                    <Checkbox
                      value={option.value}
                      disabled={readOnly}
                      data-testid={`${testId}-input-${index}-option-${optIndex}-checkbox`}
                    >
                      {option.label}
                    </Checkbox>
                  </div>
                ))}
              </Checkbox.Group>
            </div>
          )
        }
        // Single checkbox fallback
        return (
          <div className="gba:mb-4">
            <Checkbox
              data-testid={`${testId}-input-${index}-checkbox`}
              disabled={readOnly}
              checked={value || false}
              onChange={e => onChange?.(e.target.checked)}
            >
              {input.placeholder || input.label}
            </Checkbox>
          </div>
        )
    }
  }

  return renderField()
}
