'use client'

import { useEffect, useMemo, useState } from 'react'
import { MagnifyingGlassIcon, UserIcon, WarningCircleIcon } from '@phosphor-icons/react'
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Combobox,
  Label,
  ScrollArea,
  Separator,
  useTranslation
} from '@newwork/nw-design-system'
import type { CatalogEntry } from '@/common/types/CatalogTypes'
import { useCompanySelection } from '@/business-apps/fin/expenses/apps/expense-settings/hooks/useCompanySelection'
import type { EligibilityOption } from '../hooks/useAbsenceSetupEligibilityData'
import { useEmployeeEligibilityProfile } from '../hooks/useEmployeeEligibilityProfile'
import translations from '../_i18n'
import {
  filterMostSpecific,
  getOverlappingConditions,
  haveOverlappingEligibility,
  isMoreSpecificThan,
  matchesEligibilityProfile,
  policyHasSharedCategory,
  type EligibilityLabel
} from '../utils/absenceEligibilityConflict'
import {
  getAbsenceEntitlementEditorState,
  type AbsenceEntitlementObjectValue,
  type AbsenceEntitlementDetailEntry
} from '../utils/absenceEntitlementObjectValue'
import {
  getAbsencePolicyEditorState,
  type AbsencePolicyObjectValue,
  type AbsencePolicyEditorDetail
} from '../utils/absencePolicyObjectValue'

interface AbsenceEligibilityCheckerProps {
  entitlementEntries: CatalogEntry[]
  policyEntries: CatalogEntry[]
  countries: EligibilityOption[]
  contractTypes: EligibilityOption[]
  employmentTypes: EligibilityOption[]
  accessToken: string
  absenceTypes?: Array<{ code: string; value?: string }>
}

interface ProfileFilter {
  companyId: string
  standard: boolean
  countryId: string
  contractTypeId: string
  employmentTypeId: string
}

const defaultProfile: ProfileFilter = {
  companyId: '',
  standard: false,
  countryId: '',
  contractTypeId: '',
  employmentTypeId: ''
}

const isProfileActive = (profile: ProfileFilter): boolean =>
  Boolean(profile.companyId) ||
  profile.standard ||
  Boolean(profile.countryId) ||
  Boolean(profile.contractTypeId) ||
  Boolean(profile.employmentTypeId)

