import type { MouseEvent } from 'react'
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
import { DocumentTocTextStyleSection } from './DocumentTocTextStyleSection'
import {
  DEFAULT_DOCUMENT_TOC_STYLES,
  parseDocumentTocStyles,
  stringifyDocumentTocStyles
} from '../../utils/documentTocStyleUtils'

interface DocumentTocSettingsSidebarProps {
  editor: Editor
  tocNodePos: number
  headerHeight?: number
  rightOffset?: number
  onClose: () => void
  'data-testid'?: string
}

type TocAttrs = {
  stylesJson: string
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
    stylesJson: stringifyDocumentTocStyles(parseDocumentTocStyles(String(node.attrs.stylesJson ?? ''))),
    showPageNumbers: node.attrs.showPageNumbers !== false,
    rightAlignPageNumbers: node.attrs.rightAlignPageNumbers !== false,
    tabLeader: node.attrs.tabLeader === 'none' ? 'none' : 'dot',
    headingLinks: node.attrs.headingLinks !== false,
    maxHeadingLevel
  }
}

function preventEditorBlurOnMouseDown(event: MouseEvent<HTMLElement>) {
  event.preventDefault()
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
  const styles = useMemo(() => parseDocumentTocStyles(attrs.stylesJson), [attrs.stylesJson])
  const unifiedTextStyle = useMemo(() => styles.entries, [styles.entries])

  const selectContentProps = {
    'data-document-toc-sidebar-dropdown': '',
    onOpenAutoFocus: (event: Event) => event.preventDefault(),
    onCloseAutoFocus: (event: Event) => event.preventDefault()
  } as const

  return (
    <div
      className="gba:fixed gba:right-0 gba:bottom-0 gba:bg-background gba:border-l gba:border-border/50 gba:flex gba:flex-col gba:overflow-hidden gba:shadow-lg"
      style={{ top: `${headerHeight}px`, right: rightOffset, width: 360, zIndex: 45 }}
      data-testid={testId}
    >
      <div className="gba:flex gba:items-start gba:justify-between gba:gap-3 gba:px-4 gba:py-3.5 gba:border-b gba:border-border/50 gba:bg-muted/15">
        <h3 className="gba:text-base gba:font-semibold gba:leading-tight gba:tracking-tight">
          {t('document-toc-settings-title')}
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gba:h-auto gba:shrink-0 gba:px-0 gba:text-sm gba:font-normal gba:underline gba:underline-offset-2"
          onMouseDown={preventEditorBlurOnMouseDown}
          onClick={onClose}
          data-testid={`${testId}-close`}
        >
          {t('document-toc-settings-close')}
        </Button>
      </div>

      <div className="gba:flex-1 gba:min-h-0 gba:overflow-hidden">
        <ScrollArea className="gba:flex-1 gba:h-full">
          <div className="gba:flex gba:flex-col gba:gap-4 gba:px-4 gba:py-4">
            <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
              <Label className="gba:text-sm gba:font-medium">{t('document-toc-settings-page-numbers')}</Label>
              <Checkbox
                checked={attrs.showPageNumbers}
                onCheckedChange={checked => updateOptions({ showPageNumbers: checked === true })}
                onMouseDown={preventEditorBlurOnMouseDown}
                data-testid={`${testId}-page-numbers`}
              />
            </div>

            <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
              <Label className="gba:text-sm gba:font-medium">{t('document-toc-settings-heading-links')}</Label>
              <Checkbox
                checked={attrs.headingLinks}
                onCheckedChange={checked => updateOptions({ headingLinks: checked === true })}
                onMouseDown={preventEditorBlurOnMouseDown}
                data-testid={`${testId}-heading-links`}
              />
            </div>

            <Separator />

            <div className="gba:space-y-2">
              <Label className="gba:text-xs gba:font-medium">{t('document-toc-settings-page-number-align')}</Label>
              <Select
                value={attrs.rightAlignPageNumbers ? 'right' : 'inline'}
                onValueChange={value => updateOptions({ rightAlignPageNumbers: value === 'right' })}
              >
                <SelectTrigger data-testid={`${testId}-page-number-align`} onMouseDown={preventEditorBlurOnMouseDown}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent {...selectContentProps}>
                  <SelectItem value="right" onMouseDown={preventEditorBlurOnMouseDown}>
                    {t('document-toc-settings-page-number-align-right')}
                  </SelectItem>
                  <SelectItem value="inline" onMouseDown={preventEditorBlurOnMouseDown}>
                    {t('document-toc-settings-page-number-align-inline')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="gba:space-y-2">
              <Label className="gba:text-xs gba:font-medium">{t('document-toc-settings-tab-leader')}</Label>
              <Select
                value={attrs.tabLeader}
                onValueChange={value => updateOptions({ tabLeader: value as 'dot' | 'none' })}
              >
                <SelectTrigger data-testid={`${testId}-tab-leader`} onMouseDown={preventEditorBlurOnMouseDown}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent {...selectContentProps}>
                  <SelectItem value="dot" onMouseDown={preventEditorBlurOnMouseDown}>
                    {t('document-toc-settings-tab-leader-dot')}
                  </SelectItem>
                  <SelectItem value="none" onMouseDown={preventEditorBlurOnMouseDown}>
                    {t('document-toc-settings-tab-leader-none')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="gba:space-y-2">
              <Label className="gba:text-xs gba:font-medium">{t('document-toc-settings-max-heading-level')}</Label>
              <Select
                value={String(attrs.maxHeadingLevel)}
                onValueChange={value => updateOptions({ maxHeadingLevel: Number.parseInt(value, 10) || 3 })}
              >
                <SelectTrigger data-testid={`${testId}-max-level`} onMouseDown={preventEditorBlurOnMouseDown}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent {...selectContentProps}>
                  <SelectItem value="1" onMouseDown={preventEditorBlurOnMouseDown}>
                    {t('document-toc-settings-heading-1')}
                  </SelectItem>
                  <SelectItem value="2" onMouseDown={preventEditorBlurOnMouseDown}>
                    {t('document-toc-settings-heading-2')}
                  </SelectItem>
                  <SelectItem value="3" onMouseDown={preventEditorBlurOnMouseDown}>
                    {t('document-toc-settings-heading-3')}
                  </SelectItem>
                  <SelectItem value="4" onMouseDown={preventEditorBlurOnMouseDown}>
                    {t('document-toc-settings-heading-4')}
                  </SelectItem>
                  <SelectItem value="5" onMouseDown={preventEditorBlurOnMouseDown}>
                    {t('document-toc-settings-heading-5')}
                  </SelectItem>
                  <SelectItem value="6" onMouseDown={preventEditorBlurOnMouseDown}>
                    {t('document-toc-settings-heading-6')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <DocumentTocTextStyleSection
              title={t('document-toc-settings-text-style')}
              value={unifiedTextStyle}
              defaultValue={DEFAULT_DOCUMENT_TOC_STYLES.entries}
              onChange={nextValue =>
                updateOptions({
                  stylesJson: stringifyDocumentTocStyles({
                    ...styles,
                    title: nextValue,
                    entries: nextValue
                  })
                })
              }
              onMouseDown={preventEditorBlurOnMouseDown}
              selectContentProps={selectContentProps}
              testIdPrefix={`${testId}-text-style`}
            />
          </div>
        </ScrollArea>
      </div>

      <div className="gba:flex gba:gap-2 gba:border-t gba:border-border/50 gba:px-4 gba:py-3">
        <Button
          variant="outline"
          className="gba:flex-1"
          onMouseDown={preventEditorBlurOnMouseDown}
          onClick={() => editor.commands.updateDocumentTableOfContentsPageNumbers(tocNodePos)}
          data-testid={`${testId}-update-page-numbers`}
        >
          {t('document-toc-context-update-page-numbers')}
        </Button>
        <Button
          className="gba:flex-1"
          onMouseDown={preventEditorBlurOnMouseDown}
          onClick={() => editor.commands.updateDocumentTableOfContentsEntireTable(tocNodePos)}
          data-testid={`${testId}-update-entire`}
        >
          {t('document-toc-context-update-entire')}
        </Button>
      </div>
    </div>
  )
}
