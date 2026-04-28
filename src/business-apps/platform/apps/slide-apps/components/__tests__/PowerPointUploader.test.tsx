import React from 'react'
import { render, screen } from '@testing-library/react'
import { PowerPointUploader } from '../PowerPointUploader'

void React

const mockUsePowerPointParser = jest.fn()

jest.mock('../../hooks/usePowerPointParser', () => ({
  usePowerPointParser: (...args: unknown[]) => mockUsePowerPointParser(...args)
}))

jest.mock('@newwork/nw-design-system', () => {
  const actual = jest.requireActual('@newwork/nw-design-system')
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, vars?: Record<string, unknown>) => {
        switch (key) {
          case 'import-importing-title':
            return 'Importing PowerPoint'
          case 'import-progress-phase-parsing':
            return 'Parsing PowerPoint'
          case 'import-progress-phase-uploading-images':
            return 'Uploading images'
          case 'import-progress-phase-finalizing':
            return 'Finalizing presentation'
          case 'import-progress-detail-parsing':
            return 'Reading slides, layouts, and embedded assets'
          case 'import-progress-detail-images':
            return `${vars?.current} of ${vars?.total} images uploaded`
          case 'import-progress-detail-finalizing-estimated':
            return 'Final upload progress is estimated for this step'
          case 'import-progress-estimated':
            return 'Progress is estimated during the final upload'
          case 'import-powerpoint-title':
            return 'Import PowerPoint'
          case 'import-drag-drop':
            return 'Drag and drop a .pptx file here'
          case 'import-max-size':
            return `Maximum file size: ${vars?.size}`
          case 'import-choose-file':
            return 'Choose File'
          case 'import-cancel':
            return 'Cancel'
          case 'import-feature-text':
            return 'Text & formatting'
          case 'import-feature-images':
            return 'Images & shapes'
          case 'import-feature-layouts':
            return 'Slide layouts'
          case 'import-feature-transitions':
            return 'Transitions'
          default:
            return key
        }
      }
    })
  }
})

describe('PowerPointUploader progress UI', () => {
  beforeEach(() => {
    mockUsePowerPointParser.mockReturnValue({
      isLoading: false,
      progress: 0,
      error: null,
      parsedDocument: null,
      parseFile: jest.fn(),
      reset: jest.fn()
    })
  })

  it('maps parser progress into the weighted overall progress bar', () => {
    mockUsePowerPointParser.mockReturnValue({
      isLoading: true,
      progress: 62,
      error: null,
      parsedDocument: null,
      parseFile: jest.fn(),
      reset: jest.fn()
    })

    render(<PowerPointUploader onFileParsed={jest.fn()} />)

    expect(screen.getByTestId('powerpoint-uploader-progress-phase')).toHaveTextContent('Parsing PowerPoint')
    expect(screen.getByTestId('powerpoint-uploader-progress-detail')).toHaveTextContent(
      'Reading slides, layouts, and embedded assets'
    )
    expect(screen.getByTestId('powerpoint-uploader-progress-percent')).toHaveTextContent('31%')
  })

  it('renders import phase details and percent from the shared progress state', () => {
    render(
      <PowerPointUploader
        onFileParsed={jest.fn()}
        importProgress={{
          phase: 'uploading-images',
          percent: 68,
          labelKey: 'import-progress-phase-uploading-images',
          detailKey: 'import-progress-detail-images',
          detailValues: { current: 12, total: 18 }
        }}
      />
    )

    expect(screen.getByTestId('powerpoint-uploader-progress-phase')).toHaveTextContent('Uploading images')
    expect(screen.getByTestId('powerpoint-uploader-progress-detail')).toHaveTextContent('12 of 18 images uploaded')
    expect(screen.getByTestId('powerpoint-uploader-progress-percent')).toHaveTextContent('68%')
  })

  it('shows the estimated-progress hint for the finalizing phase', () => {
    render(
      <PowerPointUploader
        onFileParsed={jest.fn()}
        importProgress={{
          phase: 'finalizing',
          percent: 92,
          labelKey: 'import-progress-phase-finalizing',
          detailKey: 'import-progress-detail-finalizing-estimated',
          estimated: true
        }}
      />
    )

    expect(screen.getByTestId('powerpoint-uploader-progress-phase')).toHaveTextContent('Finalizing presentation')
    expect(screen.getByTestId('powerpoint-uploader-progress-detail')).toHaveTextContent(
      'Final upload progress is estimated for this step'
    )
    expect(screen.getByTestId('powerpoint-uploader-progress-estimated')).toHaveTextContent(
      'Progress is estimated during the final upload'
    )
  })
})
