/**
 * ScreenPreview - Live preview of generated screens
 *
 * Uses RemoteScreenLoader to render screens from Azure CDN,
 * with fallback to code viewer when azure_url is unavailable.
 */

import React, { useMemo } from 'react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Spinner,
  Card,
  CardContent,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@newwork/nw-design-system'
import { AlertCircle, Code2, Play } from 'lucide-react'
import { RemoteScreenLoader } from '@/business-apps/core/every/apps/every-box/components/RemoteScreenLoader'
import { GeneratedCodeViewer } from './GeneratedCodeViewer'
import type { ComponentSpec } from '../../types'

export interface ScreenPreviewProps {
  component: ComponentSpec
  jobId?: string
  accessToken: string
  userInfo?: any
  onClose?: () => void
}

/**
 * Extract component path from Azure CDN URL
 *
 * Example:
 * Input: https://nwcdndevfiles.blob.core.windows.net/gravity-platform/platform/apps/my-screen/index.js
 * Output: /platform/apps/my-screen
 *
 * Input: https://nwcdnprodfiles.blob.core.windows.net/screens/platform/apps/my-screen/index-v123.js
 * Output: /platform/apps/my-screen
 */
function extractComponentPath(azureUrl: string): string | null {
  try {
    const url = new URL(azureUrl)
    const pathname = url.pathname

    // Remove container name from start (e.g., /gravity-platform/ or /screens/)
    let path = pathname
    if (path.startsWith('/gravity-platform/')) {
      path = path.replace('/gravity-platform/', '/')
    } else if (path.startsWith('/screens/')) {
      path = path.replace('/screens/', '/')
    }

    // Remove /index.js, /index-v123.js, etc. from end
    path = path.replace(/\/index(-[^/]+)?\.js$/, '')

    // Ensure leading slash
    if (!path.startsWith('/')) {
      path = `/${path}`
    }

    return path || null
  } catch (error) {
    console.error('[ScreenPreview] Failed to parse Azure URL:', error)
    return null
  }
}

/**
 * Extract version from Azure URL if present
 *
 * Example:
 * Input: https://nwcdnprodfiles.blob.core.windows.net/screens/platform/apps/my-screen/index-v123.js
 * Output: v123
 */
function extractVersion(azureUrl: string): string | undefined {
  const match = azureUrl.match(/\/index-([^/]+)\.js$/)
  return match ? match[1] : undefined
}

export const ScreenPreview: React.FC<ScreenPreviewProps> = ({ component, jobId, accessToken, userInfo, onClose }) => {
  // Extract component path and version from azure_url
  const componentPath = useMemo(() => {
    if (!component.azure_url) return null
    return extractComponentPath(component.azure_url)
  }, [component.azure_url])

  const version = useMemo(() => {
    if (!component.azure_url) return undefined
    return extractVersion(component.azure_url)
  }, [component.azure_url])

  // Loading state
  if (!accessToken) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:min-h-[400px]">
        <Spinner size="lg" />
      </div>
    )
  }

  // Determine what preview capabilities we have
  const hasLivePreview = !!(component.azure_url && componentPath)
  // Code viewer is available if we have metadata OR if we have fallback identifiers (jobId, created_id)
  const hasCodeViewer = !!(
    (component.metadata?.session_id && component.metadata?.repo_id) ||
    jobId ||
    component.created_id
  )

  // If we have BOTH: show tabs for both live preview and code viewer
  if (hasLivePreview && hasCodeViewer) {
    console.log('[ScreenPreview] Showing tabs (both live preview and code viewer available)')
    return (
      <Tabs defaultValue="preview" className="gba:h-full gba:flex gba:flex-col">
        <TabsList className="gba:mx-4 gba:mt-4">
          <TabsTrigger value="preview">
            <Play className="gba:w-4 gba:h-4 gba:mr-2" />
            Live Preview
          </TabsTrigger>
          <TabsTrigger value="code">
            <Code2 className="gba:w-4 gba:h-4 gba:mr-2" />
            Generated Code
          </TabsTrigger>
        </TabsList>
        <TabsContent value="preview" className="gba:flex-1 gba:overflow-hidden">
          <RemoteScreenLoader
            componentPath={componentPath!}
            version={version}
            accessToken={accessToken}
            userInfo={userInfo || {}}
            additionalData={{}}
            onClose={onClose || (() => {})}
            onTaskCompleted={() => {}}
            onTaskUpdated={() => {}}
          />
        </TabsContent>
        <TabsContent value="code" className="gba:flex-1 gba:overflow-hidden">
          <GeneratedCodeViewer
            sessionId={component.metadata?.session_id || null}
            repoId={component.metadata?.repo_id || null}
            jobId={jobId || null}
            createdId={component.created_id || null}
            componentName={component.name}
            accessToken={accessToken}
          />
        </TabsContent>
      </Tabs>
    )
  }

  // If azure_url exists ONLY: render RemoteScreenLoader
  if (hasLivePreview) {
    console.log('[ScreenPreview] Loading screen from CDN:', {
      componentPath,
      version,
      azureUrl: component.azure_url
    })

    return (
      <div className="gba:h-full gba:min-h-[600px] gba:flex gba:flex-col">
        <RemoteScreenLoader
          componentPath={componentPath!}
          version={version}
          accessToken={accessToken}
          userInfo={userInfo || {}}
          additionalData={{}}
          onClose={onClose || (() => {})}
          onTaskCompleted={() => {}}
          onTaskUpdated={() => {}}
        />
      </div>
    )
  }

  // If sessionId/repoId exist ONLY: show code viewer fallback
  if (hasCodeViewer) {
    console.log('[ScreenPreview] Showing code viewer fallback (azure_url not available):', {
      sessionId: component.metadata?.session_id,
      repoId: component.metadata?.repo_id
    })

    return (
      <Card className="gba:h-full gba:m-4 gba:flex gba:flex-col gba:overflow-hidden">
        <CardContent className="gba:flex-1 gba:p-0 gba:overflow-hidden">
          <GeneratedCodeViewer
            sessionId={component.metadata?.session_id || null}
            repoId={component.metadata?.repo_id || null}
            jobId={jobId || null}
            createdId={component.created_id || null}
            componentName={component.name}
            accessToken={accessToken}
          />
        </CardContent>
      </Card>
    )
  }

  // Fallback: No azure_url and no sessionId available
  return (
    <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:min-h-[400px] gba:p-6">
      <Alert className="gba:max-w-md">
        <AlertCircle className="gba:h-4 gba:w-4" />
        <AlertTitle>Preview Not Available</AlertTitle>
        <AlertDescription className="gba:mt-2">
          <p>This screen was not successfully generated or published. No preview or code is available.</p>
        </AlertDescription>
      </Alert>
    </div>
  )
}

export default ScreenPreview
