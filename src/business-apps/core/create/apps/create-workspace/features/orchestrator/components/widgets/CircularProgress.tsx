/**
 * CircularProgress - SVG-based circular progress indicator
 * Premium visual progress ring
 */

import React from 'react'
import { cn } from '@newwork/nw-design-system'

export interface CircularProgressProps {
  value: number // 0-100
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showPercentage?: boolean
  strokeWidth?: number
  className?: string
  color?: 'primary' | 'success' | 'info' | 'warning' | 'destructive'
  'data-testid'?: string
}

const sizeMap = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96
}

const colorMap = {
  primary: 'currentColor', // Monochrome - uses foreground color
  success: 'var(--nw-success)',
  info: 'var(--nw-info)',
  warning: 'var(--nw-warning)',
  destructive: 'var(--nw-destructive)'
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  size = 'md',
  showPercentage = false,
  strokeWidth,
  className,
  color = 'info',
  'data-testid': testId = 'circular-progress'
}) => {
  const dimension = sizeMap[size]
  const defaultStrokeWidth = size === 'sm' ? 3 : size === 'md' ? 4 : size === 'lg' ? 5 : 6
  const stroke = strokeWidth || defaultStrokeWidth
  const radius = (dimension - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <div
      className={cn('gba:relative gba:inline-flex gba:items-center gba:justify-center', className)}
      style={{ width: dimension, height: dimension }}
      data-testid={testId}
    >
      <svg width={dimension} height={dimension} className="gba:transform gba:-rotate-90">
        {/* Background circle */}
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="gba:text-muted gba:opacity-20"
        />
        {/* Progress circle */}
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          stroke={colorMap[color]}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="gba:transition-all gba:duration-300 gba:ease-out"
          style={{
            filter: 'drop-shadow(0 0 4px currentColor)',
            opacity: 0.9
          }}
        />
      </svg>
      {showPercentage && (
        <span
          className="gba:absolute gba:text-xs gba:font-semibold gba:text-foreground"
          style={{ fontSize: size === 'sm' ? '0.625rem' : size === 'md' ? '0.75rem' : '0.875rem' }}
        >
          {Math.round(value)}%
        </span>
      )}
    </div>
  )
}

export default CircularProgress
