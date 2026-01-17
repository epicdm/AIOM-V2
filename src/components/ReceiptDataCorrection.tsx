/**
 * ReceiptDataCorrection Component
 *
 * Displays OCR extraction results and allows users to manually correct
 * extracted data before submission.
 */

import { useState, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Edit2,
  Check,
  X,
  Loader2,
  Eye,
  EyeOff,
  RotateCcw,
} from 'lucide-react';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import type { ReceiptExtractionResult, CorrectedReceiptData } from '~/lib/ocr-service/types';

// ============================================================================
// Types
// ============================================================================

export interface ReceiptDataCorrectionProps {
  /** The OCR extraction result */
  extractionResult: ReceiptExtractionResult;
  /** Preview image URL */
  imageUrl?: string;
  /** Called when data is confirmed/corrected */
  onConfirm: (data: CorrectedReceiptData) => void;
  /** Called when user cancels */
  onCancel?: () => void;
  /** Whether submission is in progress */
  isSubmitting?: boolean;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Validation Schema
// ============================================================================

const correctionFormSchema = z.object({
  amount: z.string().refine((val) => !val || !isNaN(parseFloat(val)), {
    message: 'Please enter a valid number',
  }),
  currency: z.string().min(1, 'Currency is required').max(3),
  vendor: z.string().min(1, 'Vendor name is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  category: z.string().optional(),
  notes: z.string().optional(),
});

type CorrectionFormData = z.infer<typeof correctionFormSchema>;

// ============================================================================
// Helper Components
// ============================================================================

interface ConfidenceBadgeProps {
  confidence: number;
  className?: string;
}

function ConfidenceBadge({ confidence, className }: ConfidenceBadgeProps) {
  const percentage = Math.round(confidence * 100);
  const isHigh = confidence >= 0.8;
  const isMedium = confidence >= 0.5 && confidence < 0.8;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        isHigh && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        isMedium && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        !isHigh && !isMedium && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        className
      )}
      data-testid="confidence-badge"
    >
      {isHigh && <CheckCircle className="h-3 w-3" />}
      {isMedium && <AlertTriangle className="h-3 w-3" />}
      {!isHigh && !isMedium && <AlertCircle className="h-3 w-3" />}
      {percentage}%
    </span>
  );
}

interface ValidationMessageProps {
  errors: { field: string; message: string; severity: 'error' | 'warning' }[];
}

