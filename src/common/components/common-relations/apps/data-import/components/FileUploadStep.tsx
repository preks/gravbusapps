/**
 * File Upload Step Component
 *
 * Generic upload step used by all import flows. The set of catalog
 * dropdowns rendered here is driven by `enforcedSelectConfigs` (from
 * `ImportConfig.enforcedSelects`), which the surrounding
 * `EntityImportView` wraps in a `CatalogSelect.Provider` and a
 * react-hook-form instance. Each visible config becomes a `FormField` +
 * `CatalogSelect`; cascading and "disabled until parent picked" are
 * handled natively by `CatalogSelect.parentField` /
 * `requireSourceForEnable`.
 *
 * Hidden configs (e.g. the synthetic `investmentGroup` root pre-seeded
 * with the import view's group ref) live in form state only — they exist
 * so cascading children can resolve a parent value via `parentField`
 * without rendering a duplicate dropdown.
 *
 * Adding a new enforced field is a config-only change.
 */

import React from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  Input,
  Label,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { useFormContext } from 'react-hook-form'
import { SparkleIcon, CheckCircleIcon, DownloadSimpleIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import CampaignSelect from '@/common/components/customer/selects/campaign-select/CampaignSelect'
import { CatalogSelect } from '@/components/catalog-select'
import type { EnforcedSelectConfig } from '@/common/components/common-relations/apps/data-import/types'
import translations from './FileUploadStep/_i18n'

export interface FileUploadStepProps {
  file: File | null
  isLoading: boolean
  isDownloadingTemplate?: boolean
  downloadTemplateError?: string | null
  onFileChange: (file: File | null) => Promise<void>
  onAnalyze: () => Promise<void>
  onDownloadTemplate: () => void | Promise<void>
  campaignId?: string
  onCampaignChange?: (campaign: { id: string; name: string } | null) => void
  businessAppContext?: BusinessAppContextProps
  enforcedSelectConfigs?: EnforcedSelectConfig[]
  allRequiredEnforcedSatisfied?: boolean
  'data-testid'?: string
}

interface EnforcedCatalogFieldProps {
  config: EnforcedSelectConfig
  testId: string
}

const EnforcedCatalogField: React.FC<EnforcedCatalogFieldProps> = ({ config, testId }) => {
  const { t } = useTranslation(translations)
  const form = useFormContext()
  return (
    <FormField
      control={form.control}
      name={config.id}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {t(config.labelKey)}
            {config.required && <span className="gba:text-destructive gba:ml-1">*</span>}
          </FormLabel>
          <FormControl>
            <CatalogSelect
              catalogIdentifier={`${config.catalogIdentifier}:v1`}
              variant="combobox"
              parentField={config.parentSelectId}
              requireSourceForEnable={Boolean(config.parentSelectId)}
              value={field.value || ''}
              onValueChange={field.onChange}
              allowClear={true}
              data-testid={`${testId}-enforced-${config.id}-select`}
            />
          </FormControl>
        </FormItem>
      )}
    />
  )
}

// Accepted import formats. Backend (Flowbot) handles parsing; the FE only
// gates the picker + surfaces an inline error when the user selects an
// unsupported file. Keep the extension list and `ACCEPTED_FILE_TYPES` in
// sync — extensions are checked client-side because some browsers report
// empty `File.type` for `.csv`/`.xls` on certain OSes.
const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.xls'] as const
const ACCEPTED_FILE_TYPES = [
  '.csv',
  '.xlsx',
  '.xls',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
].join(',')

const isAcceptedFile = (file: File): boolean => {
  const lower = file.name.toLowerCase()
  return ACCEPTED_EXTENSIONS.some(ext => lower.endsWith(ext))
}

