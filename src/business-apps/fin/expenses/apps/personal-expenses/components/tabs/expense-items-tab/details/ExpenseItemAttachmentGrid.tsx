import { useCallback } from 'react'
import type { UploadFile } from 'antd/es/upload/interface'
import {
  Card,
  Spinner,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { ImageIcon, FilePdfIcon } from '@phosphor-icons/react'
import { truncateFileName, formatFileSize } from '@/common/utils/fileUtils'
import {
  getExpenseItemFileExtension,
  isExpenseItemImageFile,
  isExpenseItemPdfFile,
  renderExpenseItemFileIcon
} from './expenseItemAttachmentFileTypes'
import personalTranslations from '../../../../_i18n'

const THUMB_CLASS = 'gba:rounded-md gba:shadow gba:w-24 gba:h-24'

type ExpenseItemTranslationsBundle = Record<'en-US' | 'de-DE' | 'ro-RO', string>

export interface ExpenseItemAttachmentGridProps {
  fileLoading: boolean
  fileList: UploadFile[]
  onImagePreview: (fileUrl: string) => void
  onPdfPreview: (fileUrl: string) => void
  translations?: ExpenseItemTranslationsBundle
}

export function ExpenseItemAttachmentGrid({
  fileLoading,
  fileList,
  onImagePreview,
  onPdfPreview,
  translations
}: Readonly<ExpenseItemAttachmentGridProps>) {
  const { t } = useTranslation(translations ?? personalTranslations)

  const renderFilePreview = useCallback(
    (fileUrl: string, fileName: string, fileType: string, ext: string, idx: number) => {
      if (isExpenseItemImageFile(fileType, ext)) {
        return (
          <button
            type="button"
            className={`${THUMB_CLASS} gba:cursor-pointer hover:gba:opacity-80 gba:p-0 gba:border-0 gba:bg-transparent`}
            data-testid={`expense-file-image-${idx}`}
            onClick={() => onImagePreview(fileUrl)}
          >
            <img src={fileUrl} alt={fileName} className={`${THUMB_CLASS} gba:object-cover`} />
          </button>
        )
      }
      if (isExpenseItemPdfFile(fileType, ext)) {
        return (
          <button
            type="button"
            className={`${THUMB_CLASS} gba:flex gba:justify-center gba:items-center gba:bg-muted gba:cursor-pointer hover:gba:bg-accent gba:border-0`}
            onClick={() => onPdfPreview(fileUrl)}
            data-testid={`expense-file-pdf-thumb-${idx}`}
          >
            <FilePdfIcon size={48} className="gba:text-red-500" />
          </button>
        )
      }
      return (
        <div className="gba:flex gba:flex-col gba:items-center" data-testid={`expense-file-generic-${idx}`}>
          {renderExpenseItemFileIcon(fileType, ext)}
          <a
            href={fileUrl}
            download={fileName}
            className="gba:mt-2 gba:text-xs gba:text-primary hover:gba:underline gba:cursor-pointer"
            data-testid={`expense-file-download-${idx}`}
            onClick={e => {
              e.preventDefault()
              window.open(fileUrl, '_blank')
            }}
          >
            {t('expense-items-attachment-open')}
          </a>
        </div>
      )
    },
    [onImagePreview, onPdfPreview, t]
  )

  if (fileLoading) {
    return (
      <Card
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8"
        data-testid="expense-file-loading"
      >
        <div className="gba:flex gba:flex-col gba:items-center gba:space-y-2">
          <Spinner />
          <p className="gba:text-sm gba:text-muted-foreground">{t('expense-items-attachment-loading-receipt')}</p>
        </div>
      </Card>
    )
  }

  if (fileList.length > 0) {
    return (
      <div
        className="gba:grid gba:grid-cols-2 gba:gap-4 gba:sm:gba:grid-cols-3 gba:md:gba:grid-cols-4 gba:lg:gba:grid-cols-5"
        data-testid="expense-files-grid"
      >
        {fileList.map((file, idx) => {
          const fileName = file.name || `File_${idx + 1}`
          const fileUrl = file.url || ''
          const fileType = file.type || ''
          const ext = getExpenseItemFileExtension(fileName)

          return (
            <div
              key={file.uid}
              className="gba:flex gba:flex-col gba:items-center gba:p-2 gba:bg-background gba:rounded-lg gba:shadow-md gba:w-28 gba:min-h-32 gba:max-h-40"
              data-testid={`expense-file-card-${idx}`}
            >
              {renderFilePreview(fileUrl, fileName, fileType, ext, idx)}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="gba:mt-2 gba:text-xs gba:text-center gba:w-full gba:px-1 gba:break-words gba:cursor-help gba:overflow-hidden gba:text-ellipsis gba:whitespace-nowrap gba:max-w-full gba:leading-tight"
                      data-testid={`expense-file-name-${idx}`}
                    >
                      {truncateFileName(fileName, 18)}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="gba:max-w-xs">
                      <div className="gba:font-medium gba:break-words">{fileName}</div>
                      <div className="gba:text-xs gba:text-muted-foreground">
                        {file.size ? formatFileSize(file.size) : 'Unknown size'}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <Card
      className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8"
      data-testid="expense-file-empty"
    >
      <div className="gba:flex gba:flex-col gba:items-center gba:space-y-2">
        <ImageIcon size={48} className="gba:text-muted-foreground" />
        <p className="gba:text-sm gba:text-muted-foreground">{t('expense-items-attachment-no-receipt')}</p>
      </div>
    </Card>
  )
}
