import React, { useRef } from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { ICONS } from '@/business-apps/fin/expenses/utils/icons'
import { XCircleIcon } from 'lucide-react'

interface UploadComponentProps {
  fileList: any[]
  setFileList: (files: any[]) => void
  multiple?: boolean
  dataTestIdPrefix?: string
  labelText?: string
}

const acceptedFileTypes = 'application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png,.PDF,.JPG,.JPEG,.PNG'

const UploadComponent: React.FC<UploadComponentProps> = ({
  fileList,
  setFileList,
  multiple = true,
  dataTestIdPrefix = 'upload',
  labelText
}) => {
  const createUploadItem = (file: File) => ({
    uid: Date.now().toString() + Math.random().toString(36).substring(2, 9),
    name: file.name,
    status: 'done',
    originFileObj: file
  })

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const moreFileInputRef = useRef<HTMLInputElement | null>(null)

  const appendFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    if (!multiple) {
      const first = files.item(0)
      if (first) setFileList([createUploadItem(first)])
      return
    }
    const next = [...fileList]
    Array.from(files).forEach(f => next.push(createUploadItem(f)))
    setFileList(next)
  }

  const handleRemove = (file: { uid: string }) => {
    const newFileList = fileList.filter(item => item.uid !== file.uid)
    setFileList(newFileList)
  }

  const containerClass = `gba:border gba:rounded-md gba:bg-card gba:w-full ${fileList.length > 0 ? 'gba:p-5' : 'gba:p-1'}`

  const attachText = getTranslationFromI18nKeyAndLabel(
    'lowcoder:hr_absences.create_absence.upload_document',
    labelText || 'Upload document'
  )
  const focusAlt = getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_type_item.focus_alt_text', 'Focus')

  return (
    <div className={containerClass} data-testid={`${dataTestIdPrefix}-upload-container`}>
      {fileList.length === 0 ? (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedFileTypes}
            multiple={multiple}
            className="gba:hidden"
            onChange={e => appendFiles(e.target.files)}
            data-testid={`${dataTestIdPrefix}-upload-input-empty`}
          />
          <div
            className="gba:flex gba:items-center gba:justify-center gba:cursor-pointer gba:px-3 gba:h-10"
            data-testid={`${dataTestIdPrefix}-attach-area`}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
            }}
          >
            <img
              src={ICONS.FOCUS}
              alt={focusAlt}
              width="18"
              height="18"
              className="gba:mr-2"
              data-testid={`${dataTestIdPrefix}-attach-icon`}
            />
            <span className="gba:font-medium" data-testid={`${dataTestIdPrefix}-attach-text`}>
              {attachText}
            </span>
          </div>
        </>
      ) : (
        <div className="gba:w-[100%] gba:flex gba:flex-col" data-testid={`${dataTestIdPrefix}-files-flex-container`}>
          <div className="gba:w-[100%]" data-testid={`${dataTestIdPrefix}-file-list-row`}>
            <ul className="gba:flex gba:flex-col gba:gap-2">
              {fileList.map(f => (
                <li key={f.uid} className="gba:flex gba:items-center gba:justify-between gba:gap-3">
                  <span className="gba:truncate" data-testid={`${dataTestIdPrefix}-file-name-${f.uid}`}>
                    {f.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemove(f)}
                    className="gba:flex gba:items-center gba:gap-1 gba:text-destructive"
                    data-testid={`${dataTestIdPrefix}-remove-file-${f.uid}`}
                  >
                    <XCircleIcon className="gba:w-4 gba:h-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {true && (
            <div
              className="gba:w-full gba:flex gba:justify-end gba:mt-4"
              data-testid={`${dataTestIdPrefix}-attach-button-row`}
            >
              <input
                ref={moreFileInputRef}
                type="file"
                accept={acceptedFileTypes}
                multiple={multiple}
                className="gba:hidden"
                onChange={e => appendFiles(e.target.files)}
                data-testid={`${dataTestIdPrefix}-upload-input-with-files`}
              />
              <div
                className="gba:flex gba:items-center gba:justify-end gba:cursor-pointer gba:gap-4"
                data-testid={`${dataTestIdPrefix}-attach-more-container`}
                onClick={() => moreFileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') moreFileInputRef.current?.click()
                }}
              >
                <span className="gba:font-medium gba:text-black" data-testid={`${dataTestIdPrefix}-attach-more-text`}>
                  {attachText}
                </span>
                <img
                  src={ICONS.FOCUS}
                  alt={focusAlt}
                  width="18"
                  height="18"
                  data-testid={`${dataTestIdPrefix}-attach-more-icon`}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default UploadComponent
