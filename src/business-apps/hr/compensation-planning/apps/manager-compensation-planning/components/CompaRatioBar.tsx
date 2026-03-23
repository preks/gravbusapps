import React from 'react'

interface CompaRatioBarProps {
  compaRatio: number | null
  band: {
    minSalary: number
    maxSalary: number
  } | null
  currentSalary: number | null
  proposedSalary?: number | null
  currency?: string
}

export const CompaRatioBar: React.FC<CompaRatioBarProps> = ({ compaRatio, band, currentSalary, proposedSalary }) => {
  if (!band || currentSalary == null) {
    return <span className="gba:text-xs gba:text-gray-400">No band data</span>
  }

  const range = band.maxSalary - band.minSalary
  if (range <= 0) return null

  const currentPosition = Math.max(0, Math.min(100, ((currentSalary - band.minSalary) / range) * 100))
  const proposedPosition =
    proposedSalary != null ? Math.max(0, Math.min(100, ((proposedSalary - band.minSalary) / range) * 100)) : null

  const midpoint = 50

  return (
    <div className="gba:w-full gba:min-w-[120px]">
      <div className="gba:relative gba:h-3 gba:bg-gray-100 gba:rounded-full gba:overflow-visible">
        <div
          className="gba:absolute gba:top-0 gba:h-full gba:bg-blue-100 gba:rounded-full"
          style={{ left: '0%', width: '100%' }}
        />
        <div
          className="gba:absolute gba:top-0 gba:h-full gba:w-px gba:bg-gray-400"
          style={{ left: `${midpoint}%` }}
          title="Band midpoint"
        />
        <div
          className="gba:absolute gba:top-1/2 gba:-translate-y-1/2 gba:w-3 gba:h-3 gba:rounded-full gba:bg-blue-600 gba:border-2 gba:border-white gba:shadow-sm gba:z-10"
          style={{ left: `${currentPosition}%`, marginLeft: '-6px' }}
          title={`Current: ${currentSalary?.toLocaleString()}`}
        />
        {proposedPosition != null && proposedPosition !== currentPosition && (
          <div
            className="gba:absolute gba:top-1/2 gba:-translate-y-1/2 gba:w-3 gba:h-3 gba:rounded-full gba:bg-emerald-500 gba:border-2 gba:border-white gba:shadow-sm gba:z-20"
            style={{ left: `${proposedPosition}%`, marginLeft: '-6px' }}
            title={`Proposed: ${proposedSalary?.toLocaleString()}`}
          />
        )}
      </div>
      {compaRatio != null && (
        <div className="gba:text-xs gba:text-gray-500 gba:mt-0.5 gba:text-center">CR: {compaRatio.toFixed(2)}</div>
      )}
    </div>
  )
}
