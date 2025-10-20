import React, { useState } from 'react'
import { Upload } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import { useSalesTaskFormContext } from '../context/SalesTaskFormContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

const prefixDataTestId = 'SalesTaskForm-FileUpload'

const FileUploadSection: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false) // Start collapsed

  const { fileList, setFileList } = useSalesTaskFormContext()

  const handleFileChange = ({ fileList: newFileList }: any) => {
    setFileList(newFileList)
  }

  return (
    <div className="gba:bg-white gba:rounded-xl gba:shadow-sm gba:border gba:border-gray-100 gba:overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="gba:w-full gba:px-6 gba:py-4 gba:border-b gba:border-gray-100 gba:bg-gradient-to-r gba:from-purple-200 gba:to-violet-200 gba:hover:from-purple-300 gba:hover:to-violet-300 gba:transition-colors gba:flex gba:items-center gba:justify-between gba:text-left"
        style={{
          background: 'linear-gradient(to right, #e9d5ff, #ddd6fe)',
          transition: 'background 0.2s ease'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'linear-gradient(to right, #c4b5fd, #a78bfa)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'linear-gradient(to right, #e9d5ff, #ddd6fe)'
        }}
        data-testid={formatDataTestId(prefixDataTestId, 'Toggle')}
      >
        <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900 gba:flex gba:items-center gba:gap-2">
          <div className="gba:w-2 gba:h-2 gba:bg-purple-500 gba:rounded-full"></div>
          {getTranslationFromI18nKeyAndLabel('crm:salesTask.fileAttachment', 'File Attachment')}
        </h3>
        <span className="gba:text-gray-500 gba:text-lg">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {isExpanded && (
        <div className="gba:p-6">
          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
              {getTranslationFromI18nKeyAndLabel('crm:salesTask.uploadFile', 'Upload File')}
            </label>
            <Upload.Dragger
              data-testid={formatDataTestId(prefixDataTestId, 'FileUpload')}
              fileList={fileList}
              onChange={handleFileChange}
              beforeUpload={() => false}
              multiple
              className="gba:w-full"
            >
              <p className="gba:mb-2">
                <UploadOutlined />
              </p>
              <p>
                {getTranslationFromI18nKeyAndLabel('crm:salesTask.uploadFileButton', 'Click or drag file to upload')}
              </p>
            </Upload.Dragger>
          </div>
        </div>
      )}
    </div>
  )
}

export default FileUploadSection
