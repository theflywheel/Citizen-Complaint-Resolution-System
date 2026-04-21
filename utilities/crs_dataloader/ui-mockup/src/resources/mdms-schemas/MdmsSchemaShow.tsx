import { DigitShow } from '@/admin';
import { FieldSection, FieldRow, StatusChip, JsonViewer } from '@/admin/fields';
import { TenantScopeBadge } from '@/components/ui/TenantScopeBadge';
import { Button } from '@/components/ui/button';
import { ArrowUpRight } from 'lucide-react';
import { useShowController } from 'ra-core';
import { useNavigate } from 'react-router-dom';
import { getResourceBySchema, getResourceConfig } from '@/providers/bridge';

function descriptionFor(code: string, backend: string | undefined): string {
  const resourceKey = getResourceBySchema(code);
  const curated = resourceKey ? getResourceConfig(resourceKey)?.description : undefined;
  if (curated) return curated;
  const b = (backend ?? '').trim();
  return b && b !== code ? b : '';
}

export function MdmsSchemaShow() {
  const { record } = useShowController();
  const navigate = useNavigate();

  const schemaCode = record ? String(record.code ?? '') : '';
  const matchingResource = schemaCode ? getResourceBySchema(schemaCode) : undefined;

  return (
    <DigitShow title={record ? `Schema: ${record.code ?? record.id}` : 'MDMS Schema'}>
      {(rec: Record<string, unknown>) => {
        const code = String(rec.code ?? '');
        const description = descriptionFor(code, rec.description as string | undefined);
        return (
        <div className="space-y-6">
          <FieldSection title="Details">
            <FieldRow label="Code">
              <span className="font-mono">{code}</span>
            </FieldRow>
            <FieldRow label="Tenant">
              <TenantScopeBadge tenantId={rec.tenantId as string | undefined} />
            </FieldRow>
            <FieldRow label="Description">
              {description
                ? <span className="text-sm text-muted-foreground max-w-[640px] block">{description}</span>
                : <span className="text-muted-foreground">—</span>}
            </FieldRow>
            <FieldRow label="Active">
              <StatusChip value={rec.isActive} labels={{ true: 'Active', false: 'Inactive' }} />
            </FieldRow>
            {matchingResource && (
              <FieldRow label="Records">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/manage/${matchingResource}`)}
                  className="gap-1.5"
                >
                  Open records
                  <ArrowUpRight className="w-4 h-4" />
                </Button>
              </FieldRow>
            )}
            {!matchingResource && (
              <FieldRow label="Records">
                <span className="text-xs text-muted-foreground">
                  No registered resource for this schema. Add an entry to <code className="font-mono">resourceRegistry.ts</code> to browse records.
                </span>
              </FieldRow>
            )}
          </FieldSection>

          {rec.definition != null && (
            <FieldSection title="Schema Definition">
              <JsonViewer data={rec.definition} />
            </FieldSection>
          )}
        </div>
        );
      }}
    </DigitShow>
  );
}
