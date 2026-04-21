import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface TenantScopeBadgeProps {
  tenantId: string | null | undefined;
  /** Click handler — used by MdmsSchemaList to filter the list by this tenant. */
  onClick?: () => void;
  className?: string;
}

function classifyScope(tenantId: string | null | undefined): 'root' | 'city' | 'unknown' {
  if (!tenantId) return 'unknown';
  return tenantId.includes('.') ? 'city' : 'root';
}

export function TenantScopeBadge({ tenantId, onClick, className }: TenantScopeBadgeProps) {
  const scope = classifyScope(tenantId);
  const id = tenantId || '—';

  if (scope === 'unknown') {
    return <Badge variant="outline" className={className}>no tenant</Badge>;
  }

  const isRoot = scope === 'root';
  const variant = isRoot ? 'default' : 'warning';
  const label = isRoot ? `Root · ${id}` : `City · ${id}`;
  const tip = isRoot
    ? `Changes at "${id}" (root) propagate to every city underneath.`
    : `Changes at "${id}" only affect this city.`;

  const badge = (
    <Badge
      variant={variant}
      className={[
        className ?? '',
        onClick ? 'cursor-pointer hover:opacity-80' : '',
      ].filter(Boolean).join(' ')}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      {label}
    </Badge>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs text-xs">{tip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function isRootTenant(tenantId: string | null | undefined): boolean {
  return classifyScope(tenantId) === 'root';
}
