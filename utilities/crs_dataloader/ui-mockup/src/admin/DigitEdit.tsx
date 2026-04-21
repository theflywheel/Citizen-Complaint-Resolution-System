import React, { useState } from 'react';
import { EditBase, useEditContext, Form } from 'ra-core';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, RefreshCw, AlertCircle } from 'lucide-react';
import { DigitCard } from '@/components/digit/DigitCard';
import { ActionBar } from '@/components/digit/ActionBar';
import { Button } from '@/components/ui/button';

export interface DigitEditProps {
  /** Page title */
  title?: string;
  /** Form fields (DigitFormInput components) */
  children: React.ReactNode;
  /** Optional banner rendered above the form fields (e.g., CrossTenantBanner) */
  banner?: React.ReactNode;
  /** Form-level validator: (values) => { [field]: errorMessage }. Returned empty object == valid. */
  validate?: (values: Record<string, unknown>) => Record<string, string>;
  /** Resource name (optional, from ResourceContext by default) */
  resource?: string;
  /** Record id (optional, from URL by default) */
  id?: string | number;
}

type SaveArg = Record<string, unknown>;

function DigitEditContent({
  title,
  banner,
  validate,
  children,
}: {
  title?: string;
  banner?: React.ReactNode;
  validate?: DigitEditProps['validate'];
  children: React.ReactNode;
}) {
  const { record, isPending, saving, error, defaultTitle, refetch, save } =
    useEditContext();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const displayTitle = title || defaultTitle || 'Edit';

  const handleBack = () => {
    navigate(-1);
  };

  const handleCancel = () => {
    navigate(-1);
  };

  // Wrap save so server rejections surface inline instead of only as a toast
  const onSubmit = async (data: SaveArg) => {
    setServerError(null);
    if (!save) return;
    try {
      await save(data);
    } catch (e: unknown) {
      const err = e as { body?: { message?: string }; message?: string };
      const msg = err?.body?.message || err?.message || 'Save failed';
      setServerError(msg);
    }
  };

  if (isPending) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>
        <DigitCard className="max-w-none">
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            Loading...
          </div>
        </DigitCard>
      </div>
    );
  }

  if (error && !record) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>
        <DigitCard className="max-w-none">
          <div className="text-center py-12">
            <p className="text-destructive font-medium">Error loading record</p>
            <p className="text-sm text-muted-foreground mt-1">
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3">
              Try again
            </Button>
          </div>
        </DigitCard>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold font-condensed text-foreground">
          {displayTitle}
        </h1>
        {saving && (
          <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Optional banner (e.g., cross-tenant warning) */}
      {banner}

      {/* Form card */}
      <DigitCard className="max-w-none">
        <Form onSubmit={onSubmit} validate={validate}>
          <div className="space-y-4">
            {serverError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">Server rejected the save</p>
                  <p className="text-destructive/80 mt-0.5 break-words">{serverError}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setServerError(null)}
                  className="text-destructive/60 hover:text-destructive text-xs"
                  aria-label="Dismiss"
                >
                  ×
                </button>
              </div>
            )}
            {children}
          </div>

          <ActionBar>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="gap-1.5">
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save
            </Button>
          </ActionBar>
        </Form>
      </DigitCard>
    </div>
  );
}

export function DigitEdit({ title, banner, validate, children, resource, id }: DigitEditProps) {
  return (
    <EditBase resource={resource} id={id} mutationMode="pessimistic">
      <DigitEditContent title={title} banner={banner} validate={validate}>
        {children}
      </DigitEditContent>
    </EditBase>
  );
}
