/**
 * ActivityEmailBody - Lazy-loads and renders the full email message body
 * for email-type activities inside the CRM activity timeline.
 *
 * Uses a sandboxed iframe to safely render untrusted HTML email content.
 * Provides a "Open in Email app" deep-link button.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Spinner } from '@newwork/nw-design-system'
import { EnvelopeIcon, ArrowSquareOutIcon, CaretDownIcon, CaretUpIcon } from '@phosphor-icons/react'
import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'

interface EmailBody {
  subject?: string
  textBody?: string
  htmlBody?: string
  fromAddress?: { name?: string; address?: string }
  toAddresses?: Array<{ name?: string; address?: string }>
  date?: string
}

interface ActivityEmailBodyProps {
  emailMessageId: string
  accessToken: string
  /** Whether the current viewer is the owner of the email (only they can open it in Email app) */
  isEmailOwner?: boolean
  'data-testid'?: string
}

const API_URL = getDocumentServiceApiUrl()

export const ActivityEmailBody: React.FC<ActivityEmailBodyProps> = ({
  emailMessageId,
  accessToken,
  isEmailOwner = false,
  'data-testid': testId = 'activity-email-body'
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [emailBody, setEmailBody] = useState<EmailBody | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Lazy-load the full email message from document-service using shared endpoint
  // The /shared endpoint allows any authenticated user to view CRM-linked emails
  const fetchEmail = useCallback(async () => {
    if (emailBody || loading) return
    setLoading(true)
    setError(null)
    try {
      const resp = await fetch(`${API_URL}/emails/messages/${emailMessageId}/shared`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      if (!resp.ok) throw new Error(`Failed to load email (${resp.status})`)
      const data = await resp.json()
      setEmailBody(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load email')
    } finally {
      setLoading(false)
    }
  }, [emailMessageId, accessToken, emailBody, loading])

  // Fetch on expand
  useEffect(() => {
    if (isExpanded && !emailBody && !loading) {
      fetchEmail()
    }
  }, [isExpanded, emailBody, loading, fetchEmail])

  // Auto-resize the sandboxed iframe once content loads
  useEffect(() => {
    if (!emailBody?.htmlBody || !iframeRef.current || !isExpanded) return
    const iframe = iframeRef.current
    const handleLoad = () => {
      try {
        const height = iframe.contentDocument?.documentElement?.scrollHeight
        if (height) iframe.style.height = `${Math.min(height + 16, 600)}px`
      } catch {
        // Cross-origin restriction; use a default height
        iframe.style.height = '400px'
      }
    }
    iframe.addEventListener('load', handleLoad)
    return () => iframe.removeEventListener('load', handleLoad)
  }, [emailBody?.htmlBody, isExpanded])

  const handleOpenInEmail = useCallback(() => {
    navigateTo(buildPlatformUrl('/platform/mail', { messageId: emailMessageId }))
  }, [emailMessageId])

  return (
    <div className="gba:mt-2" data-testid={testId}>
      {/* Toggle button */}
      <button
        className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:font-medium gba:text-primary gba:hover:underline gba:cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid={`${testId}-toggle`}
      >
        <EnvelopeIcon className="gba:w-3.5 gba:h-3.5" weight="bold" />
        {isExpanded ? 'Hide email' : 'Show email'}
        {isExpanded ? <CaretUpIcon className="gba:w-3 gba:h-3" /> : <CaretDownIcon className="gba:w-3 gba:h-3" />}
      </button>

      {/* Expanded email body */}
      {isExpanded && (
        <div
          className="gba:mt-2 gba:rounded gba:border gba:bg-card gba:overflow-hidden"
          data-testid={`${testId}-content`}
        >
          {loading && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:p-3">
              <Spinner size="sm" />
              <span className="gba:text-xs gba:text-muted-foreground">Loading email...</span>
            </div>
          )}

          {error && <div className="gba:p-3 gba:text-xs gba:text-destructive">{error}</div>}

          {emailBody && (
            <>
              {/* Email header summary */}
              <div className="gba:px-3 gba:py-2 gba:border-b gba:bg-muted/30">
                {emailBody.subject && (
                  <p className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">{emailBody.subject}</p>
                )}
                <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground gba:mt-0.5">
                  {emailBody.fromAddress && (
                    <span>From: {emailBody.fromAddress.name || emailBody.fromAddress.address}</span>
                  )}
                  {emailBody.date && <span>· {new Date(emailBody.date).toLocaleString()}</span>}
                </div>
              </div>

              {/* Body content - sandboxed iframe for HTML, plain text fallback */}
              <div className="gba:p-3">
                {emailBody.htmlBody ? (
                  <iframe
                    ref={iframeRef}
                    srcDoc={emailBody.htmlBody}
                    sandbox="allow-same-origin"
                    title="Email body"
                    className="gba:w-full gba:border-0 gba:min-h-24 gba:h-52"
                    data-testid={`${testId}-iframe`}
                  />
                ) : (
                  <div className="gba:whitespace-pre-wrap gba:text-sm gba:text-foreground">
                    {emailBody.textBody || '(empty)'}
                  </div>
                )}
              </div>

              {/* Actions — only the email owner can open in Email app */}
              {isEmailOwner && (
                <div className="gba:px-3 gba:pb-2 gba:flex gba:justify-end">
                  <Button variant="ghost" size="sm" onClick={handleOpenInEmail} data-testid={`${testId}-open-email`}>
                    <ArrowSquareOutIcon className="gba:w-3.5 gba:h-3.5 gba:mr-1" />
                    Open in Email app
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default ActivityEmailBody
