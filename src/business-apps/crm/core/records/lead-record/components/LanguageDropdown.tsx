import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { LANGUAGES, Language } from '../utils/translationService'

interface LanguageDropdownProps {
  selectedLanguage: string
  onChange: (languageCode: string) => void
  size?: 'small' | 'middle' | 'large'
  className?: string
}

const getTriggerSize = (size: LanguageDropdownProps['size']) => (size === 'small' ? 'sm' : 'default')

export const LanguageDropdown: React.FC<LanguageDropdownProps> = ({
  selectedLanguage,
  onChange,
  size = 'small',
  className = ''
}) => {
  return (
    <Select value={selectedLanguage} onValueChange={onChange}>
      <SelectTrigger size={getTriggerSize(size)} className={`gba:w-40 ${className}`} data-testid="language-dropdown">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LANGUAGES.map((language: Language) => (
          <SelectItem key={language.code} value={language.code}>
            <span className="gba:mr-2">{language.flag}</span>
            {language.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
