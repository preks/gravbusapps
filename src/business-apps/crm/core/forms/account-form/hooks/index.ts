export { useCountries } from './useCountries'
export { useCountriesGraphQL } from './useCountriesGraphQL'

// Default export for wrapper compatibility
const hooks = {
  useCountries,
  useCountriesGraphQL
}

export default hooks as unknown as any
