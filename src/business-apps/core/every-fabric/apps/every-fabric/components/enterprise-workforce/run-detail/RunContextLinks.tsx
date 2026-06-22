// Compact "linked context" row for the run-detail header. Entities the run
// resolved render as an avatar + name chip (clickable when navigable); the
// policies it consulted render as labelled chips. Domain-agnostic — anything
// without a deep link still shows as a non-clickable chip.

import { ArrowSquareOutIcon, BookOpenTextIcon } from '@phosphor-icons/react'
import { Avatar, AvatarFallback, AvatarImage, useTranslation } from '@newwork/nw-design-system'
import React, { useMemo } from 'react'
import type { WorkforceRun, WorkforceRunTraceEvent } from '../workforceTypes'
import { caseEntityLinks, policyRunLinks, type RunLink } from './runDetailLinks'
import { useRunEntityAvatar } from './useRunEntityAvatar'
import translations from '../../../_i18n'

export interface RunContextLinksProps {
  run: WorkforceRun
  accessToken: string
  /** Merged (live + REST) trace, so policies reflect a still-streaming run. */
  trace: readonly WorkforceRunTraceEvent[]
}

function initials(text: string): string {
  const parts = text.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  const result = parts.map(part => part[0]?.toUpperCase() ?? '').join('')
  return result || '?'
}

const ENTITY_LINK_CLASS =
  'gba:group gba:inline-flex gba:items-center gba:gap-1.5 gba:rounded-full gba:border gba:border-border/70 gba:bg-card gba:py-0.5 gba:pl-0.5 gba:pr-2.5 gba:text-xs gba:font-medium gba:text-foreground gba:shadow-sm gba:transition-colors gba:hover:border-primary/50 gba:hover:bg-primary/5'
const ENTITY_CHIP_CLASS =
  'gba:inline-flex gba:items-center gba:gap-1.5 gba:rounded-full gba:border gba:border-border/70 gba:bg-card gba:py-0.5 gba:pl-0.5 gba:pr-2.5 gba:text-xs gba:font-medium gba:text-foreground gba:shadow-sm'
const POLICY_LINK_CLASS =
  'gba:inline-flex gba:items-center gba:gap-1.5 gba:rounded-full gba:border gba:border-sky-500/30 gba:bg-sky-500/5 gba:px-2.5 gba:py-1 gba:text-xs gba:font-medium gba:text-sky-700 gba:dark:text-sky-300 gba:hover:bg-sky-500/10'
const POLICY_CHIP_CLASS =
  'gba:inline-flex gba:items-center gba:gap-1.5 gba:rounded-full gba:border gba:border-sky-500/30 gba:bg-sky-500/5 gba:px-2.5 gba:py-1 gba:text-xs gba:font-medium gba:text-sky-700 gba:dark:text-sky-300'

const EntityChip: React.FC<{ link: RunLink; accessToken: string }> = ({ link, accessToken }) => {
  const { t } = useTranslation(translations)
  const display = link.name ?? link.label
  const avatarSrc = useRunEntityAvatar(link.entityType, link.value, accessToken)
  const inner = (
    <>
      <Avatar className="gba:h-5 gba:w-5" shape="circle">
        {avatarSrc && <AvatarImage src={avatarSrc} alt={display} />}
        <AvatarFallback className="gba:bg-primary/10 gba:text-[10px] gba:font-semibold gba:text-primary">
          {initials(display)}
        </AvatarFallback>
      </Avatar>
      <span className="gba:max-w-[12rem] gba:truncate">{display}</span>
      {link.url && (
        <ArrowSquareOutIcon className="gba:h-3 gba:w-3 gba:text-muted-foreground gba:group-hover:text-primary" />
      )}
    </>
  )

  if (link.url) {
    return (
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className={ENTITY_LINK_CLASS}
        title={t('run-context-open', { label: link.label, display })}
        data-testid="run-context-entity"
      >
        {inner}
      </a>
    )
  }
  return (
    <span className={ENTITY_CHIP_CLASS} title={display} data-testid="run-context-entity">
      {inner}
    </span>
  )
}

const PolicyChipView: React.FC<{ link: RunLink }> = ({ link }) => {
  if (link.url) {
    return (
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className={POLICY_LINK_CLASS}
        title={link.label}
        data-testid="run-context-policy"
      >
        <BookOpenTextIcon className="gba:h-3.5 gba:w-3.5" />
        {link.label}
        <ArrowSquareOutIcon className="gba:h-3 gba:w-3" />
      </a>
    )
  }
  return (
    <span className={POLICY_CHIP_CLASS} title={link.label} data-testid="run-context-policy">
      <BookOpenTextIcon className="gba:h-3.5 gba:w-3.5" />
      {link.label}
    </span>
  )
}

const LinkGroup: React.FC<{ label: string; links: RunLink[]; accessToken: string }> = ({
  label,
  links,
  accessToken
}) => {
  if (links.length === 0) return null
  return (
    <div className="gba:flex gba:items-center gba:gap-1.5">
      <span className="gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground">
        {label}
      </span>
      {links.map(link =>
        link.kind === 'entity' ? (
          <EntityChip key={link.key} link={link} accessToken={accessToken} />
        ) : (
          <PolicyChipView key={link.key} link={link} />
        )
      )}
    </div>
  )
}

export const RunContextLinks: React.FC<RunContextLinksProps> = ({ run, accessToken, trace }) => {
  const { t } = useTranslation(translations)
  const entityLinks = useMemo<RunLink[]>(() => caseEntityLinks(run.case_ref), [run.case_ref])
  const policyLinks = useMemo<RunLink[]>(() => policyRunLinks(trace), [trace])
  if (entityLinks.length === 0 && policyLinks.length === 0) return null

  return (
    <div
      className="gba:mt-4 gba:flex gba:flex-wrap gba:items-center gba:gap-x-4 gba:gap-y-2 gba:border-t gba:border-border/60 gba:pt-3"
      data-testid="run-context-links"
    >
      <LinkGroup label={t('run-context-records')} links={entityLinks} accessToken={accessToken} />
      <LinkGroup label={t('run-context-policies')} links={policyLinks} accessToken={accessToken} />
    </div>
  )
}
