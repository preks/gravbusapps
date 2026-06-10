import React, { useEffect, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Textarea
} from '@newwork/nw-design-system'
import { PlusIcon, TrashIcon, ArrowCounterClockwiseIcon } from '@phosphor-icons/react'
import { useWorkplaceTranslation } from '../_i18n/useWorkplaceTranslation'
import {
  createEmptyQuickAction,
  nextQuickActionIconKey,
  resolveQuickActionIcon,
  type QuickAction
} from '../utils/quickActions'

const TEST_ID = 'digital-workplace-quick-editor'

export interface QuickActionsEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  actions: QuickAction[]
  onSave: (actions: QuickAction[]) => void
  onReset: () => void
}

/**
 * Polished editor for the workplace quick actions. Lets the user rename, re-icon
 * (cycling the icon palette), reorder by add/remove, reset to defaults and save.
 * Changes are local to the draft until "Save" commits them to the parent.
 */
const QuickActionsEditor: React.FC<QuickActionsEditorProps> = ({ open, onOpenChange, actions, onSave, onReset }) => {
  const { t } = useWorkplaceTranslation()
  const [draft, setDraft] = useState<QuickAction[]>(actions)

  useEffect(() => {
    if (open) setDraft(actions)
  }, [open, actions])

  const updateItem = (id: string, patch: Partial<QuickAction>) => {
    setDraft(prev => prev.map(item => (item.id === id ? { ...item, ...patch } : item)))
  }

  const removeItem = (id: string) => {
    setDraft(prev => prev.filter(item => item.id !== id))
  }

  const addItem = () => {
    setDraft(prev => [...prev, createEmptyQuickAction()])
  }

  const handleSave = () => {
    const cleaned = draft
      .map(item => ({ ...item, label: item.label.trim(), prompt: item.prompt.trim() }))
      .filter(item => item.label.length > 0 && item.prompt.length > 0)
    onSave(cleaned)
    onOpenChange(false)
  }

  const handleReset = () => {
    onReset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-2xl" data-testid={`${TEST_ID}-dialog`}>
        <DialogHeader>
          <DialogTitle>{t('quick-editor-title')}</DialogTitle>
          <DialogDescription>{t('quick-editor-desc')}</DialogDescription>
        </DialogHeader>

        <div className="gba:flex gba:max-h-[55vh] gba:flex-col gba:gap-3 gba:overflow-y-auto gba:py-1">
          {draft.length === 0 ? (
            <p className="gba:rounded-lg gba:border gba:border-dashed gba:border-border gba:px-4 gba:py-8 gba:text-center gba:text-sm gba:text-muted-foreground">
              {t('quick-editor-empty')}
            </p>
          ) : (
            draft.map(item => {
              const ItemIcon = resolveQuickActionIcon(item.iconKey)
              return (
                <div
                  key={item.id}
                  className="gba:flex gba:items-start gba:gap-3 gba:rounded-xl gba:border gba:border-border gba:bg-card gba:p-3"
                  data-testid={`${TEST_ID}-row`}
                >
                  <button
                    type="button"
                    onClick={() => updateItem(item.id, { iconKey: nextQuickActionIconKey(item.iconKey) })}
                    title={t('quick-editor-icon')}
                    aria-label={t('quick-editor-icon')}
                    className="gba:mt-0.5 gba:flex gba:size-10 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-lg gba:bg-ai/10 gba:text-ai gba:transition gba:hover:bg-ai/20"
                    data-testid={`${TEST_ID}-icon`}
                  >
                    <ItemIcon className="gba:size-5" weight="duotone" />
                  </button>

                  <div className="gba:flex gba:min-w-0 gba:flex-1 gba:flex-col gba:gap-2">
                    <Input
                      value={item.label}
                      onChange={event => updateItem(item.id, { label: event.target.value })}
                      placeholder={t('quick-editor-label-placeholder')}
                      aria-label={t('quick-editor-label')}
                      data-testid={`${TEST_ID}-label`}
                    />
                    <Textarea
                      value={item.prompt}
                      onChange={event => updateItem(item.id, { prompt: event.target.value })}
                      placeholder={t('quick-editor-prompt-placeholder')}
                      aria-label={t('quick-editor-prompt')}
                      rows={2}
                      data-testid={`${TEST_ID}-prompt`}
                    />
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.id)}
                    title={t('quick-editor-remove')}
                    aria-label={t('quick-editor-remove')}
                    data-testid={`${TEST_ID}-remove`}
                  >
                    <TrashIcon className="gba:size-4" />
                  </Button>
                </div>
              )
            })
          )}

          <Button
            variant="outline"
            onClick={addItem}
            className="gba:w-full gba:border-dashed"
            data-testid={`${TEST_ID}-add`}
          >
            <PlusIcon className="gba:size-4" />
            {t('quick-editor-add')}
          </Button>
        </div>

        <DialogFooter className="gba:sm:justify-between">
          <Button variant="ghost" onClick={handleReset} data-testid={`${TEST_ID}-reset`}>
            <ArrowCounterClockwiseIcon className="gba:size-4" />
            {t('quick-editor-reset')}
          </Button>
          <div className="gba:flex gba:items-center gba:gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} data-testid={`${TEST_ID}-cancel`}>
              {t('quick-editor-cancel')}
            </Button>
            <Button onClick={handleSave} data-testid={`${TEST_ID}-save`}>
              {t('quick-editor-save')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default QuickActionsEditor
export { QuickActionsEditor }
