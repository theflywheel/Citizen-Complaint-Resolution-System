import { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export interface SchemaFilterState {
  search: string;
  categories: Set<string>;
  tenant: string | null;
}

export interface SchemaFilterBarProps {
  state: SchemaFilterState;
  onChange: (next: SchemaFilterState) => void;
  /** All distinct categories derived from the full schema list. */
  availableCategories: string[];
  /** Total schemas before filtering; shown alongside filtered count. */
  totalCount: number;
  filteredCount: number;
}

/** Derive a category label from a schema code prefix. */
export function categoryForSchemaCode(code: string): string {
  if (!code) return 'Other';
  const dot = code.indexOf('.');
  const dash = code.indexOf('-');
  const firstSep = [dot, dash].filter((i) => i !== -1).sort((a, b) => a - b)[0];
  const prefix = firstSep === undefined ? code : code.slice(0, firstSep);
  // Normalize known families
  switch (prefix) {
    case 'common-masters': return 'Core';
    case 'tenant': return 'Tenant';
    case 'Workflow': return 'Workflow';
    case 'DataSecurity': return 'Security';
    case 'egov-hrms': return 'HRMS';
    case 'INBOX': return 'Inbox';
    case 'ACCESSCONTROL': return 'Access';
    case 'RAINMAKER': return 'PGR';
    default: return prefix || 'Other';
  }
}

export function SchemaFilterBar({
  state,
  onChange,
  availableCategories,
  totalCount,
  filteredCount,
}: SchemaFilterBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Ctrl/Cmd-K focuses search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggleCategory = (cat: string) => {
    const next = new Set(state.categories);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    onChange({ ...state, categories: next });
  };

  const clearTenant = () => onChange({ ...state, tenant: null });
  const clearAll = () =>
    onChange({ search: '', categories: new Set(), tenant: null });

  const hasFilter =
    state.search.length > 0 || state.categories.size > 0 || state.tenant !== null;

  return (
    <div className="space-y-3 mb-4">
      {/* Search + result count + clear */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="Search schemas… (⌘K)"
            value={state.search}
            onChange={(e) => onChange({ ...state, search: e.target.value })}
            className="pl-9"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {filteredCount === totalCount
            ? `${totalCount} schemas`
            : `${filteredCount} of ${totalCount} schemas`}
        </span>
        {hasFilter && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Category chips + active tenant pill */}
      <div className="flex items-center gap-2 flex-wrap">
        {availableCategories.map((cat) => {
          const active = state.categories.has(cat);
          return (
            <button
              key={cat}
              type="button"
              onClick={() => toggleCategory(cat)}
              className="focus:outline-none"
            >
              <Badge
                variant={active ? 'default' : 'outline'}
                className="cursor-pointer hover:opacity-80"
              >
                {cat}
              </Badge>
            </button>
          );
        })}
        {state.tenant && (
          <Badge
            variant="warning"
            className="cursor-pointer hover:opacity-80 gap-1"
            onClick={clearTenant}
          >
            Tenant: {state.tenant}
            <X className="w-3 h-3" />
          </Badge>
        )}
      </div>
    </div>
  );
}
