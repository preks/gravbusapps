import test from 'node:test'
import assert from 'node:assert/strict'
import { stripPlatformHostedFontFaces } from '../postcss/strip-platform-hosted-font-faces.mjs'

test('stripPlatformHostedFontFaces removes platform-hosted @font-face only', () => {
  const input = `@font-face {
  font-family: 'Roboto Flex';
  src: url('/platform/assets/fonts/preload/roboto-flex.woff2') format('woff2');
}
@font-face {
  font-family: 'Local Only';
  src: url('./local.woff2') format('woff2');
}`

  const output = stripPlatformHostedFontFaces(input)

  assert.match(output, /Local Only/)
  assert.doesNotMatch(output, /roboto-flex/)
})
