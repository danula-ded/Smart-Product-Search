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

export const colorTokens = {
  '--color-primary-main': colors.primary.main,
  '--color-primary-emphasis': colors.primary.emphasis,
  '--color-primary-pressed': colors.primary.pressed,
  '--color-primary-hover': colors.primary.hover,
  '--color-primary-subtle': colors.primary.subtle,
  '--color-secondary-blue-main': colors.secondaryBlue.main,
  '--color-secondary-blue-emphasis': colors.secondaryBlue.emphasis,
  '--color-secondary-blue-pressed': colors.secondaryBlue.pressed,
  '--color-secondary-blue-hover': colors.secondaryBlue.hover,
  '--color-secondary-blue-subtle': colors.secondaryBlue.subtle,
  '--color-secondary-lime-main': colors.secondaryLime.main,
  '--color-secondary-lime-emphasis': colors.secondaryLime.emphasis,
  '--color-secondary-lime-pressed': colors.secondaryLime.pressed,
  '--color-secondary-lime-hover': colors.secondaryLime.hover,
  '--color-secondary-lime-subtle': colors.secondaryLime.subtle,
} as const

export type ColorTokenName = keyof typeof colorTokens

/*
Example usage in a React component:

import { colors } from '@/shared/config'

export function AccentDivider() {
  return (
    <div
      style={{
        height: 4,
        width: 96,
        borderRadius: 999,
        backgroundColor: colors.primary.main,
      }}
    />
  )
}
*/
