/**
 * Signature ink color — design-system dropdown with swatch previews (typed + drawn).
 */

import React from 'react'
import { ChevronDown } from 'lucide-react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Label,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../../_i18n'
import {
  DEFAULT_SIGNATURE_INK_HEX,
  INK_FAMILIES_ORDER,
  SIGNATURE_INK_OPTIONS,
  type InkFamily
} from './signatureInkPalette'

const TRIGGER_CLASSES =
  'gba:h-10 gba:w-full gba:justify-between gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:font-normal gba:text-foreground'

function Swatch({ hex }: Readonly<{ hex: string }>) {
  return (
    <span
      className="gba:size-4 gba:shrink-0 gba:rounded-sm gba:border gba:border-input"
      style={{ backgroundColor: hex }}
      aria-hidden
    />
  )
}

export interface SignatureInkPickerProps {
  value: string
  onChange: (hex: string) => void
  id?: string
  'data-testid'?: string
}

export function SignatureInkPicker({
  value,
  onChange,
  id = 'signature-ink-color',
  'data-testid': testId = 'signature-ink-picker'
}: Readonly<SignatureInkPickerProps>) {
  const { t } = useTranslation(translations)

  const labelId = `${id}-label`
  const triggerId = `${id}-trigger`

  const knownHex = SIGNATURE_INK_OPTIONS.some(o => o.hex === value)
  const selectValue = knownHex ? value : DEFAULT_SIGNATURE_INK_HEX

  const optionsByFamily = (family: InkFamily) => SIGNATURE_INK_OPTIONS.filter(o => o.family === family)

  const selectedOpt = SIGNATURE_INK_OPTIONS.find(o => o.hex === selectValue)
  const triggerLabel = selectedOpt
    ? `${t(`signature-ink-family-${selectedOpt.family}`)} · ${t(`signature-ink-tone-${selectedOpt.tone}`)}`
    : t('signature-ink-color-label')

  return (
    <div className="gba:space-y-2" data-testid={testId}>
      <Label id={labelId} htmlFor={triggerId}>
        {t('signature-ink-color-label')}
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
            <span className="gba:flex gba:min-w-0 gba:flex-1 gba:items-center gba:gap-2">
              <Swatch hex={selectValue} />
              <span className="gba:truncate gba:text-left">{triggerLabel}</span>
            </span>
            <ChevronDown className="gba:size-4 gba:shrink-0 gba:opacity-50" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="gba:max-h-64 gba:min-w-[var(--radix-dropdown-menu-trigger-width)] gba:overflow-y-auto"
          data-testid={`${testId}-menu`}
        >
          {INK_FAMILIES_ORDER.map((family, familyIndex) => (
            <React.Fragment key={family}>
              {familyIndex > 0 ? <DropdownMenuSeparator /> : null}
              <DropdownMenuLabel className="gba:text-xs gba:font-medium gba:text-muted-foreground">
                {t(`signature-ink-family-${family}`)}
              </DropdownMenuLabel>
              {optionsByFamily(family).map(opt => (
                <DropdownMenuItem
                  key={opt.hex}
                  active={opt.hex === selectValue}
                  className="gba:flex gba:cursor-pointer gba:items-center gba:gap-2"
                  data-testid={`${testId}-item-${opt.hex}`}
                  onSelect={() => onChange(opt.hex)}
                >
                  <Swatch hex={opt.hex} />
                  <span>{t(`signature-ink-tone-${opt.tone}`)}</span>
                </DropdownMenuItem>
              ))}
            </React.Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
