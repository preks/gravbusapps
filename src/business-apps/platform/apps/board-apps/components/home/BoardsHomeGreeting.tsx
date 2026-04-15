import React, { useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../../_i18n'

interface BoardsHomeGreetingProps {
  userName?: string
  'data-testid'?: string
}

function getGreeting(t: (key: string, args?: Record<string, unknown>) => string): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return t('home-greeting-morning')
  if (hour >= 12 && hour < 17) return t('home-greeting-afternoon')
  if (hour >= 17 && hour < 21) return t('home-greeting-evening')
  return t('home-greeting-night')
}

export const BoardsHomeGreeting: React.FC<BoardsHomeGreetingProps> = ({
  userName,
  'data-testid': testId = 'boards-home-greeting'
}) => {
  const { t } = useTranslation(translations)
  const greeting = useMemo(() => getGreeting(t), [t])
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
      <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">{t('home-greeting-subtitle')}</p>
    </section>
  )
}
