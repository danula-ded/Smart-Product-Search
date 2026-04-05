import { RotateCcw, Search } from 'lucide-react'

import type { DemoProfile } from '@/shared/api'
import {
  AppButton,
  AppInput,
  Loader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui'

type SearchToolbarProps = {
  query: string
  selectedCustomer: string
  profiles: DemoProfile[]
  hasDataset: boolean
  searching: boolean
  onQueryChange: (value: string) => void
  onProfileChange: (value: string) => void
  onSearch: () => void
  onReset: () => void
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
  onReset,
}: SearchToolbarProps) {
  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_280px_340px]">
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

      <div className="grid grid-cols-2 gap-3 self-end">
        <AppButton
          stretch
          disabled={!hasDataset || searching || query.trim().length === 0}
          onClick={onSearch}
        >
          {searching ? <Loader label="Ищем" sizeClassName="size-4" /> : <Search className="size-4" />}
          {!searching ? 'Искать' : null}
        </AppButton>

        <AppButton variant="outline" stretch onClick={onReset}>
          <RotateCcw className="size-4" />
          Сбросить
        </AppButton>
      </div>
    </div>
  )
}
