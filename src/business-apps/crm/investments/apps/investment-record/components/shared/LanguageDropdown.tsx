import React from 'react';
import { Select } from 'antd';

interface LanguageDropdownProps {
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  availableLanguages?: string[];
}

export const LanguageDropdown: React.FC<LanguageDropdownProps> = ({
  selectedLanguage,
  onLanguageChange,
  availableLanguages = ['Original', 'English', 'German', 'French']
}) => {
  return (
    <Select
      value={selectedLanguage}
      onChange={onLanguageChange}
      size="small"
      style={{ width: 120 }}
      options={availableLanguages.map(lang => ({ label: lang, value: lang }))}
    />
  );
};

export default LanguageDropdown;
