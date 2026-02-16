import React from 'react'
import {
  Button,
  Combobox,
  FileUpload,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import type { UseFormReturn } from 'react-hook-form'
import { DebouncedInput } from '@/components/debounced-input'
import { AddSkillSearchDropdown } from './AddSkillSearchDropdown'
import { SkillLevelRow } from './SkillLevelRow'
import type { AddSkillFormValues, PendingSkill, SelectedSkill } from '../addSkill.types'

interface AddSkillFormSectionsProps {
  t: (key: string, args?: Record<string, unknown>) => string
  form: UseFormReturn<AddSkillFormValues>
  flowFormParams: any
  changeLevelParams: any
  employee: any
  activeSelectedSkills: SelectedSkill[]
  pendingSkills: PendingSkill[]
  searchTerm: string
  setSearchTerm: (value: string) => void
  inputKey: number
  isDropdownOpen: boolean
  isSearching: boolean
  filteredResults: any[]
  addError: string | null
  verificationFileList: any[]
  developmentDocumentTypes: any[]
  getCatalogValue: (entry: { translations?: { value?: string }[]; value?: string }) => string
  acceptedVerificationFileTypes: string
  dropdownRef: React.RefObject<HTMLDivElement>
  searchContainerRef: React.RefObject<HTMLDivElement>
  handleDesignSystemFilesChange: (files: Array<{ file: File | { name: string }; id: string }>) => void
  handleSearchBlur: (e: React.FocusEvent<HTMLInputElement>) => void
  handleSearchFocus: () => void
  handleSelectSkill: (skill: { id: string; name: string }) => void
  handleAddNewSkill: () => Promise<void>
  handleRemoveSkill: (id: string) => void
  handleRemovePendingSkill: (id: string) => void
  handleUpdatePendingSkillLevel: (id: string, level: number) => void
  handleUpdateExistingSkillLevel: (id: string, level: number) => void
  handleAddPendingSkillToEmployee: (skill: PendingSkill) => void
  setDocumentTypeIdLocal: (value: string | null) => void
}

const LevelSelect: React.FC<{ value: number; onChange: (value: number) => void; dataTestId: string }> = ({
  value,
  onChange,
  dataTestId
}) => (
  <Select
    value={value.toString()}
    onValueChange={nextValue => queueMicrotask(() => onChange(Number.parseInt(nextValue, 10)))}
    data-testid={dataTestId}
  >
    <SelectTrigger className="gba:w-20" size="sm">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {Array.from({ length: 10 }, (_, i) => i + 1).map(level => (
        <SelectItem key={level} value={level.toString()}>
          {level}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
)

function renderModeSection(
  mode: string | undefined,
  flowFormParams: any,
  t: (key: string, args?: Record<string, unknown>) => string
): React.ReactNode {
  if (mode === 'deactivate') {
    return (
      <p className="gba:text-muted-foreground gba:py-2" data-testid="add-skill-deactivate-message">
        {t('add-skill-form-deactivate-message-prefix')}{' '}
        <strong className="gba:font-bold gba:text-foreground">
          {flowFormParams.skillName || flowFormParams.skillId}
        </strong>{' '}
        {t('add-skill-form-deactivate-message-suffix')}
      </p>
    )
  }
  if (mode === 'activate') {
    return (
      <p className="gba:text-muted-foreground gba:py-2" data-testid="add-skill-activate-message">
        {t('add-skill-form-activate-message-prefix')}{' '}
        <strong className="gba:font-bold gba:text-foreground">
          {flowFormParams.skillName || flowFormParams.skillId}
        </strong>{' '}
        {t('add-skill-form-activate-message-suffix')}
      </p>
    )
  }
  return null
}

export const AddSkillFormSections: React.FC<AddSkillFormSectionsProps> = ({
  t,
  form,
  flowFormParams,
  changeLevelParams,
  employee,
  activeSelectedSkills,
  pendingSkills,
  searchTerm,
  setSearchTerm,
  inputKey,
  isDropdownOpen,
  isSearching,
  filteredResults,
  addError,
  verificationFileList,
  developmentDocumentTypes,
  getCatalogValue,
  acceptedVerificationFileTypes,
  dropdownRef,
  searchContainerRef,
  handleDesignSystemFilesChange,
  handleSearchBlur,
  handleSearchFocus,
  handleSelectSkill,
  handleAddNewSkill,
  handleRemoveSkill,
  handleRemovePendingSkill,
  handleUpdatePendingSkillLevel,
  handleUpdateExistingSkillLevel,
  handleAddPendingSkillToEmployee,
  setDocumentTypeIdLocal
}) => {
  const mode = flowFormParams?.mode
  const isFlowMode = mode === 'deactivate' || mode === 'activate' || mode === 'attachVerification'
  const isChangeLevelMode = changeLevelParams != null
  const isAddOrEditMode = isFlowMode === false && isChangeLevelMode === false
  const showExistingList = activeSelectedSkills.length > 0 && isAddOrEditMode
  const showEmptyMessage = isAddOrEditMode && activeSelectedSkills.length === 0

  const modeContent = renderModeSection(mode, flowFormParams, t)
  if (modeContent) {
    return <div className="gba:flex-1 gba:space-y-3">{modeContent}</div>
  }

  if (mode === 'attachVerification') {
    return (
      <div className="gba:flex-1 gba:space-y-3">
        <div className="gba:space-y-4" data-testid="add-skill-attach-verification-section">
          <p className="gba:text-muted-foreground gba:py-2" data-testid="add-skill-attach-verification-message">
            {t('add-skill-form-attach-verification-message-prefix')}{' '}
            <strong className="gba:font-bold gba:text-foreground">
              {flowFormParams.skillName || flowFormParams.skillId}
            </strong>{' '}
            {t('add-skill-form-attach-verification-message-suffix')}
          </p>

          <FormField
            name="verificationFileUpload"
            render={() => (
              <FormItem>
                <FormLabel>{t('add-skill-form-attach-verification-upload-label')}</FormLabel>
                <div data-testid="flw_addSkill_attachVerification_uploadFile">
                  <FileUpload
                    multiple={false}
                    maxFiles={1}
                    accept={acceptedVerificationFileTypes}
                    layout="list"
                    preview="icon"
                    onChange={handleDesignSystemFilesChange as any}
                  />
                </div>
              </FormItem>
            )}
          />

          {verificationFileList.length > 0 && (
            <>
              <FormField
                control={form.control}
                name="documentTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('add-skill-form-document-type')} *</FormLabel>
                    <FormControl>
                      <Combobox
                        className="gba:w-full"
                        options={(developmentDocumentTypes || []).map((ty: any) => ({
                          value: String(ty.id),
                          label: getCatalogValue(ty)
                        }))}
                        value={field.value || ''}
                        onValueChange={value => {
                          setTimeout(() => {
                            field.onChange(value)
                            setDocumentTypeIdLocal(value || null)
                          }, 0)
                        }}
                        placeholder={t('add-skill-form-select-document-type')}
                        data-testid="flw_addSkill_attachVerification_documentType"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="validTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('add-skill-form-valid-to')}</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value || ''}
                        onChange={e => {
                          const value = e.target.value || ''
                          setTimeout(() => field.onChange(value), 0)
                        }}
                        data-testid="flw_addSkill_attachVerification_validTo"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </>
          )}
        </div>
      </div>
    )
  }

  if (isChangeLevelMode) {
    const skillName =
      changeLevelParams?.skillName ??
      (changeLevelParams?.skillId
        ? ((employee?.skills as Array<{ skill?: { id: string; name?: string } }> | undefined)?.find(
            s => s.skill?.id === changeLevelParams.skillId
          )?.skill?.name ?? '')
        : '')
    return (
      <div className="gba:flex-1 gba:space-y-3">
        <span className="gba:block gba:text-muted-foreground gba:mb-4" data-testid="add-skill-change-level-label">
          {t('add-skill-form-update-level-for-prefix')}{' '}
          <strong className="gba:font-bold gba:text-foreground">{skillName}</strong> {'.'}
        </span>
        {activeSelectedSkills.length > 0 && (
          <div
            className="gba:flex gba:flex-col gba:gap-2 gba:max-h-[350px] gba:overflow-y-auto"
            data-testid="add-skill-change-level-container"
          >
            {activeSelectedSkills.map(skill => (
              <SkillLevelRow
                key={skill.id}
                skillName={skill.name}
                onRemove={() => handleRemoveSkill(skill.id)}
                dataTestIdPrefix="add-skill-change-level"
                removeButtonTestId={`skill-level-row-remove-${skill.id}`}
                rowId={skill.id}
                showRemove={false}
                levelContent={
                  <LevelSelect
                    value={skill.level ?? 1}
                    onChange={level => handleUpdateExistingSkillLevel(skill.id, level)}
                    dataTestId={`skill-level-select-${skill.id}`}
                  />
                }
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  const dropdownOpen =
    isDropdownOpen &&
    (isSearching || filteredResults.length > 0 || (searchTerm.trim().length > 0 && filteredResults.length === 0))

  return (
    <div className="gba:flex-1 gba:space-y-3">
      <span className="gba:block gba:text-muted-foreground gba:font-bold gba:mb-2" data-testid="add-skill-search-title">
        {t('add-skill-form-search-skills-title')}
      </span>

      <div className="gba:flex gba:flex-col gba:gap-2" data-testid="add-skill-search-filters">
        <div className="gba:relative gba:w-full" data-testid="add-skill-search-container" ref={searchContainerRef}>
          <DebouncedInput
            key={inputKey}
            value={searchTerm}
            onChange={setSearchTerm}
            onBlur={handleSearchBlur}
            onFocus={handleSearchFocus}
            debounceDelay={300}
            placeholder={t('add-skill-form-search-skill-placeholder')}
            data-testid="flw_addSkills_searchInput"
            className="gba:w-full"
          />
          <AddSkillSearchDropdown
            ref={dropdownRef}
            isOpen={dropdownOpen}
            isSearching={isSearching}
            filteredResults={filteredResults as any}
            searchTerm={searchTerm}
            onSelect={handleSelectSkill}
            onAddNew={handleAddNewSkill}
          />
        </div>
      </div>

      {addError && (
        <div className="gba:text-destructive" data-testid="add-skill-error">
          {addError}
        </div>
      )}

      {pendingSkills.length > 0 && (
        <div className="gba:space-y-2 gba:mt-5">
          <span
            className="gba:block gba:text-muted-foreground gba:font-bold gba:mb-4"
            data-testid="add-skill-selected-skills-label"
          >
            {t('add-skill-form-selected-skills-label')}
          </span>
          <div
            className="gba:flex gba:flex-col gba:gap-2 gba:max-h-[350px] gba:overflow-y-auto"
            data-testid="add-skill-pending-container"
          >
            {pendingSkills.map(skill => (
              <SkillLevelRow
                key={skill.id}
                skillName={skill.name}
                onRemove={() => handleRemovePendingSkill(skill.id)}
                dataTestIdPrefix="add-skill-pending"
                removeButtonTestId={`skill-level-row-remove-${skill.id}`}
                rowId={skill.id}
                levelContent={
                  <LevelSelect
                    value={skill.level}
                    onChange={level => handleUpdatePendingSkillLevel(skill.id, level)}
                    dataTestId={`skill-level-select-${skill.id}`}
                  />
                }
                actionButton={
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAddPendingSkillToEmployee(skill)}
                    data-testid={`add-skill-pending-add-${skill.id}`}
                  >
                    {t('add-skill-form-add-button')}
                  </Button>
                }
              />
            ))}
          </div>
        </div>
      )}

      <span
        className="gba:block gba:text-muted-foreground gba:font-bold gba:mb-4 gba:mt-5"
        data-testid="add-skill-employee-skills-label"
      >
        {t('add-skill-form-current-employee-skills-label')}
      </span>

      {showExistingList && (
        <div
          className="gba:flex gba:flex-col gba:gap-2 gba:max-h-[350px] gba:overflow-y-auto"
          data-testid="add-skill-existing-container"
        >
          {activeSelectedSkills.map(skill => (
            <SkillLevelRow
              key={skill.id}
              skillName={skill.name}
              onRemove={() => handleRemoveSkill(skill.id)}
              dataTestIdPrefix="add-skill-existing"
              removeButtonTestId={`skill-level-row-remove-${skill.id}`}
              rowId={skill.id}
              showRemove={changeLevelParams == null}
              statusLabel={undefined}
              levelContent={
                <LevelSelect
                  value={skill.level || 1}
                  onChange={level => handleUpdateExistingSkillLevel(skill.id, level)}
                  dataTestId={`skill-level-select-${skill.id}`}
                />
              }
            />
          ))}
        </div>
      )}

      {showEmptyMessage && (
        <div className="gba:text-sm gba:text-muted-foreground gba:py-2">{t('add-skill-form-no-current-skills')}</div>
      )}
    </div>
  )
}
