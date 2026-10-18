import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import TitleChunkerForm, { FormSchema } from '@/pages/agent/form/title-chunker-form';
import { transformApiConfigToForm, transformFormConfigToApi } from '@/utils/pipeline-operator';
import i18n, { initLanguage } from '@/locales/config';
import '@parent/web/tailwind.css';
import '@/global.less';
import './style.css';

const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Fixture() {
  const [template, setTemplate] = useState('book');
  const [data, setData] = useState<any>();
  const [formConfig, setFormConfig] = useState<any>();
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState('Loading…');
  const values = useRef<any>();
  const operator = template === 'manual' ? 'ManualChunker' : 'TitleChunker';
  const load = useCallback(async () => {
    const next = await fetch(`/fixture/config?template=${template}`).then(r => r.json());
    if (next.error) throw Error(next.error);
    setData(next);
    setFormConfig(transformApiConfigToForm(operator, next.config));
    setRevision(r => r + 1);
    setStatus('Loaded saved configuration and ran the real Go component');
  }, [template, operator]);
  useEffect(() => { void load(); }, [load]);
  const onValuesChange = useCallback((next: any) => { values.current = next; }, []);
  async function save() {
    const parsed = FormSchema.safeParse(values.current);
    if (!parsed.success) { setStatus('Validation failed: ' + parsed.error.message); return; }
    const config = transformFormConfigToApi(operator, parsed.data);
    const next = await fetch(`/fixture/config?template=${template}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config),
    }).then(r => r.json());
    if (next.error) throw Error(next.error);
    setData(next);
    setStatus('Saved — real Go output below uses these exact persisted parameters');
  }
  function selectTemplate(event: React.ChangeEvent<HTMLSelectElement>) { setTemplate(event.target.value); }
  const shownConfig = {
    method: data?.config.method,
    table_context_size: data?.config.table_context_size ?? '(not saved)',
    image_context_size: data?.config.image_context_size ?? '(not saved)',
  };
  const media = data?.run.output.chunks.filter((c: any) => c.doc_type_kwd === 'table' || c.doc_type_kwd === 'image') ?? [];
  return (
    <main>
      <header>
        <div>
          <h1>RAGFlow · Media context windows</h1>
          <p className="text-text-secondary">Issue #21029 · {data?.variant === 'before' ? 'ORIGINAL main' : 'FIXED source'}</p>
        </div>
        <label>Built-in template <select aria-label="Built-in template" value={template} onChange={selectTemplate}>
          <option value="book">Book · Title hierarchy</option>
          <option value="paper">Paper · Title group</option>
          <option value="manual">Manual · Physical order</option>
        </select></label>
      </header>
      <p className="notice text-text-secondary">Local source-component fixture: real form, validation, save/load transforms and Go template/chunker.
        Document payload and storage API are fixtures; no live OCR, database or inference.</p>
      <div className="columns">
        <section className="panel bg-bg-card border-border-default">
          <h2>Pipeline settings</h2>
          <div className="form-scroll">
            {formConfig && <TitleChunkerForm key={template + revision} hideOutputs pinMethodGroup={template === 'manual'}
              node={{ id: 'TitleChunker:evidence', data: { form: formConfig }, position: { x: 0, y: 0 } } as any}
              onValuesChange={onValuesChange} />}
          </div>
          <div className="actions">
            <Button onClick={save}>Save configuration</Button>
            <Button variant="outline" onClick={load}>Reload saved</Button>
          </div>
        </section>
        <aside>
          <section className="panel bg-bg-card border-border-default">
            <h2>Persisted parameters</h2>
            <pre aria-label="Persisted context configuration">{JSON.stringify(shownConfig, null, 2)}</pre>
            <p role="status" className="text-text-secondary">{status}</p>
          </section>
          <section className="panel bg-bg-card border-border-default">
            <h2>Actual Go output · {template}</h2>
            <p className="text-text-secondary output-note">Source: explanation → table → explanation → figure → conclusion</p>
            {media.map((chunk: any, index: number) => (
              <article key={index} data-testid={`media-${chunk.doc_type_kwd}`}>
                <div className="media-title text-text-secondary">{chunk.doc_type_kwd === 'table' ? 'Table' : 'Image'} · {chunk.img_id} · positions retained</div>
                <div className="media-body" dangerouslySetInnerHTML={{ __html: chunk.text }} />
              </article>
            ))}
          </section>
        </aside>
      </div>
    </main>
  );
}
await initLanguage();
await i18n.changeLanguage('en');
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={client}><BrowserRouter><TooltipProvider><Fixture /></TooltipProvider></BrowserRouter></QueryClientProvider>,
);
