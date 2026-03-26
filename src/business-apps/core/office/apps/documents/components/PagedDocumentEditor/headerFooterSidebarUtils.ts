import type { Editor } from '@tiptap/react'
import { CM_TO_PX } from '../../utils/pageLayoutUtils'

export function marginPxToCm(px: number): number {
  return Math.round((px / CM_TO_PX) * 100) / 100
}

export function pxToDisplay(px: number, unit: 'cm' | 'in'): number {
  const cm = marginPxToCm(px)
  return unit === 'in' ? Math.round((cm / 2.54) * 1000) / 1000 : cm
}

export function displayToPx(val: number, unit: 'cm' | 'in'): number {
  const cm = unit === 'in' ? val * 2.54 : val
  return Math.max(0, Math.round(cm * CM_TO_PX))
}

export type HeaderFooterPaginationCmd = Editor['commands'] & {
  setDifferentFirstPage?: (v: boolean) => boolean
  setDifferentOddEven?: (v: boolean) => boolean
  openHeaderEditor?: (p: { pageNumber: number }) => boolean
  openFooterEditor?: (p: { pageNumber: number }) => boolean
  closeHeaderFooterEditors?: () => boolean
  setHeaderTopMargin?: (n: number) => boolean
  setFooterBottomMargin?: (n: number) => boolean
  setPaginationDocumentTitle?: (title: string) => boolean
}
