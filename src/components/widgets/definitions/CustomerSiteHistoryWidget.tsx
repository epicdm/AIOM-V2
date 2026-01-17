import * as React from "react";
import {
  History,
  Building,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  ChevronRight,
  Search,
} from "lucide-react";
import { cn } from "~/lib/utils";
import type { WidgetDefinition, WidgetProps } from "../types";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";

/**
 * Service History Item Interface
 */
export interface ServiceHistoryItem {
  id: string;
  workOrderNumber: string;
  serviceDate: Date;
  serviceType: string;
  description: string;
  technicianName: string;
  status: "completed" | "partial" | "follow_up_needed";
  cost?: number;
  notes?: string;
  hasPhotos?: boolean;
}

/**
 * Customer Site Interface
 */
export interface CustomerSite {
  id: string;
  customerName: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address: string;
  siteType: "residential" | "commercial" | "industrial";
  serviceHistory: ServiceHistoryItem[];
  totalVisits: number;
  totalSpent?: number;
  lastServiceDate?: Date;
  equipmentNotes?: string;
  accessInstructions?: string;
}

/**
 * Customer Site History Widget Data
 */
export interface CustomerSiteHistoryData {
  sites: CustomerSite[];
  selectedSite?: CustomerSite;
}

/**
 * Customer Site History Widget Config
 */
export interface CustomerSiteHistoryConfig {
  maxHistoryItems: number;
  showCosts: boolean;
  defaultView: "sites" | "history";
}

/**
 * Site Type styling
 */
