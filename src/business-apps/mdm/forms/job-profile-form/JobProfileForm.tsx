import React, { useEffect, useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FormWrapperModal } from '@/components/form-wrapper'
import {
  Input,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Textarea,
  Combobox,
  Switch
} from '@newwork/nw-design-system'
import { JobFunction, JobProfile, JobLevelGroup, JobLevel } from '@/business-apps/mdm/apps/job-structure-data/types'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { env } from '@/common/env/EnvUtils'
import SkillsSection from './components/SkillsSection'
import { useFileClient } from '@/common/network/files/useFileClient'
import type { FileListEntry } from '@/common/types/FileTypes'

import { useRestClient } from '@/common/network/rest/useRestClient'

const DATA_TEST_ID_PREFIX = 'JobProfileForm'

interface JobProfileSkill {
  skillId: string
  skillName: string
  level: number | null
}

interface JobDescriptionInitialFile {
  id: string
  fileId: string
  name: string
  type: string
  path: string
  size: number
  url: string
}

function normalizeJobDescriptionEntries(jobDescriptionValue: unknown): unknown[] {
  if (Array.isArray(jobDescriptionValue)) {
    return jobDescriptionValue.filter(Boolean)
  }
  if (jobDescriptionValue) {
    return [jobDescriptionValue]
  }
  return []
}

function buildJobDescriptionFileIdPayload(
  jobDescriptionFileId: string | null,
  fileWasRemoved: boolean
): { jobDescriptionFileId: string | null } | Record<string, never> {
  if (jobDescriptionFileId) {
    return { jobDescriptionFileId }
  }
  if (fileWasRemoved) {
    return { jobDescriptionFileId: null }
  }
  return {}
}

function computeJobDescriptionFileIdsToDelete(params: {
  jobProfileId: string | undefined
  fileWasRemoved: boolean
  uploadedNewJobDescriptionFile: boolean
  previousFileIds: string[]
  jobDescriptionFileId: string | null
}): string[] {
  const { jobProfileId, fileWasRemoved, uploadedNewJobDescriptionFile, previousFileIds, jobDescriptionFileId } = params
  if (!jobProfileId) {
    return []
  }
  if (fileWasRemoved) {
    return previousFileIds
  }
  if (uploadedNewJobDescriptionFile) {
    return previousFileIds.filter(fileId => fileId !== jobDescriptionFileId)
  }
  return []
}

async function resolveJobDescriptionFileIdFromFirstEntry(
  firstEntry: any,
  fileClient: {
    uploadFile: (
      file: File,
      scope: { accessScope: string },
      opts: { appName: string; folderPath: string; mimeType: string }
    ) => Promise<{ fileInfo?: { fileId?: string } }>
  },
  jobProfileId: string | undefined
): Promise<{ fileId: string | null; uploadedNew: boolean }> {
  let jobDescriptionFileId: string | null = null
  let uploadedNewJobDescriptionFile = false
  const file = firstEntry?.originFileObj || firstEntry?.file
  if (file instanceof File) {
    const uploadResponse = await fileClient.uploadFile(
      file,
      { accessScope: 'tenant' },
      {
        appName: 'mdm',
        folderPath: `/job-profiles/${jobProfileId || 'new'}/documents`,
        mimeType: file.type || 'application/pdf'
      }
    )
    jobDescriptionFileId = uploadResponse?.fileInfo?.fileId || null
    uploadedNewJobDescriptionFile = Boolean(jobDescriptionFileId)
  } else if (firstEntry?.fileId) {
    jobDescriptionFileId = firstEntry.fileId
  }
  return { fileId: jobDescriptionFileId, uploadedNew: uploadedNewJobDescriptionFile }
}

