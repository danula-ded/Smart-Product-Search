import type { UploadMode } from '@/shared/api/backend'

export type TabId = 'search' | 'dynamics' | 'metrics' | 'data'

export type SearchActionKey =
  | 'open'
  | 'details'
  | 'relevant'
  | 'save'
  | 'bounce'
  | 'irrelevant'

export const pageSizeOptions = [12, 24, 48] as const

export const incrementalModes: Array<{
  value: UploadMode
  label: string
  description: string
}> = [
  {
    value: 'upsert_ste',
    label: 'СТЕ',
    description: 'Добавляет или обновляет товары каталога.',
  },
  {
    value: 'append_contracts',
    label: 'Контракты',
    description: 'Дозагружает историю закупок и пересобирает профили.',
  },
  {
    value: 'upsert_bundle',
    label: 'Оба файла',
    description: 'Обновляет каталог и историю закупок за один проход.',
  },
]

export const searchActionDetails = {
  open: {
    label: 'Открыть',
    description: 'Открывает карточку товара и даёт мягкий положительный сигнал текущему товару.',
    impact: 'Поднимает этот товар и похожие позиции в текущей сессии.',
  },
  details: {
    label: 'Детали',
    description: 'Открывает полную карточку без оценочного сигнала.',
    impact: 'На ранжирование не влияет.',
  },
  relevant: {
    label: 'Релевантно',
    description: 'Сильный положительный сигнал: результат подошёл.',
    impact: 'Заметно поднимает товар и его категорию в текущей сессии.',
  },
  save: {
    label: 'Сохранить',
    description: 'Промежуточный положительный сигнал: товар пригодился для дальнейшей работы.',
    impact: 'Добавляет умеренный положительный вес для этого товара.',
  },
  bounce: {
    label: 'Быстрый возврат',
    description: 'Негативный сигнал: карточку открыли, но быстро вернулись к поиску.',
    impact: 'Понижает товар и слегка ослабляет похожую категорию.',
  },
  irrelevant: {
    label: 'Не релевантно',
    description: 'Сильный отрицательный сигнал: результат не соответствует запросу.',
    impact: 'Сильно понижает товар и связанные позиции в текущей сессии.',
  },
} as const
