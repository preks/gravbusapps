'use client'

import { useRef, useState, useEffect } from 'react'
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
import {
  updateMainFieldTranslation,
  updateTranslation,
  changeDefaultLanguage,
  removeTranslationLanguage
} from './utils'
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
  const handleMainFieldChange = (newValue: string) => {
    onChange(newValue)
    const newTranslations = updateMainFieldTranslation(newValue, defaultLanguage, translations)
    onTranslationsChange(newTranslations)
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
    if (newTranslations !== null) {
      onTranslationsChange(newTranslations)
    }
  }

  const hasTranslations = Object.keys(translations).length > 0
  const currentValue = value
  const [open, setOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const lastFocusedInContentRef = useRef<HTMLElement | null>(null)

  // Keep focus inside the popover when Radix or parent tries to move it to the inline value
  const handleFocusOutside = (e: { preventDefault(): void }) => {
    e.preventDefault()
    const active = document.activeElement as HTMLElement | null
    if (contentRef.current?.contains(active)) return
    const toRestore = lastFocusedInContentRef.current
    if (toRestore?.offsetParent != null) {
      requestAnimationFrame(() => toRestore.focus())
    }
  }

  const handleFocusInContent = () => {
    const active = document.activeElement as HTMLElement | null
    if (active && contentRef.current?.contains(active)) {
      lastFocusedInContentRef.current = active
    }
  }

  // Handle outside click ourselves so clicks inside inputs (e.g. Romanian) don't close the popover
  useEffect(() => {
    if (!open) return
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null
      if (contentRef.current?.contains(target)) {
        if (target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/i.test(target.tagName)) {
          lastFocusedInContentRef.current = target
        }
        return
      }
      if (triggerRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown, true)
    return () => document.removeEventListener('mousedown', handleMouseDown, true)
  }, [open])

  return (
    <div className={label ? 'gba:space-y-2' : 'gba:space-y-0'} data-testid={dataTestId}>
      {/* Label */}
      {label && (
        <Label className="gba:flex gba:items-center" data-testid={`${dataTestId}-Label`}>
          {label}
          {required && <span className="gba:text-red-500 gba:ml-1">*</span>}
        </Label>
      )}

      {/* Main Input/Textarea Field with Translation Icon */}
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
            value={currentValue}
            onChange={e => handleMainFieldChange(e.target.value)}
            placeholder={placeholder}
            className={error ? 'gba:border-red-500' : ''}
            data-testid={`${dataTestId}-MainTextarea`}
            rows={4}
          />
        ) : (
          <InputGroupInput
            value={currentValue}
            onChange={e => handleMainFieldChange(e.target.value)}
            placeholder={placeholder}
            className={error ? 'gba:border-red-500' : ''}
            data-testid={`${dataTestId}-MainInput`}
          />
        )}
        <InputGroupAddon align={variant === 'textarea' ? 'block-end' : 'inline-end'}>
          <Popover open={open} onOpenChange={setOpen}>
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
                  onDefaultLanguageChangeProp={onDefaultLanguageChange}
                />
              </div>
            </PopoverContent>
          </Popover>
        </InputGroupAddon>
      </InputGroup>

      {/* Error Message */}
      {error && (
        <p className="gba:text-sm gba:text-red-600" data-testid={`${dataTestId}-Error`}>
          {error}
        </p>
      )}
    </div>
  )
}