async function submitJobProfileAndCleanupFiles(ctx: {
  values: any
  jobProfile?: JobProfile
  previousJobDescriptionFileIds: string[]
  fileClient: {
    uploadFile: (
      file: File,
      scope: { accessScope: string },
      opts: { appName: string; folderPath: string; mimeType: string }
    ) => Promise<{ fileInfo?: { fileId?: string } }>
    deleteFile: (
      args: { accessScope: string; fileId: string },
      opts: { appName: string; folderPath: string }
    ) => Promise<unknown>
  }
  restClient: { post: (path: string, body: unknown, opts: { headers: Record<string, string> }) => Promise<unknown> }
  accessToken: string | undefined
  refetch: () => void
}): Promise<void> {
  const { values, jobProfile, previousJobDescriptionFileIds, fileClient, restClient, accessToken, refetch } = ctx

  let jobDescriptionFileId: string | null = null
  let uploadedNewJobDescriptionFile = false
  const previousFileIds = previousJobDescriptionFileIds
  const jobDescriptionValue = values.jobDescriptionFile
  const currentJobDescriptionEntries = normalizeJobDescriptionEntries(jobDescriptionValue)
  const fileWasRemoved =
    Boolean(jobProfile?.id) && previousFileIds.length > 0 && currentJobDescriptionEntries.length === 0

  if (currentJobDescriptionEntries.length > 0) {
    try {
      const firstEntry = currentJobDescriptionEntries[0]
      const resolved = await resolveJobDescriptionFileIdFromFirstEntry(firstEntry, fileClient, jobProfile?.id)
      jobDescriptionFileId = resolved.fileId
      uploadedNewJobDescriptionFile = resolved.uploadedNew
    } catch (fileError) {
      console.error('Error uploading job description file:', fileError)
    }
  }

  const skills = (values.skills || [])
    .filter((skill: JobProfileSkill) => skill.skillId && skill.skillId.length > 0)
    .map((skill: JobProfileSkill) => ({
      skillId: skill.skillId,
      skillName: skill.skillName || null,
      requiredLevel: skill.level ?? null
    }))

  const payload = {
    changeMode: 'INSERT',
    jobProfile: {
      code: values.code,
      name: values.name,
      description: values.description,
      contractTypeRef: values.contractTypeRef?.length > 0 ? values.contractTypeRef : null,
      employmentTypeRef: values.employmentTypeRef?.length > 0 ? values.employmentTypeRef : null,
      jobFunction: values.jobFunctionId,
      jobLevel: values.jobLevelId?.length > 0 ? values.jobLevelId : null,
      recordState: values.active,
      ...(skills.length > 0 ? { skills } : {}),
      ...buildJobDescriptionFileIdPayload(jobDescriptionFileId, fileWasRemoved),
      ...(jobProfile ? { version: jobProfile.version, id: jobProfile.id } : {})
    }
  }

  await restClient.post('/employee/saveJobProfile', payload, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })

  const fileIdsToDelete = computeJobDescriptionFileIdsToDelete({
    jobProfileId: jobProfile?.id,
    fileWasRemoved,
    uploadedNewJobDescriptionFile,
    previousFileIds,
    jobDescriptionFileId
  })

  if (fileIdsToDelete.length > 0 && jobProfile?.id) {
    try {
      await Promise.all(
        fileIdsToDelete.map(fileId =>
          fileClient.deleteFile(
            { accessScope: 'tenant', fileId },
            {
              appName: 'mdm',
              folderPath: `/job-profiles/${jobProfile.id}/documents`
            }
          )
        )
      )
    } catch (deleteError) {
      console.error('Failed to delete previous job description files:', deleteError)
    }
  }

  refetch()
}

export interface JobProfileFormProps extends BusinessAppContextProps {
  jobProfile?: JobProfile
  prefixDataTestId?: string
  childAddButton: React.ReactNode
  jobFunctions: JobFunction[]
  jobLevelGroups: JobLevelGroup[]
  contractTypes: Array<{ id: string; value: string }>
  employmentTypes: Array<{ id: string; value: string }>
  refetch: () => void
  isDrawerActive?: boolean
  defaultJobLevels?: JobLevel[]
  jobLevelGroupRef?: string
}

