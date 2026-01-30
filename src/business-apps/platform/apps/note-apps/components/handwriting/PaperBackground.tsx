/**
 * PaperBackground Component
 * Renders realistic paper backgrounds for handwriting notes
 */

import React from 'react'
import type { PaperStyle } from './index'

interface PaperBackgroundProps {
  style: PaperStyle
  className?: string
}

export const PaperBackground: React.FC<PaperBackgroundProps> = ({ style, className = '' }) => {
  const getBackgroundStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none'
    }

    switch (style) {
      case 'lined':
        return {
          ...baseStyle,
          backgroundImage: `
            repeating-linear-gradient(
              transparent,
              transparent 31px,
              #e5e7eb 31px,
              #e5e7eb 32px
            )
          `,
          backgroundPosition: '0 8px'
        }

      case 'grid':
        return {
          ...baseStyle,
          backgroundImage: `
            linear-gradient(#e5e7eb 1px, transparent 1px),
            linear-gradient(90deg, #e5e7eb 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px'
        }

      case 'dotted':
        return {
          ...baseStyle,
          backgroundImage: `radial-gradient(circle, #d1d5db 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }

      case 'plain':
      default:
        return baseStyle
    }
  }

  return <div className={`gba:bg-[#fffef8] ${className}`} style={getBackgroundStyle()} aria-hidden="true" />
}
