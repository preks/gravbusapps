/**
 * Word-like default sizing for newly inserted document images (DPI-aware, clamp to page / local width).
 */

import type { Editor } from '@tiptap/core'
import { PAGE_FORMATS } from '@/components/tiptap-extensions/tiptap-custom-pagination'
import type { CustomImageAttributes } from '@/components/tiptap-extensions/tiptap-custom-image'
import { DEFAULT_MARGIN_CM, marginCmToPx, type PageLayoutPaginationConfig } from './pageLayoutUtils'
import { parseImageDpiFromBuffer } from './imageDpiMetadata'

export function resolvePageBodyContentWidthPx(paginationConfig: PageLayoutPaginationConfig | null): number {
  if (paginationConfig) {
    return Math.max(1, paginationConfig.pageWidth - paginationConfig.marginLeft - paginationConfig.marginRight)
  }
  const a4 = PAGE_FORMATS.A4
  const marginPx = marginCmToPx(DEFAULT_MARGIN_CM)
  return Math.max(1, a4.width - 2 * marginPx)
}

/**
 * Best-effort width of the block/container at the insertion position (table cell, paragraph, etc.).
 */
export function measureLocalContentWidthPx(editor: Editor, insertPos: number): number | null {
  try {
    const view = editor.view
    const domAtPos = view.domAtPos(insertPos)
    const baseNode =
      domAtPos.node.nodeType === Node.TEXT_NODE ? domAtPos.node.parentElement : (domAtPos.node as Element | null)

    if (!(baseNode instanceof HTMLElement) || !view.dom.contains(baseNode)) {
      return null
    }

    const imageLayoutAnchor = baseNode.closest('[data-image-layout-height]')
    const block =
      imageLayoutAnchor instanceof HTMLElement
        ? imageLayoutAnchor
        : (baseNode.closest(
            'p, li, blockquote, pre, h1, h2, h3, h4, h5, h6, td, th, figure, figcaption'
          ) as HTMLElement | null)

    const measured = block?.clientWidth ?? view.dom.clientWidth
    if (!Number.isFinite(measured) || measured <= 0) {
      return null
    }
    return Math.floor(measured)
  } catch {
    return null
  }
}

export function resolveEffectiveAvailableWidthPx(options: {
  paginationConfig: PageLayoutPaginationConfig | null
  editor?: Editor | null
  insertPos?: number | null
}): number {
  const pageBody = resolvePageBodyContentWidthPx(options.paginationConfig)
  const local =
    options.editor != null && options.insertPos != null
      ? measureLocalContentWidthPx(options.editor, options.insertPos)
      : null
  if (local == null) {
    return pageBody
  }
  return Math.max(1, Math.min(pageBody, local))
}

/**
 * Converts bitmap pixels + optional DPI into display CSS px, then clamps width to available space (no upscale).
 */
export function computeInitialImageDisplayDimensions(options: {
  naturalWidthPx: number
  naturalHeightPx: number
  dpiX: number | null
  dpiY: number | null
  availableWidthPx: number
}): { width: number; height: number } {
  const nw = options.naturalWidthPx
  const nh = options.naturalHeightPx
  if (!Number.isFinite(nw) || !Number.isFinite(nh) || nw <= 0 || nh <= 0) {
    return { width: 1, height: 1 }
  }

  let dpiX = options.dpiX
  let dpiY = options.dpiY
  if (dpiX != null && dpiX > 0 && (dpiY == null || dpiY <= 0)) {
    dpiY = dpiX
  }
  if (dpiY != null && dpiY > 0 && (dpiX == null || dpiX <= 0)) {
    dpiX = dpiY
  }

  let displayW: number
  let displayH: number
  if (dpiX != null && dpiY != null && dpiX > 0 && dpiY > 0) {
    displayW = (nw * 96) / dpiX
    displayH = (nh * 96) / dpiY
  } else {
    displayW = nw
    displayH = nh
  }

  const avail = Math.max(1, options.availableWidthPx)
  if (displayW > avail) {
    const scale = avail / displayW
    displayW = avail
    displayH = displayH * scale
  }

  return {
    width: Math.max(1, Math.round(displayW)),
    height: Math.max(1, Math.round(displayH))
  }
}

export function loadNaturalPixelSizeFromSrc(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({
        width: Math.max(1, Math.round(img.naturalWidth)),
        height: Math.max(1, Math.round(img.naturalHeight))
      })
    }
    img.onerror = () => {
      reject(new Error('image-load-failed'))
    }
    img.src = src
  })
}

export async function tryLoadImageIntrinsicPixelSize(src: string): Promise<{ width: number; height: number } | null> {
  try {
    return await loadNaturalPixelSizeFromSrc(src)
  } catch {
    return null
  }
}

async function readBlobAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') {
    return blob.arrayBuffer()
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result)
      } else {
        reject(new Error('file-read-failed'))
      }
    }
    reader.onerror = () => reject(new Error('file-read-failed'))
    reader.readAsArrayBuffer(blob)
  })
}

export async function resolveDpiFromBlob(
  blob: Blob,
  mimeType?: string | null
): Promise<{ x: number; y: number } | null> {
  try {
    const buffer = await readBlobAsArrayBuffer(blob)
    return parseImageDpiFromBuffer(buffer, mimeType ?? blob.type)
  } catch {
    return null
  }
}

export interface BuildInitialInsertedImageAttrsInput {
  src: string
  file?: File | Blob | null
  paginationConfig: PageLayoutPaginationConfig | null
  editor?: Editor | null
  insertPos?: number | null
  /** When set, skips page-body clamping and uses this width directly (e.g. note editor). */
  availableWidthPx?: number | null
}

/**
 * Full image node attrs for a new insertion (inline px sizing, locked aspect ratio).
 */
export async function buildInitialInsertedImageAttrs(
  input: BuildInitialInsertedImageAttrsInput
): Promise<CustomImageAttributes> {
  const objectUrl = input.file ? URL.createObjectURL(input.file) : null
  const measureSrc = objectUrl ?? input.src

  try {
    const [{ width: naturalW, height: naturalH }, dpi] = await Promise.all([
      loadNaturalPixelSizeFromSrc(measureSrc),
      input.file
        ? resolveDpiFromBlob(input.file instanceof File ? input.file : input.file, input.file.type)
        : Promise.resolve(null)
    ])

    const availableOverride = input.availableWidthPx
    const available =
      availableOverride != null && availableOverride > 0
        ? availableOverride
        : resolveEffectiveAvailableWidthPx({
            paginationConfig: input.paginationConfig,
            editor: input.editor ?? null,
            insertPos: input.insertPos ?? null
          })

    const { width: displayW, height: displayH } = computeInitialImageDisplayDimensions({
      naturalWidthPx: naturalW,
      naturalHeightPx: naturalH,
      dpiX: dpi?.x ?? null,
      dpiY: dpi?.y ?? null,
      availableWidthPx: available
    })

    return {
      src: input.src,
      originalWidth: naturalW,
      originalHeight: naturalH,
      width: displayW,
      height: displayH,
      widthUnit: 'px',
      heightUnit: 'px',
      widthPercent: null,
      heightPercent: null,
      scaleWidthPercent: 100,
      scaleHeightPercent: 100,
      lockAspectRatio: true
    }
  } finally {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl)
    }
  }
}