const JobProfileForm: React.FC<JobProfileFormProps> = ({
  jobProfile,
  prefixDataTestId,
  childAddButton,
  jobFunctions,
  jobLevelGroups,
  contractTypes,
  employmentTypes,
  accessToken,
  refetch,
  isDrawerActive = false
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))
  const fileClient = useFileClient({ accessToken } as BusinessAppContextProps)
  const [loading, setLoading] = useState(false)
  const [selectedJobFunction, setSelectedJobFunction] = useState<{
    id: string
    name: string
  } | null>(jobProfile?.jobFunction ?? null)
  const [selectedJobLevel, setSelectedJobLevel] = useState<{
    id: string
    name: string
  } | null>(jobProfile?.jobLevel ?? null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoadingJobDescriptionFile, setIsLoadingJobDescriptionFile] = useState(false)
  const [initialJobDescriptionFile, setInitialJobDescriptionFile] = useState<JobDescriptionInitialFile | null>(null)
  const [previousJobDescriptionFileIds, setPreviousJobDescriptionFileIds] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    let objectUrlToRevoke: string | null = null

    const fetchJobDescriptionFile = async () => {
      if (!isModalOpen || !jobProfile?.id) {
        setInitialJobDescriptionFile(null)
        setPreviousJobDescriptionFileIds([])
        setIsLoadingJobDescriptionFile(false)
        return
      }

      try {
        setIsLoadingJobDescriptionFile(true)
        const response = await fileClient.getAllFiles(
          { accessScope: 'tenant' },
          {
            appName: 'mdm',
            folderPath: `/job-profiles/${jobProfile.id}/documents`
          }
        )

        const files = Array.isArray(response.files) ? response.files : []
        const fileIds = files.map(file => file.fileId).filter((fileId): fileId is string => Boolean(fileId))
        setPreviousJobDescriptionFileIds(fileIds)

        const latestFile = [...files]
          .sort((a: FileListEntry, b: FileListEntry) => {
            const first = new Date(a.uploadedAt || '').getTime()
            const second = new Date(b.uploadedAt || '').getTime()
            return second - first
          })
          .find(file => Boolean(file.fileId))

        if (!latestFile || cancelled) {
          setInitialJobDescriptionFile(null)
          return
        }

        let fileSize = 0
        let fileUrl = latestFile.path || latestFile.fileId
        const filePath = latestFile.path || ''

        try {
          const downloaded = filePath
            ? await fileClient.downloadFileByPath(filePath, accessToken || '')
            : await fileClient.getFile(
                { accessScope: 'tenant', fileId: latestFile.fileId },
                {
                  appName: 'mdm',
                  folderPath: `/job-profiles/${jobProfile.id}/documents`
                }
              )

          fileSize = downloaded.size
          objectUrlToRevoke = URL.createObjectURL(downloaded)
          fileUrl = objectUrlToRevoke
        } catch (downloadError) {
          console.error('Error downloading existing job description file:', downloadError)
        }

        setInitialJobDescriptionFile({
          id: latestFile.fileId,
          fileId: latestFile.fileId,
          name: latestFile.fileMetadata?.originalFileName || latestFile.fileId,
          type: latestFile.fileMetadata?.mimeType || '',
          path: latestFile.path || latestFile.fileId,
          size: fileSize,
          url: fileUrl
        })
      } catch (error) {
        if (!cancelled) {
          setInitialJobDescriptionFile(null)
          setPreviousJobDescriptionFileIds([])
        }
        console.error('Error fetching existing job description file:', error)
      } finally {
        if (!cancelled) {
          setIsLoadingJobDescriptionFile(false)
        }
      }
    }

    fetchJobDescriptionFile()

    return () => {
      cancelled = true
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke)
      }
    }
  }, [accessToken, fileClient, isModalOpen, jobProfile?.id])

  const jobLevels = useMemo(() => {
    if (!jobFunctions || !Array.isArray(jobFunctions)) {
      return []
    }

    const targetJobFunction = jobFunctions.find(jobFunction => jobFunction.id === selectedJobFunction?.id)

    if (!targetJobFunction) {
      return []
    }

    if (!jobLevelGroups || !Array.isArray(jobLevelGroups)) {
      return []
    }

    const targetJobLevelGroup = jobLevelGroups.find(
      jobLevelGroup => jobLevelGroup.id === targetJobFunction?.jobLevelGroupRef
    )

    const jobLevels = (targetJobLevelGroup?.jobLevels ?? []).map(jobLevel => ({
      id: jobLevel.id,
      name: jobLevel.name
    }))

    return jobLevels
  }, [jobLevelGroups, selectedJobFunction, jobProfile, jobFunctions])

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)
      await submitJobProfileAndCleanupFiles({
        values,
        jobProfile,
        previousJobDescriptionFileIds,
        fileClient,
        restClient,
        accessToken,
        refetch
      })
    } catch (error) {
      console.error('Error saving Job Profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const defaultValues = useMemo(
    () =>
      jobProfile
        ? {
            id: jobProfile.id,
            name: jobProfile.name,
            code: jobProfile.code,
            description: jobProfile.description,
            jobFunctionId: jobProfile.jobFunctionId,
            jobLevelId: jobProfile.jobLevelId,
            contractTypeRef: jobProfile.contractTypeRef,
            employmentTypeRef: jobProfile.employmentTypeRef,
            active: jobProfile.recordState ? 'active' : 'inactive',
            skills: (jobProfile as any).jobProfileSkills
              ? (
                  (jobProfile as any).jobProfileSkills as Array<{
                    skillId: string
                    requiredLevel?: number | null
                    skill?: { id: string; name: string }
                  }>
                ).map(profileSkill => ({
                  skillId: profileSkill.skillId,
                  skillName: profileSkill.skill?.name || '',
                  level: profileSkill.requiredLevel ?? null
                }))
              : []
          }
        : { skills: [] },
    [jobProfile]
  )

  return (
    <FormWrapperModal
      childAddButton={childAddButton}
      title={jobProfile ? 'Edit Job Profile' : 'Create Job Profile'}
      description="Configure job profile details and requirements"
      onSubmit={handleSubmit}
      onCancel={() => {
        setSelectedJobLevel(jobProfile?.jobLevel ?? null)
        setSelectedJobFunction(jobProfile?.jobFunction ?? null)
      }}
      defaultValues={defaultValues}
      isEditing={!!jobProfile}
      loading={loading}
      dataTestId={dataTestId}
      isDrawerActive={isDrawerActive}
      open={isModalOpen}
      setOpen={setIsModalOpen}
    >
      <FormField
        name="name"
        rules={{ required: 'Please enter job profile name' }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Profile Name</FormLabel>
            <FormControl>
              <Input
                placeholder="e.g., Senior Software Engineer, Product Manager"
                {...field}
                data-testid={`${dataTestId}-name-input`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="code"
        rules={{ required: 'Please enter code' }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Code</FormLabel>
            <FormControl>
              <Input placeholder="e.g., SSE, PM" {...field} data-testid={`${dataTestId}-code-input`} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Describe the responsibilities and requirements for this profile"
                rows={3}
                {...field}
                data-testid={`${dataTestId}-description-textarea`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="jobFunctionId"
        rules={{ required: 'Please select a job function' }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Job Function</FormLabel>
            <FormControl>
              <Combobox
                key={`job-function-combobox-${field.value || 'empty'}`}
                options={(jobFunctions || []).map(func => ({
                  value: func.id,
                  label: func.name
                }))}
                value={field.value || ''}
                onValueChange={value => {
                  field.onChange(value)

                  const targetJobFunction = jobFunctions?.find(jobFunction => jobFunction.id === value)

                  if (targetJobFunction) {
                    setSelectedJobFunction(targetJobFunction)
                    setSelectedJobLevel(null)
                  } else {
                    setSelectedJobFunction(null)
                    setSelectedJobLevel(null)
                  }
                }}
                placeholder="Select job function"
                searchPlaceholder="Search job functions..."
                emptyText="No job functions found"
                className="gba:!w-full"
                data-testid={`${dataTestId}-job-function-combobox`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="jobLevelId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Job Level</FormLabel>
            <FormControl>
              <Combobox
                key={`job-level-combobox-${field.value || 'empty'}`}
                options={jobLevels.map(level => ({
                  value: level.id,
                  label: level.name
                }))}
                value={selectedJobLevel?.id || ''}
                onValueChange={value => {
                  field.onChange(value)
                  const targetLevel = jobLevels.find(jobLevel => jobLevel.id === value)

                  if (targetLevel) {
                    setSelectedJobLevel({
                      id: targetLevel.id,
                      name: targetLevel.name
                    })
                  }
                }}
                placeholder="Select job level (optional)"
                searchPlaceholder="Search job levels..."
                emptyText="No job levels found"
                className="gba:!w-full"
                data-testid={`${dataTestId}-job-level-combobox`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="contractTypeRef"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Contract Type</FormLabel>
            <FormControl>
              <Combobox
                key={`contract-type-combobox-${field.value || 'empty'}`}
                options={(contractTypes || []).map(type => ({
                  value: type.id,
                  label: type.value
                }))}
                value={field.value || ''}
                onValueChange={field.onChange}
                placeholder="Select contract type (optional)"
                searchPlaceholder="Search contract types..."
                emptyText="No contract types found"
                className="gba:!w-full"
                data-testid={`${dataTestId}-contract-type-combobox`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="employmentTypeRef"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Employment Type</FormLabel>
            <FormControl>
              <Combobox
                key={`employment-type-combobox-${field.value || 'empty'}`}
                options={(employmentTypes || []).map(type => ({
                  value: type.id,
                  label: type.value
                }))}
                value={field.value || ''}
                onValueChange={field.onChange}
                placeholder="Select employment type (optional)"
                searchPlaceholder="Search employment types..."
                emptyText="No employment types found"
                className="gba:!w-full"
                data-testid={`${dataTestId}-employment-type-combobox`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <SkillsSection
        dataTestId={dataTestId}
        accessToken={accessToken || ''}
        isLoadingJobDescriptionFile={isLoadingJobDescriptionFile}
        initialJobDescriptionFile={initialJobDescriptionFile}
      />

      <FormField
        name="active"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Active</FormLabel>
            <FormControl>
              <Switch
                checked={field.value === 'active'}
                onCheckedChange={checked => field.onChange(checked ? 'active' : 'inactive')}
                data-testid={`${dataTestId}-active-switch`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormWrapperModal>
  )
}

export default JobProfileForm
