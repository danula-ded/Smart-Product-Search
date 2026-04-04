import { colors } from '@/shared/config/colors'
import { mixHex, withAlpha } from '@/shared/lib/color'

export type SemanticColors = {
  buttonPrimary: string
  buttonHover: string
  buttonActive: string
  buttonSecondary: string
  buttonSecondaryHover: string
  buttonSecondaryActive: string
  buttonAccent: string
  buttonAccentHover: string
  backgroundMain: string
  backgroundSection: string
  backgroundCard: string
  backgroundElevated: string
  backgroundInfo: string
  backgroundAccent: string
  backgroundHighlight: string
  backgroundDanger: string
  textPrimary: string
  textSecondary: string
  textMuted: string
  textOnAccent: string
  borderDefault: string
  borderMuted: string
  borderStrong: string
  borderInteractive: string
  borderAccent: string
  linkPrimary: string
  linkHover: string
  iconPrimary: string
  iconAccent: string
  statusSuccess: string
  statusInfo: string
  statusDanger: string
  focusRing: string
  overlay: string
  selectedSurface: string
  selectedBorder: string
  progressTrack: string
  controlDisabled: string
  controlHover: string
}

const white = '#FFFFFF'

export const semanticColors = {
  // Filled CTA button background.
  buttonPrimary: colors.primary.main,
  // CTA button hover state.
  buttonHover: colors.primary.hover,
  // CTA button active or pressed state.
  buttonActive: colors.primary.pressed,
  // Secondary informational button background.
  buttonSecondary: colors.secondaryBlue.main,
  // Secondary informational button hover state.
  buttonSecondaryHover: colors.secondaryBlue.hover,
  // Secondary informational button active state.
  buttonSecondaryActive: colors.secondaryBlue.pressed,
  // Accent action background for lime badges and positive highlights.
  buttonAccent: colors.secondaryLime.main,
  // Hover state for accent actions and highlighted chips.
  buttonAccentHover: colors.secondaryLime.hover,
  // Main application background.
  backgroundMain: mixHex(colors.secondaryBlue.subtle, white, 7),
  // Section background for grouped content blocks.
  backgroundSection: mixHex(colors.secondaryBlue.subtle, white, 12),
  // Default card background.
  backgroundCard: mixHex(colors.secondaryBlue.subtle, white, 4),
  // Elevated surfaces such as dialogs and dropdowns.
  backgroundElevated: white,
  // Informational panels, links context and filters.
  backgroundInfo: mixHex(colors.secondaryBlue.subtle, white, 18),
  // Accent panels, selected rows and highlight boxes.
  backgroundAccent: mixHex(colors.secondaryLime.subtle, white, 18),
  // Warm highlight panels for hero and focus content.
  backgroundHighlight: mixHex(colors.primary.subtle, white, 16),
  // Warning and destructive soft surface.
  backgroundDanger: mixHex(colors.primary.subtle, white, 14),
  // Main typography color.
  textPrimary: colors.secondaryBlue.pressed,
  // Secondary supporting text.
  textSecondary: mixHex(colors.secondaryBlue.pressed, white, 56),
  // Muted helper text, labels and captions.
  textMuted: mixHex(colors.secondaryBlue.emphasis, white, 48),
  // Text placed on strong CTA buttons.
  textOnAccent: white,
  // Default border for cards, inputs and dividers.
  borderDefault: mixHex(colors.secondaryBlue.emphasis, white, 18),
  // Muted border for subtle separators.
  borderMuted: mixHex(colors.secondaryBlue.subtle, white, 34),
  // Strong border for emphasized cards and selected blocks.
  borderStrong: colors.secondaryBlue.main,
  // Interactive border for hover and focus states.
  borderInteractive: colors.primary.emphasis,
  // Accent border for selected tags and success states.
  borderAccent: colors.secondaryLime.emphasis,
  // Main link and navigation color.
  linkPrimary: colors.secondaryBlue.main,
  // Hover state for links and icon buttons.
  linkHover: colors.secondaryBlue.hover,
  // Default icon color for informative UI.
  iconPrimary: colors.secondaryBlue.main,
  // Accent icon color for CTA and highlight icons.
  iconAccent: colors.primary.main,
  // Success and positive metric state.
  statusSuccess: colors.secondaryLime.pressed,
  // Informational state and badges.
  statusInfo: colors.secondaryBlue.main,
  // Negative or destructive state.
  statusDanger: colors.primary.pressed,
  // Focus ring color for accessible outlines.
  focusRing: withAlpha(colors.secondaryBlue.hover, 0.18),
  // Overlay background for dialogs.
  overlay: withAlpha(colors.secondaryBlue.pressed, 0.18),
  // Selected state surface for filters and highlighted products.
  selectedSurface: mixHex(colors.secondaryLime.hover, white, 22),
  // Selected state border for interactive cards.
  selectedBorder: colors.secondaryLime.emphasis,
  // Progress track behind bars.
  progressTrack: mixHex(colors.secondaryBlue.subtle, white, 26),
  // Disabled controls and read-only surfaces.
  controlDisabled: mixHex(colors.secondaryBlue.subtle, white, 16),
  // Mild hover surface for rows and controls.
  controlHover: mixHex(colors.secondaryBlue.subtle, white, 14),
} as const satisfies SemanticColors

