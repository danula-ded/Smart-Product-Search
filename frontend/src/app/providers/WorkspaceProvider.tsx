import type { PropsWithChildren } from 'react'

import { WorkspaceContext, useWorkspaceModel } from '@/shared/lib/workspace'

export function WorkspaceProvider({ children }: PropsWithChildren) {
  const model = useWorkspaceModel()

  return <WorkspaceContext.Provider value={model}>{children}</WorkspaceContext.Provider>
}
