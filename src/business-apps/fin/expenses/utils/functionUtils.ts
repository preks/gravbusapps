export function mergeUniqueById<T extends { id: string }>(array1: T[], array2: T[]): T[] {
  const map = new Map<string, T>()
  ;[...array1, ...array2].forEach(item => map.set(item.id, item))
  return Array.from(map.values())
}