export const semanticColorTokens = {
  '--semantic-button-primary': semanticColors.buttonPrimary,
  '--semantic-button-hover': semanticColors.buttonHover,
  '--semantic-button-active': semanticColors.buttonActive,
  '--semantic-button-secondary': semanticColors.buttonSecondary,
  '--semantic-button-secondary-hover': semanticColors.buttonSecondaryHover,
  '--semantic-button-secondary-active': semanticColors.buttonSecondaryActive,
  '--semantic-button-accent': semanticColors.buttonAccent,
  '--semantic-button-accent-hover': semanticColors.buttonAccentHover,
  '--semantic-background-main': semanticColors.backgroundMain,
  '--semantic-background-section': semanticColors.backgroundSection,
  '--semantic-background-card': semanticColors.backgroundCard,
  '--semantic-background-elevated': semanticColors.backgroundElevated,
  '--semantic-background-info': semanticColors.backgroundInfo,
  '--semantic-background-accent': semanticColors.backgroundAccent,
  '--semantic-background-highlight': semanticColors.backgroundHighlight,
  '--semantic-background-danger': semanticColors.backgroundDanger,
  '--semantic-text-primary': semanticColors.textPrimary,
  '--semantic-text-secondary': semanticColors.textSecondary,
  '--semantic-text-muted': semanticColors.textMuted,
  '--semantic-text-on-accent': semanticColors.textOnAccent,
  '--semantic-border-default': semanticColors.borderDefault,
  '--semantic-border-muted': semanticColors.borderMuted,
  '--semantic-border-strong': semanticColors.borderStrong,
  '--semantic-border-interactive': semanticColors.borderInteractive,
  '--semantic-border-accent': semanticColors.borderAccent,
  '--semantic-link-primary': semanticColors.linkPrimary,
  '--semantic-link-hover': semanticColors.linkHover,
  '--semantic-icon-primary': semanticColors.iconPrimary,
  '--semantic-icon-accent': semanticColors.iconAccent,
  '--semantic-status-success': semanticColors.statusSuccess,
  '--semantic-status-info': semanticColors.statusInfo,
  '--semantic-status-danger': semanticColors.statusDanger,
  '--semantic-focus-ring': semanticColors.focusRing,
  '--semantic-overlay': semanticColors.overlay,
  '--semantic-selected-surface': semanticColors.selectedSurface,
  '--semantic-selected-border': semanticColors.selectedBorder,
  '--semantic-progress-track': semanticColors.progressTrack,
  '--semantic-control-disabled': semanticColors.controlDisabled,
  '--semantic-control-hover': semanticColors.controlHover,
} as const

export type SemanticTokenName = keyof typeof semanticColorTokens
