import type { DocumentSection } from '../components/DocumentHero'

export function readInitialSectionFromUrl(): DocumentSection {
  if (globalThis.window === undefined) {
    return 'my-documents'
  }

  const section = new URLSearchParams(globalThis.window.location.search).get('section')
  const validSections: DocumentSection[] = [
    'home',
    'my-documents',
    'shared',
    'templates',
    'favorites',
    'recent',
    'trash'
  ]

  return validSections.includes(section as DocumentSection) ? (section as DocumentSection) : 'my-documents'
}
