/**
 * ReceiptCapture Component
 *
 * Mobile-optimized component for capturing receipt photos with:
 * - Camera access and live preview
 * - Gallery selection
 * - Auto-rotation and image processing
 * - Manual rotation controls
 * - Upload to cloud storage
 * - Responsive, touch-friendly UI
 */

import { useEffect, useCallback, useRef } from 'react';
import {
  Camera,
  Image as ImageIcon,
  RotateCw,
  X,
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  SwitchCamera,
  Trash2,
  Plus,
} from 'lucide-react';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import {
  useReceiptCapture,
  type UseReceiptCaptureOptions,
  type CapturedReceipt,
} from '~/hooks/useReceiptCapture';
import type { MediaUploadResult } from '~/utils/storage/media-helpers';

export interface ReceiptCaptureProps {
  /** Maximum number of receipts that can be captured */
  maxReceipts?: number;
  /** Called when a receipt is successfully uploaded */
  onUploadComplete?: (results: MediaUploadResult[]) => void;
  /** Called when an error occurs */
  onError?: (error: string) => void;
  /** Called when the component is closed */
  onClose?: () => void;
  /** Additional class names */
  className?: string;
  /** Image processing options */
  processingOptions?: Omit<UseReceiptCaptureOptions, 'onUploadComplete' | 'onError'>;
}

