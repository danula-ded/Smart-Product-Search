import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AnalyticsPage } from '@/pages/AnalyticsPage'
import { CatalogPage } from '@/pages/CatalogPage'
import { DataPage } from '@/pages/DataPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ProductPage } from '@/pages/ProductPage'
import { SearchPage } from '@/pages/SearchPage'

import { AppLayout } from './AppLayout'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route path="/data" element={<DataPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
