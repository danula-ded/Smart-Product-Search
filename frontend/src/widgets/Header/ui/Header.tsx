import { useLocation } from 'react-router-dom'

import { getNavigationItem } from '@/shared/config'
import { useWorkspace } from '@/shared/lib/workspace'
import { AppButton, Loader } from '@/shared/ui'

export function Header() {
  const { pathname } = useLocation()
  const navigationItem = getNavigationItem(pathname)
  const { loadingData, refreshAll } = useWorkspace()

  return (
    <header className="border-b border-[var(--semantic-border-default)] bg-[var(--semantic-background-elevated)]">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-4 px-4 py-5 sm:px-6 xl:px-8 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--semantic-text-muted)]">
            {navigationItem.label}
          </div>
          <div className="text-2xl font-semibold tracking-tight text-[var(--semantic-text-primary)]">
            {navigationItem.pageTitle}
          </div>
          <div className="max-w-[72ch] text-sm leading-6 text-[var(--semantic-text-secondary)]">
            {navigationItem.pageDescription}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <AppButton variant="outline" onClick={() => void refreshAll()} disabled={loadingData}>
            {loadingData ? <Loader label="Обновляем" sizeClassName="size-4" /> : null}
            {!loadingData ? 'Обновить данные' : null}
          </AppButton>
        </div>
      </div>
    </header>
  )
}