export const FileUploadStep: React.FC<FileUploadStepProps> = ({
  file,
  isLoading,
  isDownloadingTemplate = false,
  downloadTemplateError = null,
  onFileChange,
  onAnalyze,
  onDownloadTemplate,
  campaignId,
  onCampaignChange,
  businessAppContext,
  enforcedSelectConfigs,
  allRequiredEnforcedSatisfied = true,
  'data-testid': testId = 'file-upload-step'
}) => {
  const { t } = useTranslation(translations)
  const [formatError, setFormatError] = React.useState<string | null>(null)

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null

    if (!selectedFile) {
      setFormatError(null)
      onFileChange(null)
      return
    }

    if (!isAcceptedFile(selectedFile)) {
      setFormatError(t('file-unsupported-format-error'))
      onFileChange(null)
      // Reset the native input so the same bad file can be re-selected after fix.
      e.target.value = ''
      return
    }

    setFormatError(null)
    onFileChange(selectedFile)
  }

  const canAnalyze = !!file && !isLoading && allRequiredEnforcedSatisfied
  const visibleEnforcedConfigs = enforcedSelectConfigs?.filter(cfg => !cfg.hidden) ?? []

  return (
    <Card data-testid={testId}>
      <CardHeader>
        <CardTitle>{t('file-upload-step-title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:space-y-4">
          <Button
            type="button"
            variant="default"
            onClick={onDownloadTemplate}
            disabled={isLoading || isDownloadingTemplate}
            className="gba:w-full"
            data-testid={`${testId}-download-template-button`}
          >
            {isDownloadingTemplate ? (
              <>
                <Spinner className="gba:w-4 gba:h-4 gba:mr-2" />
                {t('download-template-button-loading')}
              </>
            ) : (
              <>
                <DownloadSimpleIcon className="gba:w-4 gba:h-4 gba:mr-2" />
                {t('download-template-button')}
              </>
            )}
          </Button>

          <p className="gba:text-xs gba:text-muted-foreground" data-testid={`${testId}-download-template-hint`}>
            {t('download-template-hint')}
          </p>

          {downloadTemplateError && (
            <p className="gba:text-xs gba:text-destructive" data-testid={`${testId}-download-template-error`}>
              {downloadTemplateError}
            </p>
          )}

          <div>
            <Label htmlFor="file-upload">{t('file-select-label')}</Label>
            <Input
              id="file-upload"
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              onChange={handleFileInputChange}
              className="gba:mt-2"
              data-testid={`${testId}-file-input`}
            />
            <p
              className="gba:mt-1 gba:text-xs gba:text-muted-foreground"
              data-testid={`${testId}-accepted-formats-hint`}
            >
              {t('file-accepted-formats-hint')}
            </p>
          </div>

          {formatError && (
            <p className="gba:text-xs gba:text-destructive" data-testid={`${testId}-format-error`}>
              {formatError}
            </p>
          )}

          {file && (
            <div
              className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground"
              data-testid={`${testId}-file-info`}
            >
              <CheckCircleIcon className="gba:w-4 gba:h-4 gba:text-success" weight="fill" />
              {t('file-loaded-text', { fileName: file.name, fileSize: (file.size / 1024).toFixed(2) })}
            </div>
          )}

          {onCampaignChange && businessAppContext && (
            <div>
              <Label htmlFor="campaign-select">{t('campaign-id-label')}</Label>
              <CampaignSelect
                value={campaignId || null}
                onValueChange={(id: string | null) => onCampaignChange(id ? { id, name: id } : null)}
                onCampaignOptionChange={onCampaignChange}
                businessAppContext={businessAppContext}
                className="gba:mt-2 gba:w-full"
                data-testid={`${testId}-campaign-select`}
              />
            </div>
          )}

          {visibleEnforcedConfigs.map(cfg => (
            <EnforcedCatalogField key={cfg.id} config={cfg} testId={testId} />
          ))}

          {!allRequiredEnforcedSatisfied && file && (
            <p className="gba:text-xs gba:text-destructive" data-testid={`${testId}-enforced-required`}>
              {t('enforced-required-hint')}
            </p>
          )}

          <Button
            onClick={onAnalyze}
            disabled={!canAnalyze}
            className="gba:w-full"
            data-testid={`${testId}-analyze-button`}
          >
            {isLoading ? (
              <>
                <Spinner className="gba:w-4 gba:h-4 gba:mr-2" />
                {t('analyzing-button')}
              </>
            ) : (
              <>
                <SparkleIcon className="gba:w-4 gba:h-4 gba:mr-2" weight="fill" />
                {t('analyze-button')}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
