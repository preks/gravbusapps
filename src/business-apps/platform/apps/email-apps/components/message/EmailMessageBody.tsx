import React, { useEffect, useRef } from 'react'

interface EmailMessageBodyProps {
  messageId: string
  htmlBody?: string
  textBody?: string
  emptyBodyText: string
  testId: string
}

export const EmailMessageBody: React.FC<EmailMessageBodyProps> = ({
  messageId,
  htmlBody,
  textBody,
  emptyBodyText,
  testId
}) => {
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (bodyRef.current && htmlBody) {
      bodyRef.current.innerHTML = htmlBody
    }
  }, [htmlBody])

  if (htmlBody) {
    return (
      <div
        key={messageId}
        ref={bodyRef}
        className="gba:prose gba:prose-sm gba:max-w-none gba:text-foreground"
        data-testid={`${testId}-body`}
      />
    )
  }

  return (
    <div className="gba:whitespace-pre-wrap gba:text-sm gba:text-foreground" data-testid={`${testId}-body`}>
      {textBody || emptyBodyText}
    </div>
  )
}