export const AbsenceEligibilityChecker: React.FC<AbsenceEligibilityCheckerProps> = ({
  entitlementEntries,
  policyEntries,
  countries,
  contractTypes,
  employmentTypes,
  accessToken,
  absenceTypes = []
}) => {
  const { t } = useTranslation(translations)
  const [profile, setProfile] = useState<ProfileFilter>(defaultProfile)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [expandedConflicts, setExpandedConflicts] = useState<Set<string>>(new Set())

  const toggleConflict = (key: string) => {
    setExpandedConflicts(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const resolveAbsenceTypeName = (ref: string): string => {
    const code = ref.split(':').pop() || ref
    const match = absenceTypes.find(t => t.code === code)
    return match ? match.value || match.code : code
  }

  const {
    companies,
    isLoading: isLoadingCompanies,
    search: searchCompanies,
    loadMore: loadMoreCompanies
  } = useCompanySelection({ accessToken })

  const {
    options: employeeOptions,
    isLoading: isLoadingEmployees,
    searchEmployees
  } = useEmployeeEligibilityProfile(accessToken)

  useEffect(() => {
    searchEmployees()
  }, [searchEmployees])

  const updateProfile = <K extends keyof ProfileFilter>(field: K, value: ProfileFilter[K]) => {
    setProfile(current => ({ ...current, [field]: value }))
  }

  const handleEmployeeSelect = (employeeId: string) => {
    setSelectedEmployeeId(employeeId)
    if (!employeeId) return
    const selected = employeeOptions.find(opt => opt.value === employeeId)
    if (!selected) return
    setProfile(current => ({
      ...current,
      companyId: selected.profile.companyId || current.companyId,
      standard: false,
      contractTypeId: selected.profile.contractTypeId || current.contractTypeId,
      employmentTypeId: selected.profile.employmentTypeId || current.employmentTypeId
    }))
  }

  const eligibilityLabels = useMemo(
    () => ({
      companies: companies.map((c): EligibilityLabel => ({ id: c.id, label: c.name })),
      countries: countries.map((c): EligibilityLabel => ({ id: c.id, label: c.label })),
      contractTypes: contractTypes.map((c): EligibilityLabel => ({ id: c.id, label: c.label })),
      employmentTypes: employmentTypes.map((e): EligibilityLabel => ({ id: e.id, label: e.label })),
      allLabel: t('eligibility-all-hint'),
      standardLabel: t('field-standard-label')
    }),
    [companies, countries, contractTypes, employmentTypes, t]
  )

  const countryOptions = useMemo(() => countries.map(c => ({ value: c.id, label: c.label })), [countries])

  const contractTypeOptions = useMemo(() => contractTypes.map(c => ({ value: c.id, label: c.label })), [contractTypes])

  const employmentTypeOptions = useMemo(
    () => employmentTypes.map(e => ({ value: e.id, label: e.label })),
    [employmentTypes]
  )

  const profileForMatching = useMemo(
    () => ({
      company_id: profile.companyId,
      standard: profile.standard,
      allowed_countries: profile.countryId ? [profile.countryId] : [],
      allowed_contract_types: profile.contractTypeId ? [profile.contractTypeId] : [],
      allowed_employment_types: profile.employmentTypeId ? [profile.employmentTypeId] : []
    }),
    [profile]
  )

  const active = isProfileActive(profile)

  const matchingEntitlements = useMemo(() => {
    if (!active) return entitlementEntries
    const matched = entitlementEntries.filter(entry => {
      const state = getAbsenceEntitlementEditorState(entry.objectValue as AbsenceEntitlementObjectValue)
      return matchesEligibilityProfile(state.settings, profileForMatching)
    })
    return filterMostSpecific(
      matched,
      entry => getAbsenceEntitlementEditorState(entry.objectValue as AbsenceEntitlementObjectValue).settings
    )
  }, [entitlementEntries, profileForMatching, active])

  const matchingPolicies = useMemo(() => {
    if (!active) return policyEntries
    return policyEntries.filter(entry => {
      const state = getAbsencePolicyEditorState(entry.objectValue as AbsencePolicyObjectValue)
      return matchesEligibilityProfile(state.settings, profileForMatching)
    })
  }, [policyEntries, profileForMatching, active])

  const hasNoMatches = active && matchingEntitlements.length === 0 && matchingPolicies.length === 0
  const hasEntitlementConflict = active && matchingEntitlements.length > 1

  const entitlementConflictPairs = useMemo(() => {
    const pairs: Array<{ a: CatalogEntry; b: CatalogEntry }> = []
    for (let i = 0; i < entitlementEntries.length; i++) {
      for (let j = i + 1; j < entitlementEntries.length; j++) {
        const stateA = getAbsenceEntitlementEditorState(
          entitlementEntries[i].objectValue as AbsenceEntitlementObjectValue
        )
        const stateB = getAbsenceEntitlementEditorState(
          entitlementEntries[j].objectValue as AbsenceEntitlementObjectValue
        )
        if (
          haveOverlappingEligibility(stateA.settings, stateB.settings) &&
          !isMoreSpecificThan(stateA.settings, stateB.settings) &&
          !isMoreSpecificThan(stateB.settings, stateA.settings)
        ) {
          pairs.push({ a: entitlementEntries[i], b: entitlementEntries[j] })
        }
      }
    }
    return pairs
  }, [entitlementEntries])

  const policyConflictPairs = useMemo(() => {
    const pairs: Array<{ a: CatalogEntry; b: CatalogEntry }> = []
    for (let i = 0; i < policyEntries.length; i++) {
      for (let j = i + 1; j < policyEntries.length; j++) {
        const stateA = getAbsencePolicyEditorState(policyEntries[i].objectValue as AbsencePolicyObjectValue)
        const stateB = getAbsencePolicyEditorState(policyEntries[j].objectValue as AbsencePolicyObjectValue)
        const categoriesA = stateA.details.map(d => d.settings.policy_rule_category).filter(Boolean)
        const categoriesB = stateB.details.map(d => d.settings.policy_rule_category).filter(Boolean)
        if (
          haveOverlappingEligibility(stateA.settings, stateB.settings) &&
          !isMoreSpecificThan(stateA.settings, stateB.settings) &&
          !isMoreSpecificThan(stateB.settings, stateA.settings) &&
          policyHasSharedCategory(categoriesA, categoriesB)
        ) {
          pairs.push({ a: policyEntries[i], b: policyEntries[j] })
        }
      }
    }
    return pairs
  }, [policyEntries])

  const hasAnyConflicts = entitlementConflictPairs.length > 0 || policyConflictPairs.length > 0

  return (
    <div className="gba:flex gba:h-full gba:gap-6" data-testid="absence-eligibility-checker">
      <div className="gba:w-72 gba:shrink-0">
        <Card className="gba:border gba:border-border gba:bg-muted/10 gba:sticky gba:top-0">
          <CardHeader className="gba:border-b gba:border-border gba:bg-background">
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <MagnifyingGlassIcon className="gba:h-4 gba:w-4" />
              {t('eligibility-checker-profile-title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="gba:space-y-4 gba:p-4">
            <p className="gba:text-xs gba:text-muted-foreground">{t('eligibility-checker-description')}</p>

            <div className="gba:space-y-2">
              <Label className="gba:flex gba:items-center gba:gap-1.5">
                <UserIcon className="gba:h-3.5 gba:w-3.5" />
                {t('eligibility-checker-employee-label')}
              </Label>
              <Combobox
                value={selectedEmployeeId}
                onValueChange={handleEmployeeSelect}
                options={employeeOptions}
                placeholder={t('eligibility-checker-employee-placeholder')}
                searchPlaceholder={t('eligibility-checker-employee-placeholder')}
                emptyText={t('eligibility-no-options')}
                isLoading={isLoadingEmployees}
                onSearch={searchEmployees}
                data-testid="eligibility-checker-employee"
              />
              <p className="gba:text-xs gba:text-muted-foreground">{t('eligibility-checker-employee-hint')}</p>
            </div>

            <Separator />

            <div className="gba:space-y-2">
              <Label>{t('field-company-label')}</Label>
              <Combobox
                value={profile.companyId}
                onValueChange={value => {
                  updateProfile('companyId', String(value || ''))
                  if (value) updateProfile('standard', false)
                }}
                options={companies}
                placeholder={t('field-company-label')}
                searchPlaceholder={t('field-company-label')}
                emptyText={t('empty-catalog-entries', { entity: t('field-company-label') })}
                isLoading={isLoadingCompanies}
                onSearch={searchCompanies}
                onLoadMore={loadMoreCompanies}
                disabled={profile.standard}
                data-testid="eligibility-checker-company"
              />
            </div>

            <div className="gba:flex gba:items-center gba:gap-2">
              <Checkbox
                id="eligibility-checker-standard"
                checked={profile.standard}
                onCheckedChange={checked => {
                  updateProfile('standard', Boolean(checked))
                  if (checked) updateProfile('companyId', '')
                }}
                data-testid="eligibility-checker-standard"
              />
              <Label htmlFor="eligibility-checker-standard">{t('field-standard-label')}</Label>
            </div>

            <div className="gba:space-y-2">
              <Label>{t('details-label-country')}</Label>
              <Combobox
                value={profile.countryId}
                onValueChange={value => updateProfile('countryId', String(value || ''))}
                options={countryOptions}
                placeholder={t('details-label-country')}
                searchPlaceholder={t('eligibility-search-countries')}
                emptyText={t('eligibility-no-options')}
                data-testid="eligibility-checker-country"
              />
            </div>

            <div className="gba:space-y-2">
              <Label>{t('eligibility-contract-types-label')}</Label>
              <Combobox
                value={profile.contractTypeId}
                onValueChange={value => updateProfile('contractTypeId', String(value || ''))}
                options={contractTypeOptions}
                placeholder={t('eligibility-contract-types-label')}
                searchPlaceholder={t('eligibility-search-contract-types')}
                emptyText={t('eligibility-no-options')}
                data-testid="eligibility-checker-contract-type"
              />
            </div>

            <div className="gba:space-y-2">
              <Label>{t('eligibility-employment-types-label')}</Label>
              <Combobox
                value={profile.employmentTypeId}
                onValueChange={value => updateProfile('employmentTypeId', String(value || ''))}
                options={employmentTypeOptions}
                placeholder={t('eligibility-employment-types-label')}
                searchPlaceholder={t('eligibility-search-employment-types')}
                emptyText={t('eligibility-no-options')}
                data-testid="eligibility-checker-employment-type"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="gba:min-w-0 gba:flex-1">
        <ScrollArea className="gba:h-full">
          <div className="gba:space-y-4">
            {hasNoMatches && (
              <div
                className="gba:flex gba:items-start gba:gap-3 gba:rounded-lg gba:border gba:border-destructive/40 gba:bg-destructive/5 gba:p-4"
                data-testid="eligibility-checker-no-match"
              >
                <WarningCircleIcon className="gba:mt-0.5 gba:h-5 gba:w-5 gba:shrink-0 gba:text-destructive" />
                <p className="gba:text-sm gba:text-destructive">{t('eligibility-checker-no-match')}</p>
              </div>
            )}

            <Card
              className="gba:border gba:border-border gba:bg-muted/10"
              data-testid="eligibility-checker-conflicts-card"
            >
              <CardHeader className="gba:border-b gba:border-border gba:bg-background">
                <CardTitle className="gba:flex gba:items-center gba:gap-2">
                  <WarningCircleIcon
                    className={
                      hasAnyConflicts
                        ? 'gba:h-4 gba:w-4 gba:text-destructive'
                        : 'gba:h-4 gba:w-4 gba:text-muted-foreground'
                    }
                  />
                  {t('eligibility-checker-conflicts-title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="gba:p-4">
                {hasAnyConflicts ? (
                  <div className="gba:space-y-4">
                    <p className="gba:text-sm gba:text-muted-foreground">
                      {t('eligibility-checker-conflicts-description')}
                    </p>
                    {entitlementConflictPairs.length > 0 && (
                      <div className="gba:space-y-2">
                        <p className="gba:text-xs gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground">
                          {t('eligibility-checker-conflict-entitlements')}
                        </p>
                        <div className="gba:space-y-2">
                          {entitlementConflictPairs.map(({ a, b }) => {
                            const key = `ent-${a.id}-${b.id}`
                            const stateA = getAbsenceEntitlementEditorState(
                              a.objectValue as AbsenceEntitlementObjectValue
                            )
                            const stateB = getAbsenceEntitlementEditorState(
                              b.objectValue as AbsenceEntitlementObjectValue
                            )
                            return (
                              <ConflictPairAccordion
                                key={key}
                                pairKey={key}
                                entryA={a}
                                entryB={b}
                                isExpanded={expandedConflicts.has(key)}
                                overlapDims={getOverlappingConditions(stateA.settings, stateB.settings, eligibilityLabels)}
                                onToggle={toggleConflict}
                                t={t}
                              >
                                <EntitlementCompareColumn
                                  entry={a}
                                  state={stateA}
                                  resolveTypeName={resolveAbsenceTypeName}
                                  t={t}
                                />
                                <EntitlementCompareColumn
                                  entry={b}
                                  state={stateB}
                                  resolveTypeName={resolveAbsenceTypeName}
                                  t={t}
                                  compareWith={stateA}
                                />
                              </ConflictPairAccordion>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    {policyConflictPairs.length > 0 && (
                      <div className="gba:space-y-2">
                        <p className="gba:text-xs gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground">
                          {t('eligibility-checker-conflict-policies')}
                        </p>
                        <div className="gba:space-y-2">
                          {policyConflictPairs.map(({ a, b }) => {
                            const key = `pol-${a.id}-${b.id}`
                            const stateA = getAbsencePolicyEditorState(a.objectValue as AbsencePolicyObjectValue)
                            const stateB = getAbsencePolicyEditorState(b.objectValue as AbsencePolicyObjectValue)
                            return (
                              <ConflictPairAccordion
                                key={key}
                                pairKey={key}
                                entryA={a}
                                entryB={b}
                                isExpanded={expandedConflicts.has(key)}
                                overlapDims={getOverlappingConditions(stateA.settings, stateB.settings, eligibilityLabels)}
                                onToggle={toggleConflict}
                                t={t}
                              >
                                <PolicyCompareColumn
                                  entry={a}
                                  state={stateA}
                                  resolveTypeName={resolveAbsenceTypeName}
                                  t={t}
                                />
                                <PolicyCompareColumn
                                  entry={b}
                                  state={stateB}
                                  resolveTypeName={resolveAbsenceTypeName}
                                  t={t}
                                  compareWith={stateA}
                                />
                              </ConflictPairAccordion>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="gba:text-sm gba:text-muted-foreground">{t('eligibility-checker-no-conflicts')}</p>
                )}
              </CardContent>
            </Card>

            <Card
              className="gba:border gba:border-border gba:bg-muted/10"
              data-testid="eligibility-checker-entitlements-card"
            >
              <CardHeader className="gba:border-b gba:border-border gba:bg-background">
                <CardTitle className="gba:flex gba:items-center gba:justify-between">
                  <span>{t('eligibility-checker-entitlements-title')}</span>
                  {active && (
                    <Badge variant={hasEntitlementConflict ? 'destructive' : 'secondary'}>
                      {t('eligibility-checker-matches-count', { count: String(matchingEntitlements.length) })}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              {hasEntitlementConflict && (
                <div className="gba:flex gba:items-center gba:gap-2 gba:border-b gba:border-destructive/30 gba:bg-destructive/5 gba:px-4 gba:py-2">
                  <WarningCircleIcon className="gba:h-4 gba:w-4 gba:shrink-0 gba:text-destructive" />
                  <p className="gba:text-xs gba:text-destructive">
                    {t('eligibility-checker-multiple-match-warning', { count: String(matchingEntitlements.length) })}
                  </p>
                </div>
              )}
              <CardContent className="gba:p-0">
                {matchingEntitlements.length === 0 ? (
                  <div className="gba:p-6 gba:text-sm gba:text-muted-foreground">
                    {t('empty-catalog-entries', { entity: t('eligibility-checker-entitlements-title') })}
                  </div>
                ) : (
                  <ul className="gba:divide-y gba:divide-border">
                    {matchingEntitlements.map(entry => (
                      <EligibilityResultItem key={entry.id} entry={entry} isConflict={hasEntitlementConflict} />
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card
              className="gba:border gba:border-border gba:bg-muted/10"
              data-testid="eligibility-checker-policies-card"
            >
              <CardHeader className="gba:border-b gba:border-border gba:bg-background">
                <CardTitle className="gba:flex gba:items-center gba:justify-between">
                  <span>{t('eligibility-checker-policies-title')}</span>
                  {active && (
                    <Badge variant="secondary">
                      {t('eligibility-checker-matches-count', { count: String(matchingPolicies.length) })}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="gba:p-0">
                {matchingPolicies.length === 0 ? (
                  <div className="gba:p-6 gba:text-sm gba:text-muted-foreground">
                    {t('empty-catalog-entries', { entity: t('eligibility-checker-policies-title') })}
                  </div>
                ) : (
                  <ul className="gba:divide-y gba:divide-border">
                    {matchingPolicies.map(entry => (
                      <EligibilityResultItem key={entry.id} entry={entry} />
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

interface ConflictPairAccordionProps {
  pairKey: string
  entryA: CatalogEntry
  entryB: CatalogEntry
  isExpanded: boolean
  overlapDims: Array<{ label: string; value: string }>
  onToggle: (key: string) => void
  t: (key: string, values?: Record<string, string>) => string
  children: React.ReactNode
}

const ConflictPairAccordion: React.FC<ConflictPairAccordionProps> = ({
  pairKey,
  entryA,
  entryB,
  isExpanded,
  overlapDims,
  onToggle,
  t,
  children
}) => (
  <div className="gba:rounded-md gba:border gba:border-destructive/30 gba:overflow-hidden">
    <button
      type="button"
      onClick={() => onToggle(pairKey)}
      className="gba:flex gba:w-full gba:items-center gba:justify-between gba:bg-destructive/5 gba:px-3 gba:py-2 gba:text-left gba:text-sm gba:text-destructive"
    >
      <span className="gba:flex gba:min-w-0 gba:flex-col gba:gap-1">
        <span className="gba:flex gba:items-center gba:gap-2">
          <WarningCircleIcon className="gba:h-4 gba:w-4 gba:shrink-0" />
          {t('eligibility-checker-conflict-pair', {
            a: entryA.value || entryA.code,
            b: entryB.value || entryB.code
          })}
        </span>
        {overlapDims.length > 0 && (
          <span className="gba:flex gba:flex-wrap gba:gap-x-3 gba:gap-y-0.5 gba:pl-6 gba:text-xs gba:text-destructive/70">
            {overlapDims.map(dim => (
              <span key={dim.label}>
                <span className="gba:font-medium">{dim.label}:</span> {dim.value}
              </span>
            ))}
          </span>
        )}
      </span>
      <span className="gba:ml-2 gba:shrink-0 gba:text-xs gba:text-muted-foreground">{isExpanded ? '▲' : '▼'}</span>
    </button>
    {isExpanded && (
      <div className="gba:grid gba:grid-cols-2 gba:divide-x gba:divide-border gba:border-t gba:border-border gba:bg-background">
        {children}
      </div>
    )}
  </div>
)

interface EligibilityResultItemProps {
  entry: CatalogEntry
  isConflict?: boolean
}

const EligibilityResultItem: React.FC<EligibilityResultItemProps> = ({ entry, isConflict }) => (
  <li className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-3">
    <div className="gba:flex gba:min-w-0 gba:items-center gba:gap-2">
      {isConflict && <WarningCircleIcon className="gba:h-4 gba:w-4 gba:shrink-0 gba:text-destructive" />}
      <div className="gba:min-w-0">
        <p className="gba:truncate gba:text-sm gba:font-medium">{entry.value || entry.code}</p>
        <p className="gba:truncate gba:text-xs gba:text-muted-foreground">{entry.code}</p>
      </div>
    </div>
    <Badge variant={isConflict ? 'destructive' : 'outline'} className="gba:ml-3 gba:shrink-0">
      {entry.code}
    </Badge>
  </li>
)

type EntitlementState = ReturnType<typeof getAbsenceEntitlementEditorState>
type PolicyState = ReturnType<typeof getAbsencePolicyEditorState>

interface EntitlementCompareColumnProps {
  entry: CatalogEntry
  state: EntitlementState
  resolveTypeName: (ref: string) => string
  t: (key: string, values?: Record<string, string>) => string
  compareWith?: EntitlementState
}

const CompareRow: React.FC<{
  label: string
  valueA: string
  valueB?: string
  highlight?: boolean
}> = ({ label, valueA, valueB }) => {
  const isDifferent = valueB !== undefined && valueA !== valueB
  return (
    <div className={`gba:px-3 gba:py-1.5 ${isDifferent ? 'gba:bg-amber-50' : ''}`}>
      <p className="gba:text-xs gba:text-muted-foreground">{label}</p>
      <p className={`gba:text-sm gba:font-medium ${isDifferent ? 'gba:text-amber-700' : ''}`}>{valueA}</p>
    </div>
  )
}

const EntitlementCompareColumn: React.FC<EntitlementCompareColumnProps> = ({
  entry,
  state,
  resolveTypeName,
  t,
  compareWith
}) => (
  <div className="gba:space-y-0 gba:divide-y gba:divide-border">
    <div className="gba:bg-muted/30 gba:px-3 gba:py-2">
      <p className="gba:text-xs gba:font-semibold gba:truncate">{entry.value || entry.code}</p>
      <p className="gba:text-xs gba:text-muted-foreground">{entry.code}</p>
    </div>
    <CompareRow
      label={t('eligibility-checker-compare-field-type')}
      valueA={state.settings.entitlement_type || '—'}
      valueB={compareWith?.settings.entitlement_type}
    />
    <CompareRow
      label={t('eligibility-checker-compare-field-year-type')}
      valueA={state.settings.year_type || '—'}
      valueB={compareWith?.settings.year_type}
    />
    {state.detailEntries.length === 0 ? (
      <div className="gba:px-3 gba:py-2 gba:text-xs gba:text-muted-foreground">
        {t('eligibility-checker-compare-no-details')}
      </div>
    ) : (
      state.detailEntries.map((detail: AbsenceEntitlementDetailEntry) => {
        const typeName = detail.settings.absence_type_ref ? resolveTypeName(detail.settings.absence_type_ref) : '—'
        const compareDetail = compareWith?.detailEntries.find(
          d => d.settings.absence_type_ref === detail.settings.absence_type_ref
        )
        return (
          <CompareRow
            key={detail.id}
            label={typeName}
            valueA={`${detail.settings.entitlement_amount} days`}
            valueB={compareDetail ? `${compareDetail.settings.entitlement_amount} days` : undefined}
          />
        )
      })
    )}
  </div>
)

interface PolicyCompareColumnProps {
  entry: CatalogEntry
  state: PolicyState
  resolveTypeName: (ref: string) => string
  t: (key: string, values?: Record<string, string>) => string
  compareWith?: PolicyState
}

const PolicyCompareColumn: React.FC<PolicyCompareColumnProps> = ({ entry, state, resolveTypeName, compareWith }) => (
  <div className="gba:space-y-0 gba:divide-y gba:divide-border">
    <div className="gba:bg-muted/30 gba:px-3 gba:py-2">
      <p className="gba:text-xs gba:font-semibold gba:truncate">{entry.value || entry.code}</p>
      <p className="gba:text-xs gba:text-muted-foreground">{entry.code}</p>
    </div>
    {state.details.length === 0 ? (
      <div className="gba:px-3 gba:py-2 gba:text-xs gba:text-muted-foreground">—</div>
    ) : (
      state.details.map((detail: AbsencePolicyEditorDetail) => {
        const typeName = detail.settings.absence_type_ref
          ? resolveTypeName(detail.settings.absence_type_ref)
          : detail.settings.policy_rule_type
        const summary = `${detail.settings.policy_rule_category}: ${detail.settings.allowed_amount} ${detail.settings.allowed_amount_time_unit}`
        const compareDetail = compareWith?.details.find(
          d =>
            d.settings.absence_type_ref === detail.settings.absence_type_ref &&
            d.settings.policy_rule_category === detail.settings.policy_rule_category
        )
        const compareSummary = compareDetail
          ? `${compareDetail.settings.policy_rule_category}: ${compareDetail.settings.allowed_amount} ${compareDetail.settings.allowed_amount_time_unit}`
          : undefined
        return <CompareRow key={detail.id} label={typeName} valueA={summary} valueB={compareSummary} />
      })
    )}
  </div>
)
