/** Dev CDN: append `t` for HTTP cache bust on stable paths. */
export function appendRemoteAssetCacheBust(url: string): string {
  if (!url) {
    return url
  }
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}t=${Date.now()}`
}
