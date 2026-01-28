import React, { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { ActionDTO } from '@/common/data/resources/types/action.types'

interface ActionDialogProps extends BusinessAppContextProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Omit<ActionDTO, 'id'> | Partial<ActionDTO>) => Promise<void>
  mode: 'create' | 'update'
  initialData?: ActionDTO
  'data-testid'?: string
}

const FLOW_TYPES = ['ACTION', 'NAVIGATION', 'REPORT'] as const

export const ActionDialog: React.FC<ActionDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  mode,
  initialData,
  'data-testid': dataTestId = 'action-dialog'
}) => {
  const [formData, setFormData] = useState<Partial<ActionDTO>>({
    flowName: '',
    processName: '',
    flowType: 'ACTION',
    domain: '',
    description: '',
    category: '',
    module: '',
    variant: '',
    rank: undefined
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({
        flowName: '',
        processName: '',
        flowType: 'ACTION',
        domain: '',
        description: '',
        category: '',
        module: '',
        variant: '',
        rank: undefined
      })
      setIsSubmitting(false)
    }
  }, [open])

  // Initialize form from initialData when opening in update mode
  useEffect(() => {
    if (open && initialData && mode === 'update') {
      setFormData({
        flowName: initialData.flowName || '',
        processName: initialData.processName || '',
        flowType: initialData.flowType || 'ACTION',
        domain: initialData.domain || '',
        description: initialData.description || '',
        category: initialData.category || '',
        module: initialData.module || '',
        variant: initialData.variant || '',
        rank: initialData.rank
      })
    }
  }, [open, initialData, mode])

  const handleChange = useCallback((field: keyof ActionDTO, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!formData.flowName || !formData.processName || !formData.flowType || !formData.domain) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      onOpenChange(false)
    } catch (error) {
      console.error('Error submitting action:', error)
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, onSubmit, onOpenChange])

  const isFormValid = formData.flowName && formData.processName && formData.flowType && formData.domain

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-[600px]" data-testid={dataTestId}>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Action' : 'Update Action'}</DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4 gba:py-4">
          {/* Flow Name */}
          <div className="gba:space-y-2">
            <Label htmlFor="flowName">Flow Name *</Label>
            <Input
              id="flowName"
              value={formData.flowName || ''}
              onChange={e => handleChange('flowName', e.target.value)}
              placeholder="Enter flow name"
              data-testid={`${dataTestId}-flowName-input`}
            />
          </div>

          {/* Process Name */}
          <div className="gba:space-y-2">
            <Label htmlFor="processName">Process Name *</Label>
            <Input
              id="processName"
              value={formData.processName || ''}
              onChange={e => handleChange('processName', e.target.value)}
              placeholder="Enter process name"
              data-testid={`${dataTestId}-processName-input`}
            />
          </div>

          {/* Flow Type */}
          <div className="gba:space-y-2">
            <Label htmlFor="flowType">Flow Type *</Label>
            <Select
              value={formData.flowType || 'ACTION'}
              onValueChange={(value: any) => handleChange('flowType', value)}
            >
              <SelectTrigger data-testid={`${dataTestId}-flowType-select`}>
                <SelectValue placeholder="Select flow type" />
              </SelectTrigger>
              <SelectContent>
                {FLOW_TYPES.map(type => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Domain */}
          <div className="gba:space-y-2">
            <Label htmlFor="domain">Domain *</Label>
            <Input
              id="domain"
              value={formData.domain || ''}
              onChange={e => handleChange('domain', e.target.value)}
              placeholder="Enter domain"
              data-testid={`${dataTestId}-domain-input`}
            />
          </div>

          {/* Description */}
          <div className="gba:space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description || ''}
              onChange={e => handleChange('description', e.target.value)}
              placeholder="Enter description (optional)"
              data-testid={`${dataTestId}-description-input`}
            />
          </div>

          {/* Category */}
          <div className="gba:space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={formData.category || ''}
              onChange={e => handleChange('category', e.target.value)}
              placeholder="Enter category (optional)"
              data-testid={`${dataTestId}-category-input`}
            />
          </div>

          {/* Module */}
          <div className="gba:space-y-2">
            <Label htmlFor="module">Module</Label>
            <Input
              id="module"
              value={formData.module || ''}
              onChange={e => handleChange('module', e.target.value)}
              placeholder="Enter module (optional)"
              data-testid={`${dataTestId}-module-input`}
            />
          </div>

          {/* Rank */}
          <div className="gba:space-y-2">
            <Label htmlFor="rank">Rank</Label>
            <Input
              id="rank"
              type="number"
              value={formData.rank?.toString() || ''}
              onChange={e => handleChange('rank', e.target.value ? Number.parseInt(e.target.value, 10) : undefined)}
              placeholder="Enter rank (optional)"
              data-testid={`${dataTestId}-rank-input`}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            data-testid={`${dataTestId}-submit-button`}
          >
            {(() => {
              if (isSubmitting) return 'Saving...'
              if (mode === 'create') return 'Create'
              return 'Update'
            })()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
