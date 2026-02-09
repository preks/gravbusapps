import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useFormContext, useFieldArray } from 'react-hook-form'
import { FormField, FormItem, FormControl, FormMessage, Combobox, Button, FileUpload } from '@newwork/nw-design-system'
import { SkillLevelRow } from '@/business-apps/hr/core/forms/add-skill/components/SkillLevelRow'
import { DebouncedInput } from '@/components/debounced-input'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { SEARCH_SKILLS_QUERY, GET_SKILLS_BY_NAMES } from '@/business-apps/hr/core/forms/add-skill/AddSkillQueries'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'

interface SkillsSectionProps {
  dataTestId: string
  accessToken?: string
}

const getSkillValidationError = (name: string): string | null => {
  const trimmed = (name || '').trim()
  if (!trimmed) return 'The skill must have at least one letter'
  if (!/[A-Za-z]/.test(trimmed)) return 'The skill must have at least one letter'
  if (trimmed.length > 64) return 'The skill must have 64 characters or less'
  return null
}

const SkillsSection: React.FC<SkillsSectionProps> = ({ dataTestId, accessToken }) => {
  const levelOptions = [
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
    { value: '4', label: '4' },
    { value: '5', label: '5' }
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

  // Get currently selected skill IDs to filter them out
  const selectedSkillIds = useMemo(() => {
    return new Set(fields.map((_, index) => form.watch(`skills.${index}.skillId`)).filter(Boolean))
  }, [fields, form])

  // Filter search results to exclude already selected skills
  const filteredResults = useMemo(() => {
    return (searchResults || []).filter(skill => !selectedSkillIds.has(skill.id))
  }, [searchResults, selectedSkillIds])

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
      if (!term) {
        if (isActive) setSearchResults([])
        if (isActive) setIsDropdownOpen(false)
        return
      }
      setIsSearching(true)
      const mySeq = ++searchSeqRef.current
      try {
        // Search skills from GraphQL API
        const pattern = `%${term}%`
        const result = await graphqlClient.request<{ skill: Array<{ id: string; name: string; version: number }> }>(
          SEARCH_SKILLS_QUERY,
          { search: pattern, limit: 50 }
        )

        if (!isActive || mySeq !== searchSeqRef.current) return
        setSearchResults(result?.skill || [])
        setIsDropdownOpen(true)
      } catch (error) {
        console.error('Error searching skills:', error)
        if (isActive && mySeq === searchSeqRef.current) {
          setSearchResults([])
          setIsDropdownOpen(false)
        }
      } finally {
        if (isActive && mySeq === searchSeqRef.current) setIsSearching(false)
      }
    }
    run()
    return () => {
      isActive = false
    }
  }, [searchTerm, graphqlClient])

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
        { changeMode: 'INSERT', skill: { name: name } },
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
        <label className="gba:text-sm gba:font-medium gba:text-foreground">Skills</label>
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
        <label className="gba:text-sm gba:font-medium gba:text-foreground">Job Description (Optional)</label>
        <FormField
          name="jobDescriptionFile"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <FileUpload
                  multiple={false}
                  maxFiles={1}
                  accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  layout="list"
                  preview="icon"
                  onChange={(files: any[]) => {
                    if (files && files.length > 0) {
                      const fileObj = files[0]
                      // Store the file object with the actual File instance
                      const uploadFile = {
                        uid: fileObj.id || fileObj.uid || Date.now().toString(),
                        name: fileObj.file?.name || fileObj.name || 'file',
                        status: 'done' as const,
                        originFileObj: fileObj.file instanceof File ? fileObj.file : fileObj.originFileObj || null,
                        file: fileObj.file instanceof File ? fileObj.file : fileObj.originFileObj || null
                      }
                      field.onChange(uploadFile)
                    } else {
                      field.onChange(null)
                    }
                  }}
                  data-testid={`${dataTestId}-job-description-upload`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}

export default SkillsSection
