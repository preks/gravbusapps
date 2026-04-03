import React, { useState } from 'react'
import { Card, CardContent, Button } from '@newwork/nw-design-system'
import { resolveFlowbotBaseUrl } from '@/common/utils/flowbotUtils'

interface SandboxFileLinkChipProps {
  filePath: string
  token: string
  children?: React.ReactNode
}

/**
 * SandboxFileLinkChip - Downloads files from FlowBot sandbox
 *
 * Handles sandbox:// protocol links by calling the FlowBot download endpoint
 */
const SandboxFileLinkChip: React.FC<SandboxFileLinkChipProps> = ({ filePath, token, children }) => {
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const filename = filePath.split('/').pop() || 'file'

  const handleDownload = async () => {
    if (isDownloading) return

    setIsDownloading(true)
    setError(null)

    try {
      const baseUrl = resolveFlowbotBaseUrl()
      const response = await fetch(`${baseUrl}/flowbot/api/agent/download-sandbox-file`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ file_path: filePath })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || `HTTP ${response.status}`)
      }

      // Download the file
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download sandbox file:', err)
      setError(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setIsDownloading(false)
    }
  }

  const getFileIcon = () => {
    if (filename.endsWith('.json')) {
      return (
        <svg className="gba:h-10 gba:w-10 gba:text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
          />
        </svg>
      )
    }
    if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
      return (
        <svg className="gba:h-10 gba:w-10 gba:text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      )
    }
    return (
      <svg className="gba:h-10 gba:w-10 gba:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    )
  }

  return (
    <Card className="gba:border-2 gba:border-success/50 gba:shadow-xl gba:my-3 gba:bg-gradient-to-br gba:from-card gba:to-success/5 gba:overflow-hidden">
      <CardContent className="gba:p-6">
        <div className="gba:flex gba:items-start gba:gap-4">
          <div className="gba:flex-shrink-0 gba:h-16 gba:w-16 gba:rounded-2xl gba:bg-gradient-to-br gba:from-success/20 gba:to-info/20 gba:flex gba:items-center gba:justify-center gba:border-2 gba:border-success/30">
            {getFileIcon()}
          </div>
          <div className="gba:flex-1 gba:min-w-0">
            <p className="gba:text-sm gba:font-semibold gba:text-success gba:mb-1">File Ready</p>
            <h4 className="gba:text-base gba:font-bold gba:text-foreground gba:mb-3">{children || filename}</h4>

            {error && (
              <p className="gba:text-sm gba:text-destructive gba:mb-3 gba:p-2 gba:bg-destructive-secondary/50 gba:rounded">
                {error}
              </p>
            )}

            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              className="gba:inline-flex gba:items-center gba:gap-2 gba:px-6 gba:py-3 gba:rounded-xl gba:bg-gradient-to-r gba:from-success gba:to-success/80 gba:text-success-foreground gba:font-bold gba:shadow-lg hover:gba:shadow-xl gba:transition-all"
            >
              <svg className="gba:h-5 gba:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              <span>{isDownloading ? 'Downloading...' : 'Download File'}</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default SandboxFileLinkChip
