import { useEffect, useState, type ReactNode } from 'react';

import {
  bootstrapDefaultDataset,
  clearDataset,
  getDatasetSummary,
  getDemoProfiles,
  getHealth,
  getJob,
  getMetrics,
  searchProducts,
  sendEvent,
  uploadDatasets,
  type UploadMode,
} from './api';

type TabId = 'search' | 'data' | 'dynamics' | 'metrics';

const tabs: Array<{ id: TabId; label: string }> = [
  { id: 'search', label: 'Поиск' },
  { id: 'data', label: 'Данные' },
  { id: 'dynamics', label: 'Динамика' },
  { id: 'metrics', label: 'Метрики' },
];

const incrementalModes: Array<{ value: UploadMode; label: string }> = [
  { value: 'upsert_ste', label: 'Дозагрузить или обновить СТЕ' },
  { value: 'append_contracts', label: 'Дозагрузить контракты' },
  { value: 'upsert_bundle', label: 'Дозагрузить оба файла' },
];

function createSessionId() {
  return `session-${Math.random().toString(36).slice(2, 10)}`;
}

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat('ru-RU').format(value ?? 0);
}

function formatMetric(value: number | null | undefined) {
  if (value == null) {
    return '0.0000';
  }
  return value.toFixed(4);
}

function Card(props: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx('card', props.className)}>
      <header className="card-header">
        <div>
          <h3>{props.title}</h3>
          {props.description ? <p className="card-description">{props.description}</p> : null}
        </div>
        {props.action ? <div className="card-action">{props.action}</div> : null}
      </header>
      {props.children}
    </section>
  );
}

function Button(props: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  className?: string;
}) {
  const variant = props.variant ?? 'primary';
  return (
    <button
      className={cx('button', `button-${variant}`, props.className)}
      disabled={props.disabled}
      onClick={props.onClick}
      type={props.type ?? 'button'}
    >
      {props.children}
    </button>
  );
}

function Badge(props: { children: ReactNode; tone?: 'default' | 'soft' | 'danger' | 'olive' }) {
  const tone = props.tone ?? 'default';
  return <span className={cx('badge', `badge-${tone}`)}>{props.children}</span>;
}

function StatTile(props: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="stat-tile">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
      {props.hint ? <small>{props.hint}</small> : null}
    </div>
  );
}

