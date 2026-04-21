import { useMemo, useState, useCallback } from 'react';
import {
  useListController,
  ListContextProvider,
  type ListControllerResult,
  type RaRecord,
} from 'ra-core';
import { RefreshCw } from 'lucide-react';
import { DigitDatagrid } from '@/admin';
import type { DigitColumn } from '@/admin';
import { StatusChip } from '@/admin/fields';
import { DigitCard } from '@/components/digit/DigitCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TenantScopeBadge } from '@/components/ui/TenantScopeBadge';
import { getResourceBySchema, getResourceConfig } from '@/providers/bridge';
import {
  SchemaFilterBar,
  categoryForSchemaCode,
  type SchemaFilterState,
} from '@/components/ui/SchemaFilterBar';

/** Prefer a curated description from the resource registry; fall back to
 *  whatever the MDMS record itself carries (often empty or echo of code). */
function descriptionFor(code: string, backend: string | undefined): string {
  const resourceKey = getResourceBySchema(code);
  const curated = resourceKey ? getResourceConfig(resourceKey)?.description : undefined;
  if (curated) return curated;
  const b = (backend ?? '').trim();
  return b && b !== code ? b : '';
}

interface SchemaRecord extends RaRecord {
  code?: string;
  tenantId?: string;
  description?: string;
  isActive?: boolean;
}

function fuzzyMatches(haystack: string, needle: string): boolean {
  if (!needle) return true;
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function filterSchemas(
  all: SchemaRecord[],
  filter: SchemaFilterState,
): SchemaRecord[] {
  return all.filter((r) => {
    const code = r.code ?? '';
    const desc = descriptionFor(code, r.description as string | undefined);
    const cat = categoryForSchemaCode(code);
    const tid = r.tenantId ?? '';
    if (filter.search) {
      const q = filter.search;
      if (!fuzzyMatches(code, q) && !fuzzyMatches(desc, q)) return false;
    }
    if (filter.categories.size > 0 && !filter.categories.has(cat)) return false;
    if (filter.tenant && tid !== filter.tenant) return false;
    return true;
  });
}

export function MdmsSchemaList() {
  const [filter, setFilter] = useState<SchemaFilterState>({
    search: '',
    categories: new Set<string>(),
    tenant: null,
  });

  const listContext = useListController({
    resource: 'mdms-schemas',
    sort: { field: 'code', order: 'ASC' },
    perPage: 500,
    disableSyncWithLocation: true,
  }) as ListControllerResult<SchemaRecord>;

  const allData = listContext.data ?? [];

  const filtered = useMemo(() => filterSchemas(allData, filter), [allData, filter]);

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    for (const r of allData) set.add(categoryForSchemaCode(r.code ?? ''));
    return Array.from(set).sort();
  }, [allData]);

  const onTenantBadgeClick = useCallback(
    (tenantId: string | null | undefined) => {
      if (!tenantId) return;
      setFilter((f) => ({ ...f, tenant: f.tenant === tenantId ? null : tenantId }));
    },
    [],
  );

  const columns: DigitColumn[] = useMemo(
    () => [
      {
        source: 'code',
        label: 'Code',
        render: (r) => <span className="font-mono text-xs">{String(r.code ?? '')}</span>,
      },
      {
        source: '_category',
        label: 'Category',
        render: (r) => (
          <Badge variant="secondary" className="text-xs">
            {categoryForSchemaCode(String(r.code ?? ''))}
          </Badge>
        ),
      },
      {
        source: 'tenantId',
        label: 'Tenant',
        render: (r) => (
          <TenantScopeBadge
            tenantId={r.tenantId as string | undefined}
            onClick={() => onTenantBadgeClick(r.tenantId as string | undefined)}
          />
        ),
      },
      {
        source: 'description',
        label: 'Description',
        render: (r) => {
          const d = descriptionFor(String(r.code ?? ''), r.description as string | undefined);
          return d
            ? <span className="text-sm text-muted-foreground max-w-[540px] block">{d}</span>
            : <span className="text-muted-foreground">—</span>;
        },
      },
      {
        source: 'isActive',
        label: 'Active',
        render: (r) => (
          <StatusChip value={r.isActive} labels={{ true: 'Active', false: 'Inactive' }} />
        ),
      },
    ],
    [onTenantBadgeClick],
  );

  // Override the list context so DigitDatagrid sees the filtered slice.
  const filteredContext = {
    ...listContext,
    data: filtered,
    total: filtered.length,
  } as unknown as ListControllerResult<RaRecord>;

  return (
    <ListContextProvider value={filteredContext}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold font-condensed text-foreground">
              MDMS Schemas
            </h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => listContext.refetch()}
            disabled={listContext.isFetching}
            className="gap-1.5"
          >
            <RefreshCw
              className={`w-4 h-4 ${listContext.isFetching ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>

        <DigitCard className="max-w-none">
          <SchemaFilterBar
            state={filter}
            onChange={setFilter}
            availableCategories={availableCategories}
            totalCount={allData.length}
            filteredCount={filtered.length}
          />

          {listContext.isPending && (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              Loading…
            </div>
          )}

          {listContext.error && !listContext.isPending && (
            <div className="text-center py-12">
              <p className="text-destructive font-medium">Error loading schemas</p>
              <p className="text-sm text-muted-foreground mt-1">
                {listContext.error instanceof Error
                  ? listContext.error.message
                  : 'An unexpected error occurred'}
              </p>
            </div>
          )}

          {!listContext.isPending && !listContext.error && (
            <>
              {filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="font-medium">No schemas match your filters</p>
                  <p className="text-sm mt-1">Try clearing or loosening the filters above.</p>
                </div>
              ) : (
                <DigitDatagrid columns={columns} rowClick="show" />
              )}
            </>
          )}
        </DigitCard>
      </div>
    </ListContextProvider>
  );
}
