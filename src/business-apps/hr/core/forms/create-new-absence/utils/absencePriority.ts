export const extractAbsencePriority = (objectValue: unknown): number => {
  if (!objectValue) return 999

  if (typeof objectValue === 'string') {
    try {
      const parsed = JSON.parse(objectValue)
      return typeof parsed?.priority === 'number' ? parsed.priority : 999
    } catch {
      return 999
    }
  }

  if (typeof objectValue === 'object' && objectValue !== null) {
    const obj = objectValue as Record<string, unknown>
    return typeof obj?.priority === 'number' ? obj.priority : 999
  }

  return 999
}
