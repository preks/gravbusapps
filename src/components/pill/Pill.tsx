import React from 'react'

export type PillType = 'draft' | 'completed' | 'waiting' | 'task' | 'error' | 'preparing'

export interface PillProps {
  /**
   * The text content to display in the pill
   */
  label: string
  /**
   * Predefined type that sets the background color
   */
  type?: PillType
  /**
   * Custom background color (hex, rgb, etc.) - overrides type if provided
   */
  color?: string
  /**
   * Additional CSS class names
   */
  className?: string
  /**
   * Test ID for the pill element
   */
  'data-testid'?: string
}

/**
 * Pill component for displaying status indicators with consistent styling
 */
const Pill: React.FC<PillProps> = ({ label, type, color, className = '', 'data-testid': dataTestId = 'pill' }) => {
  // Define color mapping for different types
  const typeColorMap: Record<PillType, string> = {
    draft: '#797d82',
    completed: '#0DBC7B',
    waiting: '#0094D1',
    task: '#FF9E02',
    error: '#DE1D49',
    preparing: '#94A9C7'
  }

  // Determine background color based on type or custom color
  const backgroundColor = color || (type && typeColorMap[type]) || '#CCCCCC'

  // Apply opacity to the color
  const getBackgroundWithOpacity = (hexColor: string): string => {
    // If it's already an rgba color, adjust the opacity
    if (hexColor.startsWith('rgba')) {
      return hexColor.replace(/rgba\((.+),\s*[\d.]+\)/, 'rgba($1, 0.55)')
    }

    // If it's an rgb color, convert to rgba
    if (hexColor.startsWith('rgb')) {
      return hexColor.replace(/rgb\((.+)\)/, 'rgba($1, 0.55)')
    }

    // For hex colors, convert to rgba
    let hex = hexColor.replace('#', '')

    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map(char => char + char)
        .join('')
    }

    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)

    return `rgba(${r}, ${g}, ${b}, 0.55)`
  }

  const pillStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '2px 12px',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: 500,
    color: '#000000',
    backgroundColor: getBackgroundWithOpacity(backgroundColor),
    textAlign: 'center',
    minWidth: '80px'
  }

  return (
    <span className={className} style={pillStyle} data-testid={dataTestId}>
      {label}
    </span>
  )
}

export default Pill
