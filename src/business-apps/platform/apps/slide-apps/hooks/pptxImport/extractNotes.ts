// Extract speaker notes from notesSlide XML.

import type JSZip from 'jszip'
import type { SlideRelationships } from './types'
import { parseXML, getChild } from './ooxmlUtils'

export async function extractNotes(zip: JSZip, relationships: SlideRelationships): Promise<string> {
  if (!relationships.notesSlidePath) return ''

  const notesFile = zip.file(relationships.notesSlidePath)
  if (!notesFile) return ''

  const notesContent = await notesFile.async('text')
  const notesXml = parseXML(notesContent)

  const spElements = notesXml.getElementsByTagName('p:sp')
  const textParts: string[] = []

  for (let i = 0; i < spElements.length; i++) {
    const sp = spElements[i]

    const nvSpPr = getChild(sp, 'p:nvSpPr')
    if (!nvSpPr) continue
    const nvPr = getChild(nvSpPr, 'p:nvPr')
    if (!nvPr) continue
    const ph = getChild(nvPr, 'p:ph')
    if (!ph) continue

    const phType = ph.getAttribute('type')
    if (phType !== 'body') continue

    const txBody = getChild(sp, 'p:txBody')
    if (!txBody) continue

    const paragraphs = txBody.getElementsByTagName('a:p')
    for (let j = 0; j < paragraphs.length; j++) {
      const runs = paragraphs[j].getElementsByTagName('a:t')
      const runTexts: string[] = []
      for (let k = 0; k < runs.length; k++) {
        runTexts.push(runs[k].textContent || '')
      }
      const paraText = runTexts.join('')
      if (paraText.trim()) textParts.push(paraText)
    }
  }

  return textParts.join('\n').trim()
}
