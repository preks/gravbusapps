import React, { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useFeature } from '@/common/hooks/useFeature'
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Alert,
  AlertDescription,
  Spinner,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  DateInput
} from '@newwork/nw-design-system'
import { PiPlus, PiTrash, PiWarning, PiDotsSixVertical } from 'react-icons/pi'
import { getMileageRulePeriodOptions } from '../../types/ExpenseEnums'
import { DndContext, closestCenter, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { useSensors, useSensor, PointerSensor, KeyboardSensor } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { ExpenseSettingsClient } from '../../utils/ExpenseSettingsClient'
import { formatDateForInput, normalizeDateInputValue } from '../../utils'
import { useGetMileageRuleStandaloneById } from '../../queries/ExpenseRuleQueries'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { mileageRuleFormSchema } from '../../schemas'

interface MileageRuleFormData {
  id?: string
  version?: number
  code: string
  ruleName: string
  description: string
  rulePeriod: string
  activeFrom: string
  activeTo: string
  details: MileageRuleDetailFormData[]
}

interface MileageRuleDetailFormData {
  id?: string
  version?: number
  limitFrom?: number
  limitTo?: number
  rateAmount: number
  detailOrder: number
  activeFrom: string
  activeTo: string
  tempId?: string // For stable keys during drag operations
  mileageRuleId?: string // Parent rule ID for saving details separately
  additionalProperties?: Record<string, any> // Expected by API
}

interface MileageRuleFormProps {
  initialData?: MileageRuleFormData
  onSubmit: (data: MileageRuleFormData) => Promise<void>
  onCancel: () => void
  accessToken: string
}

interface SortableRowProps {
  id: string
  children: React.ReactNode
}

const SortableRow: React.FC<SortableRowProps> = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    transition: {
      duration: 150, // Shorter transition
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)'
    }
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition, // No transition while dragging
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <TableRow ref={setNodeRef} style={style} {...attributes}>
      <TableCell className="gba:w-10 gba:text-center gba:cursor-grab" {...listeners}>
        <PiDotsSixVertical className="gba:text-gray-400 gba:text-lg" />
      </TableCell>
      {children}
    </TableRow>
  )
}

