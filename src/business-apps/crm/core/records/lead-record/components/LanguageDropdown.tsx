import React from 'react'
import { Select } from 'antd'
import { LANGUAGES, Language } from '../utils/translationService'

interface LanguageDropdownProps {
  selectedLanguage: string
  onChange: (languageCode: string) => void
  size?: 'small' | 'middle' | 'large'
  style?: React.CSSProperties
}

const { Option } = Select

export const LanguageDropdown: React.FC<LanguageDropdownProps> = ({
  selectedLanguage,
  onChange,
  size = 'small',
  style = {}
}) => {
  return (
    <Select
      value={selectedLanguage}
      onChange={onChange}
      size={size}
      style={{ width: 150, ...style }}
      data-testid="language-dropdown"
    >
      {LANGUAGES.map((language: Language) => (
        <Option key={language.code} value={language.code}>
          <span style={{ marginRight: '8px' }}>{language.flag}</span>
          {language.label}
        </Option>
      ))}
    </Select>
  )
}
