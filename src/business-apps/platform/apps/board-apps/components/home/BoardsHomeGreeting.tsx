import React, { useMemo } from 'react'

interface BoardsHomeGreetingProps {
  userName?: string
  'data-testid'?: string
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  if (hour >= 17 && hour < 21) return 'Good evening'
  return 'Good night'
}

export const BoardsHomeGreeting: React.FC<BoardsHomeGreetingProps> = ({
  userName,
  'data-testid': testId = 'boards-home-greeting'
}) => {
  const greeting = useMemo(() => getGreeting(), [])
  const firstName = useMemo(() => {
    if (!userName) return ''
    return userName.split(' ')[0]
  }, [userName])

  return (
    <section data-testid={testId}>
      <h1
        className="gba:text-2xl gba:font-semibold gba:text-foreground gba:tracking-tight"
        data-testid={`${testId}-heading`}
      >
        {greeting}
        {firstName && <span>, {firstName}</span>}
      </h1>
      <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
        Here&apos;s what&apos;s happening across your boards.
      </p>
    </section>
  )
}
