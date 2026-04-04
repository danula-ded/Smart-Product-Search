export function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat('ru-RU').format(value ?? 0)
}

export function formatMoney(value: number | null | undefined) {
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 0,
  }).format(value ?? 0)
}

export function formatMetric(value: number | null | undefined) {
  if (value == null) {
    return '0.0000'
  }

  return value.toFixed(4)
}

export function formatSignedScore(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`
}
