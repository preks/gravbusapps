/**
 * Flow Studio: Neutral toggle styling.
 *
 * Design goal: avoid "accent blue" toggles in the signature Flow Studio sidebar.
 * Checked state should use the neutral/foreground token (black-ish).
 */
export const NEUTRAL_SWITCH_CLASSNAME =
  'gba:data-[state=checked]:bg-foreground gba:data-[state=checked]:border-foreground gba:data-[state=checked]:text-foreground'