const MileageRuleForm: React.FC<MileageRuleFormProps> = ({ initialData, onSubmit, onCancel, accessToken }) => {
  // Feature flag check
  const isDevEnabled = useFeature('dev.enabled')

  // ✅ Hook for fetching fresh data when editing
  const { fetchMileageRuleById } = useGetMileageRuleStandaloneById({ accessToken } as BusinessAppContextProps)

  // Feature flag guard
  if (isDevEnabled === false) {
    return null
  }

  // React Hook Form for basic fields with Zod validation
  const form = useForm<MileageRuleFormData>({
    resolver: zodResolver(mileageRuleFormSchema),
    defaultValues: {
      code: initialData?.code || '',
      ruleName: initialData?.ruleName || '',
      description: initialData?.description || '',
      rulePeriod: initialData?.rulePeriod || '',
      activeFrom: initialData?.activeFrom || '',
      activeTo: initialData?.activeTo || '',
      details: initialData?.details || []
    }
  })

  // Form state for details (kept separate due to complex management)
  const [formData, setFormData] = useState<MileageRuleFormData>(() => {
    const initialFormData = {
      ...(initialData?.id && { id: initialData.id }),
      ...(initialData?.version !== undefined && { version: initialData.version }),
      code: initialData?.code || '',
      ruleName: initialData?.ruleName || '',
      description: initialData?.description || '',
      rulePeriod: initialData?.rulePeriod || '',
      activeFrom: initialData?.activeFrom || '',
      activeTo: initialData?.activeTo || '',
      details: initialData?.details || []
    }

    return initialFormData
  })

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  // Store original data for change detection
  const [originalFormData, setOriginalFormData] = useState<MileageRuleFormData | null>(null)

  // ✅ Fetch fresh data when editing, set initial data when creating
  useEffect(() => {
    const loadData = async () => {
      if (initialData?.id) {
        // For editing, fetch fresh data from the server
        try {
          const freshData = await fetchMileageRuleById(initialData.id)
          if (freshData) {
            const transformedData = {
              id: freshData.id,
              version: freshData.version,
              code: freshData.code || '',
              ruleName: freshData.name || '',
              description: freshData.description || '',
              rulePeriod: freshData.rulePeriod || '',
              activeFrom: formatDateForInput(freshData.activeFrom) || '',
              activeTo: formatDateForInput(freshData.activeTo) || '',
              details: (freshData.mileageRuleDetail || []).map((detail: any) => ({
                id: detail.id,
                version: detail.version,
                limitFrom: detail.limitFrom,
                limitTo: detail.limitTo,
                rateAmount: detail.amount || 0,
                detailOrder: detail.detailOrder || 0,
                activeFrom: formatDateForInput(detail.activeFrom) || '',
                activeTo: formatDateForInput(detail.activeTo) || '',
                tempId: `temp-${detail.id}`,
                mileageRuleId: freshData.id,
                additionalProperties: detail.additionalProperties
              }))
            }
            setFormData(transformedData)
            setOriginalFormData(transformedData)
            // Reset form with fresh data
            form.reset({
              code: transformedData.code,
              ruleName: transformedData.ruleName,
              description: transformedData.description,
              rulePeriod: transformedData.rulePeriod,
              activeFrom: transformedData.activeFrom,
              activeTo: transformedData.activeTo,
              details: transformedData.details
            })
          }
        } catch {
          const fallbackData = {
            ...(initialData.id && { id: initialData.id }),
            ...(initialData.version !== undefined && { version: initialData.version }),
            code: initialData.code || '',
            ruleName: initialData.ruleName || '',
            description: initialData.description || '',
            rulePeriod: initialData.rulePeriod || '',
            activeFrom: initialData.activeFrom || '',
            activeTo: initialData.activeTo || '',
            details: initialData.details || []
          }
          setFormData(fallbackData)
          setOriginalFormData(fallbackData)
          form.reset(fallbackData)
        }
      } else if (initialData) {
        const originalData = {
          ...(initialData.id && { id: initialData.id }),
          ...(initialData.version !== undefined && { version: initialData.version }),
          code: initialData.code || '',
          ruleName: initialData.ruleName || '',
          description: initialData.description || '',
          rulePeriod: initialData.rulePeriod || '',
          activeFrom: initialData.activeFrom || '',
          activeTo: initialData.activeTo || '',
          details: initialData.details || []
        }
        setFormData(originalData)
        setOriginalFormData(originalData)
        form.reset(originalData)
      }
    }

    loadData()
  }, [initialData?.id, fetchMileageRuleById, form])

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8 // Require 8px of movement before starting drag
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  // Ensure all details have stable tempIds
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      details: prev.details.map(detail => ({
        ...detail,
        tempId: detail.tempId || `temp-${Date.now()}-${Math.random()}`
      }))
    }))
  }, [])

  // Add new detail
  const addDetail = () => {
    const newDetail: MileageRuleDetailFormData = {
      limitFrom: undefined,
      limitTo: undefined,
      rateAmount: 0,
      detailOrder: formData.details.length + 1,
      activeFrom: '',
      activeTo: '',
      tempId: `temp-${Date.now()}-${Math.random()}` // Stable unique ID
    }

    setFormData(prev => ({
      ...prev,
      details: [...prev.details, newDetail]
    }))
  }

  // Remove detail
  const removeDetail = (index: number) => {
    setFormData(prev => ({
      ...prev,
      details: prev.details
        .filter((_, i) => i !== index)
        .map((detail, i) => ({
          ...detail,
          detailOrder: i + 1
        }))
    }))
  }

  // Update detail
  const updateDetail = (index: number, field: keyof MileageRuleDetailFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      details: prev.details.map((detail, i) => (i === index ? { ...detail, [field]: value } : detail))
    }))
  }

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    setActiveId(null)

    if (!over || active.id === over.id) return

    const activeIndex = formData.details.findIndex(detail => detail.tempId === active.id)
    const overIndex = formData.details.findIndex(detail => detail.tempId === over.id)

    if (activeIndex === -1 || overIndex === -1) return

    // Use a more immediate update to prevent animation issues
    const newDetails = arrayMove(formData.details, activeIndex, overIndex)

    // Update detail order
    newDetails.forEach((detail, index) => {
      detail.detailOrder = index + 1
    })

    setFormData(prev => ({ ...prev, details: newDetails }))
  }

  // Validate form
  const validateForm = (): boolean => {
    const errors: string[] = []

    // Basic validation
    if (!formData.code.trim()) {
      errors.push('Code is required')
    }
    if (!formData.ruleName.trim()) {
      errors.push('Rule name is required')
    }
    if (!formData.rulePeriod) {
      errors.push('Rule period is required')
    }
    if (!formData.activeFrom) {
      errors.push('Active from date is required')
    }
    if (formData.details.length === 0) {
      errors.push('At least one mileage detail is required')
    }

    // Detail validation
    formData.details.forEach((detail, index) => {
      if (detail.rateAmount <= 0) {
        errors.push(`Row ${index + 1}: Rate amount must be greater than 0`)
      }
      if (detail.limitFrom !== undefined && detail.limitTo !== undefined && detail.limitFrom >= detail.limitTo) {
        errors.push(`Row ${index + 1}: Limit from must be less than limit to`)
      }
      if (!detail.activeFrom) {
        errors.push(`Row ${index + 1}: Active from date is required`)
      }
      if (detail.activeFrom && detail.activeTo && detail.activeFrom >= detail.activeTo) {
        errors.push(`Row ${index + 1}: Active from must be before active to`)
      }
    })

    // Check for overlapping ranges with time period consideration
    // Two details can have overlapping limit ranges if their validity periods don't overlap
    const checkTimeBasedOverlaps = () => {
      for (let i = 0; i < formData.details.length; i++) {
        for (let j = i + 1; j < formData.details.length; j++) {
          const detail1 = formData.details[i]
          const detail2 = formData.details[j]

          // Check if limit ranges overlap
          const detail1From = detail1.limitFrom || 0
          const detail1To = detail1.limitTo || Infinity
          const detail2From = detail2.limitFrom || 0
          const detail2To = detail2.limitTo || Infinity

          const rangesOverlap = !(detail1To <= detail2From || detail2To <= detail1From)

          if (rangesOverlap) {
            // If ranges overlap, check if time periods also overlap
            // Handle date parsing more robustly - skip validation if dates are invalid
            let detail1ActiveFrom: Date, detail1ActiveTo: Date, detail2ActiveFrom: Date, detail2ActiveTo: Date

            try {
              detail1ActiveFrom = detail1.activeFrom ? new Date(detail1.activeFrom) : new Date('1900-01-01')
              detail1ActiveTo = detail1.activeTo ? new Date(detail1.activeTo) : new Date('2099-12-31')
              detail2ActiveFrom = detail2.activeFrom ? new Date(detail2.activeFrom) : new Date('1900-01-01')
              detail2ActiveTo = detail2.activeTo ? new Date(detail2.activeTo) : new Date('2099-12-31')

              // Check if dates are valid
              if (
                isNaN(detail1ActiveFrom.getTime()) ||
                isNaN(detail1ActiveTo.getTime()) ||
                isNaN(detail2ActiveFrom.getTime()) ||
                isNaN(detail2ActiveTo.getTime())
              ) {
                // If any date is invalid, skip time-based validation for this pair
                // But still add a validation error about the invalid date format
                const detail1Index = formData.details.indexOf(detail1) + 1
                const detail2Index = formData.details.indexOf(detail2) + 1
                errors.push(
                  `Rows ${detail1Index} and ${detail2Index}: Cannot validate time overlap due to invalid date format. Please check date fields.`
                )
                return
              }

              const timePeriodsOverlap = !(detail1ActiveTo <= detail2ActiveFrom || detail2ActiveTo <= detail1ActiveFrom)

              if (timePeriodsOverlap) {
                const detail1Index = formData.details.indexOf(detail1) + 1
                const detail2Index = formData.details.indexOf(detail2) + 1
                errors.push(
                  `Rows ${detail1Index} and ${detail2Index}: Overlapping limit ranges (${detail1From}-${detail1To === Infinity ? '∞' : detail1To} and ${detail2From}-${detail2To === Infinity ? '∞' : detail2To}) with overlapping validity periods`
                )
              }
            } catch {
              // Handle date parsing errors gracefully
              const detail1Index = formData.details.indexOf(detail1) + 1
              const detail2Index = formData.details.indexOf(detail2) + 1
              errors.push(`Rows ${detail1Index} and ${detail2Index}: Invalid date format prevents validation`)
            }
          }
        }
      }
    }

    checkTimeBasedOverlaps()

    setValidationErrors(errors)
    return errors.length === 0
  }

  // Auto-order details by limit ranges
  const autoOrderDetails = (details: MileageRuleDetailFormData[]): MileageRuleDetailFormData[] => {
    return details
      .sort((a, b) => {
        const aFrom = a.limitFrom || 0
        const bFrom = b.limitFrom || 0
        if (aFrom !== bFrom) {
          return aFrom - bFrom
        }
        const aTo = a.limitTo || Infinity
        const bTo = b.limitTo || Infinity
        return aTo - bTo
      })
      .map((detail, index) => ({
        ...detail,
        detailOrder: index + 1
      }))
  }

  // Save individual details
  const saveDetailsToBackend = async (details: MileageRuleDetailFormData[], ruleId?: string) => {
    const parentId = ruleId || formData.id
    if (!parentId) {
      throw new Error('Parent mileage rule must be saved first')
    }

    const client = new ExpenseSettingsClient()
    client.setAccessToken(accessToken)

    const promises = details.map(async detail => {
      const detailData = {
        ...detail,
        mileageRuleId: parentId,
        activeFrom: detail.activeFrom ? new Date(detail.activeFrom + 'T00:00:00.000Z').toISOString() : '',
        activeTo: detail.activeTo ? new Date(detail.activeTo + 'T23:59:59.999Z').toISOString() : ''
      }

      try {
        const result = await client.saveMileageRuleDetail(detailData)
        return result
      } catch (error) {
        throw error
      }
    })

    await Promise.all(promises)
  }

  // Check if mileage rule data has changed
  const hasRuleChanged = (current: MileageRuleFormData, original: MileageRuleFormData | null): boolean => {
    if (!original) return true // No original data means it's new

    return (
      current.code !== original.code ||
      current.ruleName !== original.ruleName ||
      current.description !== original.description ||
      current.rulePeriod !== original.rulePeriod ||
      current.activeFrom !== original.activeFrom ||
      current.activeTo !== original.activeTo
    )
  }

  // Check if a detail has changed
  const hasDetailChanged = (current: MileageRuleDetailFormData, original: MileageRuleDetailFormData): boolean => {
    return (
      current.limitFrom !== original.limitFrom ||
      current.limitTo !== original.limitTo ||
      current.rateAmount !== original.rateAmount ||
      current.detailOrder !== original.detailOrder ||
      current.activeFrom !== original.activeFrom ||
      current.activeTo !== original.activeTo
    )
  }

  // Get details that have changed
  const getChangedDetails = (
    currentDetails: MileageRuleDetailFormData[],
    originalDetails: MileageRuleDetailFormData[]
  ): MileageRuleDetailFormData[] => {
    const changedDetails: MileageRuleDetailFormData[] = []

    // Check existing details for changes
    currentDetails.forEach(current => {
      if (current.id) {
        const original = originalDetails.find(orig => orig.id === current.id)
        if (original && hasDetailChanged(current, original)) {
          changedDetails.push(current)
        }
      } else {
        // New detail (no id)
        changedDetails.push(current)
      }
    })

    return changedDetails
  }

  // Check if there are any changes to save (memoized for performance)
  const hasAnyChanges = useMemo((): boolean => {
    if (!originalFormData) {
      // No original data means it's new (should be saveable)
      return true
    }

    // Check if rule has changed
    const ruleChanged = hasRuleChanged(formData, originalFormData)

    // Check if any details have changed
    const changedDetails = getChangedDetails(formData.details, originalFormData.details)

    const anyChanges = ruleChanged || changedDetails.length > 0
    return anyChanges
  }, [formData, originalFormData])

  // Handle submit
  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      // Step 1: Auto-order details first
      const orderedDetails = autoOrderDetails(formData.details)

      // Update form data with ordered details
      const formDataWithOrderedDetails = {
        ...formData,
        details: orderedDetails
      }

      const ruleHasChanged = hasRuleChanged(formDataWithOrderedDetails, originalFormData)
      const changedDetails = originalFormData
        ? getChangedDetails(orderedDetails, originalFormData.details)
        : orderedDetails

      // Step 3: Save rule if it has changed
      let newRuleId: string | undefined
      if (ruleHasChanged) {
        const dataToSubmit = {
          ...formDataWithOrderedDetails,
          activeFrom: formDataWithOrderedDetails.activeFrom
            ? new Date(formDataWithOrderedDetails.activeFrom + 'T00:00:00.000Z').toISOString()
            : '',
          activeTo: formDataWithOrderedDetails.activeTo
            ? new Date(formDataWithOrderedDetails.activeTo + 'T23:59:59.999Z').toISOString()
            : '',
          details: [] // Empty details array since details are saved via separate API
        }
        const savedRuleResponse: any = await onSubmit(dataToSubmit)

        const ruleId = savedRuleResponse?.mileageRule?.id || savedRuleResponse?.id
        const ruleVersion = savedRuleResponse?.mileageRule?.version

        // Always capture the ID for new rules (when we don't have one yet)
        if (ruleId && !formData.id) {
          newRuleId = ruleId
          formDataWithOrderedDetails.id = newRuleId
          formDataWithOrderedDetails.version = ruleVersion
          setFormData(prev => ({ ...prev, id: newRuleId, version: ruleVersion }))
        } else if (ruleId) {
          // For updates, just use the existing ID
          newRuleId = ruleId
        } else {
          console.error('❌ Failed to extract rule ID from response!')
        }
      } else {
      }

      // Step 4: Save changed details (pass the new rule ID if available)
      if (changedDetails.length > 0) {
        await saveDetailsToBackend(changedDetails, newRuleId || formData.id)
      }
      // Step 5: Update original data to current state (for future change detection)
      setOriginalFormData({ ...formDataWithOrderedDetails })
    } catch (error) {
      console.error('Error submitting form:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="gba:space-y-6" data-testid="mileage-rule-form">
      <Form {...form}>
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="gba:space-y-4 gba:overflow-visible">
            <div className="gba:grid gba:grid-cols-3 gba:gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={e => {
                          field.onChange(e)
                          setFormData(prev => ({ ...prev, code: e.target.value }))
                        }}
                        placeholder="Enter code"
                        data-testid="mileage-rule-form-code"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ruleName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rule Name *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={e => {
                          field.onChange(e)
                          setFormData(prev => ({ ...prev, ruleName: e.target.value }))
                        }}
                        placeholder="Enter rule name"
                        data-testid="mileage-rule-form-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rulePeriod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rule Period *</FormLabel>
                    <Select
                      value={field.value || undefined}
                      onValueChange={value => {
                        field.onChange(value)
                        setFormData(prev => ({ ...prev, rulePeriod: value }))
                      }}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="mileage-rule-form-rule-period">
                          <SelectValue placeholder="Select rule period" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {getMileageRulePeriodOptions().map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={e => {
                        field.onChange(e)
                        setFormData(prev => ({ ...prev, description: e.target.value }))
                      }}
                      placeholder="Enter description"
                      data-testid="mileage-rule-form-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <FormField
                control={form.control}
                name="activeFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Active From *</FormLabel>
                    <FormControl>
                      <DateInput
                        value={field.value || ''}
                        onChange={date => {
                          const normalized = normalizeDateInputValue(date) ?? ''
                          field.onChange(normalized)
                          setFormData(prev => ({ ...prev, activeFrom: normalized }))
                        }}
                        outputFormat="iso"
                        data-testid="mileage-rule-form-active-from"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="activeTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Active To</FormLabel>
                    <FormControl>
                      <DateInput
                        value={field.value || ''}
                        onChange={date => {
                          const normalized = normalizeDateInputValue(date)
                          field.onChange(normalized)
                          setFormData(prev => ({ ...prev, activeTo: normalized }))
                        }}
                        outputFormat="iso"
                        data-testid="mileage-rule-form-active-to"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Mileage Details */}
        <Card>
          <CardHeader>
            <CardTitle className="gba:flex gba:justify-between gba:items-center">
              <span>Mileage Details</span>
              <Button
                onClick={addDetail}
                data-testid="mileage-rule-form-add-detail"
                className="gba:flex gba:items-center gba:gap-2"
              >
                <PiPlus className="gba:w-4 gba:h-4" />
                Add Detail
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {formData.details.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No mileage details added yet. Click "Add Detail" to create your first rate.
                </AlertDescription>
              </Alert>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToVerticalAxis]}
              >
                <SortableContext
                  items={formData.details.map((detail, index) => detail.tempId || detail.id || `detail-${index}`)}
                  strategy={verticalListSortingStrategy}
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="gba:w-10">Drag</TableHead>
                        <TableHead className="gba:w-[60px]">Actions</TableHead>
                        <TableHead>Limit From</TableHead>
                        <TableHead>Limit To</TableHead>
                        <TableHead>Rate Amount</TableHead>
                        <TableHead>Active From</TableHead>
                        <TableHead>Active To</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.details.map((detail, index) => {
                        // Use stable identifier for data-testid and key
                        const stableId = detail.tempId || detail.id || `detail-${index}`

                        return (
                          <SortableRow key={stableId} id={stableId}>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeDetail(index)}
                                data-testid={`mileage-rule-form-detail-delete-${stableId}`}
                                className="gba:text-red-600 hover:gba:text-red-800"
                              >
                                <PiTrash className="gba:w-4 gba:h-4" />
                              </Button>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="1"
                                value={detail.limitFrom || ''}
                                onChange={e =>
                                  updateDetail(
                                    index,
                                    'limitFrom',
                                    e.target.value ? parseFloat(e.target.value) : undefined
                                  )
                                }
                                placeholder="0"
                                data-testid={`mileage-rule-form-detail-limit-from-${stableId}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="1"
                                value={detail.limitTo || ''}
                                onChange={e =>
                                  updateDetail(
                                    index,
                                    'limitTo',
                                    e.target.value ? parseFloat(e.target.value) : undefined
                                  )
                                }
                                placeholder="∞"
                                data-testid={`mileage-rule-form-detail-limit-to-${stableId}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                value={detail.rateAmount || ''}
                                onChange={e => {
                                  const value = e.target.value
                                  // Allow empty string for better editing experience
                                  if (value === '') {
                                    updateDetail(index, 'rateAmount', 0)
                                  } else {
                                    const parsedValue = parseFloat(value)
                                    if (!isNaN(parsedValue)) {
                                      updateDetail(index, 'rateAmount', parsedValue)
                                    }
                                  }
                                }}
                                placeholder="0.00"
                                data-testid={`mileage-rule-form-detail-rate-amount-${stableId}`}
                              />
                            </TableCell>
                            <TableCell>
                              <DateInput
                                value={detail.activeFrom || ''}
                                onChange={date =>
                                  updateDetail(index, 'activeFrom', normalizeDateInputValue(date) || '')
                                }
                                outputFormat="iso"
                                data-testid={`mileage-rule-form-detail-active-from-${stableId}`}
                              />
                            </TableCell>
                            <TableCell>
                              <DateInput
                                value={detail.activeTo || ''}
                                onChange={date => updateDetail(index, 'activeTo', normalizeDateInputValue(date) || '')}
                                outputFormat="iso"
                                data-testid={`mileage-rule-form-detail-active-to-${stableId}`}
                              />
                            </TableCell>
                          </SortableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </SortableContext>
                <DragOverlay>
                  {activeId ? (
                    <TableRow className="gba:bg-muted gba:opacity-80">
                      <TableCell className="gba:w-10 gba:text-center">
                        <PiDotsSixVertical className="gba:text-gray-400 gba:text-lg" />
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell>Dragging...</TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}
          </CardContent>
        </Card>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <PiWarning className="gba:w-4 gba:h-4" />
            <AlertDescription>
              <strong>Please fix the following issues:</strong>
              <ul className="gba:list-disc gba:list-inside gba:mt-2">
                {validationErrors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Form Actions */}
        <div className="gba:flex gba:justify-end gba:gap-3">
          <Button variant="outline" onClick={onCancel} data-testid="mileage-rule-form-cancel">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !hasAnyChanges} data-testid="mileage-rule-form-save">
            {isSubmitting ? (
              <>
                <Spinner className="gba:w-4 gba:h-4 gba:mr-2" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </Form>
    </div>
  )
}

export default MileageRuleForm
