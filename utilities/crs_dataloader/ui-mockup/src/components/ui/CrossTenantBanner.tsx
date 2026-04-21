import { AlertTriangle } from 'lucide-react';
import { useApp } from '../../App';

export interface CrossTenantBannerProps {
  /** The tenantId of the record being edited. If null/undefined, banner is hidden. */
  recordTenantId: string | null | undefined;
}

/**
 * Warns when a user's session tenant differs from the record's tenant.
 *
 * The common case is a city admin (session = "ke.nairobi") editing a record
 * that lives at root ("ke"). Changes there propagate to every city under "ke",
 * which is rarely what the user wants. Info-level banner, persistent, not
 * dismissible for the session — no confirm dialog per plan.
 */
export function CrossTenantBanner({ recordTenantId }: CrossTenantBannerProps) {
  const { state } = useApp();
  const sessionTenant = state.tenant;

  if (!recordTenantId || !sessionTenant) return null;
  if (recordTenantId === sessionTenant) return null;

  const recordIsRoot = !recordTenantId.includes('.');
  const sessionIsCity = sessionTenant.includes('.');

  let message: string;
  if (recordIsRoot && sessionIsCity) {
    message = `You are editing "${recordTenantId}" (root) config while signed in as "${sessionTenant}". Changes here propagate to every city under "${recordTenantId}".`;
  } else if (!recordIsRoot && sessionIsCity) {
    message = `You are editing "${recordTenantId}" config while signed in as "${sessionTenant}". Changes apply to "${recordTenantId}", not your own tenant.`;
  } else {
    message = `You are editing a record scoped to "${recordTenantId}" while signed in as "${sessionTenant}".`;
  }

  return (
    <div
      role="note"
      className="flex items-start gap-2 rounded-md border-l-4 border-primary bg-primary/5 px-3 py-2 text-sm"
    >
      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
      <div>
        <p className="font-medium">Cross-tenant edit</p>
        <p className="text-muted-foreground mt-0.5">{message}</p>
      </div>
    </div>
  );
}
