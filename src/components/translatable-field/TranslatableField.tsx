'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import {
  cn,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  InputGroup,
  InputGroupInput,
  InputGroupTextarea,
  InputGroupAddon,
  InputGroupButton
} from '@newwork/nw-design-system'
import { Languages } from 'lucide-react'
import { updateTranslation, changeDefaultLanguage, removeTranslationLanguage } from './utils'
import { TranslationWidget } from './TranslationWidget'

export interface TranslatableFieldProps {
  readonly label: string
  readonly value: string
  readonly onChange: (value: string) => void
  readonly translations: Record<string, string>
  readonly onTranslationsChange: (translations: Record<string, string>) => void
  readonly placeholder?: string
  readonly required?: boolean
  readonly error?: string
  readonly defaultLanguage?: string
  readonly onDefaultLanguageChange?: (language: string) => void
  readonly className?: string
  readonly variant?: 'input' | 'textarea'
  readonly 'data-testid'?: string
}

function hasDefaultTranslation(translations: Record<string, string>, defaultLanguage: string): boolean {
  return Object.prototype.hasOwnProperty.call(translations, defaultLanguage)
}

function isPointerRelevantToPopover(e: MouseEvent, popoverContentRoot: HTMLDivElement | null): boolean {
  if (!popoverContentRoot) {
    return false
  }
  return e
    .composedPath()
    .some(n => n === popoverContentRoot || (n instanceof Node && popoverContentRoot.contains(n as Node)))
}

export function TranslatableField({
  label,
  value,
  onChange,
  translations,
  onTranslationsChange,
  placeholder,
  required = false,
  error,
  defaultLanguage = 'en-US',
  onDefaultLanguageChange,
  className = '',
  variant = 'input',
  'data-testid': dataTestId
}: TranslatableFieldProps) {
  const [open, setOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const lastFocusedInContentRef = useRef<HTMLElement | null>(null)

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen)
      if (nextOpen && !hasDefaultTranslation(translations, defaultLanguage)) {
        onTranslationsChange({ ...translations, [defaultLanguage]: value })
      }
    },
    [value, defaultLanguage, translations, onTranslationsChange]
  )

  const handleMainFieldChange = (newValue: string) => {
    onChange(newValue)
    if (hasDefaultTranslation(translations, defaultLanguage)) {
      onTranslationsChange({ ...translations, [defaultLanguage]: newValue })
    }
  }

  const handleTranslationChange = (langCode: string, translationValue: string) => {
    const result = updateTranslation(langCode, translationValue, defaultLanguage, translations)
    onTranslationsChange(result.newTranslations)
    if (result.shouldUpdateMainField && result.newMainValue !== null) {
      onChange(result.newMainValue)
    }
  }

  const handleDefaultLanguageChange = (newLanguage: string) => {
    if (!onDefaultLanguageChange) return
    const result = changeDefaultLanguage(newLanguage, value, defaultLanguage, translations)
    onChange(result.newMainValue)
    onTranslationsChange(result.newTranslations)
    onDefaultLanguageChange(newLanguage)
  }

  const handleRemoveLanguage = (langToRemove: string) => {
    const newTranslations = removeTranslationLanguage(langToRemove, defaultLanguage, translations)
    if (newTranslations !== null) onTranslationsChange(newTranslations)
  }

  const handleClearTranslation = () => {
    onTranslationsChange({})
    setOpen(false)
  }

  const hasTranslations = Object.keys(translations).length > 0

  const handleFocusOutside = (e: { preventDefault(): void }) => {
    e.preventDefault()
    const active = document.activeElement as HTMLElement | null
    if (contentRef.current?.contains(active)) return
    const toRestore = lastFocusedInContentRef.current
    if (toRestore?.offsetParent != null) requestAnimationFrame(() => toRestore.focus())
  }

  const handleFocusInContent = () => {
    const active = document.activeElement as HTMLElement | null
    if (active && contentRef.current?.contains(active)) lastFocusedInContentRef.current = active
  }

  useEffect(() => {
    if (!open) return
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null
      if (isPointerRelevantToPopover(e, contentRef.current)) {
        if (target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/i.test(target.tagName)) {
          lastFocusedInContentRef.current = target
        }
        return
      }
      if (triggerRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown, false)
    return () => document.removeEventListener('mousedown', handleMouseDown, false)
  }, [open])

  return (
    <div className={label ? 'gba:space-y-2' : 'gba:space-y-0'} data-testid={dataTestId}>
      {label && (
        <Label className="gba:flex gba:items-center" data-testid={`${dataTestId}-Label`}>
          {label}
          {required && <span className="gba:text-red-500 gba:ml-1">*</span>}
        </Label>
      )}

      <InputGroup
        className={cn(
          className,
          'gba:[&&_[data-slot=input-group-control]]:![font-size:inherit]',
          'gba:[&&_[data-slot=input-group-control]]:![font-family:inherit]',
          'gba:[&&_[data-slot=input-group-control]]:![line-height:inherit]',
          'gba:[&&_[data-slot=input-group-addon]]:![font-size:inherit]',
          'gba:[&&_[data-slot=input-group-addon]]:![font-family:inherit]',
          'gba:[&&_[data-slot=input-group-addon]]:![line-height:inherit]'
        )}
      >
        {variant === 'textarea' ? (
          <InputGroupTextarea
            value={value}
            onChange={e => handleMainFieldChange(e.target.value)}
            placeholder={placeholder}
            className={error ? 'gba:border-red-500' : ''}
            data-testid={`${dataTestId}-MainTextarea`}
            rows={4}
          />
        ) : (
          <InputGroupInput
            value={value}
            onChange={e => handleMainFieldChange(e.target.value)}
            placeholder={placeholder}
            className={error ? 'gba:border-red-500' : ''}
            data-testid={`${dataTestId}-MainInput`}
          />
        )}
        <InputGroupAddon align={variant === 'textarea' ? 'block-end' : 'inline-end'}>
          <Popover open={open} onOpenChange={handleOpenChange}>
            <div ref={triggerRef} className="gba:inline-flex">
              <PopoverTrigger asChild>
                <InputGroupButton
                  variant="link"
                  size="iconXs"
                  data-testid={`${dataTestId}-TranslateButton`}
                  className="gba:ml-auto"
                >
                  <Languages
                    className={`gba:h-4 gba:w-4 gba:transition-colors ${
                      hasTranslations ? 'gba:text-blue-500' : 'gba:text-gray-400'
                    }`}
                  />
                </InputGroupButton>
              </PopoverTrigger>
            </div>
            <PopoverContent
              className="gba:w-[28rem] gba:p-4 gba:z-[10000] gba:pointer-events-auto"
              align="end"
              onPointerDownOutside={e => e.preventDefault()}
              onFocusOutside={handleFocusOutside}
            >
              <div ref={contentRef} className="gba:outline-none" onFocusCapture={handleFocusInContent}>
                <TranslationWidget
                  translations={translations}
                  defaultLanguage={defaultLanguage}
                  variant={variant}
                  onTranslationChange={handleTranslationChange}
                  onDefaultLanguageChange={handleDefaultLanguageChange}
                  onRemoveLanguage={handleRemoveLanguage}
                  onClearTranslation={handleClearTranslation}
                  onDefaultLanguageChangeProp={onDefaultLanguageChange}
                />
              </div>
            </PopoverContent>
          </Popover>
        </InputGroupAddon>
      </InputGroup>

      {error && (
        <p className="gba:text-sm gba:text-red-600" data-testid={`${dataTestId}-Error`}>
          {error}
        </p>
      )}
    </div>
  )
}
