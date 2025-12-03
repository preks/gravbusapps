import React from 'react'
import { Button, FormLabel } from '@newwork/nw-design-system'
import { File, X } from 'lucide-react'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

const prefixDataTestId = 'InvestmentForm-FileUpload'

export interface InvestmentFileUploadSegmentProps {
  file: File | null
  onFileChange: (file: File | null) => void
  label?: string
  description?: string
}

const InvestmentFileUploadSegment: React.FC<InvestmentFileUploadSegmentProps> = ({
  file,
  onFileChange,
  label,
  description
}) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null
    onFileChange(selectedFile)
  }

  const handleClearFile = () => {
    onFileChange(null)
    const input = document.getElementById('investment-ai-file-input') as HTMLInputElement | null
    if (input) {
      input.value = ''
    }
  }

  const effectiveLabel = label || 'AI Source Document'
  const effectiveDescription =
    description || 'Upload a document that AI can use to pre-fill investment details. This is optional.'

  return (
    <div className="gba:space-y-2" data-testid={prefixDataTestId}>
      <div className="gba:flex gba:flex-col gba:gap-1">
        <FormLabel>{effectiveLabel}</FormLabel>
        <p className="gba:m-0 gba:text-xs gba:text-muted-foreground">{effectiveDescription}</p>
      </div>

      {/* Hidden native file input */}
      <input
        id="investment-ai-file-input"
        type="file"
        className="gba:hidden"
        onChange={handleFileChange}
        data-testid={formatDataTestId(prefixDataTestId, 'Input')}
      />

      {/* Visible file selector */}
      {file ? (
        <div className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-md gba:bg-muted/50">
          <div className="gba:flex gba:items-center gba:gap-2">
            <File className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
            <div className="gba:flex gba:flex-col">
              <span className="gba:text-sm gba:font-medium">{file.name}</span>
              <span className="gba:text-xs gba:text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearFile}
            data-testid={formatDataTestId(prefixDataTestId, 'ClearButton')}
          >
            <X className="gba:h-4 gba:w-4 gba:mr-1" />
            Remove
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => document.getElementById('investment-ai-file-input')?.click()}
          data-testid={formatDataTestId(prefixDataTestId, 'SelectButton')}
        >
          Select file
        </Button>
      )}
    </div>
  )
}

export default InvestmentFileUploadSegment
