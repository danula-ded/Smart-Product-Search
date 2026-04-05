import type { PropsWithChildren } from 'react'

import { colorTokens, semanticColorTokens } from '@/shared/config'

function createCssVariables() {
  const variableEntries = [...Object.entries(colorTokens), ...Object.entries(semanticColorTokens)]
  return variableEntries.map(([key, value]) => `${key}: ${value};`).join('\n')
}

const themeStyles = `
:root {
  ${createCssVariables()}
}
`

export function ThemeProvider({ children }: PropsWithChildren) {
  return (
    <>
      <style>{themeStyles}</style>
      {children}
    </>
  )
}