const siteTypeStyles = {
  residential: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  commercial: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  industrial: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

const siteTypeIcons = {
  residential: User,
  commercial: Building,
  industrial: Wrench,
};

/**
 * Customer Site History Widget Component
 */
function CustomerSiteHistoryWidgetComponent({
  data,
  isLoading,
  error,
  instance,
}: WidgetProps<CustomerSiteHistoryData, CustomerSiteHistoryConfig>) {
  const config = instance.config as unknown as CustomerSiteHistoryConfig;
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedSiteId, setSelectedSiteId] = React.useState<string | null>(null);

  // Sample data for demonstration
  const sampleSites: CustomerSite[] = [
    {
      id: "1",
      customerName: "Johnson & Co.",
      contactName: "Michael Johnson",
      phone: "+1 (555) 123-4567",
      email: "mjohnson@company.com",
      address: "1234 Industrial Blvd, Suite 100",
      siteType: "commercial",
      totalVisits: 12,
      totalSpent: 4850,
      lastServiceDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      equipmentNotes: "2x Carrier RTU units on roof, access via maintenance ladder",
      accessInstructions: "Check in at front desk, ask for building manager",
      serviceHistory: [
        {
          id: "h1",
          workOrderNumber: "WO-2024-089",
          serviceDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          serviceType: "Maintenance",
          description: "Quarterly HVAC maintenance - filters replaced, coils cleaned",
          technicianName: "John Smith",
          status: "completed",
          cost: 350,
          hasPhotos: true,
        },
        {
          id: "h2",
          workOrderNumber: "WO-2024-045",
          serviceDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          serviceType: "Repair",
          description: "Replaced faulty compressor on Unit #2",
          technicianName: "John Smith",
          status: "completed",
          cost: 1200,
          notes: "Customer asked about preventive maintenance plan",
        },
      ],
    },
    {
      id: "2",
      customerName: "Smith Residence",
      contactName: "Sarah Smith",
      phone: "+1 (555) 234-5678",
      address: "567 Oak Street",
      siteType: "residential",
      totalVisits: 5,
      totalSpent: 1250,
      lastServiceDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      equipmentNotes: "Gas furnace in basement, AC unit on side of house",
      accessInstructions: "Gate code: 1234",
      serviceHistory: [
        {
          id: "h3",
          workOrderNumber: "WO-2024-067",
          serviceDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          serviceType: "Installation",
          description: "Installed new smart thermostat",
          technicianName: "Mike Davis",
          status: "completed",
          cost: 450,
        },
      ],
    },
    {
      id: "3",
      customerName: "Riverside Apartments",
      contactName: "Property Manager",
      phone: "+1 (555) 345-6789",
      address: "890 River Road",
      siteType: "commercial",
      totalVisits: 24,
      totalSpent: 8500,
      lastServiceDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      equipmentNotes: "Multiple units - see building map for equipment locations",
      serviceHistory: [
        {
          id: "h4",
          workOrderNumber: "WO-2024-092",
          serviceDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          serviceType: "Emergency",
          description: "Water heater leak in Unit 12",
          technicianName: "Tom Wilson",
          status: "follow_up_needed",
          cost: 200,
          notes: "Temporary fix applied, needs full replacement",
        },
      ],
    },
  ];

  const sites = data?.sites ?? sampleSites;
  const selectedSite = sites.find((s) => s.id === selectedSiteId) || data?.selectedSite;

  // Filter sites
  const filteredSites = searchQuery
    ? sites.filter(
        (site) =>
          site.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          site.address.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sites;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="animate-pulse flex flex-col space-y-3 w-full p-4">
          <div className="h-10 bg-muted rounded-lg" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px] text-destructive">
        <AlertCircle className="w-5 h-5 mr-2" />
        <span>{error}</span>
      </div>
    );
  }

  // Render selected site detail view
  if (selectedSite) {
    const SiteIcon = siteTypeIcons[selectedSite.siteType];
    return (
      <div className="space-y-4" data-testid="customer-site-history-detail">
        {/* Back Button & Header */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedSiteId(null)}
            className="h-8"
            data-testid="back-to-sites-btn"
          >
            ← Back
          </Button>
        </div>

        {/* Site Info */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <SiteIcon className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">{selectedSite.customerName}</h3>
            </div>
            <Badge className={cn("text-xs", siteTypeStyles[selectedSite.siteType])}>
              {selectedSite.siteType}
            </Badge>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-1 gap-2 text-sm">
            {selectedSite.contactName && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="w-3.5 h-3.5" />
                <span>{selectedSite.contactName}</span>
              </div>
            )}
            {selectedSite.phone && (
              <a
                href={`tel:${selectedSite.phone}`}
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{selectedSite.phone}</span>
              </a>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              <span>{selectedSite.address}</span>
            </div>
          </div>

          {/* Equipment Notes */}
          {selectedSite.equipmentNotes && (
            <div className="p-2 bg-background rounded border text-sm">
              <p className="text-xs font-medium text-muted-foreground mb-1">Equipment Notes</p>
              <p>{selectedSite.equipmentNotes}</p>
            </div>
          )}

          {/* Access Instructions */}
          {selectedSite.accessInstructions && (
            <div className="p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded border border-yellow-200 dark:border-yellow-800 text-sm">
              <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400 mb-1">Access Instructions</p>
              <p className="text-yellow-800 dark:text-yellow-300">{selectedSite.accessInstructions}</p>
            </div>
          )}

          {/* Stats */}
          <div className="flex gap-4 pt-2 border-t text-sm">
            <div>
              <span className="font-bold text-primary">{selectedSite.totalVisits}</span>
              <span className="text-muted-foreground ml-1">visits</span>
            </div>
            {config.showCosts && selectedSite.totalSpent && (
              <div>
                <span className="font-bold text-green-600">
                  ${selectedSite.totalSpent.toLocaleString()}
                </span>
                <span className="text-muted-foreground ml-1">total</span>
              </div>
            )}
          </div>
        </div>

        {/* Service History */}
        <div>
          <h4 className="font-medium text-sm text-muted-foreground mb-2">Service History</h4>
          <div className="space-y-2">
            {selectedSite.serviceHistory.slice(0, config.maxHistoryItems).map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{item.serviceType}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {item.workOrderNumber}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      {new Date(item.serviceDate).toLocaleDateString()}
                      <span className="mx-1">•</span>
                      {item.technicianName}
                    </p>
                  </div>
                  <Badge
                    className={cn(
                      "text-[10px] px-1.5",
                      item.status === "completed" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                      item.status === "partial" && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                      item.status === "follow_up_needed" && "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                    )}
                  >
                    {item.status === "follow_up_needed" ? "Follow-up" : item.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{item.description}</p>
                {item.notes && (
                  <p className="text-xs text-muted-foreground mt-1 italic">Note: {item.notes}</p>
                )}
                <div className="flex items-center justify-between mt-2 pt-2 border-t">
                  {config.showCosts && item.cost && (
                    <span className="text-sm font-medium text-green-600">
                      ${item.cost.toLocaleString()}
                    </span>
                  )}
                  {item.hasPhotos && (
                    <Button variant="ghost" size="sm" className="h-6 text-xs">
                      View Photos
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Render site list view
  return (
    <div className="space-y-4" data-testid="customer-site-history-widget">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search customers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="customer-search"
        />
      </div>

      {/* Site List */}
      <div className="space-y-2">
        {filteredSites.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>{searchQuery ? "No customers match your search" : "No customer history available"}</p>
          </div>
        ) : (
          filteredSites.map((site) => {
            const SiteIcon = siteTypeIcons[site.siteType];
            return (
              <div
                key={site.id}
                className={cn(
                  "p-4 rounded-lg border transition-all cursor-pointer",
                  "hover:shadow-md bg-card hover:bg-accent/50"
                )}
                onClick={() => setSelectedSiteId(site.id)}
                data-testid={`customer-site-${site.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <SiteIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium truncate">{site.customerName}</span>
                      <Badge className={cn("text-[10px] px-1.5", siteTypeStyles[site.siteType])}>
                        {site.siteType}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {site.address}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                </div>

                <div className="flex items-center gap-4 mt-2 pt-2 border-t text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {site.totalVisits} visits
                  </span>
                  {site.lastServiceDate && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Last: {new Date(site.lastServiceDate).toLocaleDateString()}
                    </span>
                  )}
                  {config.showCosts && site.totalSpent && (
                    <span className="flex items-center gap-1 text-green-600">
                      <DollarSign className="w-3 h-3" />
                      {site.totalSpent.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/**
 * Customer Site History Widget Definition
 */
export const CustomerSiteHistoryWidgetDefinition: WidgetDefinition<
  CustomerSiteHistoryData,
  CustomerSiteHistoryConfig
> = {
  id: "customer-site-history",
  name: "Customer History",
  description: "View customer site information, service history, equipment notes, and access instructions",
  category: "productivity",
  defaultSize: "medium",
  supportedSizes: ["medium", "large", "full"],
  icon: History,
  dataRequirements: [
    {
      key: "sites",
      label: "Customer Sites",
      description: "List of customer sites with service history",
      required: true,
      type: "query",
    },
  ],
  configOptions: [
    {
      key: "maxHistoryItems",
      label: "History Items",
      description: "Maximum number of history items to show per site",
      type: "number",
      defaultValue: 5,
      validation: { min: 1, max: 20 },
    },
    {
      key: "showCosts",
      label: "Show Costs",
      description: "Display cost information for services",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "defaultView",
      label: "Default View",
      description: "Which view to show by default",
      type: "select",
      defaultValue: "sites",
      options: [
        { label: "Site List", value: "sites" },
        { label: "Recent History", value: "history" },
      ],
    },
  ],
  component: CustomerSiteHistoryWidgetComponent,
  defaultConfig: {
    maxHistoryItems: 5,
    showCosts: true,
    defaultView: "sites",
  },
  supportsRefresh: true,
  minRefreshInterval: 120000,
};
