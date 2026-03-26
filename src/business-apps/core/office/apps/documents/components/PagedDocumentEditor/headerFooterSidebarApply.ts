import type { Editor } from '@tiptap/react'

export type HeaderFooterVariantKey = 'default' | 'firstPage' | 'odd' | 'even'

export function resolveHeaderFooterVariant(
  pageNumber: number,
  differentFirstPage: boolean,
  differentOddEven: boolean
): HeaderFooterVariantKey {
  if (pageNumber === 1 && differentFirstPage) return 'firstPage'
  if (!differentOddEven) return 'default'
  return pageNumber % 2 === 0 ? 'even' : 'odd'
}

type CmdEditor = Editor & {
  commands: Editor['commands'] & {
    setHeader?: (html: string) => boolean
    setFooter?: (html: string) => boolean
    setHeaderFirstPage?: (html: string) => boolean
    setFooterFirstPage?: (html: string) => boolean
    setHeaderOdd?: (html: string) => boolean
    setHeaderEven?: (html: string) => boolean
    setFooterOdd?: (html: string) => boolean
    setFooterEven?: (html: string) => boolean
  }
}

export function applyHeaderHtmlForPage(
  editor: Editor,
  pageNumber: number,
  html: string,
  differentFirstPage: boolean,
  differentOddEven: boolean
): void {
  const e = editor as CmdEditor
  const v = resolveHeaderFooterVariant(pageNumber, differentFirstPage, differentOddEven)
  switch (v) {
    case 'firstPage':
      e.commands.setHeaderFirstPage?.(html)
      break
    case 'odd':
      e.commands.setHeaderOdd?.(html)
      break
    case 'even':
      e.commands.setHeaderEven?.(html)
      break
    default:
      e.commands.setHeader?.(html)
  }
}

export function applyFooterHtmlForPage(
  editor: Editor,
  pageNumber: number,
  html: string,
  differentFirstPage: boolean,
  differentOddEven: boolean
): void {
  const e = editor as CmdEditor
  const v = resolveHeaderFooterVariant(pageNumber, differentFirstPage, differentOddEven)
  switch (v) {
    case 'firstPage':
      e.commands.setFooterFirstPage?.(html)
      break
    case 'odd':
      e.commands.setFooterOdd?.(html)
      break
    case 'even':
      e.commands.setFooterEven?.(html)
      break
    default:
      e.commands.setFooter?.(html)
  }
}
