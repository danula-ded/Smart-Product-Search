export type HexColor = `#${string}`

export type ColorRole = 'main' | 'emphasis' | 'pressed' | 'hover' | 'subtle'

export type ColorScale = Record<ColorRole, HexColor>

export type Colors = {
  primary: ColorScale
  secondaryBlue: ColorScale
  secondaryLime: ColorScale
}

export const colors = {
  primary: {
    // Main brand action color for primary buttons, active icons, and key highlights.
    main: '#FF3900',
    // Strong supporting accent for outlined actions, emphasized borders, and badges.
    emphasis: '#BF5030',
    // Pressed or active state for primary actions, selected tabs, and strong emphasis.
    pressed: '#A62500',
    // Hover state for primary buttons, links, and interactive accents.
    hover: '#FF6B40',
    // Soft accent surface for card backgrounds, banners, and selected rows.
    subtle: '#FF9273',
  },
  secondaryBlue: {
    // Main cool accent for links, informational actions, and data-heavy UI accents.
    main: '#1047A9',
    // Strong blue for default borders, secondary buttons, and focused containers.
    emphasis: '#29477F',
    // Deep blue for primary text, active states, and high-contrast labels.
    pressed: '#052A6E',
    // Hover state for blue actions, tabs, and interactive informational elements.
    hover: '#4577D4',
    // Light blue surface for app background sections, cards, and neutral fills.
    subtle: '#6B90D4',
  },
  secondaryLime: {
    // Main energetic accent for success-like highlights, feature chips, and CTA support.
    main: '#AEF100',
    // Strong lime for bordered highlights, status pills, and supportive accents.
    emphasis: '#8FB52D',
    // Pressed lime for active states, emphasized tags, and vivid accent text on dark UI.
    pressed: '#719D00',
    // Hover state for lime accents, chips, and promotional interactive surfaces.
    hover: '#C4F83E',
    // Soft lime fill for hero backgrounds, callout cards, and highlighted sections.
    subtle: '#D2F870',
  },
} as const satisfies Colors

export type SemanticColors = {
  buttonPrimary: HexColor
  buttonHover: HexColor
  buttonActive: HexColor
  backgroundMain: HexColor
  backgroundAccent: HexColor
  textPrimary: HexColor
  textOnAccent: HexColor
  borderDefault: HexColor
  borderInteractive: HexColor
}

export const semanticColors = {
  // Filled primary button background.
  buttonPrimary: colors.primary.main,
  // Primary button hover state.
  buttonHover: colors.primary.hover,
  // Primary button pressed or active state.
  buttonActive: colors.primary.pressed,
  // Main application surface or large page section background.
  backgroundMain: colors.secondaryBlue.subtle,
  // Highlighted surface for callouts, tags, or promotional blocks.
  backgroundAccent: colors.secondaryLime.subtle,
  // Default text color for headings, body copy, and key labels.
  textPrimary: colors.secondaryBlue.pressed,
  // Text color placed on bright accent surfaces such as orange or lime buttons.
  textOnAccent: colors.secondaryBlue.pressed,
  // Default border color for inputs, cards, and separators.
  borderDefault: colors.secondaryBlue.emphasis,
  // Interactive border for hover/focus states on actionable components.
  borderInteractive: colors.primary.emphasis,
} as const satisfies SemanticColors

/*
Example usage in a React component:

import { useState } from 'react'

import { semanticColors } from '@/theme/colors'

export function PrimaryActionButton() {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      style={{
        backgroundColor: semanticColors.backgroundMain,
        color: semanticColors.textPrimary,
        border: `1px solid ${semanticColors.borderDefault}`,
        borderRadius: 16,
        padding: 16,
      }}
    >
      <button
        type="button"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          backgroundColor: isHovered
            ? semanticColors.buttonHover
            : semanticColors.buttonPrimary,
          color: semanticColors.textOnAccent,
          border: `1px solid ${semanticColors.borderInteractive}`,
          borderRadius: 12,
          padding: '12px 16px',
        }}
      >
        Find product
      </button>
    </div>
  )
}
*/
