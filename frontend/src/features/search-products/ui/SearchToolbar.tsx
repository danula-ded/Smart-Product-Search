import { RefreshCcw, Search } from 'lucide-react'

import type { DemoProfile } from '@/shared/api'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui'
import { AppButton, AppInput, Loader } from '@/shared/ui'

type SearchToolbarProps = {
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

export function SearchToolbar({
  query,
  selectedCustomer,
  profiles,
  hasDataset,
  searching,
  onQueryChange,
  onProfileChange,
  onSearch,
  onNewSession,
}: SearchToolbarProps) {
  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_280px_220px]">
      <AppInput
        label="Запрос"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            onSearch()
          }
        }}
        placeholder="Например: aktirf smartbuy 16"
        startIcon={<Search className="size-4" />}
      />

      <div className="grid gap-2">
        <span className="text-sm font-medium text-[var(--semantic-text-primary)]">
          Профиль заказчика
        </span>
        <Select value={selectedCustomer} onValueChange={onProfileChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Выберите профиль" />
          </SelectTrigger>
          <SelectContent>
            {profiles.length === 0 ? (
              <SelectItem value="__empty" disabled>
                Нет профилей
              </SelectItem>
            ) : (
              profiles.map((profile) => (
                <SelectItem key={profile.customerId} value={profile.customerId}>
                  {profile.label}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col justify-end gap-2">
        <AppButton
          stretch
          disabled={!hasDataset || searching || query.trim().length === 0}
          onClick={onSearch}
        >
          {searching ? <Loader label="Ищем" sizeClassName="size-4" /> : <Search className="size-4" />}
          {!searching ? 'Искать' : null}
        </AppButton>
        <AppButton variant="outline" stretch onClick={onNewSession}>
          <RefreshCcw className="size-4" />
          Новая сессия
        </AppButton>
      </div>
    </div>
  )
}
