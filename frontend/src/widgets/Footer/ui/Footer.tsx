export function Footer() {
  return (
    <footer className="border-t border-[var(--semantic-border-default)] bg-[var(--semantic-background-section)]">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-3 px-4 py-6 sm:px-6 xl:px-8 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-[var(--semantic-text-primary)]">
            Smart Product Search
          </div>
          <div className="text-sm text-[var(--semantic-text-secondary)]">
            Единое рабочее место для поиска, подбора и анализа продукции.
          </div>
        </div>
        <div className="text-xs text-[var(--semantic-text-muted)]">(c) 2026 Smart Product Search</div>
      </div>
    </footer>
  )
}
