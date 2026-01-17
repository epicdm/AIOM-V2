/**
 * Data Export Panel Component
 * Allows users to export their data in JSON or CSV format
 * Supports GDPR and data protection compliance
 */

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import {
  Panel,
  PanelContent,
  PanelHeader,
  PanelTitle,
} from "~/components/ui/panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Checkbox } from "~/components/ui/checkbox";
import { Download, FileJson, FileSpreadsheet, Loader2, Shield } from "lucide-react";
import { authClient } from "~/lib/auth-client";

type ExportFormat = "json" | "csv";

interface ExportFilters {
  includeProfile: boolean;
  includeExpenses: boolean;
  includeBriefings: boolean;
  includeCallRecords: boolean;
  includeCallDispositions: boolean;
  includeCallTasks: boolean;
}

export function DataExportPanel() {
  const { data: session } = authClient.useSession();
  const [format, setFormat] = useState<ExportFormat>("json");
  const [isExporting, setIsExporting] = useState(false);
  const [filters, setFilters] = useState<ExportFilters>({
    includeProfile: true,
    includeExpenses: true,
    includeBriefings: true,
    includeCallRecords: true,
    includeCallDispositions: true,
    includeCallTasks: true,
  });

  const handleExport = async () => {
    if (!session?.user?.id) {
      toast.error("You must be logged in to export data");
      return;
    }

    setIsExporting(true);

    try {
      // Use GET request for immediate download
      const params = new URLSearchParams({
        format,
      });

      const response = await fetch(`/api/data-export?${params.toString()}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to export data");
      }

      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `data-export-${Date.now()}.${format}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) {
          filename = match[1];
        }
      }

      // Get total records from header
      const totalRecords = response.headers.get("X-Export-Records");

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(
        `Data exported successfully! ${totalRecords ? `(${totalRecords} records)` : ""}`
      );
    } catch (error) {
      console.error("Export error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to export data"
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleFilterChange = (key: keyof ExportFilters, checked: boolean) => {
    setFilters((prev) => ({ ...prev, [key]: checked }));
  };

  const allSelected = Object.values(filters).every(Boolean);
  const noneSelected = Object.values(filters).every((v) => !v);

  const toggleAll = () => {
    const newValue = !allSelected;
    setFilters({
      includeProfile: newValue,
      includeExpenses: newValue,
      includeBriefings: newValue,
      includeCallRecords: newValue,
      includeCallDispositions: newValue,
      includeCallTasks: newValue,
    });
  };

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Data Export
        </PanelTitle>
      </PanelHeader>
      <PanelContent className="space-y-6">
        {/* Description */}
        <div className="text-sm text-muted-foreground">
          <p>
            Export your personal data in a portable format. This feature helps
            you comply with data protection regulations like GDPR by allowing
            you to download all your stored information.
          </p>
        </div>

        {/* Format Selection */}
        <div className="space-y-2">
          <Label htmlFor="export-format">Export Format</Label>
          <Select
            value={format}
            onValueChange={(value) => setFormat(value as ExportFormat)}
          >
            <SelectTrigger id="export-format" className="w-full max-w-xs">
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="json">
                <div className="flex items-center gap-2">
                  <FileJson className="h-4 w-4" />
                  <span>JSON - Complete structured data</span>
                </div>
              </SelectItem>
              <SelectItem value="csv">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>CSV - Spreadsheet compatible</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {format === "json"
              ? "JSON format includes all data with full structure, ideal for data portability."
              : "CSV format is compatible with spreadsheet applications like Excel and Google Sheets."}
          </p>
        </div>

        {/* Data Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Data to Include</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAll}
              className="text-xs"
            >
              {allSelected ? "Deselect All" : "Select All"}
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex items-center space-x-2 cursor-pointer">
              <Checkbox
                checked={filters.includeProfile}
                onCheckedChange={(checked) =>
                  handleFilterChange("includeProfile", checked as boolean)
                }
              />
              <span className="text-sm">Profile Information</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <Checkbox
                checked={filters.includeExpenses}
                onCheckedChange={(checked) =>
                  handleFilterChange("includeExpenses", checked as boolean)
                }
              />
              <span className="text-sm">Expense Requests</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <Checkbox
                checked={filters.includeBriefings}
                onCheckedChange={(checked) =>
                  handleFilterChange("includeBriefings", checked as boolean)
                }
              />
              <span className="text-sm">Daily Briefings</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <Checkbox
                checked={filters.includeCallRecords}
                onCheckedChange={(checked) =>
                  handleFilterChange("includeCallRecords", checked as boolean)
                }
              />
              <span className="text-sm">Call Records</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <Checkbox
                checked={filters.includeCallDispositions}
                onCheckedChange={(checked) =>
                  handleFilterChange("includeCallDispositions", checked as boolean)
                }
              />
              <span className="text-sm">Call Dispositions</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <Checkbox
                checked={filters.includeCallTasks}
                onCheckedChange={(checked) =>
                  handleFilterChange("includeCallTasks", checked as boolean)
                }
              />
              <span className="text-sm">Call Tasks</span>
            </label>
          </div>
        </div>

        {/* Export Button */}
        <div className="flex items-center gap-4 pt-2">
          <Button
            onClick={handleExport}
            disabled={isExporting || noneSelected}
            className="gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Preparing Export...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download My Data
              </>
            )}
          </Button>
          {noneSelected && (
            <p className="text-sm text-destructive">
              Please select at least one data type to export
            </p>
          )}
        </div>

        {/* Privacy Notice */}
        <div className="text-xs text-muted-foreground border-t pt-4 mt-4">
          <p className="font-medium mb-1">Privacy Notice</p>
          <p>
            Your exported data may contain personal information. Please store it
            securely and be cautious when sharing. This export does not include
            sensitive authentication data like passwords.
          </p>
        </div>
      </PanelContent>
    </Panel>
  );
}
