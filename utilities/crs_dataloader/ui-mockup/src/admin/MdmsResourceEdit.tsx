import { useMemo } from 'react';
import { useInput, useEditContext, useResourceContext } from 'ra-core';
import { useFormState } from 'react-hook-form';
import { DigitEdit } from './DigitEdit';
import { DigitFormInput } from './DigitFormInput';
import { getResourceConfig, getResourceLabel } from '@/providers/bridge';
import { useSchemaDefinition } from '@/hooks/useSchemaDefinition';
import { makeSchemaValidator } from './schemaValidator';
import { CrossTenantBanner } from '@/components/ui/CrossTenantBanner';
import { formatFieldLabel } from './schemaUtils';
import type { SchemaDefinition, SchemaProperty } from './schemaUtils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface FieldBaseProps {
  source: string;
  label: string;
  disabled?: boolean;
  required?: boolean;
}

function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={`${id}-error`} className="mt-1 text-xs text-destructive" role="alert">
      {message}
    </p>
  );
}

function LabelRow({ id, label, required }: { id: string; label: string; required?: boolean }) {
  return (
    <Label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground">
      {label}
      {required && <span className="text-destructive ml-0.5" aria-label="required">*</span>}
    </Label>
  );
}

function DigitFormSelect({
  source,
  label,
  disabled,
  required,
  options,
}: FieldBaseProps & { options: string[] }) {
  const { id, field, fieldState } = useInput({ source });
  const { isSubmitted } = useFormState();
  const hasError = fieldState.invalid && (fieldState.isTouched || isSubmitted);

  return (
    <div>
      <LabelRow id={id} label={label} required={required} />
      <Select
        value={typeof field.value === 'string' ? field.value : ''}
        onValueChange={(v) => field.onChange(v)}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          aria-invalid={hasError || undefined}
          className={hasError ? 'border-destructive focus-visible:ring-destructive' : ''}
        >
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasError && fieldState.error?.message && (
        <FieldError id={id} message={fieldState.error.message} />
      )}
    </div>
  );
}

function DigitFormCheckbox({
  source,
  label,
  disabled,
}: FieldBaseProps) {
  const { id, field } = useInput({ source });
  const checked = field.value === true;
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => field.onChange(e.target.checked)}
        onBlur={field.onBlur}
        ref={field.ref}
        className="h-4 w-4 rounded border-input text-primary focus-visible:ring-primary"
      />
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </Label>
    </div>
  );
}

/** For object/array values — show as readable JSON, keep value untouched via hidden field. */
function JsonReadonlyField({
  source,
  label,
  value,
}: FieldBaseProps & { value: unknown }) {
  const { id, field } = useInput({ source });
  return (
    <div>
      <LabelRow id={id} label={label} />
      <pre className="rounded border border-input bg-muted/40 px-3 py-2 text-xs font-mono overflow-x-auto max-h-48">
        {JSON.stringify(value, null, 2)}
      </pre>
      <p className="mt-1 text-xs text-muted-foreground">
        Nested value — edit in raw JSON mode (not yet supported in form).
      </p>
      {/* keep value untouched in form submission */}
      <input type="hidden" ref={field.ref} onBlur={field.onBlur} />
    </div>
  );
}

type InputKind = 'select' | 'checkbox' | 'number' | 'text' | 'json-readonly';

function pickInputKind(prop: SchemaProperty | undefined, value: unknown): InputKind {
  if (prop?.enum && Array.isArray(prop.enum) && prop.enum.length > 0) return 'select';
  if (prop?.type === 'boolean' || typeof value === 'boolean') return 'checkbox';
  if (prop?.type === 'number' || prop?.type === 'integer' || typeof value === 'number') return 'number';
  if ((prop?.type === 'object' || prop?.type === 'array') || (value != null && typeof value === 'object')) {
    return 'json-readonly';
  }
  return 'text';
}

function MdmsEditFields({ definition }: { definition: SchemaDefinition | null }) {
  const resource = useResourceContext() ?? '';
  const config = getResourceConfig(resource);
  const idField = config?.idField ?? 'id';
  const { record } = useEditContext();

  if (!record) return null;

  const rec = record as Record<string, unknown>;

  // Field ordering: x-unique first, then required, then rest (all derived from schema if present)
  const schemaProps = definition?.properties ?? {};
  const required = new Set(definition?.required ?? []);
  const unique = definition?.['x-unique'] ?? [];

  const schemaKeys = Object.keys(schemaProps);
  const recordKeys = Object.keys(rec).filter((k) => !k.startsWith('_') && k !== 'id');
  // Union: schema fields + any extra present on record
  const allKeys = Array.from(new Set([...unique, ...schemaKeys, ...recordKeys]));

  return (
    <>
      {allKeys.map((key) => {
        const prop = schemaProps[key] as SchemaProperty | undefined;
        const value = rec[key];
        const isId = key === idField;
        const isRequired = required.has(key);
        const label = formatFieldLabel(key);
        const kind = pickInputKind(prop, value);

        if (kind === 'select' && prop?.enum) {
          return (
            <DigitFormSelect
              key={key}
              source={key}
              label={label}
              disabled={isId}
              required={isRequired}
              options={prop.enum.map(String)}
            />
          );
        }

        if (kind === 'checkbox') {
          return (
            <DigitFormCheckbox
              key={key}
              source={key}
              label={label}
              disabled={isId}
            />
          );
        }

        if (kind === 'json-readonly') {
          return (
            <JsonReadonlyField
              key={key}
              source={key}
              label={label}
              value={value}
            />
          );
        }

        return (
          <DigitFormInput
            key={key}
            source={key}
            label={label}
            disabled={isId}
            type={kind === 'number' ? 'number' : 'text'}
          />
        );
      })}
    </>
  );
}

function RecordTenantBanner() {
  const { record } = useEditContext();
  const tenantId = (record as Record<string, unknown> | undefined)?.tenantId;
  return <CrossTenantBanner recordTenantId={typeof tenantId === 'string' ? tenantId : null} />;
}

export function MdmsResourceEdit() {
  const resource = useResourceContext() ?? '';
  const config = getResourceConfig(resource);
  const label = getResourceLabel(resource);
  const { definition } = useSchemaDefinition(config?.schema);

  const validate = useMemo(
    () => makeSchemaValidator(config?.schema, definition),
    [config?.schema, definition],
  );

  return (
    <DigitEdit title={`Edit ${label}`} validate={validate} banner={<RecordTenantBanner />}>
      <MdmsEditFields definition={definition} />
    </DigitEdit>
  );
}
