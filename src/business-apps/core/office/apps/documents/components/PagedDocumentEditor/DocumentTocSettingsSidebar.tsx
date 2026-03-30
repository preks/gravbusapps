import { useMemo } from 'react'
import type { Editor } from '@tiptap/react'
import {
  Button,
  Checkbox,
  Label,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../../_i18n'

interface DocumentTocSettingsSidebarProps {
  editor: Editor
  tocNodePos: number
  headerHeight?: number
  rightOffset?: number
  onClose: () => void
  'data-testid'?: string
}

type TocAttrs = {
  showPageNumbers: boolean
  rightAlignPageNumbers: boolean
  tabLeader: 'dot' | 'none'
  headingLinks: boolean
  maxHeadingLevel: number
}

function getCurrentTocAttrs(editor: Editor, tocNodePos: number): TocAttrs | null {
  const node = editor.state.doc.nodeAt(tocNodePos)
  if (!node || node.type.name !== 'documentTableOfContents') {
    return null
  }

  const maxHeadingLevel = Math.max(1, Math.min(6, Number(node.attrs.maxHeadingLevel ?? 3)))
  return {
    showPageNumbers: node.attrs.showPageNumbers !== false,
    rightAlignPageNumbers: node.attrs.rightAlignPageNumbers !== false,
    tabLeader: node.attrs.tabLeader === 'none' ? 'none' : 'dot',
    headingLinks: node.attrs.headingLinks !== false,
    maxHeadingLevel
  }
}

export function DocumentTocSettingsSidebar({
  editor,
  tocNodePos,
  headerHeight = 120,
  rightOffset = 16,
  onClose,
  'data-testid': testId = 'document-toc-settings-sidebar'
}: Readonly<DocumentTocSettingsSidebarProps>) {
  const { t } = useTranslation(translations)
  const attrs = useMemo(() => getCurrentTocAttrs(editor, tocNodePos), [editor, tocNodePos, editor.state])

  if (!attrs) {
    return null
  }

  const updateOptions = (next: Partial<TocAttrs>) => {
    editor.commands.setDocumentTableOfContentsOptions(next, tocNodePos)
  }

  return (
    <div
      className="gba:fixed gba:right-0 gba:bottom-0 gba:bg-background gba:border-l gba:border-border/50 gba:flex gba:flex-col gba:overflow-hidden gba:shadow-lg"
      style={{ top: `${headerHeight}px`, right: rightOffset, width: 360, zIndex: 45 }}
      data-testid={testId}
    >
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:px-4 gba:py-3 gba:border-b gba:border-border/50 gba:bg-gradient-to-b gba:from-muted/20 gba:to-transparent">
        <h3 className="gba:text-base gba:font-semibold">{t('document-toc-settings-title')}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={onClose} data-testid={`${testId}-close`}>
          {t('document-toc-settings-close')}
        </Button>
      </div>

      <div className="gba:flex-1 gba:min-h-0 gba:overflow-hidden">
        <ScrollArea className="gba:flex-1 gba:h-full">
          <div className="gba:flex gba:flex-col gba:gap-4 gba:px-4 gba:py-4">
            <div className="gba:flex gba:items-center gba:justify-between">
              <Label>{t('document-toc-settings-page-numbers')}</Label>
              <Checkbox
                checked={attrs.showPageNumbers}
                onCheckedChange={checked => updateOptions({ showPageNumbers: checked === true })}
                data-testid={`${testId}-page-numbers`}
              />
            </div>

            <div className="gba:flex gba:items-center gba:justify-between">
              <Label>{t('document-toc-settings-heading-links')}</Label>
              <Checkbox
                checked={attrs.headingLinks}
                onCheckedChange={checked => updateOptions({ headingLinks: checked === true })}
                data-testid={`${testId}-heading-links`}
              />
            </div>

            <Separator />

            <div className="gba:space-y-2">
              <Label>{t('document-toc-settings-page-number-align')}</Label>
              <Select
                value={attrs.rightAlignPageNumbers ? 'right' : 'inline'}
                onValueChange={value => updateOptions({ rightAlignPageNumbers: value === 'right' })}
              >
                <SelectTrigger data-testid={`${testId}-page-number-align`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="right">{t('document-toc-settings-page-number-align-right')}</SelectItem>
                  <SelectItem value="inline">{t('document-toc-settings-page-number-align-inline')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="gba:space-y-2">
              <Label>{t('document-toc-settings-tab-leader')}</Label>
              <Select
                value={attrs.tabLeader}
                onValueChange={value => updateOptions({ tabLeader: value as 'dot' | 'none' })}
              >
                <SelectTrigger data-testid={`${testId}-tab-leader`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dot">{t('document-toc-settings-tab-leader-dot')}</SelectItem>
                  <SelectItem value="none">{t('document-toc-settings-tab-leader-none')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="gba:space-y-2">
              <Label>{t('document-toc-settings-max-heading-level')}</Label>
              <Select
                value={String(attrs.maxHeadingLevel)}
                onValueChange={value => updateOptions({ maxHeadingLevel: Number.parseInt(value, 10) || 3 })}
              >
                <SelectTrigger data-testid={`${testId}-max-level`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{t('document-toc-settings-heading-1')}</SelectItem>
                  <SelectItem value="2">{t('document-toc-settings-heading-2')}</SelectItem>
                  <SelectItem value="3">{t('document-toc-settings-heading-3')}</SelectItem>
                  <SelectItem value="4">{t('document-toc-settings-heading-4')}</SelectItem>
                  <SelectItem value="5">{t('document-toc-settings-heading-5')}</SelectItem>
                  <SelectItem value="6">{t('document-toc-settings-heading-6')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </ScrollArea>
      </div>

      <div className="gba:flex gba:gap-2 gba:border-t gba:border-border/50 gba:px-4 gba:py-3">
        <Button
          variant="outline"
          className="gba:flex-1"
          onClick={() => editor.commands.updateDocumentTableOfContents(tocNodePos)}
          data-testid={`${testId}-update`}
        >
          {t('document-toc-context-update')}
        </Button>
      </div>
    </div>
  )
}
