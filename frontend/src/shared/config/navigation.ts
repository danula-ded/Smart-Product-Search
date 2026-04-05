import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Database,
  FolderKanban,
  Home,
  Search,
  Settings,
} from 'lucide-react'

export const appNavigationItems = [
  {
    path: '/',
    label: 'Главная',
    icon: Home,
    sidebarDescription: 'Общий обзор и ключевые показатели',
    pageTitle: 'Главная',
    pageDescription: 'Общий обзор состояния каталога, профилей и текущей рабочей области.',
  },
  {
    path: '/search',
    label: 'Поиск',
    icon: Search,
    sidebarDescription: 'Запрос и параметры подбора',
    pageTitle: 'Поиск продукции',
    pageDescription: 'Формирование поискового запроса и выбор профиля заказчика.',
  },
  {
    path: '/catalog',
    label: 'Каталог',
    icon: FolderKanban,
    sidebarDescription: 'Фильтры и результаты поиска',
    pageTitle: 'Каталог продукции',
    pageDescription: 'Работа с фильтрами, карточками товаров и результатами поиска.',
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
  {
    path: '/settings',
    label: 'Настройки',
    icon: Settings,
    sidebarDescription: 'Параметры рабочего места',
    pageTitle: 'Настройки',
    pageDescription: 'Общие параметры использования системы и организационные сведения.',
  },
] as const

export type AppNavigationItem = (typeof appNavigationItems)[number] & {
  icon: LucideIcon
}
export type AppRoutePath = AppNavigationItem['path']

export function getNavigationItem(pathname: string) {
  return appNavigationItems.find((item) => item.path === pathname) ?? appNavigationItems[0]
}