function ValidationMessages({ errors }: ValidationMessageProps) {
  if (errors.length === 0) return null;

  return (
    <div className="space-y-2 p-3 rounded-lg bg-muted" data-testid="validation-messages">
      {errors.map((error, index) => (
        <div
          key={index}
          className={cn(
            'flex items-start gap-2 text-sm',
            error.severity === 'error' && 'text-red-600 dark:text-red-400',
            error.severity === 'warning' && 'text-yellow-600 dark:text-yellow-400'
          )}
        >
          {error.severity === 'error' ? (
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          )}
          <span>
            <strong className="capitalize">{error.field}:</strong> {error.message}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ReceiptDataCorrection({
  extractionResult,
  imageUrl,
  onConfirm,
  onCancel,
  isSubmitting = false,
  className,
}: ReceiptDataCorrectionProps) {
  const [showRawText, setShowRawText] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);

  // Initialize form with extracted data
  const defaultValues = useMemo(() => ({
    amount: extractionResult.amount?.value?.toString() || '',
    currency: extractionResult.amount?.currency || 'USD',
    vendor: extractionResult.vendor?.name || '',
    date: extractionResult.date?.value || new Date().toISOString().split('T')[0],
    category: '',
    notes: '',
  }), [extractionResult]);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
  } = useForm<CorrectionFormData>({
    resolver: zodResolver(correctionFormSchema),
    defaultValues,
  });

  // Watch form values to track changes
  const formValues = watch();

  // Check if any field has been modified from original
  const hasChanges = useMemo(() => {
    return (
      formValues.amount !== defaultValues.amount ||
      formValues.currency !== defaultValues.currency ||
      formValues.vendor !== defaultValues.vendor ||
      formValues.date !== defaultValues.date
    );
  }, [formValues, defaultValues]);

  // Handle form submission
  const onSubmit = useCallback(
    (data: CorrectionFormData) => {
      const correctedData: CorrectedReceiptData = {
        amount: data.amount ? parseFloat(data.amount) : null,
        currency: data.currency,
        vendor: data.vendor,
        date: data.date,
        category: data.category,
        notes: data.notes,
      };
      onConfirm(correctedData);
    },
    [onConfirm]
  );

  // Reset form to original values
  const handleReset = useCallback(() => {
    reset(defaultValues);
  }, [reset, defaultValues]);

  // Currency options
  const currencyOptions = ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'GHS', 'ZAR', 'CAD', 'AUD', 'INR'];

  return (
    <div className={cn('flex flex-col gap-6', className)} data-testid="receipt-data-correction">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Review Extracted Data</h2>
          <p className="text-sm text-muted-foreground">
            Verify and correct the information extracted from your receipt
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Confidence:</span>
          <ConfidenceBadge confidence={extractionResult.overallConfidence} />
        </div>
      </div>

      {/* Image Preview (if available) */}
      {imageUrl && (
        <div className="relative rounded-lg overflow-hidden border bg-muted">
          <img
            src={imageUrl}
            alt="Receipt preview"
            className="w-full max-h-48 object-contain"
          />
        </div>
      )}

      {/* Validation Messages */}
      <ValidationMessages errors={extractionResult.validationErrors} />

      {/* Extraction Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Amount Field */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="amount">Total Amount</Label>
              {extractionResult.amount && (
                <ConfidenceBadge confidence={extractionResult.amount.confidence} />
              )}
            </div>
            <Input
              id="amount"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              {...register('amount')}
              className={cn(errors.amount && 'border-red-500')}
              data-testid="amount-input"
            />
            {errors.amount && (
              <p className="text-sm text-red-500">{errors.amount.message}</p>
            )}
            {extractionResult.amount?.rawText && (
              <p className="text-xs text-muted-foreground">
                Original: "{extractionResult.amount.rawText}"
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <select
              id="currency"
              {...register('currency')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              data-testid="currency-select"
            >
              {currencyOptions.map((curr) => (
                <option key={curr} value={curr}>
                  {curr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Vendor Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="vendor">Vendor / Merchant</Label>
            {extractionResult.vendor && (
              <ConfidenceBadge confidence={extractionResult.vendor.confidence} />
            )}
          </div>
          <Input
            id="vendor"
            type="text"
            placeholder="Store or merchant name"
            {...register('vendor')}
            className={cn(errors.vendor && 'border-red-500')}
            data-testid="vendor-input"
          />
          {errors.vendor && (
            <p className="text-sm text-red-500">{errors.vendor.message}</p>
          )}
          {extractionResult.vendor?.address && (
            <p className="text-xs text-muted-foreground">
              Address: {extractionResult.vendor.address}
            </p>
          )}
        </div>

        {/* Date Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="date">Transaction Date</Label>
            {extractionResult.date && (
              <ConfidenceBadge confidence={extractionResult.date.confidence} />
            )}
          </div>
          <Input
            id="date"
            type="date"
            {...register('date')}
            className={cn(errors.date && 'border-red-500')}
            data-testid="date-input"
          />
          {errors.date && (
            <p className="text-sm text-red-500">{errors.date.message}</p>
          )}
          {extractionResult.date?.rawText && (
            <p className="text-xs text-muted-foreground">
              Original: "{extractionResult.date.rawText}"
              {extractionResult.date.time && ` at ${extractionResult.date.time}`}
            </p>
          )}
        </div>

        {/* Category Field */}
        <div className="space-y-2">
          <Label htmlFor="category">Category (Optional)</Label>
          <select
            id="category"
            {...register('category')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            data-testid="category-select"
          >
            <option value="">Select a category</option>
            <option value="meals">Meals & Entertainment</option>
            <option value="travel">Travel</option>
            <option value="supplies">Office Supplies</option>
            <option value="transport">Transportation</option>
            <option value="utilities">Utilities</option>
            <option value="accommodation">Accommodation</option>
            <option value="communication">Communication</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Notes Field */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Input
            id="notes"
            type="text"
            placeholder="Add any additional notes..."
            {...register('notes')}
            data-testid="notes-input"
          />
        </div>

        {/* Raw OCR Text Toggle */}
        {extractionResult.rawText && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowRawText(!showRawText)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {showRawText ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              {showRawText ? 'Hide' : 'Show'} raw OCR text
            </button>
            {showRawText && (
              <pre className="p-3 rounded-lg bg-muted text-xs whitespace-pre-wrap max-h-32 overflow-auto font-mono">
                {extractionResult.rawText}
              </pre>
            )}
          </div>
        )}

        {/* Processing Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Processed by: {extractionResult.ocrProvider}</span>
          <span>Time: {extractionResult.processingTimeMs}ms</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={isSubmitting}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
                data-testid="cancel-button"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting} data-testid="confirm-button">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  {hasChanges ? 'Save Changes' : 'Confirm'}
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default ReceiptDataCorrection;
