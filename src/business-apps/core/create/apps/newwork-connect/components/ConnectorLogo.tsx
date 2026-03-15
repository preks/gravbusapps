import React from 'react'
import { Cable, DatabaseZap, FileBox, Waypoints, ArrowLeftRight, Server } from 'lucide-react'
import type { ExternalConnectionLane } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { connectorLogoPaths } from './connectorLogoPaths'

interface ConnectorLogoProps {
  providerId: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: { container: 'gba:h-8 gba:w-8 gba:rounded-lg', icon: 'gba:h-3.5 gba:w-3.5', svg: 14 },
  md: { container: 'gba:h-10 gba:w-10 gba:rounded-xl', icon: 'gba:h-4 gba:w-4', svg: 18 },
  lg: { container: 'gba:h-14 gba:w-14 gba:rounded-2xl', icon: 'gba:h-6 gba:w-6', svg: 26 }
}

const getFallbackIcon = (providerId: string) => {
  if (providerId.startsWith('mcp')) return Cable
  if (providerId.startsWith('data-bridge')) return DatabaseZap
  return FileBox
}

export const ConnectorLogo: React.FC<ConnectorLogoProps> = ({ providerId, size = 'md' }) => {
  const brand = connectorLogoPaths[providerId]
  const s = sizeClasses[size]

  if (brand?.svgPath) {
    return (
      <div
        className={`gba:shrink-0 gba:flex gba:items-center gba:justify-center gba:bg-card gba:border gba:border-border ${s.container}`}
      >
        <svg
          role="img"
          viewBox="0 0 24 24"
          width={s.svg}
          height={s.svg}
          fill={brand.hex}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d={brand.svgPath} />
        </svg>
      </div>
    )
  }

  if (brand?.abbr) {
    const textSize = size === 'sm' ? 'gba:text-xs' : size === 'lg' ? 'gba:text-lg' : 'gba:text-sm'
    return (
      <div
        className={`gba:shrink-0 gba:flex gba:items-center gba:justify-center gba:font-bold gba:select-none ${textSize} ${s.container}`}
        style={{ backgroundColor: brand.hex, color: brand.fg || '#fff' }}
      >
        {brand.abbr}
      </div>
    )
  }

  const FallbackIcon = getFallbackIcon(providerId)
  return (
    <div className={`gba:shrink-0 gba:flex gba:items-center gba:justify-center gba:bg-muted ${s.container}`}>
      <FallbackIcon className={s.icon} />
    </div>
  )
}

interface LaneLogoProps {
  lane: ExternalConnectionLane
}

const laneIcons: Record<ExternalConnectionLane, React.FC<{ className?: string; strokeWidth?: number }>> = {
  anypoint_connect: Waypoints,
  data_bridge: ArrowLeftRight,
  mcp_servers: Server
}

export const LaneLogo: React.FC<LaneLogoProps> = ({ lane }) => {
  const Icon = laneIcons[lane]

  return (
    <div className="gba:shrink-0 gba:flex gba:h-14 gba:w-14 gba:items-center gba:justify-center gba:rounded-2xl gba:bg-decorative-1">
      <Icon className="gba:h-7 gba:w-7 gba:text-decorative-3" strokeWidth={1.5} />
    </div>
  )
}
