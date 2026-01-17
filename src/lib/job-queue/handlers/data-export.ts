/**
 * Data Export Job Handler
 * Handles async data export jobs for GDPR compliance and data portability
 */

import { R2Storage } from "~/utils/storage/r2";
import {
  collectUserDataForExport,
  formatDataExport,
  getContentTypeForFormat,
  getFileExtensionForFormat,
} from "~/data-access/data-export";
import type { JobContext, JobHandler, DataExportPayload } from "../types";
import { findUserById } from "~/data-access/users";

/**
 * Data export job handler
 * Collects user data, formats it, uploads to storage, and returns the download URL
 */
export const dataExportHandler: JobHandler<
  DataExportPayload,
  { downloadUrl: string; format: string; totalRecords: number; expiresAt: string }
> = async (context) => {
  const { job, updateProgress } = context;
  const { userId, format, filters } = job.payload;

  console.log(`[DataExportHandler] Starting data export for user ${userId} in ${format} format`);
  await updateProgress(5, "Initializing data export...");

  try {
    // Validate user exists
    const user = await findUserById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    await updateProgress(10, "Collecting user data...");

    // Collect all user data
    const data = await collectUserDataForExport(userId, filters || {});

    await updateProgress(50, `Collected ${data.metadata.totalRecords} records. Formatting data...`);

    // Format the data
    const exportContent = formatDataExport(data, format);
    const contentType = getContentTypeForFormat(format);
    const extension = getFileExtensionForFormat(format);

    await updateProgress(70, "Uploading export file...");

    // Generate storage key
    const timestamp = Date.now();
    const storageKey = `data-exports/${userId}/${timestamp}/export.${extension}`;

    // Upload to R2 storage
    let storage: R2Storage;
    try {
      storage = new R2Storage();
    } catch (error) {
      // If R2 is not configured, return the data directly (for development)
      console.warn("[DataExportHandler] R2 storage not configured, returning data directly");
      await updateProgress(100, "Export complete (no cloud storage)");

      return {
        downloadUrl: "", // Empty URL indicates data should be fetched differently
        format,
        totalRecords: data.metadata.totalRecords,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        content: exportContent, // Include content when no storage
      } as unknown as { downloadUrl: string; format: string; totalRecords: number; expiresAt: string };
    }

    const contentBuffer = Buffer.from(exportContent, "utf-8");
    await storage.upload(storageKey, contentBuffer, contentType);

    await updateProgress(90, "Generating download link...");

    // Generate presigned download URL (valid for 24 hours)
    const downloadUrl = await storage.getPresignedUrl(storageKey);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    console.log(`[DataExportHandler] Export completed for user ${userId}: ${data.metadata.totalRecords} records`);

    await updateProgress(100, "Export complete!");

    return {
      downloadUrl,
      format,
      totalRecords: data.metadata.totalRecords,
      expiresAt,
    };
  } catch (error) {
    console.error(`[DataExportHandler] Error exporting data for user ${userId}:`, error);
    throw error;
  }
};

export default dataExportHandler;
