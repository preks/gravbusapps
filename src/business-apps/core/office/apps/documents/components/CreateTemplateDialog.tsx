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
  Textarea,
  useTranslation
} from '@newwork/nw-design-system'
import type { DocumentTemplate, DocumentTemplateMutationInput, TemplateCategory } from '../types'
import { TEMPLATE_CATEGORY_API_VALUES } from '../types'
import { TEMPLATE_CONTEXTS, getContextForCategory } from '../entities/templateContextConfig'
import translations from '../_i18n'

const CATEGORY_KEYS: Record<TemplateCategory, string> = {
  contracts: 'templates-category-contracts',
  agreements: 'templates-category-agreements',
  letters: 'templates-category-letters',
  reports: 'templates-category-reports',
  proposals: 'templates-category-proposals',
  policies: 'templates-category-policies',
  procedures: 'templates-category-procedures',
  forms: 'templates-category-forms',
  other: 'templates-category-other'
}

export interface CreateTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  createTemplate: (template: DocumentTemplateMutationInput) => Promise<DocumentTemplate | null>
  /** Called after create; pass chosen context so the editor can show the right entities (not persisted). */
  onCreated?: (template: DocumentTemplate, options?: { entityContext?: string }) => void
  'data-testid'?: string
}

export function CreateTemplateDialog({
  open,
  onOpenChange,
  createTemplate,
  onCreated,
  'data-testid': testId = 'create-template-dialog'
}: Readonly<CreateTemplateDialogProps>) {
  const { t } = useTranslation(translations)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<TemplateCategory>('other')
  const [context, setContext] = useState<string>(() => getContextForCategory('other'))
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCategoryChange = (value: TemplateCategory) => {
    setCategory(value)
    setContext(getContextForCategory(value))
  }

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
        isPublic: false
      })
      if (newTemplate) {
        setName('')
        setDescription('')
        setCategory('other')
        setContext(getContextForCategory('other'))
        onOpenChange(false)
        onCreated?.(newTemplate, { entityContext: context })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid={testId}>
        <DialogHeader>
          <DialogTitle>{t('create-template-title')}</DialogTitle>
          <DialogDescription>{t('create-template-description')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="gba:space-y-4">
          <div className="gba:space-y-2">
            <Label htmlFor="template-name">{t('create-template-name-label')}</Label>
            <Input
              id="template-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('create-template-name-placeholder')}
              required
              data-testid={`${testId}-name`}
            />
          </div>
          <div className="gba:space-y-2">
            <Label htmlFor="template-description">{t('create-template-description-label')}</Label>
            <Textarea
              id="template-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('create-template-description-placeholder')}
              rows={3}
              className="gba:resize-none"
              data-testid={`${testId}-description`}
            />
          </div>
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div className="gba:space-y-2">
              <Label htmlFor="template-category">{t('create-template-category-label')}</Label>
              <Select value={category} onValueChange={handleCategoryChange}>
                <SelectTrigger id="template-category" data-testid={`${testId}-category`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORY_API_VALUES.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {t(CATEGORY_KEYS[cat])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="gba:space-y-2">
              <Label htmlFor="template-context">{t('create-template-context-label')}</Label>
              <Select value={context} onValueChange={setContext}>
                <SelectTrigger id="template-context" data-testid={`${testId}-context`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CONTEXTS.map(ctx => (
                    <SelectItem key={ctx.key} value={ctx.key}>
                      {ctx.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              {t('common-cancel')}
            </Button>
            <Button type="submit" disabled={!name.trim() || isSubmitting} data-testid={`${testId}-submit`}>
              {isSubmitting ? t('create-template-creating') : t('create-template-create-button')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
