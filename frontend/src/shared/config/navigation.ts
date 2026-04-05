import type { LucideIcon } from 'lucide-react'
import { BarChart3, Database, FolderKanban, Home } from 'lucide-react'

export const appNavigationItems = [
  {
    path: '/',
    label: 'Главная',
    icon: Home,
    sidebarDescription: 'Общий обзор и ключевые показатели',
    pageTitle: 'Главная',
    pageDescription: 'Общий обзор состояния каталога и текущей рабочей области.',
  },
  {
    path: '/catalog',
    label: 'Каталог',
    icon: FolderKanban,
    sidebarDescription: 'Поиск, фильтры и результаты',
    pageTitle: 'Каталог продукции',
    pageDescription: 'Строка поиска, фильтры и выдача товаров собраны в одном экране.',
  },
  {
    path: '/data',
    label: 'Данные',
    icon: Database,
    sidebarDescription: 'Импорт, очистка и статус базы',
    pageTitle: 'Данные',
    pageDescription: 'Быстрый старт, дозагрузка CSV, очистка базы и контроль статуса импорта.',
  },
  {
    path: '/analytics',
    label: 'Аналитика',
    icon: BarChart3,
    sidebarDescription: 'Качество выдачи и динамика',
    pageTitle: 'Аналитика',
    pageDescription: 'Показатели качества и динамика изменений в результатах поиска.',
  },
] as const

export type AppNavigationItem = (typeof appNavigationItems)[number] & {
  icon: LucideIcon
}
export type AppRoutePath = AppNavigationItem['path']

export function getNavigationItem(pathname: string) {
  return appNavigationItems.find((item) => item.path === pathname) ?? appNavigationItems[0]
}
