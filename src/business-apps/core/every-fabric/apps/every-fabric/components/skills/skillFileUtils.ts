export type SkillFileDir = 'scripts' | 'references' | 'assets'

export function inferTargetDir(filename: string): SkillFileDir {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  if (['py', 'sh', 'bash', 'js', 'ts', 'mjs', 'cjs', 'rb', 'pl'].includes(ext)) return 'scripts'
  if (['md', 'txt', 'pdf', 'doc', 'docx', 'rst', 'csv'].includes(ext)) return 'references'
  return 'assets'
}

export function formatFileSize(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`
}
