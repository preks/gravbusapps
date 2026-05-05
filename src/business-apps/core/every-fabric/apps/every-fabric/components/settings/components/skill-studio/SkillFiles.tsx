import { useCallback, useEffect, useState } from 'react'
import { TrashIcon, FileIcon } from '@phosphor-icons/react'
import { Button } from '@newwork/nw-design-system'
import type { SkillFile } from '../../../types/enterpriseAgent'

interface SkillFilesProps {
  files: SkillFile[]
  canEdit: boolean
  onUpload?: (file: File) => void
  onDelete?: (path: string) => void
  onFetchBinary?: (path: string) => Promise<Blob>
  uploading?: boolean
}

function isImageMime(mime: string | null): boolean {
  return !!mime && mime.startsWith('image/')
}

export const SkillFiles: React.FC<SkillFilesProps> = ({
  files,
  canEdit,
  onUpload,
  onDelete,
  onFetchBinary,
  uploading
}) => {
  const [imageBlobs, setImageBlobs] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    const newBlobs: Record<string, string> = {}

    async function loadImages() {
      for (const f of files) {
        if (isImageMime(f.mime_type) && onFetchBinary) {
          try {
            const blob = await onFetchBinary(f.path)
            if (!cancelled) {
              newBlobs[f.path] = URL.createObjectURL(blob)
            }
          } catch {
            // silently ignore failed image loads
          }
        }
      }
      if (!cancelled) {
        setImageBlobs(prev => {
          // revoke old blob URLs not in new set
          Object.entries(prev).forEach(([path, url]) => {
            if (!newBlobs[path]) URL.revokeObjectURL(url)
          })
          return newBlobs
        })
      }
    }

    loadImages()

    return () => {
      cancelled = true
      Object.values(imageBlobs).forEach(url => URL.revokeObjectURL(url))
    }
  }, [files, onFetchBinary])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file && onUpload) onUpload(file)
      e.target.value = ''
    },
    [onUpload]
  )

  return (
    <div className="gba:space-y-3">
      <div className="gba:flex gba:items-center gba:justify-between">
        <h4 className="gba:text-sm gba:font-semibold gba:text-foreground">Attached Files</h4>
        {canEdit && (
          <div className="gba:relative">
            <input
              type="file"
              onChange={handleFileChange}
              disabled={uploading}
              className="gba:absolute gba:inset-0 gba:opacity-0 gba:cursor-pointer"
              data-testid="skill-file-upload"
            />
            <Button size="sm" variant="secondary" disabled={uploading}>
              {uploading ? 'Uploading…' : 'Upload File'}
            </Button>
          </div>
        )}
      </div>

      {files.length === 0 ? (
        <p className="gba:text-sm gba:text-muted-foreground">No files attached.</p>
      ) : (
        <ul className="gba:divide-y gba:divide-border gba:border gba:border-border gba:rounded-md">
          {files.map(f => (
            <li key={f.path} className="gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-2">
              <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1 gba:min-w-0">
                {imageBlobs[f.path] ? (
                  <img
                    src={imageBlobs[f.path]}
                    alt={f.path}
                    className="gba:h-10 gba:w-10 gba:rounded gba:object-cover gba:shrink-0"
                  />
                ) : (
                  <FileIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:shrink-0" />
                )}
                <span className="gba:text-sm gba:truncate">{f.path}</span>
                <span className="gba:text-xs gba:text-muted-foreground gba:shrink-0">
                  ({(f.size / 1024).toFixed(1)} KB{f.mime_type ? ` • ${f.mime_type}` : ''})
                </span>
              </div>
              {canEdit && onDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(f.path)}
                  data-testid={`delete-file-${f.path}`}
                >
                  <TrashIcon className="gba:h-4 gba:w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
