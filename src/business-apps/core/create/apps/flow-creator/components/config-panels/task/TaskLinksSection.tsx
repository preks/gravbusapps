import React from 'react'
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { Link2, Plus, Trash2 } from 'lucide-react'
import type { Link } from '@/business-apps/flow/apps/creator/types/flowTemplate'
import { usePriorFileFieldOptions } from '../../shared/usePriorFileFieldOptions'

type LinkKind = 'DOCUMENT' | 'URL'

function normalizeKind(value?: string): LinkKind {
  const v = String(value || '')
    .trim()
    .toUpperCase()
  return v === 'DOCUMENT' ? 'DOCUMENT' : 'URL'
}

export interface TaskLinksSectionProps {
  nodeId: string
  value: Link[]
  onChange: (next: Link[]) => void
  t: (key: string) => string
  'data-testid'?: string
}

export const TaskLinksSection: React.FC<TaskLinksSectionProps> = ({
  nodeId,
  value,
  onChange,
  t,
  'data-testid': testId = 'flow-studio-task-links'
}) => {
  const links = Array.isArray(value) ? value : []
  const priorFileOptions = usePriorFileFieldOptions(nodeId)

  const updateAt = (index: number, patch: Partial<Link>) => {
    const next = links.slice()
    next[index] = { ...(next[index] || { type: 'URL', name: '', url: '' }), ...patch }
    onChange(next)
  }

  const removeAt = (index: number) => {
    const next = links.filter((_, i) => i !== index)
    onChange(next)
  }

  const addLink = () => {
    onChange([...links, { type: 'URL', name: '', url: '' }])
  }
  const emptyHint = priorFileOptions.length > 0 ? null : t('task-links-document-empty-hint')

  return (
    <div className="gba:flex gba:flex-col gba:gap-3" data-testid={testId}>
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
        <div className="gba:flex gba:items-center gba:gap-2">
          <div className="gba:flex gba:items-center gba:justify-center gba:w-7 gba:h-7 gba:rounded-md gba:bg-muted">
            <Link2 className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
          </div>
          <div className="gba:flex gba:flex-col">
            <span className="gba:text-sm gba:font-semibold gba:text-foreground">{t('task-links-title')}</span>
            <span className="gba:text-xs gba:text-muted-foreground">{t('task-links-subtitle')}</span>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={addLink} data-testid={`${testId}-add`}>
          <Plus className="gba:h-4 gba:w-4 gba:mr-2" />
          {t('task-links-add')}
        </Button>
      </div>

      {links.map((link, index) => {
        const kind = normalizeKind(link?.type)
        const selectedFileOptionId =
          kind === 'DOCUMENT'
            ? priorFileOptions.find(o => o.expression === String(link?.url || '').trim())?.id || ''
            : ''

        return (
          <div
            key={`${kind}-${index}`}
            className="gba:rounded-lg gba:border gba:border-border gba:bg-background"
            data-testid={`${testId}-row-${index}`}
          >
            <div className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:px-3 gba:py-2 gba:bg-muted gba:rounded-t-lg">
              <span className="gba:text-xs gba:font-semibold gba:text-foreground">
                {t('task-links-item')} {index + 1}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeAt(index)}
                data-testid={`${testId}-remove-${index}`}
              >
                <Trash2 className="gba:h-4 gba:w-4" />
              </Button>
            </div>

            <div className="gba:flex gba:flex-col gba:gap-3 gba:p-3">
              <div className="gba:flex gba:flex-col gba:gap-1.5">
                <Label className="gba:text-xs gba:font-medium">{t('task-links-kind')}</Label>
                <Select
                  value={kind}
                  onValueChange={(next: string) => {
                    const nextKind = normalizeKind(next)
                    if (nextKind === 'DOCUMENT') {
                      updateAt(index, { type: 'DOCUMENT', url: '' })
                      return
                    }
                    updateAt(index, { type: 'URL', url: kind === 'DOCUMENT' ? '' : String(link?.url || '') })
                  }}
                  data-testid={`${testId}-kind-${index}`}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DOCUMENT">{t('task-links-kind-document')}</SelectItem>
                    <SelectItem value="URL">{t('task-links-kind-link')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {kind === 'DOCUMENT' ? (
                <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-3">
                  <div className="gba:flex gba:flex-col gba:gap-1.5">
                    <Label className="gba:text-xs gba:font-medium">{t('task-links-name')}</Label>
                    <Input
                      value={String(link?.name || '')}
                      onChange={e => updateAt(index, { name: e.target.value })}
                      placeholder={t('task-links-name-placeholder')}
                      data-testid={`${testId}-name-${index}`}
                    />
                  </div>

                  <div className="gba:flex gba:flex-col gba:gap-1.5">
                    <Label className="gba:text-xs gba:font-medium">{t('task-links-document-source')}</Label>
                    <Select
                      value={selectedFileOptionId}
                      onValueChange={(id: string) => {
                        const picked = priorFileOptions.find(o => o.id === id)
                        if (!picked) return
                        updateAt(index, {
                          type: 'DOCUMENT',
                          url: picked.expression,
                          ...(String(link?.name || '').trim() ? {} : { name: picked.fieldLabel })
                        })
                      }}
                      data-testid={`${testId}-file-${index}`}
                      disabled={priorFileOptions.length === 0}
                    >
                      <SelectTrigger className="gba:w-full">
                        <SelectValue placeholder={t('task-links-document-source-placeholder')} />
                      </SelectTrigger>
                      <SelectContent className="gba:max-h-80">
                        {priorFileOptions.map(o => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {emptyHint ? <span className="gba:text-xs gba:text-muted-foreground">{emptyHint}</span> : null}
                  </div>
                </div>
              ) : (
                <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-3">
                  <div className="gba:flex gba:flex-col gba:gap-1.5">
                    <Label className="gba:text-xs gba:font-medium">{t('task-links-name')}</Label>
                    <Input
                      value={String(link?.name || '')}
                      onChange={e => updateAt(index, { name: e.target.value })}
                      placeholder={t('task-links-name-placeholder')}
                      data-testid={`${testId}-name-${index}`}
                    />
                  </div>
                  <div className="gba:flex gba:flex-col gba:gap-1.5">
                    <Label className="gba:text-xs gba:font-medium">{t('task-links-url')}</Label>
                    <Input
                      value={String(link?.url || '')}
                      onChange={e => updateAt(index, { url: e.target.value })}
                      placeholder={t('task-links-url-placeholder')}
                      data-testid={`${testId}-url-${index}`}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
