import React from 'react'

// Reusable tooltip wrapper component
interface TooltipWrapperProps {
  title: string
  children: React.ReactNode
}

export const TooltipWrapper: React.FC<TooltipWrapperProps> = ({ title, children }) => (
  <div className="gba:bg-card gba:text-card-foreground gba:p-3 gba:border gba:border-border gba:rounded-lg gba:shadow-md">
    <p className="gba:font-semibold gba:mb-2">{title}</p>
    <div className="gba:space-y-1">{children}</div>
  </div>
)

// Reusable tooltip data line component
interface TooltipDataLineProps {
  label: string
  value: string | number
  color: string
}

export const TooltipDataLine: React.FC<TooltipDataLineProps> = ({ label, value, color }) => (
  <p className="gba:text-sm gba:text-foreground">
    <span className="gba:font-medium" style={{ color }}>
      {label}:
    </span>{' '}
    {value}
  </p>
)
