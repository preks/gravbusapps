import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Combobox
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { MenuItemDTO, MenuItemUpsertRequestDTO } from '@/common/data/resources/types/menuItem.types'
import { TranslatableField } from '@/components/translatable-field/TranslatableField'
import { useNavigations } from '@/common/data/resources/hooks/useNavigations'
import { useMenuItems } from '@/common/data/resources/hooks/useMenuItems'

interface MenuItemDialogProps extends BusinessAppContextProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: MenuItemUpsertRequestDTO, isHub: boolean) => Promise<void>
  mode: 'create' | 'update'
  initialData?: MenuItemDTO
  'data-testid'?: string
}

interface ParentOption {
  id: string
  name: string
  type: 'space' | 'navigation' | 'menuItem'
  path: string
}

export const MenuItemDialog: React.FC<MenuItemDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  mode,
  initialData,
  'data-testid': dataTestId = 'menu-item-dialog',
  ...context
}) => {
  const [formData, setFormData] = useState<Partial<MenuItemUpsertRequestDTO>>({
    name: '',
    icon: '',
    description: '',
    parentId: undefined,
    hubId: undefined,
    rank: undefined,
    nameTranslated: {},
    descriptionTranslated: {},
    resourceUrlId: undefined
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null)
  const [isHub, setIsHub] = useState(false)

  // Load navigations and menu items for parent selection
  const { navigations } = useNavigations(context)
  const { menuItems } = useMenuItems(context)

  // Build parent options: Spaces, Navigations, and Menu Items
  const parentOptions = useMemo<ParentOption[]>(() => {
    const options: ParentOption[] = []

    // Add Spaces
    options.push(
      { id: 'SPACE_USE', name: 'Use Space', type: 'space', path: 'Use Space' },
      { id: 'SPACE_CREATE', name: 'Create Space', type: 'space', path: 'Create Space' },
      { id: 'SPACE_MANAGE', name: 'Manage Space', type: 'space', path: 'Manage Space' }
    )

    // Add Navigations (as potential parents for hubs)
    navigations.forEach(nav => {
      options.push({
        id: nav.id || '',
        name: nav.name,
        type: 'navigation',
        path: nav.name
      })
    })

    // Add Menu Items (with full path)
    const buildMenuItemPath = (item: MenuItemDTO, path: string[] = []): void => {
      const currentPath = [...path, item.name]
      options.push({
        id: item.id,
        name: item.name,
        type: 'menuItem',
        path: currentPath.join(' / ')
      })
      if (item.children) {
        item.children.forEach(child => buildMenuItemPath(child, currentPath))
      }
    }

    menuItems.forEach(item => {
      buildMenuItemPath(item)
    })

    return options
  }, [navigations, menuItems])

  useEffect(() => {
    if (!open) {
      setFormData({
        name: '',
        icon: '',
        description: '',
        parentId: undefined,
        hubId: undefined,
        rank: undefined,
        nameTranslated: {},
        descriptionTranslated: {},
        resourceUrlId: undefined
      })
      setSelectedParentId(null)
      setIsHub(false)
      setIsSubmitting(false)
    }
  }, [open])

  useEffect(() => {
    if (open && initialData && mode === 'update') {
      const isHubItem = initialData.level === 0
      setIsHub(isHubItem)

      // Determine parent ID
      let parentId: string | undefined = undefined
      if (isHubItem) {
        // Hub parent is a Space
        if (initialData.type) {
          parentId = `SPACE_${initialData.type}`
        }
      } else {
        // Menu item parent is hubId or parentId
        parentId = initialData.hubId || initialData.parentId
      }

      setFormData({
        name: initialData.name || '',
        icon: initialData.icon || '',
        description: initialData.description || '',
        parentId,
        hubId: initialData.hubId,
        rank: initialData.rank,
        nameTranslated: initialData.nameTranslated || {},
        descriptionTranslated: initialData.descriptionTranslated || {},
        resourceUrlId: initialData.resourceUrlId
      })
      setSelectedParentId(parentId || null)
    }
  }, [open, initialData, mode])

  const handleChange = useCallback((field: keyof MenuItemUpsertRequestDTO, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleParentChange = useCallback(
    (parentId: string | null) => {
      setSelectedParentId(parentId)

      if (!parentId) {
        handleChange('parentId', undefined)
        handleChange('hubId', undefined)
        return
      }

      const parent = parentOptions.find(p => p.id === parentId)
      if (!parent) return

      if (parent.type === 'space') {
        // Parent is a Space - this creates a Hub
        setIsHub(true)
        handleChange('parentId', parentId)
        handleChange('hubId', undefined)
      } else if (parent.type === 'navigation') {
        // Parent is a Navigation - this creates a Hub under that navigation
        setIsHub(true)
        handleChange('parentId', undefined)
        handleChange('resourceUrlId', parentId)
      } else {
        // Parent is a Menu Item - this creates a Menu Item
        setIsHub(false)
        // Check if parent is a hub (level 0) or menu item
        const parentMenuItem = menuItems.find(m => m.id === parentId)
        if (parentMenuItem?.level === 0) {
          handleChange('hubId', parentId)
          handleChange('parentId', undefined)
        } else {
          handleChange('parentId', parentId)
          handleChange('hubId', undefined)
        }
      }
    },
    [parentOptions, menuItems, handleChange]
  )

  const handleSubmit = useCallback(async () => {
    if (!formData.name) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(formData as MenuItemUpsertRequestDTO, isHub)
      onOpenChange(false)
    } catch (error) {
      console.error('Error submitting menu item:', error)
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, isHub, onSubmit, onOpenChange])

  const isFormValid = formData.name

  const parentOptionsForCombobox = parentOptions.map(opt => ({
    value: opt.id,
    label: opt.path
  }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-[600px]" data-testid={dataTestId}>
        <DialogHeader>
          <DialogTitle>
            {mode === 'create'
              ? isHub
                ? 'Create Hub'
                : 'Create Menu Item'
              : isHub
                ? 'Update Hub'
                : 'Update Menu Item'}
          </DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4 gba:py-4">
          {/* Parent Selection */}
          <div className="gba:space-y-2">
            <Label htmlFor="parent">Parent *</Label>
            <Combobox
              value={selectedParentId || ''}
              onValueChange={handleParentChange}
              options={parentOptionsForCombobox}
              placeholder="Select parent (Space, Navigation, or Menu Item)..."
              searchPlaceholder="Type to search..."
              emptyText="No parents found"
              data-testid={`${dataTestId}-parent-combobox`}
            />
            {selectedParentId && (
              <p className="gba:text-xs gba:text-muted-foreground">
                {isHub ? 'Creating as Hub' : 'Creating as Menu Item'}
              </p>
            )}
          </div>

          {/* Name */}
          <TranslatableField
            label="Name *"
            value={formData.name || ''}
            translations={formData.nameTranslated || {}}
            onChange={value => handleChange('name', value)}
            onTranslationsChange={translations => handleChange('nameTranslated', translations)}
            placeholder="Enter name"
            required
            data-testid={`${dataTestId}-name-input`}
          />

          {/* Icon */}
          <div className="gba:space-y-2">
            <Label htmlFor="icon">Icon</Label>
            <Input
              id="icon"
              value={formData.icon || ''}
              onChange={e => handleChange('icon', e.target.value)}
              placeholder="Enter icon (emoji or icon name)"
              data-testid={`${dataTestId}-icon-input`}
            />
          </div>

          {/* Description */}
          <TranslatableField
            label="Description"
            value={formData.description || ''}
            translations={formData.descriptionTranslated || {}}
            onChange={value => handleChange('description', value)}
            onTranslationsChange={translations => handleChange('descriptionTranslated', translations)}
            placeholder="Enter description (optional)"
            variant="textarea"
            data-testid={`${dataTestId}-description-input`}
          />

          {/* Rank */}
          <div className="gba:space-y-2">
            <Label htmlFor="rank">Rank</Label>
            <Input
              id="rank"
              type="number"
              value={formData.rank?.toString() || ''}
              onChange={e => handleChange('rank', e.target.value ? parseInt(e.target.value, 10) : undefined)}
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
            disabled={!isFormValid || !selectedParentId || isSubmitting}
            data-testid={`${dataTestId}-submit-button`}
          >
            {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
