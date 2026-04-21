import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DigitList, DigitDatagrid, EditableCell } from '@/admin';
import type { DigitColumn } from '@/admin';
import { useApp } from '../../App';
import { digitClient } from '@/providers/bridge';
import { toast } from '@/hooks/use-toast';

const truncate = (v: unknown, max = 100) => {
  const s = String(v ?? '');
  return s.length > max ? s.slice(0, max) + '…' : s;
};

interface LocalizationRow {
  code: string;
  module: string;
  en_IN?: string;
  sw_KE?: string;
}

function EditableLocaleCell({
  row,
  locale,
  field,
}: {
  row: LocalizationRow;
  locale: 'en_IN' | 'sw_KE';
  field: 'en_IN' | 'sw_KE';
}) {
  const { state } = useApp();
  const queryClient = useQueryClient();
  const [value, setValue] = useState(String(row[field] ?? ''));

  const handleSave = useCallback(
    async (newValue: string) => {
      if (newValue === value) return;
      try {
        await digitClient.localizationUpsert(state.tenant, locale, [
          { code: row.code, message: newValue, module: row.module },
        ]);
        // Bust the localization service cache so other clients see the new value.
        // Fire-and-forget — the local cell already shows the new value.
        const apiBase = (digitClient as unknown as { baseUrl?: string }).baseUrl || '';
        fetch(`${apiBase}/localization/messages/cache-bust`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ RequestInfo: {} }),
        }).catch(() => { /* non-fatal */ });
        setValue(newValue);
        queryClient.invalidateQueries({ queryKey: ['localization'] });
        toast({
          title: 'Saved',
          description: `${row.code} (${locale}) → ${newValue.slice(0, 40)}${newValue.length > 40 ? '…' : ''}`,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Save failed';
        toast({ title: 'Save failed', description: msg, variant: 'destructive' });
        throw err; // keep EditableCell in edit mode so user can retry
      }
    },
    [row.code, row.module, state.tenant, queryClient, value, locale],
  );

  // stopPropagation prevents the row-click (rowClick="show") from firing when
  // user clicks inside the editable cell.
  return (
    <div onClick={(e) => e.stopPropagation()} className="block max-w-[360px]">
      <EditableCell
        value={value}
        onSave={handleSave}
        placeholder="—"
        displayClassName={!value ? 'text-primary font-mono' : ''}
      />
    </div>
  );
}

const columns: DigitColumn[] = [
  {
    source: 'code',
    label: 'Code',
    render: (r) => <span className="font-mono text-xs">{truncate(r.code, 60)}</span>,
  },
  {
    source: 'module',
    label: 'Module',
    render: (r) => (
      <span className="text-xs px-2 py-0.5 rounded bg-muted">
        {String(r.module || '').replace('rainmaker-', '')}
      </span>
    ),
  },
  {
    source: 'en_IN',
    label: 'English (en_IN)',
    render: (r) => (
      <EditableLocaleCell row={r as unknown as LocalizationRow} locale="en_IN" field="en_IN" />
    ),
  },
  {
    source: 'sw_KE',
    label: 'Swahili (sw_KE)',
    render: (r) => (
      <EditableLocaleCell row={r as unknown as LocalizationRow} locale="sw_KE" field="sw_KE" />
    ),
  },
];

export function LocalizationList() {
  return (
    <DigitList title="Localization Messages" hasCreate sort={{ field: 'code', order: 'ASC' }}>
      <DigitDatagrid columns={columns} rowClick="show" />
    </DigitList>
  );
}
