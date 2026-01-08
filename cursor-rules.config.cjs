/**
 * NEWWORK Cursor Rules Configuration
 *
 * This file configures which Cursor rules are synced to your project.
 * Run 'npx cursor-rules sync' after making changes.
 *
 * @see https://bitbucket.org/new-work-team/cursor-rules
 */
module.exports = {
  // Base preset to extend
  extends: ['@newwork/cursor-rules/presets/business-apps'],

  modules: ['crm', 'hr', 'fin', 'mdm', 'irm'],
  // Project-specific rule overrides
  rules: {
    // Example: Override max file size
    // 'required/10-component-structure': {
    //   customizations: {
    //     maxFileSize: 400,
    //   },
    // },
  },

  // Local rules to include (project-specific)
  include: ['.cursor/rules/local/**/*.mdc'],

  // Rules to exclude
  exclude: [
    // 'modules/hr', // Example: exclude HR module
  ],

  // Output directory (default: .cursor/rules)
  outputDir: '.cursor/rules',

  // Generate single .cursorrules file for legacy support
  generateLegacyFile: false,

  // Variable substitutions for rule templates
  variables: {
    projectName: 'gravity-business-apps',
    designSystemPackage: '@newwork/nw-design-system',
    tailwindPrefix: 'gba:'
  }
}
