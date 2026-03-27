/**
 * Border and clip-path styling for status progression segments.
 * Extracted from StageProgression for reuse in StatusProgression.
 */
export interface SegmentStyling {
  borderRadius: string
  clipPath: string
  WebkitClipPath: string
  marginRight: string
}

export const getSegmentStyling = (index: number, totalSegments: number): SegmentStyling => {
  const styling: SegmentStyling = {
    borderRadius: '0',
    clipPath: 'none',
    WebkitClipPath: 'none',
    marginRight: '0'
  }

  if (index === 0) {
    styling.borderRadius = '20px 0 0 20px'
    if (totalSegments > 1) {
      styling.clipPath = 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)'
      styling.WebkitClipPath = styling.clipPath
      styling.marginRight = '8px'
    } else {
      styling.borderRadius = '20px'
    }
  } else if (index === totalSegments - 1) {
    styling.borderRadius = '0 20px 20px 0'
    styling.clipPath = 'polygon(12px 0, 100% 0, 100% 100%, 12px 100%, 24px 50%)'
    styling.WebkitClipPath = styling.clipPath
  } else {
    styling.clipPath = 'polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 24px 50%)'
    styling.WebkitClipPath = styling.clipPath
    styling.marginRight = '8px'
  }

  return styling
}
