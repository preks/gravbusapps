import React from 'react'
import { ResponsiveContainer } from 'recharts'

// Reusable tooltip wrapper component
interface TooltipWrapperProps {
  title: string
  children: React.ReactNode
}

export const TooltipWrapper: React.FC<TooltipWrapperProps> = ({ title, children }) => (
  <div className="gba:bg-white gba:p-3 gba:border gba:rounded-lg gba:shadow-lg">
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
  <p className="gba:text-sm">
    <span style={{ color }}>{label}:</span> {value}
  </p>
)

// Reusable chart container component
interface ChartContainerProps {
  children: React.ReactNode
}

export const ChartContainer: React.FC<ChartContainerProps> = ({ children }) => (
  <div className="gba:h-[500px]">
    <ResponsiveContainer width="100%" height="100%">
      {children}
    </ResponsiveContainer>
  </div>
)
