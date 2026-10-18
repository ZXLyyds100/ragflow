import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PdfFormFields } from '@/pages/agent/form/parser-form/pdf-form-fields';
import { FormSchema } from '@/pages/agent/form/parser-form/schema';
import { transformParserParams } from '@/pages/agent/utils';
import { transformApiConfigToForm } from '@/utils/pipeline-operator';
import { OwnerTenantIdContext } from '@/pages/agent/context';
import i18n, { initLanguage } from '@/locales/config';
import '@parent/web/tailwind.css';
import '@/global.less';

const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function Fixture() {
  const [saved, setSaved] = useState<Record<string, any>>();
  const [status, setStatus] = useState('Loading saved configuration…');
  const form = useForm<any>({ defaultValues: { setups: [] }, resolver: zodResolver(FormSchema) });
  async function load() {
    const config = await fetch('/fixture/config').then(r => r.json());
    setSaved(config);
    form.reset(transformApiConfigToForm('Parser', config));
    setStatus('Loaded saved PDF configuration');
  }
  useEffect(() => { void load(); }, []);
  async function save(values: any) {
    const config = transformParserParams(values);
    const response = await fetch('/fixture/config', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    setSaved(await response.json());
    setStatus('Saved — reload to verify persisted values');
  }
  async function resetFixture() {
    await fetch('/fixture/reset', { method: 'POST' });
    await load();
  }
  return (
    <main style={{ maxWidth: 1280, margin: '32px auto', padding: '0 28px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 650 }}>RAGFlow · MinerU PDF settings</h1>
        <p className="text-text-secondary" style={{ marginTop: 8 }}>
          Local component integration fixture · issue #21028 · no live OCR inference
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '620px 1fr', gap: 32 }}>
        <section className="bg-bg-card border border-border-default rounded-xl" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 18, marginBottom: 22 }}>PDF parser</h2>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(save)} className="space-y-5">
              <input type="hidden" {...form.register('setups.0.fileFormat')} />
              {form.watch('setups')?.length > 0 && <PdfFormFields prefix="setups.0" />}
              <div style={{ display: 'flex', gap: 12, paddingTop: 12 }}>
                <Button type="submit">Save configuration</Button>
                <Button type="button" variant="outline" onClick={load}>Reload saved</Button>
              </div>
            </form>
          </Form>
        </section>
        <aside>
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>Persisted configuration</h2>
          <p role="status" className="text-text-secondary" style={{ minHeight: 42 }}>{status}</p>
          <pre aria-label="Persisted PDF configuration" className="bg-bg-card border border-border-default rounded-xl"
            style={{ padding: 18, fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {JSON.stringify(saved?.pdf ?? {}, null, 2)}
          </pre>
          <p className="text-text-secondary" style={{ marginTop: 16, fontSize: 12 }}>
            Real PdfFormFields, FormSchema and save/load transforms from the checked-out source.
            Tenant model list and storage API are local fixtures.
          </p>
          <Button type="button" variant="outline" onClick={resetFixture} style={{ marginTop: 18 }}>Reset fixture</Button>
        </aside>
      </div>
    </main>
  );
}

await initLanguage();
await i18n.changeLanguage('en');
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={client}>
    <BrowserRouter>
      <TooltipProvider>
        <OwnerTenantIdContext.Provider value="fixture-tenant">
          <Fixture />
        </OwnerTenantIdContext.Provider>
      </TooltipProvider>
    </BrowserRouter>
  </QueryClientProvider>,
);
