import { useMemo } from 'react';
import { DigitList, DigitDatagrid } from '@/admin';
import type { DigitColumn } from '@/admin';
import { useListContext, useResourceContext } from 'ra-core';
import { getResourceConfig, getResourceLabel, getResourceBySchema } from '@/providers/bridge';
import { useSchemaDefinition } from '@/hooks/useSchemaDefinition';
import { generateColumns, getRefMap } from './schemaUtils';
import { TenantScopeBadge } from '@/components/ui/TenantScopeBadge';

function withTenantBadge(columns: DigitColumn[]): DigitColumn[] {
  return columns.map((col) =>
    col.source === 'tenantId'
      ? { ...col, render: (r) => <TenantScopeBadge tenantId={r.tenantId as string | undefined} /> }
      : col,
  );
}

export function MdmsResourcePage() {
  const resource = useResourceContext() ?? '';
  const config = getResourceConfig(resource);
  const label = getResourceLabel(resource);

  const { definition } = useSchemaDefinition(config?.schema);

  const schemaColumns = useMemo(() => {
    if (!definition) return null;
    const refMap = getRefMap(definition, getResourceBySchema);
    return withTenantBadge(generateColumns(definition, refMap));
  }, [definition]);

  const subtitle = config?.schema ? `Schema: ${config.schema}` : undefined;

  return (
    <DigitList title={label} subtitle={subtitle}>
      {schemaColumns ? (
        <DigitDatagrid columns={schemaColumns} rowClick="show" />
      ) : (
        <AutoDetectDatagrid />
      )}
    </DigitList>
  );
}

function AutoDetectDatagrid() {
  const { data } = useListContext();
  const firstRecord = data?.[0];

  const columns: DigitColumn[] = useMemo(() => {
    if (!firstRecord) return [{ source: 'id', label: 'ID' }];
    return Object.keys(firstRecord as Record<string, unknown>)
      .filter((key) => !key.startsWith('_') && key !== 'id')
      .slice(0, 8)
      .map((key) => {
        if (key === 'tenantId') {
          return {
            source: key,
            label: 'Tenant',
            render: (r) => <TenantScopeBadge tenantId={r.tenantId as string | undefined} />,
          };
        }
        return {
          source: key,
          label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
        };
      });
  }, [firstRecord]);

  return <DigitDatagrid columns={columns} rowClick="show" />;
}
