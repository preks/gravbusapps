import { Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { Bot, Pencil } from 'lucide-react'
import type { WhiteboardAiMessage as AiMessage } from '../hooks/useWhiteboardAiSocket'

interface WhiteboardAiMessageProps {
  message: AiMessage
  userAvatarUrl?: string
  userName?: string
  testId?: string
}

export const WhiteboardAiMessage = ({
  message,
  userAvatarUrl,
  userName,
  testId = 'wb-ai-message'
}: WhiteboardAiMessageProps) => {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="gba:flex gba:justify-end gba:gap-2.5 gba:px-4 gba:py-3" data-testid={`${testId}-${message.id}`}>
        <div className="gba:max-w-[80%] gba:rounded-2xl gba:rounded-br-sm gba:bg-primary gba:text-primary-foreground gba:px-4 gba:py-3">
          {message.imageDataUrl && (
            <img
              src={message.imageDataUrl}
              alt="Attached"
              className="gba:rounded-lg gba:max-w-full gba:max-h-48 gba:object-contain gba:mb-2"
            />
          )}
          <p className="gba:text-sm gba:leading-relaxed gba:whitespace-pre-wrap gba:break-words">{message.content}</p>
        </div>
        <Avatar className="gba:h-7 gba:w-7 gba:flex-shrink-0 gba:mt-0.5">
          {userAvatarUrl && <AvatarImage src={userAvatarUrl} alt={userName || 'User'} />}
          <AvatarFallback className="gba:text-[10px] gba:font-semibold gba:bg-secondary gba:text-secondary-foreground">
            {userName ? userName.charAt(0).toUpperCase() : 'U'}
          </AvatarFallback>
        </Avatar>
      </div>
    )
  }

  return (
    <div className="gba:flex gba:gap-2.5 gba:px-4 gba:py-3" data-testid={`${testId}-${message.id}`}>
      <Avatar className="gba:h-7 gba:w-7 gba:flex-shrink-0 gba:mt-0.5">
        <AvatarFallback className="gba:bg-primary/10 gba:text-primary">
          <Bot className="gba:h-3.5 gba:w-3.5" />
        </AvatarFallback>
      </Avatar>
      <div className="gba:max-w-[85%] gba:space-y-2">
        <div className="gba:rounded-2xl gba:rounded-bl-sm gba:bg-muted/60 gba:px-4 gba:py-3">
          <p className="gba:text-sm gba:whitespace-pre-wrap gba:break-words">{message.content}</p>
        </div>

        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="gba:flex gba:flex-wrap gba:gap-1.5">
            {message.toolCalls.map((tc, i) => (
              <span
                key={i}
                className="gba:inline-flex gba:items-center gba:gap-1 gba:text-xs gba:px-2 gba:py-0.5 gba:rounded-full gba:bg-success-secondary gba:text-success-secondary-foreground"
              >
                <Pencil className="gba:h-3 gba:w-3" />
                {formatToolName(tc.name)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function formatToolName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
