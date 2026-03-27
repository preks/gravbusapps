/**
 * Typed signature style — design-system dropdown with font preview in trigger and menu rows.
 */

import React from 'react'
import { ChevronDown } from 'lucide-react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Label,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../../_i18n'
import {
  TYPED_SIGNATURE_STYLE_IDS,
  getTypedSignatureInputPreviewStyle,
  type TypedSignatureStyle
} from './typedSignatureStyles'

const TRIGGER_CLASSES =
  'gba:h-10 gba:w-full gba:justify-between gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:font-normal gba:text-foreground'

export interface SignatureTypedStylePickerProps {
  value: TypedSignatureStyle
  onChange: (style: TypedSignatureStyle) => void
  id?: string
  'data-testid'?: string
}

export function SignatureTypedStylePicker({
  value,
  onChange,
  id,
  'data-testid': testId = 'signature-typed-style-picker'
}: Readonly<SignatureTypedStylePickerProps>) {
  const { t } = useTranslation(translations)
  const baseId = id ?? testId
  const labelId = `${baseId}-label`
  const triggerId = `${baseId}-trigger`

  return (
    <div className="gba:space-y-2" data-testid={testId}>
      <Label id={labelId} htmlFor={triggerId}>
        {t('signature-typed-style')}
      </Label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            id={triggerId}
            className={TRIGGER_CLASSES}
            data-testid={`${testId}-trigger`}
          >
            <span
              className="gba:min-w-0 gba:flex-1 gba:truncate gba:text-left"
              style={getTypedSignatureInputPreviewStyle(value)}
            >
              {t(`signature-style-${value}`)}
            </span>
            <ChevronDown className="gba:size-4 gba:shrink-0 gba:opacity-50" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="gba:max-h-64 gba:min-w-[var(--radix-dropdown-menu-trigger-width)] gba:overflow-y-auto"
          data-testid={`${testId}-menu`}
        >
          {TYPED_SIGNATURE_STYLE_IDS.map(styleId => (
            <DropdownMenuItem
              key={styleId}
              active={styleId === value}
              className="gba:cursor-pointer"
              data-testid={`${testId}-item-${styleId}`}
              onSelect={() => onChange(styleId)}
            >
              <span style={getTypedSignatureInputPreviewStyle(styleId)}>{t(`signature-style-${styleId}`)}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
