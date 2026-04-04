export type UploadMode = 'replace_all' | 'upsert_ste' | 'append_contracts' | 'upsert_bundle';

export type SearchFilters = {
  categories?: string[];
  brands?: string[];
  attributes?: string[];
};

export type ProductAttribute = {
  name: string;
  value: string;
  numericValue?: number | null;
};

export type Product = {
  id: string;
  title: string;
  category: string;
  brandGuess?: string | null;
  modelGuess?: string | null;
  attributesRaw: string;
  attributes: ProductAttribute[];
};

export type ScoreFactor = {
  type: string;
  value: number;
  reason: string;
};

export type SearchResult = {
  product: Product;
  score: number;
  explanation: string;
  scoreBreakdown?: ScoreFactor[];
  corrections?: Array<Record<string, unknown>>;
};

export type QueryInterpretation = {
  correctedTokens: string[];
  retrievalTokens: string[];
  layoutCorrections: Array<Record<string, unknown>>;
  typoCorrections: Array<Record<string, unknown>>;
  synonymMappings: Array<Record<string, unknown>>;
};

export type ProfileSummary = {
  customerId: string;
  customerName: string;
  purchaseCount: number;
  matchedPurchaseCount: number;
  totalSpend: number;
  lastPurchaseAt?: string | null;
  topCategories: Array<{ value: string; weight: number }>;
  topProducts: Array<{ value: string; weight: number }>;
};

export type SearchFacetBucket = {
  value: string;
  count: number;
  key?: string;
};

export type SearchFacetGroup = {
  name: string;
  values: SearchFacetBucket[];
};

export type SearchFacets = {
  categories: SearchFacetBucket[];
  brands: SearchFacetBucket[];
  attributes: SearchFacetGroup[];
};

export type SearchResponse = {
  query: string;
  normalizedQuery: string;
  correctedQuery: string;
  appliedSynonyms: string[];
  searchTermsUsed: string[];
  queryInterpretation: QueryInterpretation;
  parserSource: string;
  profileSummary?: ProfileSummary | null;
  results: SearchResult[];
  facets: SearchFacets;
  appliedFilters: SearchFilters;
  totalCount: number;
  limit: number;
  offset: number;
  timingsMs: Record<string, number>;
};

export type SearchAnalysisResponse = {
  query: string;
  normalizedQuery: string;
  correctedQuery: string;
  appliedSynonyms: string[];
  searchTermsUsed: string[];
  queryInterpretation: QueryInterpretation;
  parserSource: string;
};

export type DemoProfile = {
  customerId: string;
  label: string;
  summary: {
    customerName: string;
    [key: string]: unknown;
  };
};

export type DatasetJob = {
  jobId: string;
  status: string;
  mode: string;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  progress: number;
  warnings: string[];
  errors: string[];
  stats: Record<string, unknown>;
};

export type DatasetSummary = {
  counts: Record<string, number>;
  activeIndex: {
    dbPath: string;
    lastSuccessfulJob?: DatasetJob | null;
  };
  imports: DatasetJob[];
};

export type MetricsSummary = {
  dataset: Record<string, number>;
  baseline: Record<string, number>;
  personalized: Record<string, number>;
};

export type Health = {
  status: string;
  version: string;
};

export type SearchPayload = {
  query: string;
  customerId?: string | null;
  sessionId?: string | null;
  limit?: number;
  offset?: number;
  includeDebug?: boolean;
  filters?: SearchFilters;
};

export type RecommendationPayload = {
  customerId?: string | null;
  sessionId?: string | null;
  limit?: number;
  offset?: number;
  includeDebug?: boolean;
};

export type EventPayload = {
  eventType: string;
  productId?: string | null;
  sessionId?: string | null;
  customerId?: string | null;
  query?: string | null;
  position?: number | null;
  dwellMs?: number | null;
  note?: string | null;
};

const jsonHeaders = {
  'Content-Type': 'application/json',
};

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail = 'Request failed';
    try {
      const payload = await response.json();
      detail = payload.detail ?? JSON.stringify(payload);
    } catch {
      detail = await response.text();
    }
    throw new Error(detail);
  }
  return response.json() as Promise<T>;
}

export async function getHealth() {
  return parseResponse<Health>(await fetch('/health'));
}

export async function getDatasetSummary() {
  return parseResponse<DatasetSummary>(await fetch('/datasets/summary'));
}

export async function getDemoProfiles() {
  return parseResponse<DemoProfile[]>(await fetch('/profiles/demo'));
}

export async function getMetrics() {
  return parseResponse<MetricsSummary>(await fetch('/metrics/summary'));
}

export async function uploadDatasets(
  mode: UploadMode,
  steFile?: File | null,
  contractsFile?: File | null,
) {
  const formData = new FormData();
  formData.append('mode', mode);
  if (steFile) formData.append('ste_file', steFile);
  if (contractsFile) formData.append('contracts_file', contractsFile);
  return parseResponse<{ jobId: string }>(
    await fetch('/datasets/upload', { method: 'POST', body: formData }),
  );
}

export async function getJob(jobId: string) {
  return parseResponse<DatasetJob>(await fetch(`/datasets/jobs/${jobId}`));
}

export async function bootstrapDefaultDataset() {
  return parseResponse<{ success: boolean; message?: string; jobId?: string }>(
    await fetch('/datasets/bootstrap-default', { method: 'POST' }),
  );
}

export async function clearDataset() {
  return parseResponse<{ success: boolean; message?: string }>(
    await fetch('/datasets/clear', { method: 'POST' }),
  );
}

export async function searchProducts(payload: SearchPayload) {
  return parseResponse<SearchResponse>(
    await fetch('/search', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    }),
  );
}

export async function getRecommendations(payload: RecommendationPayload) {
  return parseResponse<SearchResponse>(
    await fetch('/search/recommendations', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    }),
  );
}

export async function analyzeSearchQuery(payload: Pick<SearchPayload, 'query'>) {
  return parseResponse<SearchAnalysisResponse>(
    await fetch('/search/analyze', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    }),
  );
}

export async function sendEvent(payload: EventPayload) {
  return parseResponse<{ success: boolean; eventId: string }>(
    await fetch('/events', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    }),
  );
}
