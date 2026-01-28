'use client'

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
  label: string
  value: string
  onChange: (value: string) => void
  translations: Record<string, string>
  onTranslationsChange: (translations: Record<string, string>) => void
  placeholder?: string
  required?: boolean
  error?: string
  defaultLanguage?: string
  onDefaultLanguageChange?: (language: string) => void
  className?: string
  variant?: 'input' | 'textarea'
  'data-testid'?: string
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
          <Popover>
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
            <PopoverContent className="gba:w-[28rem] gba:p-4" align="end">
              <TranslationWidget
                translations={translations}
                defaultLanguage={defaultLanguage}
                variant={variant}
                onTranslationChange={handleTranslationChange}
                onDefaultLanguageChange={handleDefaultLanguageChange}
                onRemoveLanguage={handleRemoveLanguage}
                onDefaultLanguageChangeProp={onDefaultLanguageChange}
              />
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
