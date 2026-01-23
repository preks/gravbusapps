'use client'

import {
  Input,
  Textarea,
  Button,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { X, Settings } from 'lucide-react'
import { DEFAULT_LANGUAGES, getAllLanguageCodes, getLanguageDisplayName } from './utils'

export interface TranslationWidgetProps {
  translations: Record<string, string>
  defaultLanguage: string
  variant: 'input' | 'textarea'
  onTranslationChange: (langCode: string, translationValue: string) => void
  onDefaultLanguageChange: (newLanguage: string) => void
  onRemoveLanguage: (langToRemove: string) => void
  onDefaultLanguageChangeProp?: (language: string) => void
}

export function TranslationWidget({
  translations,
  defaultLanguage,
  variant,
  onTranslationChange,
  onDefaultLanguageChange,
  onRemoveLanguage,
  onDefaultLanguageChangeProp
}: TranslationWidgetProps) {
  const allLanguageCodes = getAllLanguageCodes(translations)

  return (
    <div className="gba:space-y-4">
      <div className="gba:pb-2">
        <h4 className="gba:font-medium gba:text-sm gba:text-gray-900">Translations</h4>
      </div>

      {onDefaultLanguageChangeProp && allLanguageCodes.length > 1 && (
        <>
          <div className="gba:space-y-3">
            <div className="gba:flex gba:items-center gba:space-x-2">
              <Settings className="gba:h-4 gba:w-4 gba:text-gray-500" />
              <span className="gba:text-sm gba:font-medium gba:text-gray-700">Default Language</span>
            </div>
            <Select value={defaultLanguage} onValueChange={onDefaultLanguageChange}>
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

      <div className="gba:space-y-3">
        <div className="gba:max-h-[70vh] gba:overflow-y-auto gba:space-y-3">
          {allLanguageCodes.map(langCode => {
            const isCurrentLanguage = langCode === defaultLanguage
            const isDefaultLanguage = DEFAULT_LANGUAGES.includes(langCode)
            const canRemove = langCode !== defaultLanguage && !isDefaultLanguage

            return (
              <div
                key={langCode}
                className={`gba:flex gba:items-center gba:space-x-3 gba:p-3 gba:rounded-md gba:border ${
                  isCurrentLanguage ? 'gba:bg-blue-50 gba:border-blue-200' : 'gba:bg-gray-50 gba:border-gray-200'
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
                  {variant === 'textarea' ? (
                    <Textarea
                      value={translations[langCode] || ''}
                      onChange={e => onTranslationChange(langCode, e.target.value)}
                      placeholder="Please enter..."
                      rows={3}
                    />
                  ) : (
                    <Input
                      value={translations[langCode] || ''}
                      onChange={e => onTranslationChange(langCode, e.target.value)}
                      placeholder="Please enter..."
                      className="gba:h-9"
                    />
                  )}
                </div>
                {canRemove && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveLanguage(langCode)}
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
  )
}
