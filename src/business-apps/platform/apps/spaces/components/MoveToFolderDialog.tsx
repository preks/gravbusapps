/**
 * MoveToFolderDialog
 *
 * Move an item to a folder (within the same Space).
 * Modern dialog with clean folder selection.
 */

import React, { useMemo, useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  ScrollArea,
  useTranslation
} from '@newwork/nw-design-system'
import { Folder, Search, Loader2, Home, Check } from 'lucide-react'
import type { SpaceFolder } from '../types/space.types'
import translations from '../_i18n'

export interface MoveToFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  folders: SpaceFolder[]
  itemLabel: string
  onMove: (folderId: string | null) => Promise<void>
  'data-testid'?: string
}

function buildPathMap(folders: SpaceFolder[]): Map<string, string> {
  const byId = new Map(folders.map(f => [f.id, f]))
  const cache = new Map<string, string>()

  const compute = (id: string): string => {
    const existing = cache.get(id)
    if (existing) return existing
    const folder = byId.get(id)
    if (!folder) return ''
    const parentId = folder.parentId ?? null
    const path = parentId ? `${compute(parentId)} / ${folder.name}` : folder.name
    cache.set(id, path)
    return path
  }

  for (const f of folders) compute(f.id)
  return cache
}

export const MoveToFolderDialog: React.FC<MoveToFolderDialogProps> = ({
  open,
  onOpenChange,
  folders,
  itemLabel,
  onMove,
  'data-testid': testId = 'move-to-folder-dialog'
}) => {
  const { t } = useTranslation(translations)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [isMoving, setIsMoving] = useState(false)

  useEffect(() => {
    if (open) {
      setSearchQuery('')
      setSelectedFolderId(null)
      setIsMoving(false)
    }
  }, [open])

  const pathMap = useMemo(() => buildPathMap(folders), [folders])

  const options = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const list = folders
      .map(f => ({
        id: f.id,
        path: pathMap.get(f.id) || f.name
      }))
      .sort((a, b) => a.path.localeCompare(b.path))

    return q ? list.filter(o => o.path.toLowerCase().includes(q)) : list
  }, [folders, pathMap, searchQuery])

  const handleMove = useCallback(async () => {
    setIsMoving(true)
    try {
      await onMove(selectedFolderId)
      onOpenChange(false)
    } finally {
      setIsMoving(false)
    }
  }, [onMove, onOpenChange, selectedFolderId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-md gba:p-0 gba:overflow-hidden" data-testid={testId}>
        {/* Header */}
        <div className="gba:p-6 gba:pb-4">
          <DialogHeader>
            <DialogTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg">
              <div className="gba:w-8 gba:h-8 gba:rounded-lg gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
                <Folder className="gba:w-4 gba:h-4 gba:text-primary" />
              </div>
              {t('move-to-folder-title')}
            </DialogTitle>
            <DialogDescription className="gba:text-sm gba:text-muted-foreground gba:mt-1">
              {t('move-to-folder-description', { item: itemLabel })}
            </DialogDescription>
          </DialogHeader>

          <div className="gba:relative gba:mt-4">
            <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('common-search-folders-placeholder')}
              className="gba:pl-10 gba:h-10"
              data-testid={`${testId}-search`}
            />
          </div>
        </div>

        {/* Folder list */}
        <ScrollArea className="gba:h-72 gba:border-y gba:border-border/50">
          <div className="gba:p-3 gba:space-y-1">
            {/* Root option */}
            <button
              type="button"
              onClick={() => setSelectedFolderId(null)}
              className={`gba:w-full gba:flex gba:items-center gba:gap-3 gba:p-3 gba:rounded-lg gba:transition-all gba:duration-150 ${
                selectedFolderId === null ? 'gba:bg-primary/10 gba:ring-1 gba:ring-primary/30' : 'gba:hover:bg-muted/50'
              }`}
              data-testid={`${testId}-root`}
            >
              <div
                className={`gba:w-9 gba:h-9 gba:rounded-lg gba:flex gba:items-center gba:justify-center ${
                  selectedFolderId === null ? 'gba:bg-primary/20' : 'gba:bg-muted'
                }`}
              >
                <Home
                  className={`gba:w-4 gba:h-4 ${
                    selectedFolderId === null ? 'gba:text-primary' : 'gba:text-muted-foreground'
                  }`}
                />
              </div>
              <div className="gba:flex-1 gba:text-left">
                <p
                  className={`gba:text-sm gba:font-medium ${
                    selectedFolderId === null ? 'gba:text-primary' : 'gba:text-foreground'
                  }`}
                >
                  {t('common-root')}
                </p>
                <p className="gba:text-xs gba:text-muted-foreground">{t('common-no-folder-top-level')}</p>
              </div>
              {selectedFolderId === null && <Check className="gba:w-4 gba:h-4 gba:text-primary" />}
            </button>

            {/* Folder options */}
            {options.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedFolderId(opt.id)}
                className={`gba:w-full gba:flex gba:items-center gba:gap-3 gba:p-3 gba:rounded-lg gba:transition-all gba:duration-150 ${
                  selectedFolderId === opt.id
                    ? 'gba:bg-primary/10 gba:ring-1 gba:ring-primary/30'
                    : 'gba:hover:bg-muted/50'
                }`}
                data-testid={`${testId}-folder-${opt.id}`}
              >
                <div
                  className={`gba:w-9 gba:h-9 gba:rounded-lg gba:flex gba:items-center gba:justify-center ${
                    selectedFolderId === opt.id ? 'gba:bg-warning/20' : 'gba:bg-warning/10'
                  }`}
                >
                  <Folder className="gba:w-4 gba:h-4 gba:text-warning" />
                </div>
                <p
                  className={`gba:flex-1 gba:text-sm gba:text-left gba:truncate ${
                    selectedFolderId === opt.id ? 'gba:text-primary gba:font-medium' : 'gba:text-foreground'
                  }`}
                >
                  {opt.path}
                </p>
                {selectedFolderId === opt.id && <Check className="gba:w-4 gba:h-4 gba:text-primary" />}
              </button>
            ))}

            {/* Empty state */}
            {options.length === 0 && searchQuery && (
              <div className="gba:text-center gba:py-8">
                <p className="gba:text-sm gba:text-muted-foreground">{t('move-to-folder-empty-search')}</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="gba:p-4 gba:flex gba:justify-end gba:gap-2 gba:bg-muted/20">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isMoving}>
            {t('common-cancel')}
          </Button>
          <Button onClick={handleMove} disabled={isMoving} data-testid={`${testId}-move`}>
            {isMoving ? (
              <>
                <Loader2 className="gba:w-4 gba:h-4 gba:mr-2 gba:animate-spin" />
                {t('move-to-folder-moving')}
              </>
            ) : (
              t('common-move-here')
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default MoveToFolderDialog
