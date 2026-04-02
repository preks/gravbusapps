import React, { useCallback, useMemo, useState } from 'react'
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { Check, ChevronsUpDown, FileText, Loader2 } from 'lucide-react'
import translations from '../../../../_i18n'
import { useContentEntries } from '@/common/data/content/hooks/useContentEntries'
import { isPolicyContentEntry } from '@/business-apps/core/content/utils/policyUtils'
import { ContentGroup, ContentRole } from '@/common/data/content/constants/contentConstants'
import type { ContentEntry } from '@/common/data/content/types/contentEntryTypes'
import { POLICY_PICKER_FIELDS } from '../decisionConfigUtils'

interface DecisionPolicyPickerProps {
  accessToken: string
  policyDocumentId?: string
  policyDocumentTitle?: string
  onSelect: (policy: Pick<ContentEntry, 'id' | 'title' | 'entryVersion'>) => void
  'data-testid': string
}

export const DecisionPolicyPicker: React.FC<DecisionPolicyPickerProps> = ({
  accessToken,
  policyDocumentId,
  policyDocumentTitle,
  onSelect,
  'data-testid': testId
}) => {
  const { t } = useTranslation(translations)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const queryParams = useMemo(
    () => ({
      role: ContentRole.ROOT,
      contentGroups: [
        ContentGroup.NEWS,
        ContentGroup.KNOWLEDGE,
        ContentGroup.DOCUMENT,
        ContentGroup.QUESTION,
        ContentGroup.GLOSSARY,
        ContentGroup.POLICY
      ],
      limit: 100,
      offset: 0,
      sortBy: 'updatedAt' as const,
      sortOrder: 'DESC' as const
    }),
    []
  )
  const policyQueryOptions = useMemo(() => ({ fields: POLICY_PICKER_FIELDS }), [])
  const { entries, isLoading } = useContentEntries(queryParams, accessToken, policyQueryOptions)

  const allPolicies = useMemo(() => entries.filter(isPolicyContentEntry), [entries])
  const selectedPolicy = useMemo(
    () => allPolicies.find(p => p.id === policyDocumentId),
    [allPolicies, policyDocumentId]
  )
  const filteredPolicies = useMemo(() => {
    const q = String(search || '')
      .trim()
      .toLowerCase()
    if (!q) return allPolicies
    return allPolicies.filter(p => (p.title ?? '').toLowerCase().includes(q))
  }, [allPolicies, search])

  const selectPolicy = useCallback(
    (policy: Pick<ContentEntry, 'id' | 'title' | 'entryVersion'>) => {
      onSelect(policy)
      setOpen(false)
    },
    [onSelect]
  )

  return (
    <div className="gba:flex gba:flex-col gba:gap-1.5">
      <Label className="gba:text-xs gba:font-medium">{t('decision-policy')}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="gba:w-full gba:justify-between gba:h-9 gba:text-xs gba:font-normal"
            data-testid={testId}
          >
            {selectedPolicy || policyDocumentTitle ? (
              <span className="gba:flex gba:items-center gba:gap-1.5 gba:text-foreground gba:truncate">
                <FileText className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground gba:flex-shrink-0" />
                {selectedPolicy?.title ?? policyDocumentTitle ?? 'Untitled policy'}
              </span>
            ) : (
              <span className="gba:text-muted-foreground">
                {isLoading ? 'Loading policies...' : t('decision-policy-optional-placeholder')}
              </span>
            )}
            <ChevronsUpDown className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground gba:flex-shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="gba:w-[var(--radix-popover-trigger-width)] gba:p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Search policies..." value={search} onValueChange={setSearch} />
            <CommandList className="gba:max-h-72 gba:overflow-y-auto">
              {isLoading ? (
                <div className="gba:flex gba:items-center gba:justify-center gba:py-6 gba:text-xs gba:text-muted-foreground gba:gap-2">
                  <Loader2 className="gba:h-4 gba:w-4 gba:animate-spin" />
                  Loading policies...
                </div>
              ) : (
                <>
                  <CommandEmpty>No policies found.</CommandEmpty>
                  <CommandGroup>
                    {filteredPolicies.map(policy => (
                      <CommandItem key={policy.id} value={policy.id ?? ''} onSelect={() => selectPolicy(policy)}>
                        <FileText className="gba:h-3.5 gba:w-3.5 gba:mr-2 gba:text-muted-foreground" />
                        <div className="gba:flex gba:flex-col gba:flex-1 gba:min-w-0">
                          <span className="gba:truncate gba:text-foreground">{policy.title ?? 'Untitled'}</span>
                          {policy.preview && (
                            <span className="gba:text-[10px] gba:text-muted-foreground gba:truncate">
                              {policy.preview}
                            </span>
                          )}
                        </div>
                        {policyDocumentId === policy.id && (
                          <Check className="gba:h-3.5 gba:w-3.5 gba:text-primary gba:flex-shrink-0" />
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
