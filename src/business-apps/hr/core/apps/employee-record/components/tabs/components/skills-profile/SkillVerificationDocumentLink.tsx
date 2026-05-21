import React, { useCallback } from 'react'
import { toast } from '@newwork/nw-design-system'
import { useFileClient } from '@/common/network/files/useFileClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { isPreviewableFile } from '@/common/utils/filePreview'
import { EmployeeSkillItem } from './skillsProfile.utils'

interface SkillVerificationDocumentLinkProps {
  skill: EmployeeSkillItem
  accessToken: string
  t: (key: string, args?: Record<string, unknown>) => string
}

export function SkillVerificationDocumentLink({ skill, accessToken, t }: Readonly<SkillVerificationDocumentLinkProps>) {
  const fileClient = useFileClient({ accessToken } as BusinessAppContextProps)
  const document = skill.verificationDocument

  const handleOpenDocument = useCallback(async () => {
    if (!document?.file) return

    try {
      const blob = await fileClient.getFile(
        {
          accessScope: 'tenant',
          fileId: document.file
        },
        {
          appName: 'employee-profile',
          folderPath: `/documents/${document.employeeId || ''}`
        }
      )
      const url = URL.createObjectURL(blob)
      const link = globalThis.document.createElement('a')
      link.href = url
      link.target = '_blank'
      if (!isPreviewableFile(document.mimeType ?? undefined)) {
        link.download = document.name || 'document'
      }
      globalThis.document.body.appendChild(link)
      link.click()
      link.remove()
      globalThis.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      console.error('Error opening skill verification document:', error)
      toast.error(t('skills-document-download-failed'))
    }
  }, [document?.employeeId, document?.file, document?.mimeType, document?.name, fileClient, t])

  if (!document?.file) {
    return null
  }

  return (
    <div className="gba:flex gba:items-center gba:gap-1">
      <span>{t('skills-verification-document')}:</span>
      <button
        type="button"
        className="gba:text-primary gba:font-medium gba:hover:underline gba:truncate gba:max-w-full"
        onClick={handleOpenDocument}
        data-testid={`skills-profile-verification-document-${skill.skill.id}`}
      >
        {document.name || t('skills-verification-document')}
      </button>
    </div>
  )
}
