import { useNavigate } from 'react-router-dom'

import { useWorkspace } from '@/shared/lib/workspace'
import { SearchSection } from '@/widgets/SearchSection'

export function SearchPage() {
  const navigate = useNavigate()
  const model = useWorkspace()

  async function handleSearch() {
    await model.executeSearch({ nextPage: 1 })
    navigate('/catalog')
  }

  return (
    <SearchSection
      error={model.error}
      query={model.query}
      selectedCustomer={model.selectedCustomer}
      profiles={model.profiles}
      hasDataset={model.hasDataset}
      searching={model.searching}
      onQueryChange={model.setQuery}
      onProfileChange={model.handleProfileChange}
      onSearch={() => void handleSearch()}
      onNewSession={model.startNewSession}
    />
  )
}