function EmptyState(props: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <h3>{props.title}</h3>
      <p>{props.description}</p>
      {props.action ? <div className="inline-actions">{props.action}</div> : null}
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('search');
  const [health, setHealth] = useState<{ status: string; version: string } | null>(null);
  const [summary, setSummary] = useState<any | null>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<UploadMode>('upsert_bundle');
  const [steFile, setSteFile] = useState<File | null>(null);
  const [contractsFile, setContractsFile] = useState<File | null>(null);
  const [jobState, setJobState] = useState<any | null>(null);
  const [datasetBusy, setDatasetBusy] = useState(false);

  const [query, setQuery] = useState('aktirf smartbuy 16');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [sessionId, setSessionId] = useState(createSessionId());
  const [includeDebug, setIncludeDebug] = useState(true);
  const [searchState, setSearchState] = useState<any | null>(null);
  const [previousSearchState, setPreviousSearchState] = useState<any | null>(null);
  const [searching, setSearching] = useState(false);

  const hasDataset = (summary?.counts?.products ?? 0) > 0;
  const displayedJob = jobState ?? summary?.activeIndex?.lastSuccessfulJob ?? summary?.imports?.[0] ?? null;
  const comparisonRows =
    previousSearchState && searchState
      ? searchState.results.map((item: any, index: number) => {
          const beforeIndex = previousSearchState.results.findIndex(
            (previousItem: any) => previousItem.product.id === item.product.id,
          );
          return {
            id: item.product.id,
            title: item.product.title,
            before: beforeIndex >= 0 ? beforeIndex + 1 : null,
            after: index + 1,
            delta: beforeIndex >= 0 ? beforeIndex + 1 - (index + 1) : null,
          };
        })
      : [];

  useEffect(() => {
    void refreshAll();
  }, []);

  useEffect(() => {
    if (activeTab === 'metrics' && !metrics && !metricsLoading) {
      void refreshMetrics();
    }
  }, [activeTab, metrics, metricsLoading]);

  async function refreshAll() {
    setLoadingData(true);
    setError(null);
    try {
      const [healthResult, summaryResult, profilesResult] = await Promise.all([
        getHealth(),
        getDatasetSummary(),
        getDemoProfiles().catch(() => []),
      ]);
      setHealth(healthResult);
      setSummary(summaryResult);
      setProfiles(profilesResult);
      setJobState((current: any) => {
        if (current?.status === 'running' || current?.status === 'queued') {
          return current;
        }
        return summaryResult?.activeIndex?.lastSuccessfulJob ?? summaryResult?.imports?.[0] ?? null;
      });
      if (!selectedCustomer && profilesResult.length > 0) {
        setSelectedCustomer(profilesResult[0].customerId);
      }
      if (profilesResult.length === 0) {
        setSelectedCustomer('');
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось загрузить данные.');
    } finally {
      setLoadingData(false);
    }
  }

  async function refreshMetrics() {
    setMetricsLoading(true);
    setError(null);
    try {
      setMetrics(await getMetrics());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось загрузить метрики.');
    } finally {
      setMetricsLoading(false);
    }
  }

  function resetSearchState() {
    setSearchState(null);
    setPreviousSearchState(null);
    setSessionId(createSessionId());
  }

  async function pollJob(jobId: string) {
    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline) {
      const current = await getJob(jobId);
      setJobState(current);
      if (current.status === 'successful') {
        return current;
      }
      if (current.status === 'failed' || current.status === 'interrupted') {
        throw new Error(current.errors?.join('; ') || 'Фоновая задача завершилась с ошибкой.');
      }
      await new Promise((resolve) => setTimeout(resolve, 700));
    }
    throw new Error('Обработка заняла слишком много времени.');
  }

  async function handleUpload() {
    setDatasetBusy(true);
    setError(null);
    try {
      const result = await uploadDatasets(mode, steFile, contractsFile);
      await pollJob(result.jobId);
      setMetrics(null);
      await refreshAll();
      setActiveTab('search');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось выполнить дозагрузку.');
    } finally {
      setDatasetBusy(false);
    }
  }

  async function handleBootstrap() {
    setDatasetBusy(true);
    setError(null);
    try {
      const result = await bootstrapDefaultDataset();
      if (!result.jobId) {
        throw new Error(result.message || 'Сервер не вернул идентификатор задачи.');
      }
      await pollJob(result.jobId);
      setMetrics(null);
      await refreshAll();
      setActiveTab('search');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось загрузить базовый датасет.');
    } finally {
      setDatasetBusy(false);
    }
  }

  async function handleClear() {
    setDatasetBusy(true);
    setError(null);
    try {
      await clearDataset();
      setJobState(null);
      setSteFile(null);
      setContractsFile(null);
      setMetrics(null);
      resetSearchState();
      await refreshAll();
      setActiveTab('data');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось очистить базу.');
    } finally {
      setDatasetBusy(false);
    }
  }

  async function runSearch() {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      setError('Введите поисковый запрос хотя бы из одного символа.');
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const payload = await searchProducts({
        query: normalizedQuery,
        customerId: selectedCustomer || null,
        sessionId,
        limit: 10,
        offset: 0,
        includeDebug,
      });
      setPreviousSearchState(searchState);
      setSearchState(payload);
      setActiveTab('search');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось выполнить поиск.');
    } finally {
      setSearching(false);
    }
  }

  async function handleResultEvent(eventType: string, productId: string, position: number) {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      setError('Нельзя отправить событие без исходного поискового запроса.');
      return;
    }
    setError(null);
    try {
      await sendEvent({
        sessionId,
        customerId: selectedCustomer || null,
        eventType,
        productId,
        query: normalizedQuery,
        position,
      });
      setPreviousSearchState(searchState);
      const refreshed = await searchProducts({
        query: normalizedQuery,
        customerId: selectedCustomer || null,
        sessionId,
        limit: 10,
        offset: 0,
        includeDebug,
      });
      setSearchState(refreshed);
      setActiveTab('dynamics');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось записать событие.');
    }
  }

  const profileSummary = searchState?.profileSummary;
  const interpretation = searchState?.queryInterpretation;

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero-copy">
          <Badge tone="olive">Smart Product Search</Badge>
          <h1>Умный поиск СТЕ с понятной персонализацией</h1>
          <p>
            Сначала система нормализует запрос, исправляет раскладку и опечатки, учитывает
            синонимы, затем ищет кандидатов через SQLite FTS5 и только после этого персонализирует
            ранжирование по контрактной истории и событиям текущей сессии.
          </p>
        </div>
        <div className="hero-status">
          <div className={cx('status-pill', health?.status === 'healthy' && 'status-pill-live')}>
            {health?.status ?? 'offline'}
          </div>
          <div>
            <strong>Backend {health?.version ?? 'n/a'}</strong>
            <p>{loadingData ? 'Обновляем состояние системы…' : 'Готов к демонстрации'}</p>
          </div>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <Card title="Сводка" description="Текущее состояние индекса и профилей.">
            <div className="stats-grid">
              <StatTile label="Товары" value={formatNumber(summary?.counts?.products)} />
              <StatTile label="Контракты" value={formatNumber(summary?.counts?.contracts)} />
              <StatTile label="Профили" value={formatNumber(summary?.counts?.profiles)} />
              <StatTile label="Demo-профили" value={formatNumber(summary?.counts?.demoProfiles)} />
            </div>
          </Card>

          <Card
            title="Demo-заказчики"
            description="Профили выбираются автоматически по объему и разнообразию закупок."
          >
            <div className="profile-list">
              {profiles.length === 0 ? (
                <p className="muted">Профили появятся после загрузки данных.</p>
              ) : (
                profiles.map((profile) => (
                  <button
                    key={profile.customerId}
                    className={cx(
                      'profile-button',
                      selectedCustomer === profile.customerId && 'profile-button-active',
                    )}
                    onClick={() => setSelectedCustomer(profile.customerId)}
                    type="button"
                  >
                    <strong>{profile.label}</strong>
                    <span>{profile.summary.customerName}</span>
                  </button>
                ))
              )}
            </div>
          </Card>

          <Card title="Как используется ИИ" description="Без внешних API и с безопасным fallback.">
            <div className="explain-list">
              <div>
                <strong>В hot path ИИ не обязателен.</strong>
                <p>Поиск работает на нормализации, словарях, FTS5 и прозрачном rerank.</p>
              </div>
              <div>
                <strong>Локальная LLM опциональна.</strong>
                <p>Ее можно включить как локальный парсер для неоднозначных запросов, не ломая API.</p>
              </div>
              <div>
                <strong>Объяснение строится детерминированно.</strong>
                <p>Пользователь видит не “магический ответ”, а реальные факторы ранжирования.</p>
              </div>
            </div>
          </Card>
        </aside>

        <main className="main-area">
          <nav className="tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={cx('tab', activeTab === tab.id && 'tab-active')}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
            <div className="tabs-spacer" />
            <Button variant="ghost" onClick={() => void refreshAll()}>
              Обновить
            </Button>
          </nav>

          {error ? <div className="error-banner">{error}</div> : null}

          {activeTab === 'search' ? (
            <>
              <Card
                title="Поиск"
                description="Показывает, какие именно преобразования запроса использовались при ранжировании."
                action={
                  <div className="session-box">
                    <span>Session</span>
                    <strong>{sessionId}</strong>
                  </div>
                }
              >
                {!hasDataset ? (
                  <EmptyState
                    title="Индекс пока пустой"
                    description="Сначала загрузите базовый датасет или выполните дозагрузку на экране данных."
                    action={<Button onClick={() => setActiveTab('data')}>Открыть экран данных</Button>}
                  />
                ) : (
                  <>
                    <div className="search-grid">
                      <label className="field field-wide">
                        <span>Запрос</span>
                        <input
                          onChange={(event) => setQuery(event.target.value)}
                          placeholder="Например: aktirf smartbuy 16"
                          value={query}
                        />
                      </label>

                      <label className="field">
                        <span>Заказчик</span>
                        <select
                          onChange={(event) => setSelectedCustomer(event.target.value)}
                          value={selectedCustomer}
                        >
                          <option value="">Без персонализации</option>
                          {profiles.map((profile) => (
                            <option key={profile.customerId} value={profile.customerId}>
                              {profile.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="checkbox-field">
                        <input
                          checked={includeDebug}
                          onChange={(event) => setIncludeDebug(event.target.checked)}
                          type="checkbox"
                        />
                        <span>Показывать debug-факторы</span>
                      </label>
                    </div>

                    <div className="inline-actions">
                      <Button disabled={searching} onClick={() => void runSearch()}>
                        {searching ? 'Ищем…' : 'Запустить поиск'}
                      </Button>
                      <Button onClick={() => setSessionId(createSessionId())} variant="secondary">
                        Новая сессия
                      </Button>
                    </div>

                    {searchState ? (
                      <>
                        <div className="insight-grid">
                          <div className="insight-card">
                            <span className="insight-label">Нормализованный запрос</span>
                            <strong>{searchState.normalizedQuery || '—'}</strong>
                          </div>
                          <div className="insight-card">
                            <span className="insight-label">Исправленный запрос</span>
                            <strong>{searchState.correctedQuery || '—'}</strong>
                          </div>
                          <div className="insight-card">
                            <span className="insight-label">Кандидатов после ранжирования</span>
                            <strong>{formatNumber(searchState.totalCount)}</strong>
                          </div>
                        </div>

                        <div className="stack">
                          <div>
                            <h4>Что использовалось в поиске</h4>
                            <div className="badge-row">
                              {searchState.searchTermsUsed?.map((term: string) => (
                                <Badge key={term}>{term}</Badge>
                              ))}
                            </div>
                          </div>

                          {interpretation ? (
                            <div className="interpretation-grid">
                              <div>
                                <h4>Исправления раскладки</h4>
                                {interpretation.layoutCorrections.length === 0 ? (
                                  <p className="muted">Не использовались.</p>
                                ) : (
                                  interpretation.layoutCorrections.map((item: any) => (
                                    <div className="mini-row" key={`${item.from}-${item.to}`}>
                                      <Badge tone="soft">{item.keyboard}</Badge>
                                      <span>
                                        {item.from} → {item.to}
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>

                              <div>
                                <h4>Исправления опечаток</h4>
                                {interpretation.typoCorrections.length === 0 ? (
                                  <p className="muted">Не использовались.</p>
                                ) : (
                                  interpretation.typoCorrections.map((item: any) => (
                                    <div className="mini-row" key={`${item.from}-${item.to}`}>
                                      <Badge tone="soft">score {item.score}</Badge>
                                      <span>
                                        {item.from} → {item.to}
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>

                              <div>
                                <h4>Синонимы</h4>
                                {interpretation.synonymMappings.length === 0 ? (
                                  <p className="muted">Не использовались.</p>
                                ) : (
                                  interpretation.synonymMappings.map((item: any) => (
                                    <div className="mini-row" key={`${item.from}-${item.to}`}>
                                      <Badge tone="olive">synonym</Badge>
                                      <span>
                                        {item.from} → {item.to}
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          ) : null}

                          {profileSummary ? (
                            <Card
                              title="Профиль заказчика"
                              description="Эти агрегаты строятся автоматически из контрактной истории."
                              className="subcard"
                            >
                              <div className="stats-grid">
                                <StatTile label="Заказчик" value={profileSummary.customerName} />
                                <StatTile
                                  label="Закупок"
                                  value={formatNumber(profileSummary.purchaseCount)}
                                  hint={`matched: ${formatNumber(profileSummary.matchedPurchaseCount)}`}
                                />
                                <StatTile
                                  label="Общий объем"
                                  value={formatNumber(Math.round(profileSummary.totalSpend))}
                                />
                                <StatTile
                                  label="Последняя закупка"
                                  value={profileSummary.lastPurchaseAt ?? '—'}
                                />
                              </div>
                            </Card>
                          ) : null}
                        </div>
                      </>
                    ) : null}
                  </>
                )}
              </Card>

              <Card
                title="Результаты"
                description="Каждая карточка показывает объяснение ранжирования и live-действия."
              >
                {!searchState ? (
                  <EmptyState
                    title="Поиск еще не запускался"
                    description="Введите запрос, выберите профиль заказчика и нажмите «Запустить поиск»."
                  />
                ) : searchState.results.length === 0 ? (
                  <EmptyState
                    title="По этому запросу ничего не найдено"
                    description="Проверьте запрос или загрузите данные на экране управления датасетом."
                  />
                ) : (
                  <div className="result-list">
                    {searchState.results.map((item: any, index: number) => (
                      <article className="result-card" key={`${item.product.id}-${index}`}>
                        <div className="result-header">
                          <div>
                            <h4>{item.product.title}</h4>
                            <p>{item.product.category}</p>
                          </div>
                          <div className="result-score">
                            <span>Score</span>
                            <strong>{item.score.toFixed(3)}</strong>
                          </div>
                        </div>

                        <p className="result-explanation">{item.explanation}</p>

                        <div className="badge-row">
                          {item.product.brandGuess ? <Badge>{item.product.brandGuess}</Badge> : null}
                          {item.product.modelGuess ? <Badge>{item.product.modelGuess}</Badge> : null}
                          {item.product.attributes?.slice(0, 3).map((attribute: any) => (
                            <Badge key={`${item.product.id}-${attribute.name}-${attribute.value}`} tone="soft">
                              {attribute.name}: {attribute.value}
                            </Badge>
                          ))}
                        </div>

                        {includeDebug && item.scoreBreakdown ? (
                          <div className="factor-list">
                            {item.scoreBreakdown.map((factor: any) => (
                              <div className="factor-row" key={`${item.product.id}-${factor.type}-${factor.reason}`}>
                                <Badge tone={factor.value < 0 ? 'danger' : 'soft'}>
                                  {factor.type}: {factor.value > 0 ? '+' : ''}
                                  {factor.value.toFixed(2)}
                                </Badge>
                                <span>{factor.reason}</span>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        <div className="inline-actions">
                          <Button
                            onClick={() => void handleResultEvent('result_opened', item.product.id, index + 1)}
                            variant="secondary"
                          >
                            Открыл карточку
                          </Button>
                          <Button
                            onClick={() => void handleResultEvent('result_bounced', item.product.id, index + 1)}
                            variant="ghost"
                          >
                            Быстрый возврат
                          </Button>
                          <Button
                            onClick={() => void handleResultEvent('result_saved', item.product.id, index + 1)}
                            variant="secondary"
                          >
                            Сохранить
                          </Button>
                          <Button
                            onClick={() => void handleResultEvent('marked_relevant', item.product.id, index + 1)}
                            variant="primary"
                          >
                            Релевантно
                          </Button>
                          <Button
                            onClick={() => void handleResultEvent('marked_irrelevant', item.product.id, index + 1)}
                            variant="danger"
                          >
                            Не релевантно
                          </Button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </Card>
            </>
          ) : null}

          {activeTab === 'data' ? (
            <>
              <Card
                title="Быстрый старт"
                description="Для защиты удобно один раз заранее прогреть полный индекс из встроенной папки data."
              >
                <div className="inline-actions">
                  <Button disabled={datasetBusy} onClick={() => void handleBootstrap()}>
                    {datasetBusy ? 'Обрабатываем…' : 'Загрузить встроенный датасет'}
                  </Button>
                  <Badge tone="soft">replace_all</Badge>
                </div>
              </Card>

              <div className="two-column-grid">
                <Card
                  title="Дозагрузка"
                  description="Частичный импорт без обязательного полного пересоздания индекса."
                >
                  <div className="form-grid">
                    <label className="field">
                      <span>Режим</span>
                      <select onChange={(event) => setMode(event.target.value as UploadMode)} value={mode}>
                        {incrementalModes.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field">
                      <span>Файл СТЕ</span>
                      <input onChange={(event) => setSteFile(event.target.files?.[0] ?? null)} type="file" />
                    </label>

                    <label className="field">
                      <span>Файл контрактов</span>
                      <input
                        onChange={(event) => setContractsFile(event.target.files?.[0] ?? null)}
                        type="file"
                      />
                    </label>
                  </div>

                  <div className="inline-actions">
                    <Button disabled={datasetBusy} onClick={() => void handleUpload()}>
                      Запустить дозагрузку
                    </Button>
                    <Badge tone="soft">{mode}</Badge>
                  </div>
                </Card>

                <Card
                  title="Очистка БД"
                  description="Удаляет текущий индекс, профили, события и историю импортов."
                >
                  <div className="stack">
                    <p className="muted">
                      Полезно перед повторной демонстрацией или когда нужно гарантированно показать
                      чистый сценарий.
                    </p>
                    <div className="inline-actions">
                      <Button disabled={datasetBusy} onClick={() => void handleClear()} variant="danger">
                        Очистить текущую БД
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>

              <Card title="Последняя задача импорта" description="Статус и предупреждения по текущей обработке.">
                {displayedJob ? (
                  <div className="stack">
                    <div className="job-headline">
                      <div>
                        <strong>{displayedJob.status}</strong>
                        <p>{displayedJob.mode}</p>
                      </div>
                      <Badge tone="soft">{Math.round((displayedJob.progress ?? 0) * 100)}%</Badge>
                    </div>
                    <div className="progress-shell">
                      <div
                        className="progress-fill"
                        style={{ width: `${(displayedJob.progress ?? 0) * 100}%` }}
                      />
                    </div>
                    {displayedJob.warnings?.length ? (
                      <div className="warning-box">
                        {displayedJob.warnings.slice(0, 8).map((warning: string) => (
                          <p key={warning}>{warning}</p>
                        ))}
                      </div>
                    ) : null}
                    {displayedJob.stats ? (
                      <div className="stats-grid">
                        {Object.entries(displayedJob.stats).map(([key, value]) => (
                          <StatTile key={key} label={key} value={String(value)} />
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="muted">Импорт еще не запускался в этой сессии.</p>
                )}
              </Card>

              <Card title="История импортов" description="Последние операции по текущему индексу.">
                {summary?.imports?.length ? (
                  <div className="history-list">
                    {summary.imports.map((item: any) => (
                      <div className="history-row" key={item.jobId}>
                        <div>
                          <strong>{item.mode}</strong>
                          <p>{item.finishedAt ?? item.createdAt}</p>
                        </div>
                        <Badge tone={item.status === 'successful' ? 'olive' : 'soft'}>{item.status}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted">История импортов пока пуста.</p>
                )}
              </Card>
            </>
          ) : null}

          {activeTab === 'dynamics' ? (
            <>
              <Card
                title="Динамика выдачи"
                description="Сравнение позиций до и после действия пользователя в текущей сессии."
              >
                {!previousSearchState || !searchState ? (
                  <EmptyState
                    title="Еще нет сравнения"
                    description="Сначала выполните поиск, затем нажмите на одном из результатов «Релевантно», «Не релевантно», «Открыл карточку» или «Быстрый возврат»."
                  />
                ) : (
                  <div className="comparison-list">
                    {comparisonRows.map((row: any) => (
                      <div className="comparison-row" key={row.id}>
                        <div>
                          <strong>{row.title}</strong>
                          <p>ID: {row.id}</p>
                        </div>
                        <div className="comparison-metrics">
                          <Badge tone="soft">до: {row.before ?? 'new'}</Badge>
                          <Badge tone="soft">после: {row.after}</Badge>
                          <Badge tone={row.delta == null ? 'default' : row.delta > 0 ? 'olive' : 'danger'}>
                            {row.delta == null ? 'новый' : row.delta > 0 ? `↑ ${row.delta}` : `↓ ${Math.abs(row.delta)}`}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card
                title="Как пересчитываются предпочтения в реальном времени"
                description="Короткое объяснение механики live-персонализации."
              >
                <div className="explain-list">
                  <div>
                    <strong>Долгоживущий профиль</strong>
                    <p>Строится из контрактов: категории, СТЕ и токены получают свои веса.</p>
                  </div>
                  <div>
                    <strong>Сигналы сессии</strong>
                    <p>
                      `result_opened`, `result_saved`, `marked_relevant`, `marked_irrelevant` и
                      `result_bounced` сразу пишутся в таблицу событий.
                    </p>
                  </div>
                  <div>
                    <strong>Следующий запрос уже другой</strong>
                    <p>
                      При повторном поиске к базовому score добавляются session product/category
                      boosts или penalties, поэтому порядок выдачи меняется мгновенно.
                    </p>
                  </div>
                </div>
              </Card>
            </>
          ) : null}

          {activeTab === 'metrics' ? (
            <>
              <Card
                title="Оценка качества"
                description="Сравнение baseline-поиска и персонализированной версии на implicit relevance из контрактов."
                action={
                  <Button disabled={metricsLoading} onClick={() => void refreshMetrics()} variant="secondary">
                    {metricsLoading ? 'Считаем…' : 'Пересчитать'}
                  </Button>
                }
              >
                {metricsLoading ? (
                  <p className="muted">Считаем метрики на текущем индексе…</p>
                ) : metrics ? (
                  <>
                    <div className="stats-grid">
                      <StatTile label="Товары" value={formatNumber(metrics.dataset.products)} />
                      <StatTile label="Контракты" value={formatNumber(metrics.dataset.contracts)} />
                      <StatTile label="Профили" value={formatNumber(metrics.dataset.profiles)} />
                      <StatTile
                        label="Оценочных запросов"
                        value={formatNumber(metrics.dataset.evaluationQueries)}
                      />
                    </div>

                    <div className="metric-table">
                      {(['ndcg10', 'mrr10', 'recall20', 'success5'] as const).map((metricName) => {
                        const baselineValue = metrics.baseline[metricName];
                        const personalizedValue = metrics.personalized[metricName];
                        const delta = personalizedValue - baselineValue;
                        return (
                          <div className="metric-row" key={metricName}>
                            <div>
                              <strong>{metricName}</strong>
                              <p>
                                baseline {formatMetric(baselineValue)} → personalized{' '}
                                {formatMetric(personalizedValue)}
                              </p>
                            </div>
                            <div className="metric-bars">
                              <div className="metric-track">
                                <div
                                  className="metric-fill metric-fill-baseline"
                                  style={{ width: `${Math.max(4, baselineValue * 100)}%` }}
                                />
                              </div>
                              <div className="metric-track">
                                <div
                                  className="metric-fill metric-fill-personalized"
                                  style={{ width: `${Math.max(4, personalizedValue * 100)}%` }}
                                />
                              </div>
                            </div>
                            <Badge tone={delta >= 0 ? 'olive' : 'danger'}>
                              {delta >= 0 ? '+' : ''}
                              {delta.toFixed(4)}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <p className="muted">Метрики еще не считались после старта приложения.</p>
                )}
              </Card>

              <Card
                title="Процесс поиска под пользователя"
                description="Короткая схема того, что можно объяснить на защите."
              >
                <div className="process-grid">
                  <div className="process-step">
                    <strong>1. Подготовка запроса</strong>
                    <p>Нормализация, исправление раскладки, typo correction, синонимы.</p>
                  </div>
                  <div className="process-step">
                    <strong>2. Быстрый retrieval</strong>
                    <p>SQLite FTS5 поднимает кандидатов по каталогу без внешних сервисов.</p>
                  </div>
                  <div className="process-step">
                    <strong>3. Прозрачный rerank</strong>
                    <p>Учитываются текст, категория, атрибуты, числа, история контрактов и live-сигналы.</p>
                  </div>
                  <div className="process-step">
                    <strong>4. Объяснение</strong>
                    <p>API возвращает score breakdown и интерпретацию запроса, а не скрытую эвристику.</p>
                  </div>
                </div>
              </Card>
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}

export default App;