export function ReceiptCapture({
  maxReceipts = 10,
  onUploadComplete,
  onError,
  onClose,
  className,
  processingOptions,
}: ReceiptCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    mode,
    receipts,
    activeReceiptId,
    isProcessing,
    isCameraReady,
    cameraError,
    facingMode,
    videoRef,
    startCamera,
    stopCamera,
    switchCamera,
    capturePhoto,
    selectFromGallery,
    rotateReceipt,
    removeReceipt,
    setActiveReceipt,
    uploadReceipt,
    uploadAllReceipts,
    setMode,
    reset,
  } = useReceiptCapture({
    ...processingOptions,
    onError,
  });

  // Start camera when entering camera mode
  useEffect(() => {
    if (mode === 'camera') {
      startCamera();
    }
    return () => {
      if (mode === 'camera') {
        stopCamera();
      }
    };
  }, [mode]);

  // Handle file selection from gallery
  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        selectFromGallery(files[0]);
      }
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [selectFromGallery]
  );

  // Open gallery
  const openGallery = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle upload all
  const handleUploadAll = useCallback(async () => {
    const results = await uploadAllReceipts();
    if (results.length > 0) {
      onUploadComplete?.(results);
    }
  }, [uploadAllReceipts, onUploadComplete]);

  // Handle close
  const handleClose = useCallback(() => {
    reset();
    onClose?.();
  }, [reset, onClose]);

  // Get active receipt
  const activeReceipt = receipts.find((r) => r.id === activeReceiptId);

  // Check if can add more receipts
  const canAddMore = receipts.length < maxReceipts;

  // Check if any receipts are ready for upload
  const readyForUpload = receipts.filter(
    (r) => r.status === 'ready' || r.status === 'pending'
  );

  // Check if any uploads are in progress
  const uploading = receipts.some((r) => r.status === 'uploading');

  return (
    <div
      className={cn(
        'flex flex-col h-full w-full bg-background',
        className
      )}
      data-testid="receipt-capture"
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
        data-testid="receipt-file-input"
      />

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Capture Receipt</h2>
        <Button variant="ghost" size="icon" onClick={handleClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {mode === 'camera' && (
          <CameraView
            videoRef={videoRef}
            isCameraReady={isCameraReady}
            cameraError={cameraError}
            facingMode={facingMode}
            isProcessing={isProcessing}
            onCapture={capturePhoto}
            onSwitchCamera={switchCamera}
            onOpenGallery={openGallery}
            onRetry={startCamera}
          />
        )}

        {mode === 'preview' && activeReceipt && (
          <PreviewView
            receipt={activeReceipt}
            isProcessing={isProcessing}
            onRotate={(degrees) => rotateReceipt(activeReceipt.id, degrees)}
            onRemove={() => {
              removeReceipt(activeReceipt.id);
              if (receipts.length <= 1) {
                setMode('camera');
              } else {
                const remaining = receipts.filter((r) => r.id !== activeReceipt.id);
                setActiveReceipt(remaining[0]?.id || null);
              }
            }}
            onUpload={() => uploadReceipt(activeReceipt.id)}
          />
        )}

        {mode === 'gallery' && (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Select an image from your gallery</p>
          </div>
        )}
      </div>

      {/* Receipt Thumbnails */}
      {receipts.length > 0 && mode === 'preview' && (
        <div className="border-t p-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {receipts.map((receipt) => (
              <ReceiptThumbnail
                key={receipt.id}
                receipt={receipt}
                isActive={receipt.id === activeReceiptId}
                onClick={() => setActiveReceipt(receipt.id)}
              />
            ))}
            {canAddMore && (
              <button
                type="button"
                onClick={() => setMode('camera')}
                className="flex-shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                data-testid="add-receipt-button"
              >
                <Plus className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Footer Actions */}
      {mode === 'preview' && readyForUpload.length > 0 && (
        <div className="border-t p-4">
          <Button
            onClick={handleUploadAll}
            disabled={uploading || isProcessing}
            className="w-full"
            size="lg"
            data-testid="upload-all-button"
          >
            {uploading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-5 w-5 mr-2" />
                Upload {readyForUpload.length} Receipt{readyForUpload.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// Camera View Component
interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isCameraReady: boolean;
  cameraError: string | null;
  facingMode: 'user' | 'environment';
  isProcessing: boolean;
  onCapture: () => void;
  onSwitchCamera: () => void;
  onOpenGallery: () => void;
  onRetry: () => void;
}

function CameraView({
  videoRef,
  isCameraReady,
  cameraError,
  isProcessing,
  onCapture,
  onSwitchCamera,
  onOpenGallery,
  onRetry,
}: CameraViewProps) {
  if (cameraError) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center" data-testid="camera-error">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2">Camera Access Failed</h3>
        <p className="text-muted-foreground mb-6">{cameraError}</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
          <Button onClick={onOpenGallery}>
            <ImageIcon className="h-4 w-4 mr-2" />
            Choose from Gallery
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full bg-black" data-testid="camera-view">
      {/* Video Preview */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        data-testid="camera-preview"
      />

      {/* Loading Overlay */}
      {!isCameraReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      )}

      {/* Receipt Frame Guide */}
      <div className="absolute inset-8 border-2 border-white/30 rounded-lg pointer-events-none">
        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl-lg" />
        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr-lg" />
        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl-lg" />
        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white rounded-br-lg" />
      </div>

      {/* Camera Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {/* Gallery Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-full bg-white/20 hover:bg-white/30 text-white"
            onClick={onOpenGallery}
            data-testid="gallery-button"
          >
            <ImageIcon className="h-6 w-6" />
          </Button>

          {/* Capture Button */}
          <button
            type="button"
            onClick={onCapture}
            disabled={!isCameraReady || isProcessing}
            className="h-18 w-18 rounded-full bg-white border-4 border-white/50 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
            style={{ width: '72px', height: '72px' }}
            data-testid="capture-button"
          >
            {isProcessing ? (
              <Loader2 className="h-8 w-8 mx-auto animate-spin text-gray-600" />
            ) : (
              <Camera className="h-8 w-8 mx-auto text-gray-600" />
            )}
          </button>

          {/* Switch Camera Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-full bg-white/20 hover:bg-white/30 text-white"
            onClick={onSwitchCamera}
            data-testid="switch-camera-button"
          >
            <SwitchCamera className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Preview View Component
interface PreviewViewProps {
  receipt: CapturedReceipt;
  isProcessing: boolean;
  onRotate: (degrees: 90 | 180 | 270) => void;
  onRemove: () => void;
  onUpload: () => void;
}

function PreviewView({
  receipt,
  isProcessing,
  onRotate,
  onRemove,
  onUpload,
}: PreviewViewProps) {
  return (
    <div className="relative h-full flex flex-col" data-testid="preview-view">
      {/* Image Preview */}
      <div className="flex-1 relative bg-muted overflow-hidden">
        <img
          src={receipt.previewUrl}
          alt="Receipt preview"
          className="w-full h-full object-contain"
          data-testid="receipt-preview-image"
        />

        {/* Processing Overlay */}
        {(receipt.status === 'processing' || isProcessing) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center text-white">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-sm">Processing...</p>
            </div>
          </div>
        )}

        {/* Upload Progress Overlay */}
        {receipt.status === 'uploading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center text-white">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-sm">Uploading... {receipt.uploadProgress}%</p>
            </div>
          </div>
        )}

        {/* Success Overlay */}
        {receipt.status === 'completed' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center text-white">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-400" />
              <p className="text-sm">Uploaded successfully!</p>
            </div>
          </div>
        )}

        {/* Error Overlay */}
        {receipt.status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center text-white">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 text-red-400" />
              <p className="text-sm">{receipt.error || 'An error occurred'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Preview Controls */}
      <div className="p-4 border-t bg-background">
        <div className="flex items-center justify-center gap-3">
          {/* Rotate Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => onRotate(90)}
            disabled={isProcessing || receipt.status === 'uploading'}
            data-testid="rotate-button"
          >
            <RotateCw className="h-5 w-5" />
          </Button>

          {/* Remove Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={onRemove}
            disabled={receipt.status === 'uploading'}
            className="text-destructive hover:text-destructive"
            data-testid="remove-button"
          >
            <Trash2 className="h-5 w-5" />
          </Button>

          {/* Upload Button (single) */}
          {(receipt.status === 'ready' || receipt.status === 'pending') && (
            <Button
              onClick={onUpload}
              disabled={isProcessing}
              data-testid="upload-single-button"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          )}

          {/* Retry Button (on error) */}
          {receipt.status === 'error' && (
            <Button onClick={onUpload} data-testid="retry-upload-button">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Receipt Thumbnail Component
interface ReceiptThumbnailProps {
  receipt: CapturedReceipt;
  isActive: boolean;
  onClick: () => void;
}

function ReceiptThumbnail({ receipt, isActive, onClick }: ReceiptThumbnailProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all',
        isActive ? 'border-primary ring-2 ring-primary/20' : 'border-border',
        'hover:border-primary/50'
      )}
      data-testid={`receipt-thumbnail-${receipt.id}`}
    >
      <img
        src={receipt.previewUrl}
        alt=""
        className="w-full h-full object-cover"
      />

      {/* Status Indicator */}
      {receipt.status === 'uploading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="h-4 w-4 animate-spin text-white" />
        </div>
      )}

      {receipt.status === 'completed' && (
        <div className="absolute top-1 right-1">
          <CheckCircle className="h-4 w-4 text-green-400" />
        </div>
      )}

      {receipt.status === 'error' && (
        <div className="absolute top-1 right-1">
          <AlertCircle className="h-4 w-4 text-red-400" />
        </div>
      )}
    </button>
  );
}

export default ReceiptCapture;
