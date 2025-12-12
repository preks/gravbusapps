/**
 * InstanceFormDialog Component
 * Dialog for creating or editing flow engine instances
 */

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Textarea,
  Alert,
  AlertDescription
} from '@newwork/nw-design-system'
import { FlowEngineInstance } from '../../types/instance'
import { InstanceFormData } from '../../hooks/useInstanceManagement'
import { Loader2, AlertCircle } from 'lucide-react'

interface InstanceFormDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: InstanceFormData) => Promise<void>
  instance?: FlowEngineInstance | null
  isSubmitting: boolean
}

const DEFAULT_FORM_DATA: InstanceFormData = {
  name: '',
  code: '',
  baseUrl: '',
  apiKey: '',
  environment: 'DEV',
  icon: '🔧',
  color: '#666666',
  description: '',
  displayOrder: 999
}

const ENVIRONMENT_COLORS: Record<string, string> = {
  DEV: '#3b82f6',
  STAGING: '#f59e0b',
  PROD: '#10b981',
  LOCAL: '#8b5cf6'
}

const ENVIRONMENT_ICONS: Record<string, string> = {
  DEV: '💻',
  STAGING: '🧪',
  PROD: '🚀',
  LOCAL: '🖥️'
}

export const InstanceFormDialog: React.FC<InstanceFormDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  instance,
  isSubmitting
}) => {
  const [formData, setFormData] = useState<InstanceFormData>(DEFAULT_FORM_DATA)
  const [errors, setErrors] = useState<Partial<Record<keyof InstanceFormData, string>>>({})

  // Load instance data when editing
  useEffect(() => {
    if (instance && isOpen) {
      // Extract data from objectValue
      setFormData({
        name: instance.name,
        code: instance.code,
        baseUrl: instance.baseUrl,
        apiKey: instance.apiKey,
        environment: instance.environment as 'DEV' | 'STAGING' | 'PROD' | 'LOCAL',
        icon: instance.icon,
        color: instance.color,
        description: instance.description || '',
        displayOrder: instance.order || 999
      })
    } else if (isOpen) {
      // Reset form for new instance
      setFormData(DEFAULT_FORM_DATA)
    }
    setErrors({})
  }, [instance, isOpen])

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof InstanceFormData, string>> = {}

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    } else if (formData.name.length > 100) {
      newErrors.name = 'Name must be 100 characters or less'
    }

    // Code validation (only for new instances, code is immutable for existing ones)
    if (!instance) {
      if (!formData.code.trim()) {
        newErrors.code = 'Code is required'
      } else if (!/^[A-Z0-9_]+$/.test(formData.code)) {
        newErrors.code = 'Code must be uppercase alphanumeric with underscores'
      } else if (formData.code.length > 50) {
        newErrors.code = 'Code must be 50 characters or less'
      }
    }

    // Base URL validation
    if (!formData.baseUrl.trim()) {
      newErrors.baseUrl = 'Base URL is required'
    } else if (!/^https?:\/\/.+/.test(formData.baseUrl)) {
      newErrors.baseUrl = 'Base URL must start with http:// or https://'
    }

    // Icon validation
    if (!formData.icon.trim()) {
      newErrors.icon = 'Icon is required'
    }

    // Color validation
    if (!formData.color.trim()) {
      newErrors.color = 'Color is required'
    } else if (!/^#[0-9A-Fa-f]{6}$/.test(formData.color)) {
      newErrors.color = 'Color must be a valid hex color (e.g., #3b82f6)'
    }

    // Display order validation
    if (formData.displayOrder < 0) {
      newErrors.displayOrder = 'Display order must be a positive number'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      await onSubmit(formData)
      onClose()
    } catch (err) {
      // Error is handled by parent component
      console.error('Form submission failed:', err)
    }
  }

  const handleEnvironmentChange = (env: string) => {
    const environment = env as 'DEV' | 'STAGING' | 'PROD' | 'LOCAL'
    setFormData(prev => ({
      ...prev,
      environment,
      color: ENVIRONMENT_COLORS[environment] || prev.color,
      icon: ENVIRONMENT_ICONS[environment] || prev.icon
    }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="gba:max-w-2xl gba:max-h-[90vh] gba:overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{instance ? 'Edit Instance' : 'Add New Instance'}</DialogTitle>
          <DialogDescription>
            {instance
              ? 'Update the flow engine instance configuration.'
              : 'Add a new flow engine instance to enable template synchronization.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="gba:space-y-4 gba:py-4">
            {/* Name */}
            <div className="gba:space-y-2">
              <Label htmlFor="name">
                Name <span className="gba:text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Staging Environment"
                data-testid="instance-form-name"
              />
              {errors.name && <p className="gba:text-sm gba:text-destructive">{errors.name}</p>}
            </div>

            {/* Code */}
            <div className="gba:space-y-2">
              <Label htmlFor="code">
                Code <span className="gba:text-destructive">*</span>
              </Label>
              <Input
                id="code"
                value={formData.code}
                onChange={e => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                placeholder="e.g., STAGING"
                className="gba:font-mono"
                data-testid="instance-form-code"
                disabled={!!instance}
              />
              {errors.code && <p className="gba:text-sm gba:text-destructive">{errors.code}</p>}
              <p className="gba:text-xs gba:text-muted-foreground">
                {instance ? 'Code cannot be changed after creation' : 'Uppercase alphanumeric with underscores'}
              </p>
            </div>

            {/* Base URL */}
            <div className="gba:space-y-2">
              <Label htmlFor="baseUrl">
                Base URL <span className="gba:text-destructive">*</span>
              </Label>
              <Input
                id="baseUrl"
                value={formData.baseUrl}
                onChange={e => setFormData(prev => ({ ...prev, baseUrl: e.target.value }))}
                placeholder="https://staging.newwork.com/flow-engine"
                className="gba:font-mono"
                data-testid="instance-form-baseurl"
              />
              {errors.baseUrl && <p className="gba:text-sm gba:text-destructive">{errors.baseUrl}</p>}
              <p className="gba:text-xs gba:text-muted-foreground">
                Full URL to the custom-flow-engine instance (without /api)
              </p>
            </div>

            {/* API Key */}
            <div className="gba:space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={formData.apiKey}
                onChange={e => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder="Optional (uses access token if not provided)"
                data-testid="instance-form-apikey"
              />
              <p className="gba:text-xs gba:text-muted-foreground">
                Leave empty to use your access token. Required for external instances.
              </p>
            </div>

            {/* Environment */}
            <div className="gba:space-y-2">
              <Label htmlFor="environment">
                Environment <span className="gba:text-destructive">*</span>
              </Label>
              <Select value={formData.environment} onValueChange={handleEnvironmentChange}>
                <SelectTrigger id="environment" data-testid="instance-form-environment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEV">DEV</SelectItem>
                  <SelectItem value="STAGING">STAGING</SelectItem>
                  <SelectItem value="PROD">PROD</SelectItem>
                  <SelectItem value="LOCAL">LOCAL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Icon and Color */}
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <div className="gba:space-y-2">
                <Label htmlFor="icon">
                  Icon <span className="gba:text-destructive">*</span>
                </Label>
                <Input
                  id="icon"
                  value={formData.icon}
                  onChange={e => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                  placeholder="🔧"
                  maxLength={2}
                  data-testid="instance-form-icon"
                />
                {errors.icon && <p className="gba:text-sm gba:text-destructive">{errors.icon}</p>}
                <p className="gba:text-xs gba:text-muted-foreground">Emoji (e.g., 🧪 🚀 💻)</p>
              </div>

              <div className="gba:space-y-2">
                <Label htmlFor="color">
                  Color <span className="gba:text-destructive">*</span>
                </Label>
                <div className="gba:flex gba:gap-2">
                  <Input
                    id="color"
                    value={formData.color}
                    onChange={e => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    placeholder="#666666"
                    className="gba:font-mono"
                    data-testid="instance-form-color"
                  />
                  <input
                    type="color"
                    value={formData.color}
                    onChange={e => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="gba:w-12 gba:h-10 gba:rounded gba:cursor-pointer"
                  />
                </div>
                {errors.color && <p className="gba:text-sm gba:text-destructive">{errors.color}</p>}
              </div>
            </div>

            {/* Display Order */}
            <div className="gba:space-y-2">
              <Label htmlFor="displayOrder">
                Display Order <span className="gba:text-destructive">*</span>
              </Label>
              <Input
                id="displayOrder"
                type="number"
                min="0"
                value={formData.displayOrder}
                onChange={e => setFormData(prev => ({ ...prev, displayOrder: parseInt(e.target.value) || 0 }))}
                data-testid="instance-form-displayorder"
              />
              {errors.displayOrder && <p className="gba:text-sm gba:text-destructive">{errors.displayOrder}</p>}
              <p className="gba:text-xs gba:text-muted-foreground">Lower numbers appear first in lists</p>
            </div>

            {/* Description */}
            <div className="gba:space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional notes about this instance..."
                rows={3}
                data-testid="instance-form-description"
              />
            </div>

            {/* Preview */}
            <Alert>
              <AlertCircle className="gba:h-4 gba:w-4" />
              <AlertDescription>
                <div className="gba:flex gba:items-center gba:gap-2">
                  <span className="gba:text-2xl">{formData.icon}</span>
                  <div>
                    <div className="gba:font-medium">{formData.name || 'Instance Name'}</div>
                    <div className="gba:text-xs gba:text-muted-foreground">
                      {formData.environment} • {formData.baseUrl || 'Base URL'}
                    </div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} data-testid="instance-form-submit">
              {isSubmitting ? (
                <>
                  <Loader2 className="gba:mr-2 gba:h-4 gba:w-4 gba:animate-spin" />
                  {instance ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>{instance ? 'Update Instance' : 'Create Instance'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
