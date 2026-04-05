import { createContext, useContext } from 'react'

import type { WorkspaceModel } from './useWorkspaceModel'

export const WorkspaceContext = createContext<WorkspaceModel | null>(null)

export function useWorkspace() {
  const value = useContext(WorkspaceContext)

  if (!value) {
    throw new Error('useWorkspace must be used within WorkspaceProvider.')
  }

  return value
}
