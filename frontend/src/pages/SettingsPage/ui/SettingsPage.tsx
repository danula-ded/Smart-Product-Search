import { AppCard, AppCardContent, AppCardHeader, SectionTitle } from '@/shared/ui'

export function SettingsPage() {
  return (
    <div className="space-y-4">
      <SectionTitle
        title="Настройки"
        description="Раздел предназначен для общих пользовательских параметров и организационных сведений."
      />

      <AppCard>
        <AppCardHeader className="pb-3">
          <SectionTitle
            title="Параметры рабочего места"
            description="Текущая версия приложения использует единые настройки интерфейса. Дополнительные пользовательские параметры будут расширяться по мере развития системы."
          />
        </AppCardHeader>
        <AppCardContent className="text-sm leading-6 text-[var(--semantic-text-secondary)]">
          Здесь будут размещаться параметры, связанные с персональными настройками рабочего места,
          уведомлениями и предпочтениями интерфейса без вывода технических данных системы.
        </AppCardContent>
      </AppCard>
    </div>
  )
}
