/**
 * File Upload Step Component
 * Generic file upload for any entity import
 */

import React, { useRef } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { SparkleIcon, CheckCircleIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import CampaignSelect from '@/common/components/customer/selects/campaign-select/CampaignSelect'
import { LeadImportDefaults } from '@/common/components/common-relations/apps/data-import/hooks/useLeadImportDefaults'
import translations from './FileUploadStep/_i18n'

export interface FileUploadStepProps {
  file: File | null
  isLoading: boolean
  onFileChange: (file: File | null) => Promise<void>
  onAnalyze: () => Promise<void>
  campaignId?: string
  onCampaignChange?: (campaign: { id: string; name: string } | null) => void
  businessAppContext?: BusinessAppContextProps
  leadDefaults?: LeadImportDefaults
  'data-testid'?: string
}

export const FileUploadStep: React.FC<FileUploadStepProps> = ({
  file,
  isLoading,
  onFileChange,
  onAnalyze,
  campaignId,
  onCampaignChange,
  businessAppContext,
  leadDefaults,
  'data-testid': testId = 'file-upload-step'
}) => {
  const { t } = useTranslation(translations)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null
    onFileChange(selectedFile)
  }

  const leadDefaultsComplete =
    !leadDefaults || (!!leadDefaults.selectedStatus && !!leadDefaults.selectedSource && !!leadDefaults.selectedRating)

  const canAnalyze = !!file && !isLoading && leadDefaultsComplete

  return (
    <Card data-testid={testId}>
      <CardHeader>
        <CardTitle>{t('file-upload-step-title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:space-y-4">
          <div>
            <Label htmlFor="file-upload">{t('file-select-label')}</Label>
            <Input
              id="file-upload"
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              className="gba:mt-2"
              data-testid={`${testId}-file-input`}
            />
          </div>

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

          {leadDefaults && (
            <>
              <div>
                <Label htmlFor="lead-status-select">
                  {t('lead-status-label')}
                  <span className="gba:text-destructive gba:ml-1">*</span>
                </Label>
                <Select
                  value={leadDefaults.selectedStatus || undefined}
                  onValueChange={leadDefaults.onStatusChange}
                  disabled={leadDefaults.isLoading}
                >
                  <SelectTrigger
                    id="lead-status-select"
                    className="gba:mt-2 gba:w-full"
                    data-testid={`${testId}-lead-status-select`}
                  >
                    <SelectValue
                      placeholder={leadDefaults.isLoading ? t('loading-placeholder') : t('lead-status-placeholder')}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {leadDefaults.statusOptions.map(opt => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="lead-source-select">
                  {t('lead-source-label')}
                  <span className="gba:text-destructive gba:ml-1">*</span>
                </Label>
                <Select
                  value={leadDefaults.selectedSource || undefined}
                  onValueChange={leadDefaults.onSourceChange}
                  disabled={leadDefaults.isLoading}
                >
                  <SelectTrigger
                    id="lead-source-select"
                    className="gba:mt-2 gba:w-full"
                    data-testid={`${testId}-lead-source-select`}
                  >
                    <SelectValue
                      placeholder={leadDefaults.isLoading ? t('loading-placeholder') : t('lead-source-placeholder')}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {leadDefaults.sourceOptions.map(opt => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="lead-rating-select">
                  {t('lead-rating-label')}
                  <span className="gba:text-destructive gba:ml-1">*</span>
                </Label>
                <Select
                  value={leadDefaults.selectedRating || undefined}
                  onValueChange={leadDefaults.onRatingChange}
                  disabled={leadDefaults.isLoading}
                >
                  <SelectTrigger
                    id="lead-rating-select"
                    className="gba:mt-2 gba:w-full"
                    data-testid={`${testId}-lead-rating-select`}
                  >
                    <SelectValue
                      placeholder={leadDefaults.isLoading ? t('loading-placeholder') : t('lead-rating-placeholder')}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {leadDefaults.ratingOptions.map(opt => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!leadDefaultsComplete && file && (
                <p className="gba:text-xs gba:text-destructive" data-testid={`${testId}-lead-defaults-required`}>
                  {t('lead-defaults-required-hint')}
                </p>
              )}
            </>
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
