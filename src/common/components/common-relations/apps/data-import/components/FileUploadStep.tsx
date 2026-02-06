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
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { SparkleIcon, CheckCircleIcon } from '@phosphor-icons/react'
import translations from './FileUploadStep/_i18n'

export interface FileUploadStepProps {
  file: File | null
  isLoading: boolean
  onFileChange: (file: File | null) => Promise<void>
  onAnalyze: () => Promise<void>
  'data-testid'?: string
}

export const FileUploadStep: React.FC<FileUploadStepProps> = ({
  file,
  isLoading,
  onFileChange,
  onAnalyze,
  'data-testid': testId = 'file-upload-step'
}) => {
  const { t } = useTranslation(translations)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null
    onFileChange(selectedFile)
  }

  return (
    <Card data-testid={testId}>
      <CardHeader>
        <CardTitle>{t('step-title')}</CardTitle>
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

          <Button
            onClick={onAnalyze}
            disabled={!file || isLoading}
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
