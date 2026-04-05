import { useHomePageModel } from '@/pages/HomePage/model/useHomePageModel'

export function useWorkspaceModel() {
  return useHomePageModel()
}

export type WorkspaceModel = ReturnType<typeof useWorkspaceModel>
