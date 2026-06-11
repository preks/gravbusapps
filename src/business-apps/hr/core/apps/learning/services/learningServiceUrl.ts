export function trimTrailingSlashes(value: string): string {
  let endIndex = value.length
  while (endIndex > 0 && value[endIndex - 1] === '/') {
    endIndex -= 1
  }
  return value.slice(0, endIndex)
}
