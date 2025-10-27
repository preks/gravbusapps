import React, { useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator
} from '@newwork/nw-design-system'
import { Calendar, User, Settings, Globe, Info, Hash, Tag } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CatalogManagement } from '@/common/types/CatalogTypes'
import { TranslatableField } from '@/components/translatable-field'

interface CatalogHeaderFormProps extends BusinessAppContextProps {
  data: CatalogManagement
  onChange: (field: string, value: any) => void
  isLoading?: boolean
  'data-testid'?: string
}

const localeOptions = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'German' },
  { value: 'ro', label: 'Romanian' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' }
]

export const CatalogHeaderForm: React.FC<CatalogHeaderFormProps> = ({
  data,
  onChange,
  isLoading = false,
  'data-testid': dataTestId = 'CatalogHeaderForm'
}) => {
  // Initialize translations from data.children if available
  const [nameTranslations, setNameTranslations] = useState<Record<string, string>>(() => {
    const translations: Record<string, string> = {}
    if (data.children && Array.isArray(data.children)) {
      for (const child of data.children) {
        const locale = child.defaultLocale || 'en'
        if (child.name) {
          translations[locale] = child.name
        }
      }
    }
    return translations
  })

  const [descriptionTranslations, setDescriptionTranslations] = useState<Record<string, string>>(() => {
    const translations: Record<string, string> = {}
    if (data.children && Array.isArray(data.children)) {
      for (const child of data.children) {
        const locale = child.defaultLocale || 'en'
        if (child.description) {
          translations[locale] = child.description
        }
      }
    }
    return translations
  })

  const handleTranslatableNameChange = (value: string) => {
    onChange('name', value)
  }

  const handleTranslatableDescriptionChange = (value: string) => {
    onChange('description', value)
  }

  const handleNameTranslationsChange = (translations: Record<string, string>) => {
    setNameTranslations(translations)
    onChange('nameTranslations', translations)
  }

  const handleDescriptionTranslationsChange = (translations: Record<string, string>) => {
    setDescriptionTranslations(translations)
    onChange('descriptionTranslations', translations)
  }

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
  }

  return (
    <div className="gba:space-y-6" data-testid={dataTestId}>
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <Info className="gba:h-5 gba:w-5" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
            <div className="gba:space-y-2">
              <Label htmlFor="catalog-identifier" className="gba:flex gba:items-center gba:gap-2">
                <Hash className="gba:h-4 gba:w-4" />
                Identifier *
              </Label>
              <Input
                id="catalog-identifier"
                value={data.identifier || ''}
                onChange={e => onChange('identifier', e.target.value)}
                placeholder="e.g., job-levels, departments"
                disabled={isLoading}
                data-testid={`${dataTestId}-IdentifierInput`}
              />
              <p className="gba:text-xs" style={{ color: 'var(--nw-color-text-secondary)' }}>
                Unique identifier used in API calls
              </p>
            </div>

            <div className="gba:space-y-2">
              <Label htmlFor="catalog-version" className="gba:flex gba:items-center gba:gap-2">
                <Tag className="gba:h-4 gba:w-4" />
                Version *
              </Label>
              <Input
                id="catalog-version"
                value={data.version || ''}
                onChange={e => onChange('version', e.target.value)}
                placeholder="e.g., v1, 1.0.0"
                disabled={isLoading}
                data-testid={`${dataTestId}-VersionInput`}
              />
              <p className="gba:text-xs" style={{ color: 'var(--nw-color-text-secondary)' }}>
                Version identifier for this catalog
              </p>
            </div>
          </div>

          <div className="gba:space-y-2">
            <Label className="gba:flex gba:items-center gba:gap-2">
              <Globe className="gba:h-4 gba:w-4" />
              Catalog Name *
            </Label>
            <TranslatableField
              label=""
              value={data.name || ''}
              onChange={handleTranslatableNameChange}
              translations={nameTranslations}
              onTranslationsChange={handleNameTranslationsChange}
              placeholder="Enter catalog display name..."
              required={true}
              defaultLanguage={data.defaultLocale || 'en'}
              data-testid={`${dataTestId}-NameTranslatable`}
            />
            <p className="gba:text-xs" style={{ color: 'var(--nw-color-text-secondary)' }}>
              Display name shown in user interfaces
            </p>
          </div>

          <div className="gba:space-y-2">
            <Label className="gba:flex gba:items-center gba:gap-2">
              <Globe className="gba:h-4 gba:w-4" />
              Description
            </Label>
            <TranslatableField
              label=""
              value={data.description || ''}
              onChange={handleTranslatableDescriptionChange}
              translations={descriptionTranslations}
              onTranslationsChange={handleDescriptionTranslationsChange}
              placeholder="Enter catalog description..."
              defaultLanguage={data.defaultLocale || 'en'}
              data-testid={`${dataTestId}-DescriptionTranslatable`}
            />
            <p className="gba:text-xs" style={{ color: 'var(--nw-color-text-secondary)' }}>
              Optional description explaining the catalog purpose
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Localization Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <Globe className="gba:h-5 gba:w-5" />
            Localization
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          <div className="gba:space-y-2">
            <Label htmlFor="default-locale">Default Locale</Label>
            <Select value={data.defaultLocale || 'en'} onValueChange={value => onChange('defaultLocale', value)}>
              <SelectTrigger data-testid={`${dataTestId}-LocaleSelect`}>
                <SelectValue placeholder="Select default locale" />
              </SelectTrigger>
              <SelectContent>
                {localeOptions.map(locale => (
                  <SelectItem key={locale.value} value={locale.value}>
                    {locale.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="gba:text-xs" style={{ color: 'var(--nw-color-text-secondary)' }}>
              Default language for catalog entries
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Validity Period */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <Calendar className="gba:h-5 gba:w-5" />
            Validity Period
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
            <div className="gba:space-y-2">
              <Label htmlFor="valid-from">Valid From</Label>
              <Input
                id="valid-from"
                type="datetime-local"
                value={data.validFrom ? new Date(data.validFrom).toISOString().slice(0, 16) : ''}
                onChange={e =>
                  onChange('validFrom', e.target.value ? new Date(e.target.value).toISOString() : undefined)
                }
                disabled={isLoading}
                data-testid={`${dataTestId}-ValidFromInput`}
              />
            </div>

            <div className="gba:space-y-2">
              <Label htmlFor="valid-to">Valid To</Label>
              <Input
                id="valid-to"
                type="datetime-local"
                value={data.validTo ? new Date(data.validTo).toISOString().slice(0, 16) : ''}
                onChange={e => onChange('validTo', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                disabled={isLoading}
                data-testid={`${dataTestId}-ValidToInput`}
              />
            </div>
          </div>
          <p className="gba:text-xs" style={{ color: 'var(--nw-color-text-secondary)' }}>
            Define when this catalog is active. Leave empty for permanent validity.
          </p>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <Settings className="gba:h-5 gba:w-5" />
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
            <div className="gba:space-y-2">
              <Label className="gba:flex gba:items-center gba:gap-2">
                <Calendar className="gba:h-4 gba:w-4" />
                Created
              </Label>
              <div
                className="gba:text-sm"
                style={{
                  color: 'var(--nw-color-text-secondary)',
                  padding: 'var(--nw-spacing-sm)',
                  backgroundColor: 'var(--nw-color-surface-secondary)',
                  borderRadius: 'var(--nw-border-radius-sm)'
                }}
              >
                {data.createdAt ? formatDateTime(data.createdAt) : 'Not available'}
              </div>
            </div>

            <div className="gba:space-y-2">
              <Label className="gba:flex gba:items-center gba:gap-2">
                <User className="gba:h-4 gba:w-4" />
                Created By
              </Label>
              <div
                className="gba:text-sm"
                style={{
                  color: 'var(--nw-color-text-secondary)',
                  padding: 'var(--nw-spacing-sm)',
                  backgroundColor: 'var(--nw-color-surface-secondary)',
                  borderRadius: 'var(--nw-border-radius-sm)'
                }}
              >
                {data.createdBy || 'Not available'}
              </div>
            </div>

            <div className="gba:space-y-2">
              <Label className="gba:flex gba:items-center gba:gap-2">
                <Calendar className="gba:h-4 gba:w-4" />
                Last Updated
              </Label>
              <div
                className="gba:text-sm"
                style={{
                  color: 'var(--nw-color-text-secondary)',
                  padding: 'var(--nw-spacing-sm)',
                  backgroundColor: 'var(--nw-color-surface-secondary)',
                  borderRadius: 'var(--nw-border-radius-sm)'
                }}
              >
                {data.updatedAt ? formatDateTime(data.updatedAt) : 'Not available'}
              </div>
            </div>

            <div className="gba:space-y-2">
              <Label className="gba:flex gba:items-center gba:gap-2">
                <User className="gba:h-4 gba:w-4" />
                Updated By
              </Label>
              <div
                className="gba:text-sm"
                style={{
                  color: 'var(--nw-color-text-secondary)',
                  padding: 'var(--nw-spacing-sm)',
                  backgroundColor: 'var(--nw-color-surface-secondary)',
                  borderRadius: 'var(--nw-border-radius-sm)'
                }}
              >
                {data.updatedBy || 'Not available'}
              </div>
            </div>
          </div>

          <Separator />

          <div className="gba:space-y-2">
            <Label className="gba:flex gba:items-center gba:gap-2">
              <Hash className="gba:h-4 gba:w-4" />
              Record State
            </Label>
            <div
              className="gba:text-sm"
              style={{
                color: 'var(--nw-color-text-secondary)',
                padding: 'var(--nw-spacing-sm)',
                backgroundColor: 'var(--nw-color-surface-secondary)',
                borderRadius: 'var(--nw-border-radius-sm)'
              }}
            >
              {data.recordState || 'ACTIVE'}
            </div>
          </div>

          {data.isDeleted && (
            <div
              className="gba:text-sm"
              style={{
                color: 'var(--nw-color-danger-500)',
                padding: 'var(--nw-spacing-sm)',
                backgroundColor: 'var(--nw-color-danger-50)',
                borderRadius: 'var(--nw-border-radius-sm)',
                border: '1px solid var(--nw-color-danger-200)'
              }}
            >
              ⚠️ This catalog is marked as deleted
              {data.deletedAt && ` on ${formatDateTime(data.deletedAt)}`}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default CatalogHeaderForm
