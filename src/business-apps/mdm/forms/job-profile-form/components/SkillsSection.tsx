import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useFormContext, useFieldArray } from 'react-hook-form'
import {
  FormField,
  FormItem,
  FormControl,
  FormMessage,
  Combobox,
  Button,
  FileUpload,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { SkillLevelRow } from '@/business-apps/hr/core/forms/add-skill/components/SkillLevelRow'
import { DebouncedInput } from '@/components/debounced-input'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { SEARCH_SKILLS_QUERY, GET_SKILLS_BY_NAMES } from '@/business-apps/hr/core/forms/add-skill/AddSkillQueries'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { hybridSearchSkills } from '@/common/network/flowbot/hybridSearchSkills'
import { env } from '@/common/env/EnvUtils'
import translations from '../_i18n'

interface SkillsSectionProps {
  dataTestId: string
  accessToken?: string
  isLoadingJobDescriptionFile?: boolean
  initialJobDescriptionFile?: {
    id: string
    fileId: string
    name: string
    type: string
    path: string
    size: number
    url: string
  } | null
}

const getSkillValidationError = (name: string): string | null => {
  const trimmed = (name || '').trim()
  if (!trimmed) return 'The skill must have at least one letter'
  if (!/[A-Za-z]/.test(trimmed)) return 'The skill must have at least one letter'
  if (trimmed.length > 64) return 'The skill must have 64 characters or less'
  return null
}

const SkillsSection: React.FC<SkillsSectionProps> = ({
  dataTestId,
  accessToken,
  isLoadingJobDescriptionFile = false,
  initialJobDescriptionFile
}) => {
  const { t } = useTranslation(translations)
  const levelOptions = [
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
    { value: '4', label: '4' },
    { value: '5', label: '5' },
    { value: '6', label: '6' },
    { value: '7', label: '7' },
    { value: '8', label: '8' },
    { value: '9', label: '9' },
    { value: '10', label: '10' }
  ]
  const form = useFormContext()
  const graphqlClient = useGraphQLClient(accessToken)
  const restClient = useRestClient(env('NEXT_PUBLIC_BASE_URL'))
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'skills'
  })

  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string }>>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [inputKey, setInputKey] = useState(0)
  const suppressOpenRef = useRef(false)
  const searchSeqRef = useRef(0)
  const hydratedInitialFileIdRef = useRef<string | null>(null)

  // Get currently selected skill IDs to filter them out
  const selectedSkillIds = useMemo(() => {
    return new Set(fields.map((_, index) => form.watch(`skills.${index}.skillId`)).filter(Boolean))
  }, [fields, form])

  // Filter search results to exclude already selected skills
  const filteredResults = useMemo(() => {
    return (searchResults || []).filter(skill => !selectedSkillIds.has(skill.id))
  }, [searchResults, selectedSkillIds])

  const loadSearchResults = useCallback(
    async (term: string): Promise<Array<{ id: string; name: string }>> => {
      try {
        const matches = await hybridSearchSkills(term, accessToken ?? '', 20)
        return matches.map(m => ({ id: m.id, name: m.name }))
      } catch {
        try {
          const pattern = `%${term}%`
          const result = await graphqlClient.request<{ skill: Array<{ id: string; name: string; version: number }> }>(
            SEARCH_SKILLS_QUERY,
            { search: pattern, limit: 50 }
          )
          return result?.skill ?? []
        } catch (error) {
          console.error('Error searching skills:', error)
          return []
        }
      }
    },
    [accessToken, graphqlClient]
  )

  // Search skills when search term changes
  useEffect(() => {
    let isActive = true
    const run = async () => {
      if (suppressOpenRef.current) {
        suppressOpenRef.current = false
        if (isActive) {
          setIsDropdownOpen(false)
          setSearchResults([])
        }
        return
      }
      const term = searchTerm.trim()
      if (!term || term.length < 2) {
        if (isActive) setSearchResults([])
        if (isActive) setIsDropdownOpen(false)
        return
      }
      setIsSearching(true)
      const mySeq = ++searchSeqRef.current
      try {
        const matches = await loadSearchResults(term)
        if (!isActive || mySeq !== searchSeqRef.current) return
        setSearchResults(matches)
        setIsDropdownOpen(true)
      } finally {
        if (isActive && mySeq === searchSeqRef.current) setIsSearching(false)
      }
    }
    run()
    return () => {
      isActive = false
    }
  }, [searchTerm, loadSearchResults])

  useEffect(() => {
    if (!initialJobDescriptionFile) {
      hydratedInitialFileIdRef.current = null
      return
    }

    const currentValue = form.getValues('jobDescriptionFile')
    const hasAnyCurrentFile = Boolean(
      currentValue?.originFileObj instanceof File ||
        currentValue?.file instanceof File ||
        currentValue?.fileId ||
        currentValue?.uid
    )

    if (hasAnyCurrentFile) {
      hydratedInitialFileIdRef.current = initialJobDescriptionFile.fileId
      return
    }

    if (hydratedInitialFileIdRef.current === initialJobDescriptionFile.fileId) {
      return
    }

    form.setValue(
      'jobDescriptionFile',
      {
        fileId: initialJobDescriptionFile.fileId,
        name: initialJobDescriptionFile.name,
        mimeType: initialJobDescriptionFile.type,
        path: initialJobDescriptionFile.path
      },
      { shouldDirty: false }
    )
    hydratedInitialFileIdRef.current = initialJobDescriptionFile.fileId
  }, [form, initialJobDescriptionFile])

  const handleSelectSkill = (skill: { id: string; name: string }) => {
    append({
      skillId: skill.id,
      skillName: skill.name,
      level: null
    })
    suppressOpenRef.current = true
    searchSeqRef.current += 1
    setIsDropdownOpen(false)
    setSearchTerm('')
    setSearchResults([])
    setIsSearching(false)
    setInputKey(prev => prev + 1)
  }

  const handleAddNewSkill = async () => {
    const name = searchTerm.trim()
    if (!name) return

    const validationError = getSkillValidationError(name)
    if (validationError) {
      setAddError(validationError)
      return
    }

    setAddError(null)
    setIsSearching(true)

    try {
      // Check if skill with this exact name already exists in the database
      const pattern = `%${name}%`
      const result = await graphqlClient.request<{ skill: Array<{ id: string; name: string; version: number }> }>(
        SEARCH_SKILLS_QUERY,
        { search: pattern, limit: 10 }
      )

      const existingSkill = result?.skill?.find(s => s.name.toLowerCase() === name.toLowerCase())
      if (existingSkill) {
        handleSelectSkill(existingSkill)
        return
      }

      // Save new skill to backend
      await restClient.post(
        '/processes/employee/saveSkill',
        { skill: { name: name } },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      // Fetch the newly created skill to get its ID
      const fetchResult = await graphqlClient.request<{ skill: Array<{ id: string; name: string; version: number }> }>(
        GET_SKILLS_BY_NAMES,
        { names: [name] }
      )

      const newSkill = fetchResult?.skill?.[0]
      if (newSkill) {
        handleSelectSkill(newSkill)
      } else {
        setAddError('Failed to create skill. Please try again.')
      }
    } catch (error) {
      console.error('Error creating skill:', error)
      setAddError('Failed to create skill. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleRemoveSkill = (index: number) => {
    remove(index)
  }

  const showNoResults = !isSearching && filteredResults.length === 0 && searchTerm.trim().length > 0

  return (
    <div className="gba:space-y-4">
      <div className="gba:flex gba:items-center gba:justify-between">
        <label className="gba:text-sm gba:font-medium gba:text-foreground">Required Skills and Levels</label>
      </div>

      {/* Search Input */}
      <div className="gba:space-y-2 gba:w-full" data-testid={`${dataTestId}-search-container`}>
        <DebouncedInput
          key={inputKey}
          value={searchTerm}
          onChange={setSearchTerm}
          debounceDelay={300}
          placeholder="Search skill..."
          data-testid={`${dataTestId}-search-input`}
          className="gba:w-full"
        />

        {/* Results Dropdown */}
        {isDropdownOpen && (isSearching || filteredResults.length > 0 || showNoResults) && (
          <div
            className="gba:w-full gba:bg-card gba:text-card-foreground gba:border gba:rounded-lg"
            data-testid={`${dataTestId}-search-dropdown`}
          >
            <div
              className={`gba:p-2 gba:space-y-1 gba:w-full gba:max-h-[250px] gba:overflow-y-auto gba:!text-left gba:font-normal gba:[&>*]:gba:mb-1 ${
                showNoResults ? 'gba:px-3 gba:py-3' : ''
              }`}
            >
              {isSearching && (
                <div className="gba:text-muted-foreground" data-testid={`${dataTestId}-search-loading`}>
                  Loading...
                </div>
              )}

              {!isSearching &&
                filteredResults.slice(0, 5).map((skill, idx) => (
                  <Button
                    key={skill.id}
                    variant="ghost"
                    type="button"
                    className="gba:w-full gba:block gba:!justify-start gba:!text-left gba:!items-start gba:py-2 gba:!whitespace-normal gba:!h-auto gba:!min-h-10 gba:!leading-normal gba:font-normal"
                    onClick={() => handleSelectSkill(skill)}
                    data-testid={`${dataTestId}-search-option-${idx}`}
                  >
                    <span className="gba:block gba:w-full gba:break-words gba:!break-words gba:!whitespace-normal gba:!text-left gba:!leading-normal gba:font-normal">
                      {skill.name}
                    </span>
                  </Button>
                ))}

              {showNoResults && (
                <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
                  <div className="gba:text-muted-foreground" data-testid={`${dataTestId}-no-results-text`}>
                    No matching skill found for {searchTerm.trim()}.
                  </div>
                  <Button
                    size="sm"
                    type="button"
                    onClick={handleAddNewSkill}
                    data-testid={`${dataTestId}-add-new-button`}
                  >
                    Add Skill
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {addError && (
          <div className="gba:text-destructive gba:text-sm" data-testid={`${dataTestId}-add-error`}>
            {addError}
          </div>
        )}
      </div>

      {/* Selected Skills */}
      {fields.length === 0 ? (
        <div className="gba:text-sm gba:text-muted-foreground gba:py-2">
          No skills added. Search and select skills above.
        </div>
      ) : (
        <div className="gba:space-y-3">
          {fields.map((field, index) => {
            const skillName = form.watch(`skills.${index}.skillName`)

            return (
              <SkillLevelRow
                key={field.id}
                skillName={skillName || 'Unknown Skill'}
                onRemove={() => handleRemoveSkill(index)}
                dataTestIdPrefix={dataTestId}
                removeButtonTestId={`${dataTestId}-remove-skill-${index}`}
                index={index}
                levelContent={
                  <FormField
                    name={`skills.${index}.level`}
                    rules={{ required: 'Please select a level' }}
                    render={({ field: levelField }) => (
                      <FormItem className="gba:space-y-0">
                        <FormControl>
                          <Combobox
                            options={levelOptions}
                            value={levelField.value?.toString() || ''}
                            onValueChange={value => levelField.onChange(value ? parseInt(value) : null)}
                            placeholder="Level"
                            className="gba:!w-full"
                            data-testid={`${dataTestId}-skill-level-${index}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                }
              />
            )
          })}
        </div>
      )}

      {/* Job Description File Upload */}
      <div className="gba:space-y-2">
        <label className="gba:text-sm gba:font-medium gba:text-foreground">{t('job-description-label')}</label>
        {isLoadingJobDescriptionFile ? (
          <div className="gba:flex gba:items-center gba:justify-center gba:gap-2 gba:min-h-20 gba:px-4 gba:rounded-md gba:border gba:border-border gba:bg-muted/30">
            <Spinner size="sm" />
            <span className="gba:text-sm gba:text-muted-foreground">{t('job-description-loading-message')}</span>
          </div>
        ) : (
          <FormField
            name="jobDescriptionFile"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="gba:min-w-0 gba:[&_span]:gba:whitespace-normal gba:[&_span]:gba:break-all gba:[&_p]:gba:whitespace-normal gba:[&_p]:gba:break-all">
                    <FileUpload
                      key={
                        field.value?.fileId ||
                        field.value?.uid ||
                        initialJobDescriptionFile?.fileId ||
                        initialJobDescriptionFile?.id ||
                        'job-description-empty'
                      }
                      multiple={false}
                      maxFiles={1}
                      accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                      layout="list"
                      preview="icon"
                      initialFiles={
                        field.value || initialJobDescriptionFile
                          ? [
                              {
                                id:
                                  field.value?.fileId ||
                                  field.value?.uid ||
                                  initialJobDescriptionFile?.fileId ||
                                  initialJobDescriptionFile?.id ||
                                  'job-description',
                                name:
                                  field.value?.name ||
                                  field.value?.file?.name ||
                                  initialJobDescriptionFile?.name ||
                                  'file',
                                size:
                                  field.value?.file?.size || field.value?.size || initialJobDescriptionFile?.size || 0,
                                type:
                                  field.value?.mimeType ||
                                  field.value?.file?.type ||
                                  initialJobDescriptionFile?.type ||
                                  '',
                                url:
                                  field.value?.url ||
                                  field.value?.path ||
                                  initialJobDescriptionFile?.url ||
                                  initialJobDescriptionFile?.path ||
                                  ''
                              }
                            ]
                          : []
                      }
                      onChange={(files: any[]) => {
                        if (files && files.length > 0) {
                          const fileObj = files[0]
                          const uploadedFile =
                            fileObj?.file instanceof File
                              ? fileObj.file
                              : fileObj?.originFileObj instanceof File
                                ? fileObj.originFileObj
                                : null

                          if (uploadedFile) {
                            field.onChange({
                              uid: fileObj.id || fileObj.uid || Date.now().toString(),
                              name: uploadedFile.name,
                              status: 'done' as const,
                              originFileObj: uploadedFile,
                              file: uploadedFile
                            })
                            return
                          }

                          field.onChange({
                            fileId: fileObj.fileId || fileObj.id || null,
                            name: fileObj.name || 'file',
                            mimeType: fileObj.type || fileObj.mimeType || '',
                            path: fileObj.path || fileObj.url || '',
                            size: fileObj.size || 0,
                            url: fileObj.url || fileObj.path || ''
                          })
                        } else {
                          field.onChange(null)
                        }
                      }}
                      data-testid={`${dataTestId}-job-description-upload`}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>
    </div>
  )
}

export default SkillsSection
