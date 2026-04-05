import type { PropsWithChildren } from 'react'

import { TooltipProvider } from '@/shared/ui'

import { ThemeProvider } from './ThemeProvider'
import { WorkspaceProvider } from './WorkspaceProvider'

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <WorkspaceProvider>
        <TooltipProvider>{children}</TooltipProvider>
      </WorkspaceProvider>
    </ThemeProvider>
  )
}
