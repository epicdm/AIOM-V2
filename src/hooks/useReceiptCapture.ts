/**
 * useReceiptCapture Hook
 *
 * Provides state management and utilities for the ReceiptCapture component.
 * Handles camera access, image capture, processing, and upload.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { processImage, rotateImage, type ProcessedImage } from '~/utils/image-processing';
import {
  uploadMediaFile,
  type MediaUploadResult,
  type UploadProgress,
} from '~/utils/storage/media-helpers';

export type CaptureMode = 'camera' | 'gallery' | 'preview' | 'processing';

export interface CapturedReceipt {
  id: string;
  originalFile: File;
  processedBlob?: Blob;
  previewUrl: string;
  width?: number;
  height?: number;
  rotation: 0 | 90 | 180 | 270;
  uploadProgress?: number;
  uploadResult?: MediaUploadResult;
  error?: string;
  status: 'pending' | 'processing' | 'ready' | 'uploading' | 'completed' | 'error';
}

export interface UseReceiptCaptureOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  autoProcess?: boolean;
  onCaptureComplete?: (receipt: CapturedReceipt) => void;
  onUploadComplete?: (result: MediaUploadResult) => void;
  onError?: (error: string) => void;
}

export interface UseReceiptCaptureReturn {
  // State
  mode: CaptureMode;
  receipts: CapturedReceipt[];
  activeReceiptId: string | null;
  isProcessing: boolean;
  isCameraReady: boolean;
  cameraError: string | null;
  facingMode: 'user' | 'environment';

  // Camera controls
  videoRef: React.RefObject<HTMLVideoElement>;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  switchCamera: () => void;
  capturePhoto: () => Promise<void>;

  // Image controls
  selectFromGallery: (file: File) => Promise<void>;
  rotateReceipt: (id: string, degrees: 90 | 180 | 270) => Promise<void>;
  removeReceipt: (id: string) => void;
  setActiveReceipt: (id: string | null) => void;

  // Upload controls
  uploadReceipt: (id: string) => Promise<MediaUploadResult | null>;
  uploadAllReceipts: () => Promise<MediaUploadResult[]>;

  // Mode controls
  setMode: (mode: CaptureMode) => void;
  reset: () => void;
}

export function useReceiptCapture(
  options: UseReceiptCaptureOptions = {}
): UseReceiptCaptureReturn {
  const {
    maxWidth = 2048,
    maxHeight = 2048,
    quality = 0.85,
    autoProcess = true,
    onCaptureComplete,
    onUploadComplete,
    onError,
  } = options;

  // State
  const [mode, setMode] = useState<CaptureMode>('camera');
  const [receipts, setReceipts] = useState<CapturedReceipt[]>([]);
  const [activeReceiptId, setActiveReceiptId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      receipts.forEach((receipt) => {
        URL.revokeObjectURL(receipt.previewUrl);
      });
    };
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      setIsCameraReady(false);

      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraReady(true);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to access camera';
      setCameraError(message);
      onError?.(message);
    }
  }, [facingMode, onError]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraReady(false);
  }, []);

  // Switch camera (front/back)
  const switchCamera = useCallback(() => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  }, []);

  // Effect to restart camera when facing mode changes
  useEffect(() => {
    if (mode === 'camera' && isCameraReady) {
      startCamera();
    }
  }, [facingMode]);

  // Capture photo from camera
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !isCameraReady) {
      onError?.('Camera not ready');
      return;
    }

    try {
      setIsProcessing(true);

      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      ctx.drawImage(video, 0, 0);

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Failed to capture image'))),
          'image/jpeg',
          0.95
        );
      });

      // Create file from blob
      const file = new File([blob], `receipt-${Date.now()}.jpg`, { type: 'image/jpeg' });

      // Process the captured image
      await addReceipt(file);

      setMode('preview');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to capture photo';
      onError?.(message);
    } finally {
      setIsProcessing(false);
    }
  }, [isCameraReady, onError]);

  // Add receipt from file
  const addReceipt = useCallback(
    async (file: File) => {
      const id = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);

      const receipt: CapturedReceipt = {
        id,
        originalFile: file,
        previewUrl,
        rotation: 0,
        status: autoProcess ? 'processing' : 'pending',
      };

      setReceipts((prev) => [...prev, receipt]);
      setActiveReceiptId(id);

      if (autoProcess) {
        try {
          const processed = await processImage(file, {
            maxWidth,
            maxHeight,
            quality,
          });

          setReceipts((prev) =>
            prev.map((r) =>
              r.id === id
                ? {
                    ...r,
                    processedBlob: processed.blob,
                    width: processed.width,
                    height: processed.height,
                    status: 'ready' as const,
                  }
                : r
            )
          );

          const updatedReceipt = {
            ...receipt,
            processedBlob: processed.blob,
            width: processed.width,
            height: processed.height,
            status: 'ready' as const,
          };
          onCaptureComplete?.(updatedReceipt);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Processing failed';
          setReceipts((prev) =>
            prev.map((r) =>
              r.id === id
                ? { ...r, status: 'error' as const, error: message }
                : r
            )
          );
          onError?.(message);
        }
      } else {
        onCaptureComplete?.(receipt);
      }
    },
    [autoProcess, maxWidth, maxHeight, quality, onCaptureComplete, onError]
  );

  // Select from gallery
  const selectFromGallery = useCallback(
    async (file: File) => {
      setIsProcessing(true);
      try {
        await addReceipt(file);
        setMode('preview');
      } finally {
        setIsProcessing(false);
      }
    },
    [addReceipt]
  );

  // Rotate receipt
  const rotateReceipt = useCallback(
    async (id: string, degrees: 90 | 180 | 270) => {
      const receipt = receipts.find((r) => r.id === id);
      if (!receipt) return;

      setIsProcessing(true);
      setReceipts((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: 'processing' as const } : r
        )
      );

      try {
        const sourceBlob = receipt.processedBlob || receipt.originalFile;
        const rotatedBlob = await rotateImage(sourceBlob, degrees, { quality });

        // Calculate new rotation
        const newRotation = ((receipt.rotation + degrees) % 360) as 0 | 90 | 180 | 270;

        // Update preview URL
        URL.revokeObjectURL(receipt.previewUrl);
        const newPreviewUrl = URL.createObjectURL(rotatedBlob);

        setReceipts((prev) =>
          prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  processedBlob: rotatedBlob,
                  previewUrl: newPreviewUrl,
                  rotation: newRotation,
                  status: 'ready' as const,
                }
              : r
          )
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Rotation failed';
        setReceipts((prev) =>
          prev.map((r) =>
            r.id === id
              ? { ...r, status: 'error' as const, error: message }
              : r
          )
        );
        onError?.(message);
      } finally {
        setIsProcessing(false);
      }
    },
    [receipts, quality, onError]
  );

  // Remove receipt
  const removeReceipt = useCallback((id: string) => {
    setReceipts((prev) => {
      const receipt = prev.find((r) => r.id === id);
      if (receipt) {
        URL.revokeObjectURL(receipt.previewUrl);
      }
      return prev.filter((r) => r.id !== id);
    });

    if (activeReceiptId === id) {
      setActiveReceiptId(null);
    }
  }, [activeReceiptId]);

  // Set active receipt
  const setActiveReceipt = useCallback((id: string | null) => {
    setActiveReceiptId(id);
  }, []);

  // Upload single receipt
  const uploadReceipt = useCallback(
    async (id: string): Promise<MediaUploadResult | null> => {
      const receipt = receipts.find((r) => r.id === id);
      if (!receipt || receipt.status === 'uploading' || receipt.status === 'completed') {
        return null;
      }

      setReceipts((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, status: 'uploading' as const, uploadProgress: 0 }
            : r
        )
      );

      try {
        const blobToUpload = receipt.processedBlob || receipt.originalFile;
        const file = new File(
          [blobToUpload],
          receipt.originalFile.name,
          { type: 'image/jpeg' }
        );

        const result = await uploadMediaFile(file, (progress: UploadProgress) => {
          setReceipts((prev) =>
            prev.map((r) =>
              r.id === id ? { ...r, uploadProgress: progress.percentage } : r
            )
          );
        });

        setReceipts((prev) =>
          prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: 'completed' as const,
                  uploadProgress: 100,
                  uploadResult: result,
                }
              : r
          )
        );

        onUploadComplete?.(result);
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Upload failed';
        setReceipts((prev) =>
          prev.map((r) =>
            r.id === id
              ? { ...r, status: 'error' as const, error: message }
              : r
          )
        );
        onError?.(message);
        return null;
      }
    },
    [receipts, onUploadComplete, onError]
  );

  // Upload all receipts
  const uploadAllReceipts = useCallback(async (): Promise<MediaUploadResult[]> => {
    const results: MediaUploadResult[] = [];
    const pendingReceipts = receipts.filter(
      (r) => r.status === 'ready' || r.status === 'pending'
    );

    for (const receipt of pendingReceipts) {
      const result = await uploadReceipt(receipt.id);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }, [receipts, uploadReceipt]);

  // Reset all state
  const reset = useCallback(() => {
    stopCamera();
    receipts.forEach((receipt) => {
      URL.revokeObjectURL(receipt.previewUrl);
    });
    setReceipts([]);
    setActiveReceiptId(null);
    setMode('camera');
    setIsProcessing(false);
    setCameraError(null);
  }, [receipts, stopCamera]);

  return {
    // State
    mode,
    receipts,
    activeReceiptId,
    isProcessing,
    isCameraReady,
    cameraError,
    facingMode,

    // Camera controls
    videoRef: videoRef as React.RefObject<HTMLVideoElement>,
    startCamera,
    stopCamera,
    switchCamera,
    capturePhoto,

    // Image controls
    selectFromGallery,
    rotateReceipt,
    removeReceipt,
    setActiveReceipt,

    // Upload controls
    uploadReceipt,
    uploadAllReceipts,

    // Mode controls
    setMode,
    reset,
  };
}
