import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ReceiptCapture } from "~/components/ReceiptCapture";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Receipt } from "lucide-react";
import type { MediaUploadResult } from "~/utils/storage/media-helpers";

export const Route = createFileRoute("/demo/receipt-capture")({
  component: ReceiptCaptureDemo,
});

function ReceiptCaptureDemo() {
  const [isOpen, setIsOpen] = useState(false);
  const [uploadedReceipts, setUploadedReceipts] = useState<MediaUploadResult[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // Ensure client-side only rendering for the modal
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleUploadComplete = (results: MediaUploadResult[]) => {
    setUploadedReceipts((prev) => [...prev, ...results]);
    setIsOpen(false);
  };

  const handleError = (error: string) => {
    console.error("Receipt capture error:", error);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Receipt Capture Demo</h1>
          <p className="text-muted-foreground">
            Mobile-optimized component for capturing receipt photos with image processing and cloud upload.
          </p>
        </div>

        {/* Open Capture Button */}
        <Card>
          <CardHeader>
            <CardTitle>Capture Receipt</CardTitle>
            <CardDescription>
              Use your camera to capture receipt photos or select from your gallery.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setIsOpen(true)} size="lg" data-testid="open-capture-button">
              <Receipt className="h-5 w-5 mr-2" />
              Capture Receipt
            </Button>
          </CardContent>
        </Card>

        {/* Uploaded Receipts */}
        {uploadedReceipts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Uploaded Receipts</CardTitle>
              <CardDescription>
                {uploadedReceipts.length} receipt(s) have been uploaded successfully.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {uploadedReceipts.map((receipt, index) => (
                  <div
                    key={receipt.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    data-testid={`uploaded-receipt-${index}`}
                  >
                    <div className="flex items-center gap-3">
                      <Receipt className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{receipt.fileName}</p>
                        <p className="text-sm text-muted-foreground">
                          {(receipt.fileSize / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <span className="text-sm text-green-600 font-medium">Uploaded</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Full-screen Modal - Client-side only */}
        {isMounted && isOpen && (
          <div className="fixed inset-0 z-50 bg-background" data-testid="receipt-capture-modal">
            <ReceiptCapture
              onUploadComplete={handleUploadComplete}
              onError={handleError}
              onClose={() => setIsOpen(false)}
              maxReceipts={5}
            />
          </div>
        )}
      </div>
    </div>
  );
}
