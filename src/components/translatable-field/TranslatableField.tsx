'use client'

import {
  Input,
  Label,
  Button,
  Badge,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { Languages, X, Settings } from 'lucide-react'

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
  inputClassName?: string
  'data-testid'?: string
}

const defaultLanguages = ['en-US', 'de-DE', 'ro-RO']

const languageNames: Record<string, string> = {
  'en-US': 'English',
  'de-DE': 'German',
  'ro-RO': 'Romanian'
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
  inputClassName = '',
  'data-testid': dataTestId
}: TranslatableFieldProps) {
  // Remove the unused state since we're using uncontrolled Popover

  // Get all languages that should be shown: default languages + languages with existing translations
  const translatedLanguageCodes = Object.keys(translations)
  const allLanguageCodes = Array.from(new Set([...defaultLanguages, ...translatedLanguageCodes]))

  const getLanguageDisplayName = (langCode: string) => {
    return languageNames[langCode] || langCode.toUpperCase()
  }

  // Handle main field value change
  const handleMainFieldChange = (newValue: string) => {
    onChange(newValue)
    // Auto-update the default language translation
    onTranslationsChange({
      ...translations,
      [defaultLanguage]: newValue
    })
  }

  // Handle translation change for specific language
  const handleTranslationChange = (langCode: string, translationValue: string) => {
    const updatedTranslations = {
      ...translations,
      [langCode]: translationValue
    }

    // If changing the default language, also update the main field
    if (langCode === defaultLanguage) {
      onChange(translationValue)
    }

    onTranslationsChange(updatedTranslations)
  }

  // Handle default language change
  const handleDefaultLanguageChange = (newLanguage: string) => {
    if (!onDefaultLanguageChange) return

    // Update the main field value to match the new default language
    const newDefaultValue = translations[newLanguage] || ''
    onChange(newDefaultValue)

    // Preserve current main field value in old default language
    const updatedTranslations = {
      ...translations,
      [defaultLanguage]: value,
      [newLanguage]: newDefaultValue
    }

    onTranslationsChange(updatedTranslations)
    onDefaultLanguageChange(newLanguage)
  }

  // Remove language
  const removeLanguage = (langToRemove: string) => {
    // Don't allow removing the current default language
    if (langToRemove === defaultLanguage) return

    const updatedTranslations = { ...translations }
    delete updatedTranslations[langToRemove]
    onTranslationsChange(updatedTranslations)
  }

  const hasTranslations = Object.keys(translations).length > 0
  const currentValue = value

  return (
    <div className={`${label ? 'gba:space-y-2' : 'gba:space-y-0'} ${className}`} data-testid={dataTestId}>
      {/* Label */}
      {label && (
        <Label className="gba:flex gba:items-center" data-testid={`${dataTestId}-Label`}>
          {label}
          {required && <span className="gba:text-red-500 gba:ml-1">*</span>}
        </Label>
      )}

      {/* Main Input Field with Translation Icon */}
      <div className="gba:relative gba:inline-block gba:w-full">
        <Input
          value={currentValue}
          onChange={e => handleMainFieldChange(e.target.value)}
          placeholder={placeholder}
          className={`${error ? 'gba:border-red-500 gba:pr-10' : 'gba:pr-10'} ${inputClassName}`}
          data-testid={`${dataTestId}-MainInput`}
        />

        {/* Translation Icon inside field */}
        <div className="gba:absolute gba:right-2 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:z-10">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="link"
                size="sm"
                className="gba:h-8 gba:w-8 gba:p-0 hover:gba:bg-gray-100"
                data-testid={`${dataTestId}-TranslateButton`}
              >
                <Languages
                  className={`gba:h-4 gba:w-4 gba:transition-colors ${
                    hasTranslations ? 'gba:text-blue-500' : 'gba:text-gray-400'
                  }`}
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="gba:w-[28rem] gba:p-4" align="end">
              <div className="gba:space-y-4">
                {/* Header */}
                <div className="gba:pb-2">
                  <h4 className="gba:font-medium gba:text-sm gba:text-gray-900">Translations</h4>
                </div>

                {/* Default Language Selection */}
                {onDefaultLanguageChange && allLanguageCodes.length > 1 && (
                  <>
                    <div className="gba:space-y-3">
                      <div className="gba:flex gba:items-center gba:space-x-2">
                        <Settings className="gba:h-4 gba:w-4 gba:text-gray-500" />
                        <span className="gba:text-sm gba:font-medium gba:text-gray-700">Default Language</span>
                      </div>
                      <Select value={defaultLanguage} onValueChange={handleDefaultLanguageChange}>
                        <SelectTrigger className="gba:w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {allLanguageCodes.map(langCode => (
                            <SelectItem key={langCode} value={langCode}>
                              {getLanguageDisplayName(langCode)} ({langCode})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="gba:text-xs gba:text-gray-500 gba:leading-relaxed">
                        The main field will sync with this language
                      </p>
                    </div>
                    <div className="gba:border-t gba:border-gray-200 gba:my-4" />
                  </>
                )}

                {/* Translation Inputs */}
                <div className="gba:space-y-3">
                  <div className="gba:max-h-[70vh] gba:overflow-y-auto gba:space-y-3">
                    {allLanguageCodes.map(langCode => {
                      const isCurrentLanguage = langCode === defaultLanguage
                      const isDefaultLanguage = defaultLanguages.includes(langCode)
                      const canRemove = langCode !== defaultLanguage && !isDefaultLanguage

                      return (
                        <div
                          key={langCode}
                          className={`gba:flex gba:items-center gba:space-x-3 gba:p-3 gba:rounded-md gba:border ${
                            isCurrentLanguage
                              ? 'gba:bg-blue-50 gba:border-blue-200'
                              : 'gba:bg-gray-50 gba:border-gray-200'
                          }`}
                        >
                          <div className="gba:w-20 gba:flex-shrink-0">
                            <div className="gba:space-y-1 gba:flex gba:flex-col gba:items-center">
                              <div className="gba:text-sm gba:font-medium gba:text-gray-700 gba:text-center">
                                {getLanguageDisplayName(langCode)}
                              </div>
                              {isCurrentLanguage && (
                                <Badge variant="default" className="gba:text-xs">
                                  Default
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="gba:flex-1">
                            <Input
                              value={translations[langCode] || ''}
                              onChange={e => handleTranslationChange(langCode, e.target.value)}
                              placeholder="Please enter..."
                              className="gba:h-9"
                            />
                          </div>
                          {canRemove && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeLanguage(langCode)}
                              className="gba:text-red-600 hover:gba:text-red-700 gba:p-1 gba:h-8 gba:w-8"
                            >
                              <X className="gba:h-4 gba:w-4" />
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <p className="gba:text-sm gba:text-red-600" data-testid={`${dataTestId}-Error`}>
          {error}
        </p>
      )}
    </div>
  )
}
