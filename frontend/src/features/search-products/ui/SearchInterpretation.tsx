import type { SearchAnalysisResponse, SearchResponse } from '@/shared/api'
import { asText } from '@/shared/lib/search'
import { AppBadge } from '@/shared/ui'

type InterpretationPayload =
  | {
      correctedQuery: SearchResponse['correctedQuery']
      queryInterpretation: SearchResponse['queryInterpretation']
      appliedSynonyms: SearchResponse['appliedSynonyms']
      searchTermsUsed: SearchResponse['searchTermsUsed']
    }
  | {
      correctedQuery: SearchAnalysisResponse['correctedQuery']
      queryInterpretation: SearchAnalysisResponse['queryInterpretation']
      appliedSynonyms: SearchAnalysisResponse['appliedSynonyms']
      searchTermsUsed: SearchAnalysisResponse['searchTermsUsed']
    }

type SearchInterpretationProps = {
  query: string
  interpretation: InterpretationPayload | null
}

export function SearchInterpretation({ query, interpretation }: SearchInterpretationProps) {
    if (!interpretation) {
      return null
    }

    return (
      <div className="grid gap-3 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-lg border border-[var(--semantic-border-default)] bg-[var(--semantic-background-section)] p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--semantic-text-muted)]">
            Исправление запроса
          </div>
          <div className="mt-3 text-sm text-[var(--semantic-text-secondary)]">Оригинал</div>
          <div className="mt-1 font-medium text-[var(--semantic-text-primary)]">
            {query.trim() || '—'}
          </div>
          <div className="mt-3 text-sm text-[var(--semantic-text-secondary)]">Будем искать как</div>
          <div className="mt-1 text-lg font-semibold text-[var(--semantic-text-primary)]">
            {interpretation.correctedQuery || '—'}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {interpretation.queryInterpretation.layoutCorrections.map((entry, index) => (
              <AppBadge key={`layout-${index}`} tone="outline">
                {asText(entry.from)} → {asText(entry.to)}
              </AppBadge>
            ))}
            {interpretation.queryInterpretation.typoCorrections.map((entry, index) => (
              <AppBadge key={`typo-${index}`} tone="outline">
                {asText(entry.from)} → {asText(entry.to)}
              </AppBadge>
            ))}
            {interpretation.queryInterpretation.synonymMappings.map((entry, index) => (
              <AppBadge key={`synonym-${index}`} tone="accent">
                {asText(entry.from)} → {asText(entry.to)}
              </AppBadge>
            ))}
            {interpretation.queryInterpretation.layoutCorrections.length === 0 &&
            interpretation.queryInterpretation.typoCorrections.length === 0 &&
            interpretation.queryInterpretation.synonymMappings.length === 0 ? (
              <span className="text-sm text-[var(--semantic-text-secondary)]">
                Дополнительных исправлений не потребовалось.
              </span>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--semantic-border-default)] bg-[var(--semantic-background-section)] p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--semantic-text-muted)]">
            Что реально использовано при поиске
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {interpretation.searchTermsUsed.map((term) => (
              <AppBadge key={term}>{term}</AppBadge>
            ))}
            {interpretation.searchTermsUsed.length === 0 ? (
              <span className="text-sm text-[var(--semantic-text-secondary)]">Токены ещё не готовы.</span>
            ) : null}
          </div>
          <div className="mt-5 text-sm text-[var(--semantic-text-secondary)]">Синонимы</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {interpretation.appliedSynonyms.map((value) => (
              <AppBadge key={value} tone="info">
                {value}
              </AppBadge>
            ))}
            {interpretation.appliedSynonyms.length === 0 ? (
              <span className="text-sm text-[var(--semantic-text-secondary)]">
                Синонимы в этом запросе не понадобились.
              </span>
            ) : null}
          </div>
        </div>
      </div>
    )
}
