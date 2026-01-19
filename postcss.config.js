import tailwindcss from '@tailwindcss/postcss'

const renameTailwindLayersPlugin = () => {
  return {
    postcssPlugin: 'rename-tailwind-layers',
    Once(root) {
      root.walkAtRules('layer', rule => {
        const layerNames = rule.params.split(',').map(name => name.trim())

        const layerMapping = {
          properties: 'gravity-business-apps-properties',
          theme: 'gravity-business-apps-theme',
          base: 'gravity-business-apps-base',
          components: 'gravity-business-apps-components',
          utilities: 'all-newwork-tw-utilities'
        }

        const renamedLayers = layerNames.map(layerName => {
          return layerMapping[layerName] || layerName
        })

        rule.params = renamedLayers.join(', ')
      })
    }
  }
}

renameTailwindLayersPlugin.postcss = true

export default {
  plugins: [tailwindcss, renameTailwindLayersPlugin()]
}
