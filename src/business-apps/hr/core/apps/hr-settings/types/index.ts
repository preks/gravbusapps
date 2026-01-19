export interface HrSettingsConfig {
  id: string
  name: string
  value: string | number | boolean
  type: 'string' | 'number' | 'boolean' | 'json'
  category: string
  description?: string
  isRequired?: boolean
  isEditable?: boolean
  createdAt?: Date
  updatedAt?: Date
}

export interface HrSettingsCategory {
  id: string
  name: string
  description?: string
  icon?: string
  settings: HrSettingsConfig[]
}

export interface HrSettingsFormData {
  [key: string]: string | number | boolean
}
