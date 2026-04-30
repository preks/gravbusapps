import React, { useState, useRef, useCallback, useEffect } from 'react'
import { DatePicker } from 'antd'
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
  TooltipContent,
  Checkbox
} from '@newwork/nw-design-system'
import { Database, Upload as UploadIcon, FileText, X, AlertCircle } from 'lucide-react'
import { InputType } from '@/common/network/flows/FlowTemplateClient'

interface FileItem {
  uid: string
  name: string
  status: 'done' | 'uploading' | 'error'
  errorMessage?: string
  originFileObj?: File
}

interface FileUploadInputProps {
  input: any
  index: number
  testId?: string
  readOnly?: boolean
  value?: any
  onChange?: (value: any) => void
}

const FileUploadInput: React.FC<FileUploadInputProps> = ({
  input,
  index,
  testId = 'input-renderer',
  readOnly,
  value,
  onChange
}) => {
  const [fileList, setFileList] = useState<FileItem[]>(
    Array.isArray(value)
      ? value.map((f: any, i: number) => ({
          uid: f.uid || `${Date.now()}-${i}`,
          name: f.name || 'file',
          status: 'done' as const
        }))
      : []
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  const maxFiles = input.maxFiles || 5
  const maxFileSize = (input.maxFileSize || 10) * 1024 * 1024 // Convert MB to bytes
  const allowedTypes = input.accept || '.pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.zip'

  const validateFile = useCallback(
    (file: File): string | null => {
      if (file.size > maxFileSize) {
        return `File size must be less than ${input.maxFileSize || 10}MB`
      }

      const fileName = file.name || ''
      const lastDotIndex = fileName.lastIndexOf('.')
      const fileExtension = lastDotIndex > 0 ? fileName.slice(lastDotIndex).toLowerCase() : ''
      const allowedExtensions = allowedTypes.split(',').map((t: string) => t.trim().toLowerCase())

      if (fileExtension && !allowedExtensions.includes(fileExtension)) {
        return `File type ${fileExtension} is not allowed`
      }

      if (!fileExtension) {
        return `File has no extension`
      }

      return null
    },
    [maxFileSize, allowedTypes, input.maxFileSize]
  )

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (readOnly) return

      const selectedFiles = Array.from(event.target.files || [])
      const remainingSlots = maxFiles - fileList.length
      const filesToAdd = selectedFiles.slice(0, remainingSlots)

      const newFiles: FileItem[] = filesToAdd.map((file, i) => {
        const validationError = validateFile(file)
        return {
          uid: `${Date.now()}-${i}`,
          name: file.name,
          status: validationError ? ('error' as const) : ('done' as const),
          errorMessage: validationError || undefined,
          originFileObj: file
        }
      })

      const updatedList = [...fileList, ...newFiles]
      setFileList(updatedList)
      onChange?.(updatedList)

      if (event.target) {
        event.target.value = ''
      }
    },
    [fileList, maxFiles, validateFile, onChange, readOnly]
  )

  const removeFile = useCallback(
    (uid: string) => {
      if (readOnly) return

      const updatedList = fileList.filter(f => f.uid !== uid)
      setFileList(updatedList)
      onChange?.(updatedList)

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [fileList, onChange, readOnly]
  )

  const openFilePicker = useCallback(() => {
    if (readOnly) return
    fileInputRef.current?.click()
  }, [readOnly])

  const canAddMoreFiles = fileList.length < maxFiles

  return (
    <div className="gba:mb-4" data-testid={`${testId}-file-upload-${index}`}>
      <label className="gba:block gba:text-sm gba:font-medium gba:mb-2" style={{ color: 'var(--color-text-primary)' }}>
        {input.label}
        {input.required && <span className="gba:text-destructive gba:ml-1">*</span>}
      </label>

      {input.description && <p className="gba:text-xs gba:text-muted-foreground gba:mb-2">{input.description}</p>}

      {/* Upload Area */}
      <div
        className={`gba:border-2 gba:border-dashed gba:rounded-lg gba:p-6 gba:text-center gba:transition-colors ${
          readOnly ? 'gba:opacity-50 gba:cursor-not-allowed' : 'gba:cursor-pointer hover:gba:border-primary'
        } gba:border-border`}
        onClick={canAddMoreFiles && !readOnly ? openFilePicker : undefined}
      >
        <div className="gba:flex gba:justify-center gba:mb-2">
          <UploadIcon className="gba:w-8 gba:h-8 gba:text-muted-foreground" />
        </div>

        {canAddMoreFiles ? (
          <>
            <p className="gba:mb-1 gba:font-medium gba:text-sm gba:text-foreground">Click to browse files</p>
            <p className="gba:text-xs gba:text-muted-foreground">
              Max {maxFiles} files, {input.maxFileSize || 10}MB each
            </p>
          </>
        ) : (
          <p className="gba:text-sm gba:text-muted-foreground">Maximum {maxFiles} files reached</p>
        )}
      </div>

      {/* Hidden Input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        accept={allowedTypes}
        multiple={maxFiles > 1}
        className="gba:hidden"
        disabled={readOnly}
      />

      {/* File List */}
      {fileList.length > 0 && (
        <div className="gba:space-y-2 gba:mt-3">
          {fileList.map(file => (
            <div
              key={file.uid}
              className={`gba:flex gba:items-center gba:justify-between gba:p-3 gba:rounded-md gba:border ${
                file.status === 'error' ? 'gba:border-destructive gba:bg-destructive/5' : 'gba:border-border'
              }`}
            >
              <div className="gba:flex gba:flex-col gba:gap-1 gba:flex-1">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <FileText className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                  <span className="gba:text-sm gba:font-medium gba:text-foreground">{file.name}</span>

                  {file.status === 'error' && (
                    <Badge variant="destructive" className="gba:text-xs">
                      <AlertCircle className="gba:w-3 gba:h-3 gba:mr-1" />
                      Error
                    </Badge>
                  )}

                  {file.status === 'done' && !file.errorMessage && (
                    <Badge variant="secondary" className="gba:text-xs">
                      Ready
                    </Badge>
                  )}
                </div>

                {file.errorMessage && (
                  <span className="gba:text-xs gba:text-destructive gba:ml-6">{file.errorMessage}</span>
                )}
              </div>

              {!readOnly && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(file.uid)}
                  className="gba:h-6 gba:w-6 gba:p-0 gba:ml-2"
                >
                  <X className="gba:h-4 gba:w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface MultiSelectInputProps {
  input: any
  index: number
  testId?: string
  readOnly?: boolean
  value?: any
  onChange?: (value: any) => void
}

const MultiSelectInput: React.FC<MultiSelectInputProps> = ({
  input,
  index,
  testId = 'input-renderer',
  readOnly,
  value,
  onChange
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedValues = Array.isArray(value) ? value : []

  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    if (!input.options) return []
    if (!searchTerm.trim()) return input.options

    const search = searchTerm.toLowerCase()
    return input.options.filter((option: any) => {
      const optionLabel = typeof option === 'string' ? option : option.label
      return optionLabel.toLowerCase().includes(search)
    })
  }, [input.options, searchTerm])

  // Show search input for more than 10 options
  const showSearchInput = input.options && input.options.length > 10

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current && showSearchInput) {
      inputRef.current.focus()
    }
  }, [isOpen, showSearchInput])

  const handleToggle = useCallback(
    (optionValue: string) => {
      const isSelected = selectedValues.includes(optionValue)
      if (isSelected) {
        onChange?.(selectedValues.filter((v: string) => v !== optionValue))
      } else {
        onChange?.([...selectedValues, optionValue])
      }
    },
    [selectedValues, onChange]
  )

  const handleRemove = useCallback(
    (optionValue: string, e: React.MouseEvent) => {
      e.stopPropagation()
      onChange?.(selectedValues.filter((v: string) => v !== optionValue))
    },
    [selectedValues, onChange]
  )

  const handleClearAll = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onChange?.([])
    },
    [onChange]
  )

  const getLabelForValue = useCallback(
    (val: string) => {
      if (!input.options) return val
      const option = input.options.find((opt: any) => {
        const optValue = typeof opt === 'string' ? opt : opt.value
        return optValue === val
      })
      if (!option) return val
      return typeof option === 'string' ? option : option.label
    },
    [input.options]
  )

  return (
    <div className="gba:mb-4" ref={containerRef}>
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

      {/* Multi-select dropdown */}
      <div className="gba:relative">
        {/* Selected Values Display / Trigger */}
        <div
          className={`gba:min-h-[40px] gba:w-full gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:py-2 gba:flex gba:flex-wrap gba:gap-1.5 gba:items-center gba:cursor-pointer ${
            readOnly || input._resolveError
              ? 'gba:opacity-50 gba:cursor-not-allowed gba:bg-muted'
              : 'gba:hover:border-primary'
          } ${isOpen ? 'gba:border-primary gba:ring-2 gba:ring-primary/20' : ''}`}
          onClick={() => !readOnly && !input._resolveError && setIsOpen(!isOpen)}
          data-testid={`${testId}-input-${index}-trigger`}
        >
          {selectedValues.length === 0 ? (
            <span className="gba:text-muted-foreground gba:text-sm">
              {input.placeholder || `Select ${input.label}`}
            </span>
          ) : (
            <>
              {selectedValues.map((val: string) => (
                <span
                  key={val}
                  className="gba:inline-flex gba:items-center gba:gap-1 gba:rounded gba:bg-primary gba:px-2 gba:py-0.5 gba:text-xs gba:text-primary-foreground gba:max-w-[150px]"
                >
                  <span className="gba:truncate">{getLabelForValue(val)}</span>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={e => handleRemove(val, e)}
                      className="gba:ml-0.5 gba:hover:bg-primary/80 gba:rounded-full gba:p-0.5"
                      data-testid={`${testId}-input-${index}-remove-${val}`}
                    >
                      <X className="gba:w-3 gba:h-3" />
                    </button>
                  )}
                </span>
              ))}
            </>
          )}

          {/* Clear all button */}
          {selectedValues.length > 1 && !readOnly && (
            <button
              type="button"
              onClick={handleClearAll}
              className="gba:ml-auto gba:text-xs gba:text-muted-foreground gba:hover:text-foreground gba:underline"
              data-testid={`${testId}-input-${index}-clear-all`}
            >
              Clear all
            </button>
          )}

          {/* Dropdown indicator */}
          <span
            className={`gba:ml-auto gba:text-muted-foreground gba:transition-transform ${isOpen ? 'gba:rotate-180' : ''}`}
          >
            ▼
          </span>
        </div>

        {/* Dropdown Options */}
        {isOpen && !readOnly && !input._resolveError && (
          <div className="gba:absolute gba:top-full gba:left-0 gba:right-0 gba:z-50 gba:mt-1 gba:rounded-md gba:border gba:bg-popover gba:shadow-lg">
            {/* Search Input - only show when more than 10 options */}
            {showSearchInput && (
              <div className="gba:p-2 gba:border-b">
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="gba:h-9"
                  data-testid={`${testId}-input-${index}-search`}
                />
              </div>
            )}

            {/* Selection count - always show when items are selected */}
            {selectedValues.length > 0 && (
              <div className="gba:px-3 gba:py-2 gba:text-xs gba:text-muted-foreground gba:border-b gba:bg-muted/30">
                {selectedValues.length} item{selectedValues.length !== 1 ? 's' : ''} selected
              </div>
            )}

            {/* Options List */}
            <div className="gba:max-h-60 gba:overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="gba:p-4 gba:text-center gba:text-sm gba:text-muted-foreground">
                  {searchTerm ? 'No results found' : 'No options available'}
                </div>
              ) : (
                filteredOptions.map((option: any, optIndex: number) => {
                  const optionValue = typeof option === 'string' ? option : option.value
                  const optionLabel = typeof option === 'string' ? option : option.label
                  const isSelected = selectedValues.includes(optionValue)

                  return (
                    <div
                      key={optIndex}
                      className={`gba:px-3 gba:py-2.5 gba:text-sm gba:cursor-pointer gba:flex gba:items-center gba:gap-2 gba:hover:bg-accent gba:hover:text-accent-foreground ${
                        isSelected ? 'gba:bg-primary/10' : ''
                      }`}
                      onClick={() => handleToggle(optionValue)}
                      data-testid={`${testId}-input-${index}-option-${optIndex}`}
                    >
                      {/* Checkbox indicator */}
                      <div
                        className={`gba:w-4 gba:h-4 gba:border gba:rounded gba:flex gba:items-center gba:justify-center gba:shrink-0 ${
                          isSelected
                            ? 'gba:bg-primary gba:border-primary gba:text-primary-foreground'
                            : 'gba:border-input'
                        }`}
                      >
                        {isSelected && <X className="gba:w-3 gba:h-3 gba:rotate-45" strokeWidth={3} />}
                      </div>
                      <span className="gba:flex-1 gba:truncate">{optionLabel}</span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>

      {input.description && <p className="gba:text-xs gba:text-muted-foreground gba:mt-2">{input.description}</p>}
    </div>
  )
}

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
          <MultiSelectInput
            input={input}
            index={index}
            testId={testId}
            readOnly={readOnly}
            value={value}
            onChange={onChange}
          />
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

      case InputType.FILE:
        return (
          <FileUploadInput
            input={input}
            index={index}
            testId={testId}
            readOnly={readOnly}
            value={value}
            onChange={onChange}
          />
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
          const selectedValues = Array.isArray(value) ? value : []
          return (
            <div className="gba:mb-4">
              <label
                className="gba:block gba:text-sm gba:font-medium gba:mb-2"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {input.label}
              </label>
              <div className="gba:space-y-2" data-testid={`${testId}-input-${index}`}>
                {input.options.map((option: any, optIndex: number) => {
                  const optionValue = typeof option === 'string' ? option : option.value
                  const optionLabel = typeof option === 'string' ? option : option.label
                  const isChecked = selectedValues.includes(optionValue)

                  return (
                    <div key={optIndex} className="gba:flex gba:items-center gba:space-x-2">
                      <Checkbox
                        id={`${testId}-input-${index}-option-${optIndex}`}
                        checked={isChecked}
                        onCheckedChange={checked => {
                          if (checked) {
                            onChange?.([...selectedValues, optionValue])
                          } else {
                            onChange?.(selectedValues.filter((v: any) => v !== optionValue))
                          }
                        }}
                        disabled={readOnly}
                        data-testid={`${testId}-input-${index}-option-${optIndex}-checkbox`}
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
              </div>
            </div>
          )
        }
        // Single checkbox fallback
        return (
          <div className="gba:mb-4">
            <div className="gba:flex gba:items-center gba:space-x-2">
              <Checkbox
                id={`${testId}-input-${index}-checkbox`}
                checked={value || false}
                onCheckedChange={checked => onChange?.(checked)}
                disabled={readOnly}
                data-testid={`${testId}-input-${index}-checkbox`}
              />
              <Label
                htmlFor={`${testId}-input-${index}-checkbox`}
                className="gba:text-sm gba:cursor-pointer"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {input.placeholder || input.label}
              </Label>
            </div>
          </div>
        )
    }
  }

  return renderField()
}
