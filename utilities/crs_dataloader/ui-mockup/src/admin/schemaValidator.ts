import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import type { SchemaDefinition } from './schemaUtils';

const ajv = new Ajv({ allErrors: true, strict: false, useDefaults: false });
addFormats(ajv);

const compileCache = new Map<string, ValidateFunction | null>();

function stripUnresolvableRefs(def: unknown): unknown {
  if (def == null || typeof def !== 'object') return def;
  if (Array.isArray(def)) return def.map(stripUnresolvableRefs);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(def as Record<string, unknown>)) {
    // Cross-schema $refs point to other MDMS schemas; ajv can't follow them.
    // Strip so the rest of the schema still validates the shape/required fields.
    if (k === '$ref') continue;
    out[k] = stripUnresolvableRefs(v);
  }
  return out;
}

function getValidator(schemaCode: string, definition: SchemaDefinition): ValidateFunction | null {
  if (compileCache.has(schemaCode)) return compileCache.get(schemaCode) ?? null;
  if (!definition || !definition.properties) {
    compileCache.set(schemaCode, null);
    return null;
  }
  try {
    const cleaned = stripUnresolvableRefs(definition) as Record<string, unknown>;
    const compiled = ajv.compile(cleaned);
    compileCache.set(schemaCode, compiled);
    return compiled;
  } catch {
    compileCache.set(schemaCode, null);
    return null;
  }
}

export function makeSchemaValidator(
  schemaCode: string | undefined,
  definition: SchemaDefinition | null | undefined,
) {
  if (!schemaCode || !definition) return undefined;
  const validate = getValidator(schemaCode, definition);
  if (!validate) return undefined;
  return (values: Record<string, unknown>) => {
    const ok = validate(values);
    if (ok) return {};
    const errors: Record<string, string> = {};
    for (const err of validate.errors ?? []) {
      const field = mapErrorPathToField(err);
      if (field && !errors[field]) {
        errors[field] = formatErrorMessage(err);
      }
    }
    return errors;
  };
}

function mapErrorPathToField(err: ErrorObject): string | null {
  if (err.keyword === 'required') {
    return String((err.params as { missingProperty?: string }).missingProperty ?? '') || null;
  }
  const p = err.instancePath;
  if (!p) return null;
  // "/phoneNumber" → "phoneNumber"; "/address/city" → "address" (top-level only for now)
  const parts = p.slice(1).split('/');
  return parts[0] || null;
}

function formatErrorMessage(err: ErrorObject): string {
  const p = err.params as Record<string, unknown>;
  switch (err.keyword) {
    case 'required':
      return `${String(p.missingProperty)} is required`;
    case 'pattern':
      return `Doesn't match required pattern ${p.pattern ? `"${p.pattern}"` : ''}`.trim();
    case 'minLength':
      return `Must be at least ${p.limit} characters`;
    case 'maxLength':
      return `Must be at most ${p.limit} characters`;
    case 'minimum':
      return `Must be ≥ ${p.limit}`;
    case 'maximum':
      return `Must be ≤ ${p.limit}`;
    case 'enum':
      return `Must be one of: ${(p.allowedValues as unknown[])?.join(', ')}`;
    case 'type':
      return `Must be a ${p.type}`;
    case 'format':
      return `Invalid ${p.format}`;
    default:
      return err.message || 'Invalid value';
  }
}
