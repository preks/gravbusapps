import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Dialog, DialogContent, DialogTitle, Spinner } from '@newwork/nw-design-system'
import { EnvelopeIcon } from '@phosphor-icons/react'
import { EmailReader, EmailThreadComposeSurface } from '@/business-apps/platform/apps/email-apps/components'
import { EmailApiService } from '@/business-apps/platform/apps/email-apps/services/EmailApiService'
import { useEmailAccounts } from '@/business-apps/platform/apps/email-apps/hooks/useEmailAccounts'
import { useEmailFolders } from '@/business-apps/platform/apps/email-apps/hooks/useEmailFolders'
import { useEmailDirectory } from '@/business-apps/platform/apps/email-apps/hooks/useEmailDirectory'
import type { ComposeMode, EmailMessage } from '@/business-apps/platform/apps/email-apps/types'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useWorkplaceTranslation } from '../_i18n/useWorkplaceTranslation'

const TEST_ID = 'digital-workplace-mail-dialog'

export interface EveryOneMailDialogProps {
  open: boolean
  messageId: string | null
  context: BusinessAppContextProps
  onClose: () => void
  /** Fired after a change (read/star/delete/reply) so the panel can refresh. */
  onChanged: () => void
}

type ViewMode = 'read' | ComposeMode

/**
 * Reads and replies to a single email inline, reusing the mail app's own
 * `EmailReader` and `EmailThreadComposeSurface`. We fetch the full message body
 * (the list only carries a snippet) and mirror the mail hub's read/compose
 * toggle so Reply / Reply all / Forward work without leaving the desk.
 */
const EveryOneMailDialog: React.FC<EveryOneMailDialogProps> = ({ open, messageId, context, onClose, onChanged }) => {
  const { t } = useWorkplaceTranslation()
  const accessToken = context.accessToken
  const { accounts, defaultAccount } = useEmailAccounts(accessToken)
  const { folders } = useEmailFolders(accessToken, defaultAccount?.id)
  const { searchContacts } = useEmailDirectory(accessToken, accounts)

  const [message, setMessage] = useState<EmailMessage | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<ViewMode>('read')

  // Keep the latest onChanged without making it a fetch dependency — otherwise a
  // background email poll changes its identity and re-runs the fetch, which would
  // reset the compose view back to read mode mid-reply.
  const onChangedRef = useRef(onChanged)
  useEffect(() => {
    onChangedRef.current = onChanged
  }, [onChanged])

  useEffect(() => {
    if (!open || !messageId || !accessToken) {
      setMessage(null)
      setMode('read')
      setError(null)
      return
    }
    let cancelled = false
    EmailApiService.setAccessToken(accessToken)
    setLoading(true)
    setMode('read')
    EmailApiService.getMessage(messageId)
      .then(async full => {
        if (cancelled) return
        setMessage(full)
        setError(null)
        if (!full.isRead) {
          await EmailApiService.markRead(full.id, true).catch(() => undefined)
          if (!cancelled) {
            setMessage(prev => (prev && prev.id === full.id ? { ...prev, isRead: true } : prev))
          }
          onChangedRef.current()
        }
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load email.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, messageId, accessToken])

  const handleToggleStar = useCallback(
    async (id: string) => {
      const result = await EmailApiService.toggleStar(id).catch(() => null)
      if (result) {
        setMessage(prev => (prev && prev.id === id ? { ...prev, isStarred: result.isStarred } : prev))
        onChanged()
      }
    },
    [onChanged]
  )

  // Lets the user keep an email unread so it stays in the Digital Workplace inbox.
  const handleToggleRead = useCallback(async () => {
    if (!message) return
    const nextIsRead = !message.isRead
    await EmailApiService.markRead(message.id, nextIsRead).catch(() => undefined)
    setMessage(prev => (prev ? { ...prev, isRead: nextIsRead } : prev))
    onChanged()
  }, [message, onChanged])

  const handleDelete = useCallback(
    async (id: string) => {
      await EmailApiService.deleteMessage(id).catch(() => undefined)
      onChanged()
      onClose()
    },
    [onChanged, onClose]
  )

  const handleArchive = useCallback(
    async (id: string) => {
      const archiveFolder = folders.find(folder => folder.type === 'archive')
      if (archiveFolder) {
        await EmailApiService.moveToFolder(id, archiveFolder.id).catch(() => undefined)
      }
      onChanged()
      onClose()
    },
    [folders, onChanged, onClose]
  )

  const isComposing = mode !== 'read'

  return (
    <Dialog open={open} onOpenChange={value => !value && onClose()}>
      <DialogContent
        className="gba:flex gba:h-[85vh] gba:max-h-[85vh] gba:w-full gba:max-w-3xl gba:flex-col gba:overflow-hidden gba:p-0"
        data-testid={`${TEST_ID}-content`}
      >
        <DialogTitle className="gba:sr-only">{message?.subject || t('messages-no-subject')}</DialogTitle>

        {message && !isComposing ? (
          <div className="gba:flex gba:items-center gba:gap-2 gba:border-b gba:border-border/60 gba:px-4 gba:py-2 gba:pr-12">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleToggleRead()}
              data-testid={`${TEST_ID}-toggle-read`}
            >
              <EnvelopeIcon className="gba:size-4" />
              {message.isRead ? t('mail-mark-unread') : t('mail-mark-read')}
            </Button>
          </div>
        ) : null}

        <div className="gba:flex gba:min-h-0 gba:flex-1 gba:flex-col">
          {loading && !message ? (
            <div className="gba:flex gba:flex-1 gba:items-center gba:justify-center">
              <Spinner />
            </div>
          ) : error && !message ? (
            <div
              className="gba:m-6 gba:rounded-md gba:border gba:border-destructive/40 gba:bg-destructive/5 gba:px-3 gba:py-2 gba:text-xs gba:text-destructive"
              role="alert"
            >
              {error}
            </div>
          ) : isComposing ? (
            <EmailThreadComposeSurface
              isOpen
              mode={mode as ComposeMode}
              replyToMessage={message}
              accounts={accounts}
              defaultAccountId={defaultAccount?.id}
              searchContacts={searchContacts}
              onClose={() => setMode('read')}
              onSent={() => {
                setMode('read')
                onChanged()
              }}
              assistantEnabled
              data-testid={`${TEST_ID}-compose`}
            />
          ) : (
            <EmailReader
              message={message}
              accessToken={accessToken}
              activeAccount={defaultAccount}
              employeeId={context.userInfo?.employeeDetails?.employeeId}
              initiatorUserId={context.userInfo?.id}
              threadEnabled={false}
              onCompose={composeMode => setMode(composeMode)}
              onDelete={id => void handleDelete(id)}
              onToggleStar={id => void handleToggleStar(id)}
              onArchive={id => void handleArchive(id)}
              data-testid={`${TEST_ID}-reader`}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default EveryOneMailDialog
export { EveryOneMailDialog }
