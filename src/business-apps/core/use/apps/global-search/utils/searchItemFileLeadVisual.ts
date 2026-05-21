/**
 * Tint classes for Phosphor file lead icons — aligned with drive MIME / type colors
 * (see DriveContentGrid MIME_ICON_MAP and TYPE_COLORS).
 */
const PHOSPHOR_FILE_LEAD_VISUAL: Record<string, { iconClass: string; containerClass: string }> = {
  FileXls: { iconClass: 'gba:text-success', containerClass: 'gba:bg-success/10' },
  FileCsv: { iconClass: 'gba:text-success', containerClass: 'gba:bg-success/10' },
  FileDoc: { iconClass: 'gba:text-info', containerClass: 'gba:bg-info/10' },
  FileTxt: { iconClass: 'gba:text-info', containerClass: 'gba:bg-info/10' },
  FileMd: { iconClass: 'gba:text-info', containerClass: 'gba:bg-info/10' },
  FileHtml: { iconClass: 'gba:text-info', containerClass: 'gba:bg-info/10' },
  FileText: { iconClass: 'gba:text-info', containerClass: 'gba:bg-info/10' },
  FilePpt: { iconClass: 'gba:text-warning', containerClass: 'gba:bg-warning/10' },
  FilePdf: { iconClass: 'gba:text-destructive', containerClass: 'gba:bg-destructive/10' },
  FileImage: { iconClass: 'gba:text-primary', containerClass: 'gba:bg-primary/10' },
  FilePng: { iconClass: 'gba:text-primary', containerClass: 'gba:bg-primary/10' },
  FileJpg: { iconClass: 'gba:text-primary', containerClass: 'gba:bg-primary/10' },
  FileZip: { iconClass: 'gba:text-muted-foreground', containerClass: 'gba:bg-muted' },
  FileArchive: { iconClass: 'gba:text-muted-foreground', containerClass: 'gba:bg-muted' },
  File: { iconClass: 'gba:text-muted-foreground', containerClass: 'gba:bg-muted' }
}

export function resolveOfficeFileLeadVisual(
  phosphorIconBaseName: string | undefined
): { iconClass: string; containerClass: string } | null {
  if (!phosphorIconBaseName) {
    return null
  }
  return PHOSPHOR_FILE_LEAD_VISUAL[phosphorIconBaseName] ?? null
}
