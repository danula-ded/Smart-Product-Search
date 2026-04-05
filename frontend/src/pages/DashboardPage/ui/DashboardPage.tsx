import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useWorkspace } from '@/shared/lib/workspace'
import {
  AppButton,
  AppCard,
  AppCardContent,
  AppCardHeader,
  SectionTitle,
} from '@/shared/ui'
import { OverviewSection } from '@/widgets/OverviewSection'

export function DashboardPage() {
  const model = useWorkspace()

  return (
    <div className="space-y-8">
      <OverviewSection
        summary={model.summary}
        selectedProfile={model.selectedProfile}
        searchState={model.searchState}
      />

      <AppCard>
        <AppCardHeader className="pb-3">
          <SectionTitle
            title="Быстрые переходы"
            description="Основные рабочие сценарии вынесены на отдельные страницы приложения."
          />
        </AppCardHeader>
        <AppCardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <AppButton asChild variant="outline" className="justify-between">
            <Link to="/search">
              Перейти к поиску
              <ArrowRight className="size-4" />
            </Link>
          </AppButton>
          <AppButton asChild variant="outline" className="justify-between">
            <Link to="/catalog">
              Открыть каталог
              <ArrowRight className="size-4" />
            </Link>
          </AppButton>
          <AppButton asChild variant="outline" className="justify-between">
            <Link to="/data">
              Открыть данные
              <ArrowRight className="size-4" />
            </Link>
          </AppButton>
          <AppButton asChild variant="outline" className="justify-between">
            <Link to="/analytics">
              Смотреть аналитику
              <ArrowRight className="size-4" />
            </Link>
          </AppButton>
        </AppCardContent>
      </AppCard>
    </div>
  )
}
