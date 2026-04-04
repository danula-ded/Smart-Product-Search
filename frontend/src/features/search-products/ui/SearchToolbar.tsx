import { RefreshCcw, Search } from 'lucide-react'

import type { DemoProfile } from '@/shared/api'
import { AppButton, AppInput, Checkbox, Loader, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui'

type SearchToolbarProps = {
  query: string
  isFeedMode: boolean
  selectedCustomer: string
  profiles: DemoProfile[]
  hasDataset: boolean
  searching: boolean
  includeDebug: boolean
  analysisLoading: boolean
  onQueryChange: (value: string) => void
  onProfileChange: (value: string) => void
  onSearch: () => void
  onNewSession: () => void
  onIncludeDebugChange: (value: boolean) => void
}

export function SearchToolbar({
  query,
  isFeedMode,
  selectedCustomer,
  profiles,
  hasDataset,
  searching,
  includeDebug,
  analysisLoading,
  onQueryChange,
  onProfileChange,
  onSearch,
  onNewSession,
  onIncludeDebugChange,
}: SearchToolbarProps) {
  return (
    <div className="space-y-4">
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
          placeholder="Оставьте поле пустым для персональной витрины или введите запрос"
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
          <AppButton stretch disabled={!hasDataset || searching} onClick={onSearch}>
            {searching ? <Loader label={isFeedMode ? 'Собираем витрину' : 'Ищем'} sizeClassName="size-4" /> : <Search className="size-4" />}
            {!searching ? (isFeedMode ? 'Подобрать' : 'Искать') : null}
          </AppButton>
          <AppButton variant="outline" stretch onClick={onNewSession}>
            <RefreshCcw className="size-4" />
            Новая сессия
          </AppButton>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-[var(--semantic-text-secondary)]">
          <Checkbox
            checked={includeDebug}
            onCheckedChange={(value) => onIncludeDebugChange(Boolean(value))}
          />
          Показывать факторы ранжирования
        </label>
        {analysisLoading ? <Loader label="Разбираем запрос" /> : null}
      </div>
    </div>
  )
}
