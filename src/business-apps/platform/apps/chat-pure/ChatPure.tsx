import React from 'react'
import { Chat } from '../chat/Chat'
import { GlobalCallContainer } from '../chat/components/GlobalCallContainer'
import { GlobalPreCallSetupDialog } from '../chat/components/GlobalPreCallSetupDialog'

type ChatProps = React.ComponentProps<typeof Chat>

/**
 * Chat (Pure) keeps the single-chat experience (no tabs),
 * but still mounts the global call/pre-call UI introduced by chat refactors.
 */
export const ChatPure: React.FC<ChatProps> = props => {
  return (
    <>
      <Chat {...props} />
      <GlobalCallContainer />
      <GlobalPreCallSetupDialog />
    </>
  )
}
