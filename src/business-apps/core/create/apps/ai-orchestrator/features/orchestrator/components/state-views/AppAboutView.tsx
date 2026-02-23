/**
 * AppAboutView - Minimal App Store Connect-style metadata page.
 */

import React from 'react'
import { Check } from 'lucide-react'
import { AppIconBadge } from '../ui/AppIconBadge'
import { useCurrentUserPicture } from '@/business-apps/platform/apps/every-ai/hooks/useCurrentUserPicture'
import type { AppMetadata, BuildAnalysis, UserSummary } from '../../types/build'
import type { ComponentSpec } from '../../types'
import type { UserInfoProps } from '@/common/BusinessAppContext'

export interface AppAboutViewProps {
  appMetadata?: AppMetadata
  components: ComponentSpec[]
  analysis?: BuildAnalysis
  userSummary?: UserSummary
  originalPrompt?: string
  createdAt?: string
  userInfo?: UserInfoProps
  accessToken?: string
}

function countByType(components: ComponentSpec[], type: string): number {
  return components.filter(c => c.type === type && c.status !== 'error').length
}

const Divider = () => <div className="gba:border-t gba:border-border" />

export const AppAboutView: React.FC<AppAboutViewProps> = ({
  appMetadata,
  components,
  analysis,
  userSummary,
  originalPrompt,
  createdAt,
  userInfo,
  accessToken
}) => {
  const employeeId = userInfo?.employeeDetails?.employeeId || undefined
  const { pictureThumbnail } = useCurrentUserPicture(employeeId, accessToken ?? '')

  const firstName = userInfo?.givenName || userInfo?.employeeDetails?.firstName || ''
  const lastName = userInfo?.familyName || userInfo?.employeeDetails?.lastName || ''
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || userInfo?.userName || null
  const initials = [firstName[0], lastName[0]].filter(Boolean).join('').toUpperCase() || '?'

  const screens = countByType(components, 'screen')
  const dataModels = countByType(components, 'data_model')
  const functions = countByType(components, 'function')
  const agents = countByType(components, 'agent')
  const flows = countByType(components, 'flow')

  const statParts: string[] = []
  if (screens > 0) statParts.push(`${screens} Screen${screens > 1 ? 's' : ''}`)
  if (dataModels > 0) statParts.push(`${dataModels} Data Model${dataModels > 1 ? 's' : ''}`)
  if (functions > 0) statParts.push(`${functions} Function${functions > 1 ? 's' : ''}`)
  if (agents > 0) statParts.push(`${agents} Agent${agents > 1 ? 's' : ''}`)
  if (flows > 0) statParts.push(`${flows} Flow${flows > 1 ? 's' : ''}`)
  if (analysis?.complexity) statParts.push(analysis.complexity.charAt(0).toUpperCase() + analysis.complexity.slice(1))

  const builtOn = createdAt
    ? new Date(createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  const features = [...(userSummary?.whatYouGet ?? []), ...(userSummary?.whatYouCanDo ?? [])]

  return (
    <div className="gba:max-w-xl gba:mx-auto gba:px-8 gba:py-8 gba:space-y-6">
      {/* ── Identity ── */}
      <div className="gba:flex gba:items-start gba:gap-5">
        <AppIconBadge iconName={appMetadata?.icon} size="lg" className="gba:shrink-0 gba:mt-0.5" />
        <div className="gba:min-w-0 gba:flex-1">
          <div className="gba:flex gba:items-center gba:gap-3 gba:flex-wrap">
            <h1 className="gba:text-xl gba:font-bold gba:text-foreground gba:leading-tight">
              {appMetadata?.name ?? 'App'}
            </h1>
            <span className="gba:text-sm gba:font-semibold gba:text-foreground/70 gba:font-mono gba:bg-muted gba:px-2 gba:py-0.5 gba:rounded-md">
              v{appMetadata?.version ?? '1.0.0'}
            </span>
          </div>
          {appMetadata?.category && (
            <p className="gba:text-sm gba:text-primary gba:mt-0.5 gba:font-medium">{appMetadata.category}</p>
          )}
          <p className="gba:mt-2 gba:text-sm gba:text-muted-foreground gba:leading-relaxed">
            {appMetadata?.longDescription || appMetadata?.description}
          </p>
        </div>
      </div>

      <Divider />

      {/* ── Author ── */}
      {(fullName || builtOn) && (
        <div className="gba:flex gba:items-center gba:gap-3">
          {fullName &&
            (pictureThumbnail ? (
              <img
                src={`data:image/jpeg;base64,${pictureThumbnail}`}
                alt={fullName}
                className="gba:w-8 gba:h-8 gba:rounded-full gba:object-cover gba:shrink-0"
              />
            ) : (
              <div className="gba:w-8 gba:h-8 gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center gba:shrink-0">
                <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground">{initials}</span>
              </div>
            ))}
          <div>
            {fullName && <p className="gba:text-sm gba:font-medium gba:text-foreground gba:leading-none">{fullName}</p>}
            {builtOn && <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">Built {builtOn}</p>}
          </div>
        </div>
      )}

      {/* ── Features ── */}
      {features.length > 0 && (
        <>
          <Divider />
          <ul className="gba:grid gba:grid-cols-2 gba:gap-x-6 gba:gap-y-2.5">
            {features.map((item, i) => (
              <li
                key={i}
                className="gba:flex gba:items-start gba:gap-2 gba:text-sm gba:text-foreground gba:leading-snug"
              >
                <Check className="gba:w-3.5 gba:h-3.5 gba:text-emerald-500 gba:shrink-0 gba:mt-0.5" strokeWidth={2.5} />
                {item}
              </li>
            ))}
          </ul>
        </>
      )}

      {/* ── Business value ── */}
      {userSummary?.businessValue && (
        <>
          <Divider />
          <p className="gba:text-sm gba:text-muted-foreground gba:leading-relaxed">{userSummary.businessValue}</p>
        </>
      )}

      {/* ── Composition ── */}
      {statParts.length > 0 && (
        <>
          <Divider />
          <p className="gba:text-xs gba:text-muted-foreground gba:tracking-wide">{statParts.join('  ·  ')}</p>
        </>
      )}

      {/* ── Tags ── */}
      {appMetadata?.tags && appMetadata.tags.length > 0 && (
        <>
          <Divider />
          <div className="gba:flex gba:flex-wrap gba:gap-x-3 gba:gap-y-1">
            {appMetadata.tags.map(tag => (
              <span key={tag} className="gba:text-xs gba:text-muted-foreground">
                #{tag}
              </span>
            ))}
          </div>
        </>
      )}

      {/* ── Prompt ── */}
      {originalPrompt && (
        <>
          <Divider />
          <p className="gba:text-xs gba:text-muted-foreground gba:italic gba:leading-relaxed gba:line-clamp-4">
            "{originalPrompt}"
          </p>
        </>
      )}
    </div>
  )
}
