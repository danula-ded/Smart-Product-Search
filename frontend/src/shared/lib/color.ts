function normalizeHex(hex: string) {
  const normalized = hex.replace('#', '').trim()
  if (normalized.length === 3) {
    return normalized
      .split('')
      .map((char) => `${char}${char}`)
      .join('')
  }
  if (normalized.length !== 6) {
    throw new Error(`Invalid hex color: ${hex}`)
  }
  return normalized
}

function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex)
  const value = Number.parseInt(normalized, 16)

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  }
}

function componentToHex(component: number) {
  return component.toString(16).padStart(2, '0').toUpperCase()
}

export function rgbToHex(red: number, green: number, blue: number) {
  return `#${componentToHex(red)}${componentToHex(green)}${componentToHex(blue)}` as const
}

export function mixHex(left: string, right: string, leftWeight = 50) {
  const ratio = Math.max(0, Math.min(100, leftWeight)) / 100
  const leftRgb = hexToRgb(left)
  const rightRgb = hexToRgb(right)

  return rgbToHex(
    Math.round(leftRgb.r * ratio + rightRgb.r * (1 - ratio)),
    Math.round(leftRgb.g * ratio + rightRgb.g * (1 - ratio)),
    Math.round(leftRgb.b * ratio + rightRgb.b * (1 - ratio)),
  )
}

export function withAlpha(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex)
  const normalizedAlpha = Math.max(0, Math.min(1, alpha))

  return `rgb(${r} ${g} ${b} / ${normalizedAlpha})`
}
