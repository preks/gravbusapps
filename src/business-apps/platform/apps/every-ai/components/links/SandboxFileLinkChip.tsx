import React, { useState } from 'react'
import { Button } from '@newwork/nw-design-system'
import { env } from '@/common/env/EnvUtils'

interface SandboxFileLinkChipProps {
  filePath: string
  token: string
  children?: React.ReactNode
}

const SandboxFileLinkChip: React.FC<SandboxFileLinkChipProps> = ({ filePath, token, children }) => {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    if (isDownloading) return

    setIsDownloading(true)
    try {
      const baseUrl = env('NEXT_PUBLIC_BASE_URL') || 'https://newwork-dev.newwork.com'
      const response = await fetch(`${baseUrl}/flowbot/api/agent/download-sandbox-file`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ file_path: filePath })
      })

      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`)
      }

      // Get filename from path
      const filename = filePath.split('/').pop() || 'download'

      // Create blob and download
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download sandbox file:', error)
      alert('Failed to download file. Please try again.')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Button
      onClick={handleDownload}
      disabled={isDownloading}
      className="gba:inline-flex gba:items-center gba:gap-2 gba:px-6 gba:py-3 gba:rounded-xl gba:bg-gradient-to-r gba:from-success gba:to-success/80 gba:text-success-foreground gba:font-bold gba:shadow-lg hover:gba:shadow-xl gba:transition-all gba:my-2"
    >
      <svg className="gba:h-5 gba:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.5}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
      <span>{isDownloading ? 'Downloading...' : children || 'Download File'}</span>
    </Button>
  )
}

export default SandboxFileLinkChip
