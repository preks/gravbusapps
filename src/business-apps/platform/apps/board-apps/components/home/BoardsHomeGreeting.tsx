import React, { useMemo } from 'react'
import { Button } from '@newwork/nw-design-system'
import { Plus, Sparkles, Search } from 'lucide-react'

interface BoardsHomeGreetingProps {
  userName?: string
  onCreateBoard: () => void
  onCreateAI: () => void
  onSearch: () => void
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
  onCreateBoard,
  onCreateAI,
  onSearch,
  'data-testid': testId = 'boards-home-greeting'
}) => {
  const greeting = useMemo(() => getGreeting(), [])
  const firstName = useMemo(() => {
    if (!userName) return ''
    return userName.split(' ')[0]
  }, [userName])

  return (
    <section className="gba:rounded-xl gba:bg-card gba:p-6" data-testid={testId}>
      <div className="gba:flex gba:items-start gba:justify-between gba:gap-4 gba:flex-wrap">
        <div>
          <h2 className="gba:text-xl gba:font-semibold gba:text-foreground gba:mb-1" data-testid={`${testId}-heading`}>
            {greeting}
            {firstName && <span>, {firstName}</span>}
          </h2>
          <p className="gba:text-sm gba:text-muted-foreground">Build anything. Track everything.</p>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2">
          <Button variant="outline" size="sm" onClick={onSearch} data-testid={`${testId}-search`}>
            <Search className="gba:h-4 gba:w-4 gba:mr-1.5" />
            Search boards
          </Button>
          <Button variant="outline" size="sm" onClick={onCreateAI} data-testid={`${testId}-ai`}>
            <Sparkles className="gba:h-4 gba:w-4 gba:mr-1.5" />
            AI Board
          </Button>
          <Button size="sm" onClick={onCreateBoard} data-testid={`${testId}-create`}>
            <Plus className="gba:h-4 gba:w-4 gba:mr-1.5" />
            New Board
          </Button>
        </div>
      </div>
    </section>
  )
}
