import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Spinner } from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import flowSmall from '@/assets/icons/flowSmall.svg';
import { useGetEmployeePicture } from './queries/ChangeProfilePictureQueries';
import { useFileClient } from '@/common/network/files/useFileClient';
import AppActionForm from '@/components/app-action-form/AppActionForm';
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils';

interface ChangeProfilePictureScreenProps extends BusinessAppContextProps {}

const prefixDataTestId = 'ChangeProfilePictureScreen';

const ChangeProfilePictureScreen: React.FC<ChangeProfilePictureScreenProps> = ({
  additionalData,
  userInfo,
  accessToken,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState<boolean>(true);
  const [currentVersion, setCurrentVersion] = useState<number | null>(null);

  const currentImageUrl = useMemo(() => {
    const avatar = (additionalData as any)?.psi_taskPayload?.avatarUrl;
    return typeof avatar === 'string' && avatar.length > 0 ? avatar : null;
  }, [additionalData]);

  // GraphQL: Prefill from existing picture
  const { fetchEmployeePicture } = useGetEmployeePicture({ accessToken, userInfo });
  const fileClient = useFileClient({ accessToken, userInfo });
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      // Skip if already have preview or payload provides avatar
      if (previewUrl || currentImageUrl) return;
      const employeeId = userInfo?.employeeDetails?.employeeId;
      if (!employeeId) return;
      try {
        setIsImageLoading(true);
        const res = await fetchEmployeePicture(employeeId);
        if (!cancelled) {
          if (res.thumbnail) setPreviewUrl(res.thumbnail);
          if (typeof res.version === 'number') setCurrentVersion(res.version);
        }
      } catch (error) {
        console.error('Failed to upload profile picture:', error);
      } finally {
        if (!cancelled) setIsImageLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo?.employeeDetails?.employeeId, accessToken]);

  const handleOpenFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    if (file) {
      const reader = new FileReader();
      setIsImageLoading(true);
      reader.onload = () => {
        setPreviewUrl(typeof reader.result === 'string' ? reader.result : null);
        setIsImageLoading(false);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
      setIsImageLoading(false);
    }
  };

  const imageSrc = previewUrl || currentImageUrl || undefined;

  const validateForm = () => {
    // Require uploading a new file; existing preview/current image is not sufficient
    const hasNewUpload = Boolean(selectedFile);
    if (!hasNewUpload) {
      return [getTranslationFromI18nKeyAndLabel('lowcoder:profile_picture_form.required', 'Please upload a profile picture.')];
    }
    return null;
  };

  const handlePreSubmit = async () => {
    const employeeId = userInfo?.employeeDetails?.employeeId;
    if (!employeeId || !selectedFile) return {};

    try {
      const pathParams = { accessScope: 'public' } as const;
      const appName = 'userProfile';
      const folderPath = `/pics/${employeeId}`;
  
      const uploadResponse = await fileClient.uploadFile(selectedFile, pathParams, { appName, folderPath });
  
      const thumbnailBase64 = previewUrl
        ? (previewUrl.includes(',') ? previewUrl.split(',').pop() || '' : previewUrl)
        : '';
  
      const employeePictureChange = {
        id: employeeId,
        version: currentVersion ?? undefined,
        firstName: userInfo?.employeeDetails?.firstName,
        lastName: userInfo?.employeeDetails?.lastName,
        picture: JSON.stringify(uploadResponse.fileInfo),
        pictureThumbnail: thumbnailBase64,
      };
  
      return {
        employeeId,
        employeePictureChange,
      };
    } catch (error) {
      console.error('Failed to upload profile picture:', error);
    }
  };

  return (
    <AppActionForm
      processType="update"
      formData={{}}
      onSubmit={(data) => data}
      // Prevent platform process event hooks after submit/cancel
      submitEventType={undefined as any}
      cancelEventType={undefined as any}
      businessAppContext={{ accessToken, userInfo, additionalData }}
      validateForm={validateForm}
      handlePreSubmit={handlePreSubmit}
      // Disable submit until a new file is selected
      isSubmitDisabled={!selectedFile}
      submitButtonText={getTranslationFromI18nKeyAndLabel('common.submit', 'Submit')}
      cancelButtonText={getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
      submitButtonTestId="flw_changePicture_btnSubmit"
      cancelButtonTestId="flw_changePicture_btnCancel"
      data-testid={formatDataTestId(prefixDataTestId, 'Container')}
      onCancel={() => {
        dispatchProcessContinueEvent('pse_abort', {
          event: 'pse_abort',
          pso_exitStrategy: 'abort',
          pso_completeNotification: {
            type: 'error',
            messageKey: getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_module.toast_notification_cancel_create_absence',
              'The action has been canceled.'
            )
          }
        });
      }}
    >
      <div className="gba:bg-white gba:w-full gba:max-w-xl gba:max-h-[90vh] gba:overflow-hidden">
        {/* Header */}
        <div className="gba:flex gba:items-center gba:justify-between gba:p-6">
          <div className="gba:flex gba:items-center gba:gap-2">
            <img
              src={flowSmall}
              alt="Flow Small"
              data-testid={formatDataTestId(prefixDataTestId, 'FlowIcon')}
              className="gba:w-6 gba:h-6"
              style={{
                filter: 'brightness(0)',
              }}
            />
            <h2
              className="gba:text-xl gba:font-semibold"
              style={{ color: 'var(--nw-color-text-primary)' }}
              data-testid={formatDataTestId(prefixDataTestId, 'Title')}
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:profile_picture_form.title', 'Change Profile Picture')}
            </h2>
          </div>
        </div>

        {/* Divider */}
        <div className="gba:border-t" style={{ borderColor: 'var(--nw-color-border-default)' }} />

        {/* Content */}
        <div className="gba:p-6 gba:flex gba:flex-col gba:items-center gba:gap-6 gba:overflow-y-auto gba:max-h-[calc(90vh-160px)]">
          {/* Avatar preview */}
          <div
            className="gba:w-48 gba:h-48 gba:rounded-full gba:overflow-hidden gba:border gba:flex gba:items-center gba:justify-center"
            style={{ borderColor: 'var(--nw-color-border-default)' }}
            data-testid="flw_changePicture_currentPicture"
          >
            {isImageLoading ? (
              <Spinner size="lg" />
            ) : imageSrc ? (
              <img src={imageSrc} alt="avatar" className="gba:w-full gba:h-full gba:object-cover" />
            ) : (
              <div className="gba:w-full gba:h-full gba:flex gba:items-center gba:justify-center" style={{ color: 'var(--nw-color-text-tertiary)' }}>
                {getTranslationFromI18nKeyAndLabel('lowcoder:profile_picture_form.noImage', 'No image')}
              </div>
            )}
          </div>

          {/* Upload button */}
          <div className="gba:w-full">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="gba:hidden"
              data-testid={formatDataTestId(prefixDataTestId, 'FileInput')}
            />
            <Button
              variant="secondary"
              onClick={handleOpenFileDialog}
              data-testid="flw_changePicture_uploadFile"
              type="button"
              className="gba:w-full"
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:profile_picture_form.upload', 'Upload Picture')}
            </Button>
            {!selectedFile && !imageSrc && (
              <div className="gba:text-red-500 gba:text-sm gba:mt-2" data-testid={formatDataTestId(prefixDataTestId, 'ValidationMessage')}>
                {getTranslationFromI18nKeyAndLabel('lowcoder:profile_picture_form.required', 'Please upload a profile picture.')}
              </div>
            )}
          </div>
        </div>

        {/* Actions handled by AppActionForm (standard layout) */}
      </div>
    </AppActionForm>
  );
};

export default ChangeProfilePictureScreen;


