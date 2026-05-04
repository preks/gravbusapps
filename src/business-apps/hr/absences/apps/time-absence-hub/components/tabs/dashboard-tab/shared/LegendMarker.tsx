import React from 'react'

interface LegendMarkerProps {
  color: string
}

export const LegendMarker: React.FC<LegendMarkerProps> = ({ color }) => (
  <svg width="12" height="12" viewBox="0 0 12 12" className="gba:flex-shrink-0" aria-hidden="true">
    <circle cx="6" cy="6" r="6" fill={color} />
  </svg>
)
