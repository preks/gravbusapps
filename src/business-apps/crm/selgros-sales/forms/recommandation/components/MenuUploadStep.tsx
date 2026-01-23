import React from 'react'
import { Input, Badge, Spinner } from '@newwork/nw-design-system'

const DATA_TEST_ID_PREFIX = 'MenuUploadStep'

const MENU_PROCESSING_STEPS = [
  'Uploading menu PDF…',
  'Extracting text from PDF…',
  'Analyzing menu structure…',
  'Identifying dishes and items…',
  'Mapping items to ingredients…',
  'Generating recommendations…'
] as const

interface MenuUploadStepProps {
  selectedFile: File | null
  onFileChange: (file: File | null) => void
  isLoading: boolean
  loadingStepIndex?: number
  errorMessage?: string | null
}

export const MenuUploadStep: React.FC<MenuUploadStepProps> = ({
  selectedFile,
  onFileChange,
  isLoading,
  loadingStepIndex = 0,
  errorMessage
}) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    onFileChange(file)
  }

  return (
    <div
      className="gba:flex gba:flex-col gba:h-full"
      data-testid={`${DATA_TEST_ID_PREFIX}-container`}
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
    >
      <div className="gba:mb-4">
        <h2 className="gba:text-xl gba:font-semibold gba:text-foreground">Upload Menu PDF</h2>
        <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
          Upload the restaurant menu so the AI can extract items and generate recommendations.
        </p>
      </div>

      <div className="gba:flex gba:flex-col gba:gap-3 gba:max-w-lg">
        <Input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          data-testid={`${DATA_TEST_ID_PREFIX}-file-input`}
          disabled={isLoading}
        />
        <div className="gba:flex gba:items-center gba:gap-2">
          <Badge variant="secondary">PDF only</Badge>
          <span className="gba:text-xs gba:text-muted-foreground">Max size depends on your browser.</span>
        </div>
        {selectedFile && (
          <div className="gba:text-sm" data-testid={`${DATA_TEST_ID_PREFIX}-file-name`}>
            Selected: <span className="gba:font-medium">{selectedFile.name}</span>
          </div>
        )}
        {isLoading && (
          <div className="gba:rounded-lg gba:border gba:border-border gba:bg-card gba:p-4">
            <div className="gba:flex gba:items-start gba:gap-3">
              <div className="gba:flex gba:items-center gba:justify-center gba:h-10 gba:w-10 gba:rounded-full gba:bg-muted">
                <Spinner size="sm" />
              </div>
              <div className="gba:flex-1">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <p className="gba:text-sm gba:font-semibold">AI menu processor</p>
                  <Badge variant="secondary" className="gba:whitespace-nowrap">
                    Processing
                  </Badge>
                </div>
                <p className="gba:text-base gba:mt-2">{MENU_PROCESSING_STEPS[loadingStepIndex]}</p>
                <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                  AI is analyzing your menu and extracting items for recommendations.
                </p>
              </div>
            </div>
            <div className="gba:mt-3 gba:grid gba:grid-cols-1 gba:gap-2 md:gba:grid-cols-2">
              {MENU_PROCESSING_STEPS.map((step, index) => (
                <div key={step} className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
                  <div
                    className={`gba:h-2 gba:w-2 gba:rounded-full ${
                      index <= loadingStepIndex ? 'gba:bg-primary' : 'gba:bg-muted'
                    }`}
                  />
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {errorMessage && (
          <div className="gba:text-sm gba:text-destructive" data-testid={`${DATA_TEST_ID_PREFIX}-error`}>
            {errorMessage}
          </div>
        )}
      </div>
    </div>
  )
}

export default MenuUploadStep
