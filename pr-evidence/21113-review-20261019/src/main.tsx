import { ImageFormFields as CurrentImageFormFields } from '@/pages/agent/form/parser-form/image-form-fields';
import { FormSchema } from '@/pages/agent/form/parser-form/schema';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import { useCallback, useEffect, useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { Toaster } from 'sonner';
import { ImageFormFields as BaselineImageFormFields } from './baseline/image-form-fields';
import { OwnerTenantIdContext } from './fixtures/owner';
import { LlmKeys } from './fixtures/model-query';
import './i18n';
import { Language, Version } from './i18n';
import '@review-tailwind';
import './review.css';

const Owner = 'synthetic-review-owner';
const MissingId = 'synthetic-deleted-model-id';
const Params = new URLSearchParams(location.search);
const Scenario = Params.get('scenario') || 'models';
const FixtureMode = ['loading-error', 'default-loading-error'].includes(Scenario)
  ? 'hold' : Scenario === 'empty' ? 'empty' : 'models';
await fetch(`/__fixture/control?mode=${FixtureMode}`);

const Query = new QueryClient({
  defaultOptions: {
    // Deliberate deterministic fixture policy; real app retry timing is not tested.
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});
const InitialValues = {
  enable_vision_enhancement: true,
  vlm: { llm_id: '', system_prompt: '' },
  setups: [{
    fileFormat: 'image',
    output_format: 'json',
    ocr_enabled: true,
    ocr_model_id: ['loading-error', 'missing'].includes(Scenario) ? MissingId : '',
  }],
};
const ImageFormFields = Version === 'baseline' ? BaselineImageFormFields : CurrentImageFormFields;

function Review() {
  const form = useForm({ defaultValues: InitialValues });
  const values = useWatch({ control: form.control });
  const [saved, setSaved] = useState<object | null>(null);
  const [notice, setNotice] = useState('Local fixture ready');
  const [queryState, setQueryState] = useState('');
  const queryClient = useQueryClient();
  const formId = values.setups?.[0]?.ocr_model_id ?? '';

  useEffect(() => {
    let frame: number | undefined;
    const refresh = () => {
      const queries = queryClient.getQueryCache().getAll().map((query) => ({
        key: query.queryKey,
        status: query.state.status,
        fetchStatus: query.state.fetchStatus,
        fetched: query.state.dataUpdateCount + query.state.errorUpdateCount > 0,
        models: Array.isArray(query.state.data) ? query.state.data.length : 0,
      }));
      setQueryState(JSON.stringify(queries, null, 2));
    };
    refresh();
    // A new query can be registered while a child renders. The debug panel
    // must not synchronously set React state from that registration event.
    const scheduleRefresh = () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(refresh);
    };
    const unsubscribe = queryClient.getQueryCache().subscribe(scheduleRefresh);
    return () => {
      unsubscribe();
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, [queryClient]);

  const save = useCallback(() => {
    const actual = form.getValues();
    const parsed = FormSchema.safeParse(actual);
    if (!parsed.success) {
      setNotice(`Real FormSchema rejected: ${parsed.error.issues[0]?.message}`);
      return;
    }
    // Explicit save fixture, not transformParserParams or a backend save request.
    // Only known image contract fields are copied; no sentinel interpretation.
    const payload = {
      enable_vision_enhancement: parsed.data.enable_vision_enhancement,
      setups: parsed.data.setups.map(({ fileFormat, output_format, ocr_enabled, ocr_model_id }) => ({
        fileFormat, output_format, ocr_enabled, ocr_model_id,
      })),
    };
    setSaved(structuredClone(payload));
    setNotice(JSON.stringify(payload).includes('__image_ocr_deepdoc__')
      ? 'FAIL: sentinel leaked into save fixture'
      : 'Saved locally — no sentinel in synthetic payload');
  }, [form]);
  const reloadSaved = useCallback(() => {
    if (!saved) return;
    form.reset({ ...InitialValues, ...structuredClone(saved) } as typeof InitialValues);
    setNotice('Reloaded synthetic saved form');
  }, [form, saved]);
  const chooseMissing = useCallback(() => {
    form.setValue('setups.0.ocr_model_id', MissingId);
    setNotice('Loaded synthetic persisted missing ID');
  }, [form]);
  const toggleVision = useCallback(() => {
    form.setValue('enable_vision_enhancement', !form.getValues('enable_vision_enhancement'));
  }, [form]);
  const releaseError = useCallback(async () => {
    await fetch('/__fixture/control?release=http-error');
    setNotice('Held model requests released as synthetic HTTP 503');
  }, []);
  const releaseSuccess = useCallback(async () => {
    await fetch('/__fixture/control?release=models');
    setNotice('Held requests released successfully');
  }, []);
  const refetchHttpError = useCallback(async () => {
    await fetch('/__fixture/control?mode=http-error');
    await queryClient.refetchQueries({ queryKey: LlmKeys.allModels() .slice(0, 1) });
    setNotice('Synthetic background HTTP 503; cache must survive');
  }, [queryClient]);
  const refetchBusinessError = useCallback(async () => {
    await fetch('/__fixture/control?mode=business-error');
    await queryClient.refetchQueries({ queryKey: LlmKeys.allModels().slice(0, 1) });
    setNotice('Synthetic HTTP 200 / code 100, using existing hook envelope behavior');
  }, [queryClient]);
  const restoreModels = useCallback(async () => {
    await fetch('/__fixture/control?mode=models');
    await queryClient.refetchQueries({ queryKey: LlmKeys.allModels().slice(0, 1) });
    setNotice('Restored synthetic models');
  }, [queryClient]);
  const focusModel = useCallback(() => form.setFocus('setups.0.ocr_model_id'), [form]);
  const blockSubmit = useCallback((event: React.FormEvent) => event.preventDefault(), []);

  return (
    <main>
      <header className="review-header">
        <div>
          <p className="eyebrow">RAGFlow #21113 · independent UI review</p>
          <h1>{Version === 'baseline' ? 'Before · baseline f66e8362850f' : 'After · current worktree'}</h1>
        </div>
        <span className="fixture-badge">SYNTHETIC DATA · ISOLATED HARNESS</span>
      </header>
      <p className="boundary">
        Real ImageFormFields / TreeSelect / RAGFlowFormItem / MissingModelLabel.
        Fixture: owner, model query + local HTTP, save. Not the full app or backend.
      </p>
      <div className="review-layout">
        <section className="review-card feature-card">
          <div className="card-heading">
            <h2>Image parser</h2>
            <span className="subtle">{Language.toUpperCase()} · {Scenario}</span>
          </div>
          <p className="subtle">Same component container, synthetic owner and HTTP responses for before / after.</p>
          <div className="vision-row">
            <span>Global vision enhancement <small>(fixture control)</small></span>
            <button type="button" onClick={toggleVision} data-testid="fixture-vision">
              {values.enable_vision_enhancement ? 'On' : 'Off'}
            </button>
          </div>
          <FormProvider {...form}>
            <form className="actual-feature" onSubmit={blockSubmit}>
              <ImageFormFields prefix="setups.0" />
            </form>
          </FormProvider>
          <div className="actions">
            <button onClick={save}>Save synthetic form</button>
            <button onClick={reloadSaved} disabled={!saved}>Reload saved</button>
            <button onClick={focusModel}>Focus OCR model</button>
          </div>
          <div className="result-line">{notice}</div>
          <div className="value-line">
            Raw form OCR ID: <code data-testid="raw-id">{JSON.stringify(formId)}</code>
          </div>
          <h3>Local synthetic saved payload</h3>
          <pre data-testid="saved-payload">{saved ? JSON.stringify(saved, null, 2) : 'Not saved yet'}</pre>
        </section>
        <aside className="review-card fixture-card">
          <h2>Fixture controls</h2>
          <p className="subtle">Real React Query; retries disabled only for deterministic capture. Both model-query paths use local HTTP.</p>
          <div className="fixture-actions">
            <button onClick={chooseMissing}>Load saved missing ID</button>
            <button onClick={releaseError}>Release loading → HTTP error</button>
            <button onClick={releaseSuccess}>Release loading → success</button>
            <button onClick={refetchHttpError}>Refetch → HTTP error (keep cache)</button>
            <button onClick={refetchBusinessError}>Refetch → HTTP 200 business error</button>
            <button onClick={restoreModels}>Restore models</button>
          </div>
          <h3>Observed query cache</h3>
          <pre data-testid="query-state">{queryState}</pre>
          <p className="subtle">Owner: synthetic-review-owner. No auth, real accounts, remote requests, OCR execution or backend persistence.</p>
        </aside>
      </div>
      <footer>Review fixture · local-only evidence · real component UI, not a full-app E2E claim</footer>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={Query}>
    <OwnerTenantIdContext.Provider value={Owner}>
      <TooltipProvider>
        <Review />
        <Toaster />
      </TooltipProvider>
    </OwnerTenantIdContext.Provider>
  </QueryClientProvider>,
);
