import type { DemoProfile } from '@/shared/api'
import {
  AppCard,
  AppCardContent,
  AppCardHeader,
  SectionTitle,
} from '@/shared/ui'
import { SearchToolbar } from '@/features/search-products'

type SearchSectionProps = {
  error: string | null
  query: string
  selectedCustomer: string
  profiles: DemoProfile[]
  hasDataset: boolean
  searching: boolean
  onQueryChange: (value: string) => void
  onProfileChange: (value: string) => void
  onSearch: () => void
  onNewSession: () => void
}

export function SearchSection({
  error,
  query,
  selectedCustomer,
  profiles,
  hasDataset,
  searching,
  onQueryChange,
  onProfileChange,
  onSearch,
  onNewSession,
}: SearchSectionProps) {
  return (
    <section className="space-y-4">
      <SectionTitle
        title="Поиск и подбор"
        description="Сформируйте запрос, выберите профиль заказчика и запустите поиск по каталогу."
      />

      {error ? (
        <div className="rounded-lg border border-[var(--semantic-border-interactive)] bg-[var(--semantic-background-danger)] px-4 py-4 text-sm text-[var(--semantic-status-danger)]">
          {error}
        </div>
      ) : null}

      <AppCard>
        <AppCardHeader className="pb-3">
          <SectionTitle
            title="Параметры поиска"
            description="Основные параметры собраны в одном блоке без дополнительных технических настроек."
          />
        </AppCardHeader>
        <AppCardContent>
          <SearchToolbar
            query={query}
            selectedCustomer={selectedCustomer}
            profiles={profiles}
            hasDataset={hasDataset}
            searching={searching}
            onQueryChange={onQueryChange}
            onProfileChange={onProfileChange}
            onSearch={onSearch}
            onNewSession={onNewSession}
          />
        </AppCardContent>
      </AppCard>
    </section>
  )
}
