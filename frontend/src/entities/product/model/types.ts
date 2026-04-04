export type {
  Product,
  ProductAttribute,
  ScoreFactor,
  SearchResult,
} from '@/shared/api'

export type ProductFeedbackEventType =
  | 'result_opened'
  | 'marked_relevant'
  | 'marked_irrelevant'
  | 'result_bounced'
  | 'result_saved'
