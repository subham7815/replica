import { VOLUNTEER_CSV_TEMPLATE, type ImportResult } from '@newreplica/shared';
import { useImportVolunteers } from '@newreplica/shared/queries';
import { useState } from 'react';
import { icons } from '../../components/icons';
import { FormError, Modal, Spinner, Toggle } from '../../components/ui';
import { downloadText } from '../../lib/download';

const OUTCOME_STYLE: Record<ImportResult['rows'][number]['outcome'], string> = {
  create: 'bg-success-soft text-success',
  skip: 'bg-navy-soft text-muted',
  error: 'bg-brand-soft text-brand',
};
const OUTCOME_LABEL = { create: 'New', skip: 'Skipped', error: 'Error' } as const;

export function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [csv, setCsv] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [sendInvites, setSendInvites] = useState(false);
  const preview = useImportVolunteers();
  const commit = useImportVolunteers();

  function reset() {
    setCsv(null);
    setFileName('');
    preview.reset();
    commit.reset();
  }

  function close() {
    reset();
    onClose();
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    reset();
    const text = await file.text();
    setCsv(text);
    setFileName(file.name);
    preview.mutate({ csv: text, dryRun: true });
  }

  const result = commit.data ?? preview.data;
  const counts = result
    ? {
        create: result.rows.filter((r) => r.outcome === 'create').length,
        skip: result.rows.filter((r) => r.outcome === 'skip').length,
        error: result.rows.filter((r) => r.outcome === 'error').length,
      }
    : null;

  return (
    <Modal open={open} onClose={close} title="Import volunteers" wide>
      {commit.data ? (
        <div className="py-6 text-center">
          <span className="mx-auto grid h-12 w-12 animate-pop-in place-items-center rounded-full bg-success text-white">
            <icons.check size={24} />
          </span>
          <p className="mt-4 text-lg font-semibold text-ink">
            {commit.data.created} {commit.data.created === 1 ? 'volunteer' : 'volunteers'} imported
          </p>
          {counts!.error > 0 && <p className="mt-1 text-sm">{counts!.error} rows couldn’t be imported. Fix them and import the file again; existing people are skipped.</p>}
          <button className="btn-primary mt-6" onClick={close}>
            Done
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <p className="text-sm">
            Upload a CSV with a header row. <span className="font-medium text-ink">name</span> and{' '}
            <span className="font-medium text-ink">email</span> are required; <span className="font-medium text-ink">phone</span>,{' '}
            <span className="font-medium text-ink">departments</span>, <span className="font-medium text-ink">skills</span> and{' '}
            <span className="font-medium text-ink">notes</span> are optional. Separate several departments or skills with a semicolon.{' '}
            <button type="button" className="font-semibold text-brand hover:text-brand-dark" onClick={() => downloadText('volunteers-template.csv', VOLUNTEER_CSV_TEMPLATE)}>
              Download a template
            </button>
          </p>

          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-line-strong bg-surface px-6 py-8 text-center transition hover:border-brand/40 hover:bg-brand-soft/30">
            <icons.note size={28} className="text-brand" />
            <span className="font-medium text-ink">{fileName || 'Choose a CSV file'}</span>
            <span className="text-xs text-muted">Up to 2,000 rows</span>
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>

          {preview.isPending && (
            <div className="flex items-center gap-2 text-sm">
              <Spinner className="h-4 w-4 text-brand" /> Checking the file…
            </div>
          )}
          <FormError error={preview.error ?? commit.error} />

          {result && counts && (
            <>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded-full bg-success-soft px-3 py-1 font-medium text-success">{counts.create} new</span>
                <span className="rounded-full bg-navy-soft px-3 py-1 font-medium text-muted">{counts.skip} already added</span>
                <span className="rounded-full bg-brand-soft px-3 py-1 font-medium text-brand">{counts.error} with errors</span>
              </div>
              <div className="max-h-72 overflow-auto rounded-xl border border-line">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-surface text-xs font-semibold text-muted uppercase">
                    <tr>
                      <th className="px-3 py-2">Row</th>
                      <th className="px-3 py-2">Name / email</th>
                      <th className="px-3 py-2">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {result.rows.map((r) => (
                      <tr key={r.row}>
                        <td className="px-3 py-2 text-muted">{r.row}</td>
                        <td className="px-3 py-2">
                          <p className="font-medium text-ink">{r.name || '—'}</p>
                          <p className="text-xs text-muted">{r.email || '—'}</p>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${OUTCOME_STYLE[r.outcome]}`}>{OUTCOME_LABEL[r.outcome]}</span>
                          {r.message && <p className="mt-1 text-xs">{r.message}</p>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Toggle checked={sendInvites} onChange={setSendInvites} label="Email each new volunteer an invitation to sign in" />
              <div className="flex justify-end gap-2">
                <button className="btn-secondary" onClick={close}>
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  disabled={counts.create === 0 || commit.isPending}
                  onClick={() => csv && commit.mutate({ csv, dryRun: false, sendInvites })}
                >
                  {commit.isPending && <Spinner />}
                  Import {counts.create} {counts.create === 1 ? 'volunteer' : 'volunteers'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
