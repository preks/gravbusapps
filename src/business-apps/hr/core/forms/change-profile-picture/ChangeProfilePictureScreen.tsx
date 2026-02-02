import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Spinner, AvatarUpload } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import flowSmall from '@/assets/icons/flowSmall.svg'
import { useGetEmployeePicture } from './queries/ChangeProfilePictureQueries'
import { useFileClient } from '@/common/network/files/useFileClient'
import AppActionForm from '@/components/app-action-form/AppActionForm'
import FormHeader from '../components/FormHeader'

const prefixDataTestId = 'ChangeProfilePictureScreen'

const extractBase64Data = (dataUrl: string | null): string | null => {
  if (!dataUrl) return null
  const commaIndex = dataUrl.indexOf(',')
  return commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl
}

type AvatarUploadValue = {
  file: File | null
  thumbnail: string | null
}

import { EmployeeInfo } from '../components/FormHeader'

const ChangeProfilePictureScreen: React.FC<BusinessAppContextProps> = ({ additionalData, userInfo, accessToken }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isImageLoading, setIsImageLoading] = useState<boolean>(true)
  const [currentVersion, setCurrentVersion] = useState<number | null>(null)
  const [changedFile, setChangedFile] = useState<AvatarUploadValue | null>(null)
  const [employeeHeaderInfo, setEmployeeHeaderInfo] = useState<EmployeeInfo | undefined>(undefined)
  const onChangeExecutionsRef = useRef<number>(0)

  const currentImageUrl = useMemo(() => {
    const avatar = (additionalData as any)?.psi_taskPayload?.avatarUrl
    return typeof avatar === 'string' && avatar.length > 0 ? avatar : null
  }, [additionalData])

  const { fetchEmployeePicture } = useGetEmployeePicture({ accessToken, userInfo })
  const fileClient = useFileClient({ accessToken, userInfo })

  const employeeId = useMemo(() => {
    return (
      (additionalData as any)?.psi_taskPayload?.psi_initialParameters?.employeeId ||
      userInfo?.employeeDetails?.employeeId
    )
  }, [additionalData, userInfo?.employeeDetails?.employeeId])

  useEffect(() => {
    if (!employeeId || !accessToken) {
      setIsImageLoading(false)
      return
    }

    let cancelled = false
    const load = async () => {
      try {
        setIsImageLoading(true)
        const res = await fetchEmployeePicture(employeeId)
        if (!cancelled) {
          if (!currentImageUrl && res.thumbnail) {
            setPreviewUrl(res.thumbnail)
          }
          if (typeof res.version === 'number') setCurrentVersion(res.version)
          const rawThumbnail = res.thumbnail
            ? res.thumbnail.includes(',')
              ? res.thumbnail.split(',')[1]
              : res.thumbnail
            : undefined
          setEmployeeHeaderInfo({
            firstName: res.firstName,
            lastName: res.lastName,
            pictureThumbnail: rawThumbnail,
            jobTitle: res.jobTitle
          })
        }
      } catch (error) {
        console.error('Failed to fetch employee data:', error)
      } finally {
        if (!cancelled) setIsImageLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [employeeId, accessToken])

  const imageSrc = previewUrl || currentImageUrl || undefined

  const validateForm = () => {
    const hasNewUpload = Boolean(changedFile)
    if (!hasNewUpload) {
      return [
        getTranslationFromI18nKeyAndLabel('lowcoder:profile_picture_form.required', 'Please upload a profile picture.')
      ]
    }
    return null
  }

  const handlePreSubmit = async () => {
    const employeeId =
      (additionalData as any)?.psi_taskPayload?.psi_initialParameters?.employeeId ||
      userInfo?.employeeDetails?.employeeId
    if (!employeeId || !changedFile) return {}

    const file = changedFile?.file
    const thumbnail = changedFile?.thumbnail
    if (!file || !thumbnail) return {}

    try {
      const pathParams = { accessScope: 'public' } as const
      const appName = 'userProfile'
      const folderPath = `/pics/${employeeId}`

      const uploadResponse = await fileClient.uploadFile(file!, pathParams, { appName, folderPath })

      if (!uploadResponse.fileInfo) return {}

      const employeePictureChange = {
        id: employeeId,
        version: currentVersion ?? undefined,
        firstName: userInfo?.employeeDetails?.firstName,
        lastName: userInfo?.employeeDetails?.lastName,
        picture: JSON.stringify(uploadResponse.fileInfo),
        pictureThumbnail: thumbnail
      }

      // window.dispatchEvent(new Event('com.newwork.user.profilePicture.updated'));

      return {
        event: 'pse_submit',
        employeeId,
        employeePictureChange
      }
    } catch (error) {
      console.error('Failed to upload profile picture:', error)
    }
  }

  return (
    <AppActionForm
      processType="update"
      formData={{}}
      onSubmit={data => data}
      submitEventType="pse_submit"
      cancelEventType="pse_abort"
      businessAppContext={{ accessToken, userInfo, additionalData }}
      validateForm={validateForm}
      handlePreSubmit={handlePreSubmit}
      isSubmitDisabled={!changedFile || onChangeExecutionsRef.current < 2}
      submitButtonText={getTranslationFromI18nKeyAndLabel('common.submit', 'Submit')}
      cancelButtonText={getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
      submitButtonTestId="flw_changePicture_btnSubmit"
      cancelButtonTestId="flw_changePicture_btnCancel"
      data-testid={formatDataTestId(prefixDataTestId, 'Container')}
    >
      <div className="gba:bg-white gba:w-full gba:max-w-xl gba:max-h-[90vh] gba:overflow-hidden">
        <FormHeader
          title={getTranslationFromI18nKeyAndLabel('lowcoder:profile_picture_form.title', 'Change Profile Picture')}
          flowIconUrl={flowSmall}
          employee={
            employeeHeaderInfo?.firstName || employeeHeaderInfo?.lastName
              ? {
                  firstName: employeeHeaderInfo.firstName,
                  lastName: employeeHeaderInfo.lastName,
                  pictureThumbnail: employeeHeaderInfo.pictureThumbnail,
                  jobTitle: employeeHeaderInfo.jobTitle
                }
              : undefined
          }
        />

        <div className="gba:px-6 gba:pb-6 gba:flex gba:flex-col gba:items-center gba:gap-6 gba:overflow-y-auto gba:max-h-[calc(90vh-160px)]">
          <div className="gba:w-full gba:flex gba:justify-center">
            {isImageLoading ? (
              <Spinner size="lg" />
            ) : (
              <AvatarUpload
                image={imageSrc}
                shape="circle"
                uploadButtonText={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:profile_picture_form.upload',
                  'Upload Picture'
                )}
                onChange={value => {
                  onChangeExecutionsRef.current += 1
                  setChangedFile(value ? { file: value.file, thumbnail: extractBase64Data(value.thumbnail) } : null)
                }}
                data-testid="flw_changePicture_avatarUpload"
                className="gba:w-full"
                fallback={
                  <div className="gba:w-48 gba:h-48 gba:rounded-full gba:overflow-hidden gba:border gba:border-border gba:flex gba:items-center gba:justify-center gba:text-muted-foreground">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:profile_picture_form.noImage', 'No image')}
                  </div>
                }
              />
            )}
          </div>
          {!changedFile && (
            <div
              className="gba:text-destructive gba:text-sm gba:mt-2"
              data-testid={formatDataTestId(prefixDataTestId, 'ValidationMessage')}
            >
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:profile_picture_form.required',
                'Please upload a profile picture.'
              )}
            </div>
          )}
        </div>
      </div>
    </AppActionForm>
  )
}

export default ChangeProfilePictureScreen
