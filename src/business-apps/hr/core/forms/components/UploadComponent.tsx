import React from 'react';
import { Upload } from 'antd';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { ICONS } from '@/business-apps/fin/expenses/utils/icons';

interface UploadComponentProps {
  fileList: any[];
  setFileList: (files: any[]) => void;
  multiple?: boolean;
  dataTestIdPrefix?: string;
}

const acceptedFileTypes = 'application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png,.PDF,.JPG,.JPEG,.PNG';

const UploadComponent: React.FC<UploadComponentProps> = ({ fileList, setFileList, multiple = true, dataTestIdPrefix = 'upload' }) => {
  const createUploadItem = (file: File) => ({
    uid: Date.now().toString() + Math.random().toString(36).substring(2, 9),
    name: file.name,
    status: 'done',
    originFileObj: file
  });

  const handleBeforeUpload = (file: File) => {
    // Intercept to manage file list ourselves for both single and multiple modes
    if (!multiple) {
      setFileList([createUploadItem(file)]);
    } else {
      setFileList([...fileList, createUploadItem(file)]);
    }
    return false;
  };

  const handleChange = (info: any) => {
    // Only act on removals; additions are handled in beforeUpload
    if (info?.file?.status === 'removed' || (Array.isArray(info.fileList) && info.fileList.length < fileList.length)) {
      setFileList(info.fileList || []);
    }
  };

  const handleRemove = (file: any) => {
    const newFileList = fileList.filter((item) => item.uid !== file.uid);
    setFileList(newFileList);
  };

  const getContainerStyles = (): React.CSSProperties => {
    if (fileList.length > 0) {
      return {
        border: '2px solid #EFEFEF',
        borderRadius: '4px',
        padding: '20px 20px',
        position: 'relative' as const,
        backgroundColor: '#fff',
        minHeight: '80px'
      };
    }
    return {
      border: '2px solid #EFEFEF',
      borderRadius: '4px',
      padding: '0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#fff',
      height: '204px'
    };
  };

  const attachText = getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.upload_document', 'Attach Document');
  const focusAlt = getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_type_item.focus_alt_text', 'Focus');

  return (
    <div style={getContainerStyles()} data-testid={`${dataTestIdPrefix}-upload-container`}>
      {fileList.length === 0 ? (
        <Upload
          listType="text"
          fileList={fileList}
          beforeUpload={handleBeforeUpload}
          onChange={handleChange}
          onRemove={handleRemove}
          multiple={multiple}
          accept={acceptedFileTypes}
          style={{ width: '100%', height: '100%' }}
          data-testid={`${dataTestIdPrefix}-upload-input-empty`}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            flexDirection: 'column-reverse',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: '20px 20px',
            width: '100%',
            height: '100%',
            gap: '16px'
          }} data-testid={`${dataTestIdPrefix}-attach-area`}>
            <span className="gba:font-medium gba:text-black" data-testid={`${dataTestIdPrefix}-attach-text`}>{attachText}</span>
            <img src={ICONS.FOCUS} alt={focusAlt} style={{ width: '36px', height: '36px' }}
                width="36"
                height="36" data-testid={`${dataTestIdPrefix}-attach-icon`} />
          </div>
        </Upload>
      ) : (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }} data-testid={`${dataTestIdPrefix}-files-flex-container`}>
          <div style={{ width: '100%' }} data-testid={`${dataTestIdPrefix}-file-list-row`} className="gba:[&_.ant-upload-list-item-name]:flex">
            <Upload
              listType="text"
              fileList={fileList}
              beforeUpload={handleBeforeUpload}
              onChange={handleChange}
              onRemove={handleRemove}
              multiple={multiple}
              accept={acceptedFileTypes}
              style={{ width: '100%', height: '100%' }}
              showUploadList={{
                showPreviewIcon: false,
                showDownloadIcon: false,
                showRemoveIcon: true
              }}
              data-testid={`${dataTestIdPrefix}-upload-input-with-files`}
            />
          </div>

          {true && (
            <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }} data-testid={`${dataTestIdPrefix}-attach-button-row`}>
              <Upload
                showUploadList={false}
                beforeUpload={handleBeforeUpload}
                onChange={handleChange}
                multiple={multiple}
                accept={acceptedFileTypes}
                data-testid={`${dataTestIdPrefix}-attach-more-upload`}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', cursor: 'pointer', gap: '16px' }} data-testid={`${dataTestIdPrefix}-attach-more-container`}>
                  <span className="gba:font-medium gba:text-black" data-testid={`${dataTestIdPrefix}-attach-more-text`}>{attachText}</span>
                  <img src={ICONS.FOCUS} alt={focusAlt} style={{ width: '18px', height: '18px' }} data-testid={`${dataTestIdPrefix}-attach-more-icon`} />
                </div>
              </Upload>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UploadComponent;



