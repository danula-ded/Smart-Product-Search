import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AnalyticsPage } from '@/pages/AnalyticsPage'
import { CatalogPage } from '@/pages/CatalogPage'
import { DataPage } from '@/pages/DataPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { SearchPage } from '@/pages/SearchPage'
import { SettingsPage } from '@/pages/SettingsPage'

import { AppLayout } from './AppLayout'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/data" element={<DataPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
