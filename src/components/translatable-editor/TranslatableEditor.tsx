'use client'

import React from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import {
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

export interface TranslatableEditorProps {
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
  readonly 'data-testid'?: string
  readonly quillModules?: any
  readonly quillFormats?: string[]
}

const defaultLanguages = ['en-US', 'de-DE', 'ro-RO']

const languageNames: Record<string, string> = {
  'en-US': 'English',
  'de-DE': 'German',
  'ro-RO': 'Romanian'
}

const defaultQuillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    ['link', 'image'],
    ['clean']
  ]
}

const defaultQuillFormats = [
  'header',
  'bold',
  'italic',
  'underline',
  'strike',
  'list',
  'bullet',
  'align',
  'link',
  'image'
]

export function TranslatableEditor({
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
  'data-testid': dataTestId,
  quillModules = defaultQuillModules,
  quillFormats = defaultQuillFormats
}: TranslatableEditorProps) {
  const translatedLanguageCodes = Object.keys(translations)
  const allLanguageCodes = Array.from(new Set([...defaultLanguages, ...translatedLanguageCodes]))

  const getLanguageDisplayName = (langCode: string) => {
    return languageNames[langCode] || langCode.toUpperCase()
  }

  const handleMainFieldChange = (newValue: string) => {
    onChange(newValue)
    onTranslationsChange({
      ...translations,
      [defaultLanguage]: newValue
    })
  }

  const handleTranslationChange = (langCode: string, translationValue: string) => {
    const updatedTranslations = {
      ...translations,
      [langCode]: translationValue
    }

    if (langCode === defaultLanguage) {
      onChange(translationValue)
    }

    onTranslationsChange(updatedTranslations)
  }

  const handleDefaultLanguageChange = (newLanguage: string) => {
    if (!onDefaultLanguageChange) return

    const newDefaultValue = translations[newLanguage] || ''
    onChange(newDefaultValue)

    const updatedTranslations = {
      ...translations,
      [defaultLanguage]: value,
      [newLanguage]: newDefaultValue
    }

    onTranslationsChange(updatedTranslations)
    onDefaultLanguageChange(newLanguage)
  }

  const removeLanguage = (langToRemove: string) => {
    if (langToRemove === defaultLanguage) return

    const updatedTranslations = { ...translations }
    delete updatedTranslations[langToRemove]
    onTranslationsChange(updatedTranslations)
  }

  const hasTranslations = Object.keys(translations).length > 0

  return (
    <div className={`gba:space-y-2 ${className}`} data-testid={dataTestId}>
      {label && (
        <div className="gba:flex gba:items-center gba:justify-between">
          <Label className="gba:flex gba:items-center" data-testid={`${dataTestId}-Label`}>
            {label}
            {required && <span className="gba:text-destructive gba:ml-1">*</span>}
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="link"
                size="sm"
                className="gba:h-8 gba:w-8 gba:p-0"
                data-testid={`${dataTestId}-TranslateButton`}
              >
                <Languages
                  className={`gba:h-4 gba:w-4 gba:transition-colors ${
                    hasTranslations ? 'gba:text-primary' : 'gba:text-muted-foreground'
                  }`}
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="gba:w-[32rem] gba:p-4" align="end">
              <div className="gba:space-y-4">
                <div className="gba:pb-2">
                  <h4 className="gba:font-medium gba:text-sm">Translations</h4>
                </div>

                {onDefaultLanguageChange && allLanguageCodes.length > 1 && (
                  <>
                    <div className="gba:space-y-3">
                      <div className="gba:flex gba:items-center gba:space-x-2">
                        <Settings className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                        <span className="gba:text-sm gba:font-medium">Default Language</span>
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
                      <p className="gba:text-xs gba:text-muted-foreground gba:leading-relaxed">
                        The main field will sync with this language
                      </p>
                    </div>
                    <div className="gba:border-t gba:border-border gba:my-4" />
                  </>
                )}

                <div className="gba:space-y-3">
                  <div className="gba:max-h-[70vh] gba:overflow-y-auto gba:space-y-3">
                    {allLanguageCodes.map(langCode => {
                      const isCurrentLanguage = langCode === defaultLanguage
                      const isDefaultLanguage = defaultLanguages.includes(langCode)
                      const canRemove = langCode !== defaultLanguage && !isDefaultLanguage

                      return (
                        <div
                          key={langCode}
                          className={`gba:space-y-2 gba:p-3 gba:rounded-md gba:border ${
                            isCurrentLanguage
                              ? 'gba:bg-primary/5 gba:border-primary/20'
                              : 'gba:bg-muted/30 gba:border-border'
                          }`}
                        >
                          <div className="gba:flex gba:items-center gba:justify-between">
                            <div className="gba:flex gba:items-center gba:gap-2">
                              <span className="gba:text-sm gba:font-medium">{getLanguageDisplayName(langCode)}</span>
                              {isCurrentLanguage && (
                                <Badge variant="default" className="gba:text-xs">
                                  Default
                                </Badge>
                              )}
                            </div>
                            {canRemove && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeLanguage(langCode)}
                                className="gba:text-destructive hover:gba:text-destructive gba:p-1 gba:h-8 gba:w-8"
                              >
                                <X className="gba:h-4 gba:w-4" />
                              </Button>
                            )}
                          </div>
                          <div className="gba:rounded-md gba:border gba:border-border gba:overflow-hidden [&_.ql-toolbar]:gba:border-b [&_.ql-toolbar]:gba:border-border [&_.ql-toolbar]:gba:bg-muted/30 [&_.ql-container]:gba:border-0 [&_.ql-editor]:gba:min-h-[150px] [&_.ql-editor]:gba:text-foreground [&_.ql-editor.ql-blank::before]:gba:text-muted-foreground">
                            <ReactQuill
                              theme="snow"
                              value={translations[langCode] || ''}
                              onChange={val => handleTranslationChange(langCode, val)}
                              modules={quillModules}
                              formats={quillFormats}
                              placeholder="Write content here..."
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

      <div className="gba:rounded-md gba:border gba:border-border gba:overflow-hidden [&_.ql-toolbar]:gba:border-b [&_.ql-toolbar]:gba:border-border [&_.ql-toolbar]:gba:bg-muted/30 [&_.ql-container]:gba:border-0 [&_.ql-editor]:gba:min-h-[200px] [&_.ql-editor]:gba:text-foreground [&_.ql-editor.ql-blank::before]:gba:text-muted-foreground">
        <ReactQuill
          theme="snow"
          value={value || ''}
          onChange={handleMainFieldChange}
          modules={quillModules}
          formats={quillFormats}
          placeholder={placeholder || 'Write content here...'}
        />
      </div>

      {error && (
        <p className="gba:text-sm gba:text-destructive" data-testid={`${dataTestId}-Error`}>
          {error}
        </p>
      )}
    </div>
  )
}
