/**
 * CreateTemplateDialog
 *
 * Modal to create a new document template: name, description, and category.
 * Category options match the document API allowed values.
 */

import React, { useState } from 'react'
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
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea
} from '@newwork/nw-design-system'
import type { DocumentTemplate, TemplateCategory } from '../types'
import { TEMPLATE_CATEGORY_API_VALUES } from '../types'

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  contracts: 'Contracts',
  agreements: 'Agreements',
  letters: 'Letters',
  reports: 'Reports',
  proposals: 'Proposals',
  policies: 'Policies',
  procedures: 'Procedures',
  forms: 'Forms',
  other: 'Other'
}

export interface CreateTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  createTemplate: (
    template: Omit<DocumentTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>
  ) => Promise<DocumentTemplate | null>
  currentUserId: string
  onCreated?: (template: DocumentTemplate) => void
  'data-testid'?: string
}

export function CreateTemplateDialog({
  open,
  onOpenChange,
  createTemplate,
  currentUserId,
  onCreated,
  'data-testid': testId = 'create-template-dialog'
}: CreateTemplateDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<TemplateCategory>('other')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) return
    setIsSubmitting(true)
    try {
      const newTemplate = await createTemplate({
        name: trimmedName,
        description: description.trim() || undefined,
        category,
        content: '<p></p>',
        isPublic: false,
        createdBy: currentUserId
      })
      if (newTemplate) {
        setName('')
        setDescription('')
        setCategory('other')
        onOpenChange(false)
        onCreated?.(newTemplate)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid={testId}>
        <DialogHeader>
          <DialogTitle>Create template</DialogTitle>
          <DialogDescription>
            Enter a name, optional description, and choose a category. You can edit content after creating.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="gba:space-y-4">
          <div className="gba:space-y-2">
            <Label htmlFor="template-name">Name</Label>
            <Input
              id="template-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Offer Letter"
              required
              data-testid={`${testId}-name`}
            />
          </div>
          <div className="gba:space-y-2">
            <Label htmlFor="template-description">Description (optional)</Label>
            <Textarea
              id="template-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of the template"
              rows={3}
              className="gba:resize-none"
              data-testid={`${testId}-description`}
            />
          </div>
          <div className="gba:space-y-2">
            <Label htmlFor="template-category">Category</Label>
            <Select value={category} onValueChange={v => setCategory(v as TemplateCategory)}>
              <SelectTrigger id="template-category" data-testid={`${testId}-category`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATE_CATEGORY_API_VALUES.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isSubmitting} data-testid={`${testId}-submit`}>
              {isSubmitting ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
