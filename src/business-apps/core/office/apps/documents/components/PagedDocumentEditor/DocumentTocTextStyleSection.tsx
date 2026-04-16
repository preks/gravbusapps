// Shared formatting controls for a generated table-of-contents text style.

import React from 'react'
import type { MouseEvent } from 'react'
import {
  Button,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../../_i18n'
import { DEFAULT_FONT_FAMILY, FONT_FAMILIES, FONT_FAMILY_KEYS, FONT_SIZES } from './editorToolbarShared'
import { type DocumentTocTextStyle, normalizeDocumentTocTextStyle } from '../../utils/documentTocStyleUtils'

const DEFAULT_FONT_SIZE_PT = 12

interface DocumentTocTextStyleSectionProps {
  title: string
  value: DocumentTocTextStyle
  defaultValue: DocumentTocTextStyle
  onChange: (nextValue: DocumentTocTextStyle) => void
  onMouseDown: (event: MouseEvent<HTMLElement>) => void
  selectContentProps: {
    'data-document-toc-sidebar-dropdown': ''
    onOpenAutoFocus: (event: Event) => void
    onCloseAutoFocus: (event: Event) => void
  }
  testIdPrefix: string
}

export function DocumentTocTextStyleSection({
  title,
  value,
  defaultValue,
  onChange,
  onMouseDown,
  selectContentProps,
  testIdPrefix
}: Readonly<DocumentTocTextStyleSectionProps>) {
  const { t } = useTranslation(translations)

  const applyPatch = (patch: Partial<DocumentTocTextStyle>) => {
    onChange(normalizeDocumentTocTextStyle({ ...value, ...patch }, defaultValue))
  }

  const fontFamilyValue = value.fontFamily || DEFAULT_FONT_FAMILY
  const fontSizeValue = `${value.fontSizePt ?? DEFAULT_FONT_SIZE_PT}pt`
  const hasCustomFontSize =
    value.fontSizePt !== null && !FONT_SIZES.some(fontSize => fontSize.value === `${value.fontSizePt}pt`)

  return (
    <React.Fragment>
      <section className="gba:space-y-3" data-testid={`${testIdPrefix}-section`}>
        <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
          <h4 className="gba:text-sm gba:font-semibold">{title}</h4>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gba:h-auto gba:px-0 gba:text-xs"
            onMouseDown={onMouseDown}
            onClick={() => onChange(defaultValue)}
            data-testid={`${testIdPrefix}-reset-button`}
          >
            {t('table-sidebar-reset-default')}
          </Button>
        </div>

        <div className="gba:space-y-2">
          <Label className="gba:text-xs gba:font-medium">{t('document-toc-settings-font-family')}</Label>
          <Select value={fontFamilyValue} onValueChange={nextValue => applyPatch({ fontFamily: nextValue })}>
            <SelectTrigger data-testid={`${testIdPrefix}-font-family`} onMouseDown={onMouseDown}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent {...selectContentProps}>
              {FONT_FAMILIES.filter(font => font.value).map(font => (
                <SelectItem key={font.value} value={font.value} onMouseDown={onMouseDown}>
                  {t(FONT_FAMILY_KEYS[font.value] ?? 'editor-font-times')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="gba:space-y-2">
          <Label className="gba:text-xs gba:font-medium">{t('document-toc-settings-font-size')}</Label>
          <Select
            value={fontSizeValue}
            onValueChange={nextValue => {
              const parsedValue = Number.parseFloat(nextValue.replace('pt', ''))
              if (!Number.isNaN(parsedValue)) {
                applyPatch({ fontSizePt: parsedValue })
              }
            }}
          >
            <SelectTrigger data-testid={`${testIdPrefix}-font-size`} onMouseDown={onMouseDown}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent {...selectContentProps}>
              {hasCustomFontSize ? (
                <SelectItem value={fontSizeValue} onMouseDown={onMouseDown}>
                  {String(value.fontSizePt)}
                </SelectItem>
              ) : null}
              {FONT_SIZES.map(fontSize => (
                <SelectItem key={fontSize.value} value={fontSize.value} onMouseDown={onMouseDown}>
                  {fontSize.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="gba:grid gba:grid-cols-2 gba:gap-3">
          <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
            <Label className="gba:text-sm gba:font-medium">{t('document-toc-settings-bold')}</Label>
            <Checkbox
              checked={value.bold}
              onCheckedChange={checked => applyPatch({ bold: checked === true })}
              onMouseDown={onMouseDown}
              data-testid={`${testIdPrefix}-bold`}
            />
          </div>
          <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
            <Label className="gba:text-sm gba:font-medium">{t('document-toc-settings-italic')}</Label>
            <Checkbox
              checked={value.italic}
              onCheckedChange={checked => applyPatch({ italic: checked === true })}
              onMouseDown={onMouseDown}
              data-testid={`${testIdPrefix}-italic`}
            />
          </div>
        </div>

        <div className="gba:space-y-2">
          <Label className="gba:text-xs gba:font-medium">{t('document-toc-settings-text-color')}</Label>
          <div className="gba:flex gba:items-center gba:gap-2">
            <input
              type="color"
              value={value.color ?? '#000000'}
              onChange={event => applyPatch({ color: event.target.value })}
              className="gba:h-10 gba:w-14 gba:cursor-pointer gba:rounded gba:border gba:border-input gba:bg-background"
              data-testid={`${testIdPrefix}-color-picker`}
            />
            <Input
              type="text"
              value={value.color ?? ''}
              placeholder={t('editor-font-default')}
              onChange={event => applyPatch({ color: event.target.value })}
              className="gba:font-mono gba:text-sm"
              data-testid={`${testIdPrefix}-color-input`}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onMouseDown={onMouseDown}
              onClick={() => applyPatch({ color: null })}
              data-testid={`${testIdPrefix}-color-reset-button`}
            >
              {t('editor-font-default')}
            </Button>
          </div>
        </div>
      </section>
    </React.Fragment>
  )
}
