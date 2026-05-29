import React, { useRef } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Progress
} from '@newwork/nw-design-system'
import { DotsThree } from '@phosphor-icons/react'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import {
  EmployeeSkillItem,
  getVisibilityLabel,
  isSkillActive,
  isSkillPending,
  isSkillVerified,
  parseSkillLevel
} from './skillsProfile.utils'
import { SkillVerificationDocumentLink } from './SkillVerificationDocumentLink'
import { getSkillCategory, getTimeSince } from '../../../../utils/utils'

interface UpdateSkillContext {
  context: FlowContextName
  contextData: { employeeId?: string }
}

interface SkillCardProps {
  skill: EmployeeSkillItem
  accessToken: string
  updateSkillContext: UpdateSkillContext
  t: (key: string, args?: Record<string, unknown>) => string
  temporaryDisabled: boolean
}

export const SkillCard: React.FC<SkillCardProps> = ({
  skill,
  accessToken,
  updateSkillContext,
  t,
  temporaryDisabled = false
}) => {
  const deactivateActivateTriggerRef = useRef<HTMLDivElement>(null)
  const attachVerificationTriggerRef = useRef<HTMLDivElement>(null)
  const removeTriggerRef = useRef<HTMLDivElement>(null)

  const parsedLevel = parseSkillLevel(skill.level)
  const hasLevel = parsedLevel !== null
  const isVerified = isSkillVerified(skill)
  const isPending = isSkillPending(skill)
  const isActive = isSkillActive(skill)
  const category = getSkillCategory(skill.skill.additionalProperties)
  const createdLabel = getTimeSince(skill.createdAt || skill.skill.createdAt || '')
  const updatedLabel = getTimeSince(skill.updatedAt || skill.skill.updatedAt || '')
  const visibilityLabel = skill.acl == null ? null : getVisibilityLabel(skill.acl)

  return (
    <Card
      className={`gba:h-full gba:overflow-visible ${isActive && !isPending ? '' : 'gba:bg-muted/50'}`}
      data-testid={`skills-profile-card-${skill.skill.id}`}
    >
      <CardContent className="gba:p-4 gba:space-y-4 gba:overflow-visible">
        <div className={isActive && !isPending ? '' : 'gba:opacity-50'}>
          <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
            <div className="gba:min-w-0 gba:flex-1">
              <h4 className="gba:text-base gba:font-semibold gba:truncate">{skill.skill.name}</h4>
              <p className="gba:text-xs gba:text-muted-foreground">{category}</p>
            </div>
            <div className="gba:text-right">
              <div className="gba:text-2xl gba:font-bold">{hasLevel ? parsedLevel : t('skills-set-level-inline')}</div>
              <p className="gba:text-xs gba:text-muted-foreground">{t('skills-level')}</p>
            </div>
          </div>

          <div className="gba:space-y-2 gba:min-h-[1.75rem]">
            {hasLevel ? (
              <Progress value={Math.min(100, Math.round((parsedLevel / 10) * 100))} />
            ) : (
              <div className="gba:text-xs gba:text-muted-foreground">{t('skills-level-empty-microcopy')}</div>
            )}
          </div>

          <div className="gba:flex gba:flex-wrap gba:gap-2">
            <Badge
              variant={isVerified ? 'success' : 'secondary'}
              data-testid={`skills-profile-verified-${skill.skill.id}`}
            >
              {isVerified ? t('skills-status-verified') : t('skills-status-unverified')}
            </Badge>
            {isPending && (
              <Badge variant="warning" data-testid={`skills-profile-pending-${skill.skill.id}`}>
                {t('skills-status-pending')}
              </Badge>
            )}
            {!isActive && (
              <Badge variant="destructive" data-testid={`skills-profile-inactive-${skill.skill.id}`}>
                {t('skills-status-inactive')}
              </Badge>
            )}
            {visibilityLabel != null && (
              <Badge variant="outline" data-testid={`skills-profile-visibility-${skill.skill.id}`}>
                {t('skills-visibility-label', { scope: visibilityLabel })}
              </Badge>
            )}
          </div>

          <div className="gba:mt-4 gba:text-xs gba:text-muted-foreground gba:space-y-1">
            <div>{t('skills-added-relative', { value: createdLabel })}</div>
            {isActive && <div>{t('skills-updated-relative', { value: updatedLabel })}</div>}
            {skill.validFrom && isActive && (
              <div>{t('skills-active-since', { value: getTimeSince(skill.validFrom) })}</div>
            )}
            {skill.validTo && !isActive && (
              <div>{t('skills-inactive-since', { value: getTimeSince(skill.validTo) })}</div>
            )}
            {isVerified && <SkillVerificationDocumentLink skill={skill} accessToken={accessToken} t={t} />}
          </div>
        </div>

        {!temporaryDisabled && (
          <div className="gba:flex gba:items-center gba:gap-2 gba:overflow-visible">
            {isActive ? (
              <>
                <AppAction
                  variant="update-secondary"
                  buttonSize="default"
                  buttonVariant="outline"
                  data-testid={`skills-profile-update-level-${skill.skill.id}`}
                  contexts={[
                    {
                      ...updateSkillContext,
                      contextData: {
                        ...updateSkillContext.contextData,
                        mode: 'changeLevel',
                        skillId: skill.skill.id,
                        employeeSkillId: skill.id,
                        skillName: skill.skill.name ?? undefined,
                        currentLevel: skill.level ?? null
                      }
                    }
                  ]}
                  prefixDataTestId={`skills-profile-update-level-${skill.skill.id}`}
                  accessToken={accessToken}
                  autoExecute={true}
                  disabled={isPending}
                >
                  {hasLevel ? t('skills-action-update-level') : t('skills-action-set-level')}
                </AppAction>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="gba:shrink-0"
                      aria-label={t('skills-profile-more-actions')}
                      data-testid={`skills-profile-more-actions-${skill.skill.id}`}
                      disabled={isPending}
                    >
                      <DotsThree className="gba:h-4 gba:w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    sideOffset={4}
                    className="gba:min-w-[13rem] gba:w-max gba:py-1"
                    style={{ maxHeight: 'none' }}
                  >
                    <DropdownMenuItem
                      className="gba:py-2 gba:px-3 gba:cursor-pointer"
                      data-testid={`skills-profile-attach-verification-${skill.skill.id}`}
                      disabled={isPending}
                      onSelect={() => {
                        if (isPending) return
                        attachVerificationTriggerRef.current?.querySelector('button')?.click()
                      }}
                    >
                      <span className="gba:block gba:text-left gba:w-full">
                        {t(isVerified ? 'skills-action-change-verification' : 'skills-action-attach-verification')}
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gba:py-2 gba:px-3 gba:cursor-pointer"
                      data-testid={`skills-profile-toggle-active-${skill.skill.id}`}
                      disabled={isPending}
                      onSelect={() => {
                        if (isPending) return
                        deactivateActivateTriggerRef.current?.querySelector('button')?.click()
                      }}
                    >
                      <span className="gba:block gba:text-left gba:w-full">{t('skills-action-deactivate')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gba:py-2 gba:px-3 gba:cursor-pointer"
                      data-testid={`skills-profile-remove-${skill.skill.id}`}
                      disabled={isPending}
                      onSelect={() => {
                        if (isPending) return
                        removeTriggerRef.current?.querySelector('button')?.click()
                      }}
                    >
                      <span className="gba:block gba:text-left gba:w-full">{t('skills-action-remove')}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button
                variant="outline"
                size="default"
                className="gba:shrink-0"
                data-testid={`skills-profile-activate-${skill.skill.id}`}
                disabled={isPending}
                onClick={() => deactivateActivateTriggerRef.current?.querySelector('button')?.click()}
              >
                {t('skills-action-activate')}
              </Button>
            )}
            {/* Same pattern as Update level: AppAction always mounted so flow data is ready when user clicks the menu item */}
            <div
              ref={deactivateActivateTriggerRef}
              className="gba:fixed gba:opacity-0 gba:pointer-events-none gba:left-[-9999px] gba:top-0"
              aria-hidden="true"
            >
              <AppAction
                variant="update-secondary"
                contexts={[
                  {
                    ...updateSkillContext,
                    contextData: {
                      ...updateSkillContext.contextData,
                      mode: isActive ? 'deactivate' : 'activate',
                      skillId: skill.skill.id,
                      employeeSkillId: skill.id,
                      skillName: skill.skill.name
                    }
                  }
                ]}
                accessToken={accessToken}
                autoExecute={true}
                disabled={isPending}
                prefixDataTestId={`skills-profile-toggle-active-${skill.skill.id}`}
              >
                <span />
              </AppAction>
            </div>
            <div
              ref={removeTriggerRef}
              className="gba:fixed gba:opacity-0 gba:pointer-events-none gba:left-[-9999px] gba:top-0"
              aria-hidden="true"
            >
              <AppAction
                variant="update-secondary"
                contexts={[
                  {
                    context: FlowContextName.deleteEmployeeSkill,
                    contextData: {
                      ...updateSkillContext.contextData,
                      mode: 'remove',
                      skillId: skill.skill.id,
                      employeeSkillId: skill.id,
                      skillName: skill.skill.name
                    }
                  }
                ]}
                accessToken={accessToken}
                autoExecute={true}
                disabled={isPending}
                prefixDataTestId={`skills-profile-remove-${skill.skill.id}`}
              >
                <span />
              </AppAction>
            </div>
            <div
              ref={attachVerificationTriggerRef}
              className="gba:fixed gba:opacity-0 gba:pointer-events-none gba:left-[-9999px] gba:top-0"
              aria-hidden="true"
            >
              <AppAction
                variant="update-secondary"
                contexts={[
                  {
                    ...updateSkillContext,
                    contextData: {
                      ...updateSkillContext.contextData,
                      mode: 'attachVerification',
                      skillId: skill.skill.id,
                      employeeSkillId: skill.id,
                      skillName: skill.skill.name
                    }
                  }
                ]}
                accessToken={accessToken}
                autoExecute={true}
                disabled={isPending}
                prefixDataTestId={`skills-profile-attach-verification-${skill.skill.id}`}
              >
                <span />
              </AppAction>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
