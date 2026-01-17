/**
 * Field Technician Customer Site History Page
 *
 * Mobile-optimized page for viewing customer site history and past service records.
 * Features search, filtering, and detailed service history for each customer.
 */

import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  History,
  Search,
  Building2,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Clock,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileText,
  Wrench,
  CheckCircle,
  AlertTriangle,
  User,
  Star,
} from "lucide-react";
import { authClient } from "~/lib/auth-client";
import { redirect } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { cn } from "~/lib/utils";
import { format, formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/mobile/field-tech/history")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session) {
      throw redirect({
        to: "/sign-in",
        search: { redirect: "/mobile/field-tech/history" },
      });
    }
  },
  component: HistoryPage,
});

// Service record interface
interface ServiceRecord {
  id: string;
  date: Date;
  workOrderNumber: string;
  workType: string;
  description: string;
  technicianName: string;
  duration: number; // minutes
  partsUsed: string[];
  notes?: string;
  resolution: "resolved" | "partial" | "follow_up_needed";
}

// Customer site interface
interface CustomerSite {
  id: string;
  name: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  siteType: "commercial" | "residential" | "industrial";
  equipmentList: string[];
  serviceRecords: ServiceRecord[];
  lastServiceDate: Date;
  totalVisits: number;
  notes?: string;
  rating?: number;
}

// Sample customer sites with service history
const SAMPLE_CUSTOMER_SITES: CustomerSite[] = [
  {
    id: "site-1",
    name: "Acme Corporation",
    contactName: "John Smith",
    contactPhone: "(555) 123-4567",
    contactEmail: "john.smith@acme.com",
    address: "123 Business Park Dr, Suite 200",
    siteType: "commercial",
    equipmentList: ["Carrier 50XC Rooftop Unit", "Honeywell T6 Thermostat", "AprilAire Humidifier"],
    totalVisits: 12,
    lastServiceDate: new Date(Date.now() - 86400000 * 30),
    rating: 4,
    notes: "Preferred service window: 8am-12pm. Access code: 1234",
    serviceRecords: [
      {
        id: "sr-1",
        date: new Date(Date.now() - 86400000 * 30),
        workOrderNumber: "WO-2023-089",
        workType: "HVAC Maintenance",
        description: "Annual preventive maintenance on rooftop unit",
        technicianName: "Mike Johnson",
        duration: 120,
        partsUsed: ["Air Filter 20x25", "Capacitor"],
        resolution: "resolved",
        notes: "Replaced worn capacitor. System running efficiently.",
      },
      {
        id: "sr-2",
        date: new Date(Date.now() - 86400000 * 90),
        workOrderNumber: "WO-2023-056",
        workType: "Repair Service",
        description: "AC not cooling properly",
        technicianName: "Sarah Williams",
        duration: 180,
        partsUsed: ["Refrigerant R-410A", "Contactor"],
        resolution: "resolved",
        notes: "Low refrigerant found. Recharged system and replaced faulty contactor.",
      },
      {
        id: "sr-3",
        date: new Date(Date.now() - 86400000 * 180),
        workOrderNumber: "WO-2023-023",
        workType: "Installation",
        description: "Thermostat upgrade installation",
        technicianName: "Mike Johnson",
        duration: 90,
        partsUsed: ["Honeywell T6 Thermostat"],
        resolution: "resolved",
      },
    ],
  },
  {
    id: "site-2",
    name: "Johnson & Co.",
    contactName: "Emily Johnson",
    contactPhone: "(555) 234-5678",
    contactEmail: "emily@johnsonco.com",
    address: "1234 Industrial Blvd, Suite 100",
    siteType: "industrial",
    equipmentList: ["Trane XR15 Heat Pump", "Lennox iComfort S30"],
    totalVisits: 8,
    lastServiceDate: new Date(Date.now() - 86400000 * 7),
    rating: 5,
    serviceRecords: [
      {
        id: "sr-4",
        date: new Date(Date.now() - 86400000 * 7),
        workOrderNumber: "WO-2024-002",
        workType: "Equipment Installation",
        description: "New heat pump installation",
        technicianName: "Current Technician",
        duration: 240,
        partsUsed: ["Trane XR15 Heat Pump", "Mounting Hardware"],
        resolution: "resolved",
        notes: "Installation complete. Customer trained on operation.",
      },
    ],
  },
  {
    id: "site-3",
    name: "Tech Solutions Inc",
    contactName: "David Chen",
    contactPhone: "(555) 345-6789",
    contactEmail: "david.chen@techsolutions.com",
    address: "567 Innovation Way",
    siteType: "commercial",
    equipmentList: ["Daikin VRV System", "Nest Learning Thermostat"],
    totalVisits: 5,
    lastServiceDate: new Date(Date.now() - 86400000 * 60),
    notes: "Server room requires precise temperature control.",
    serviceRecords: [
      {
        id: "sr-5",
        date: new Date(Date.now() - 86400000 * 60),
        workOrderNumber: "WO-2023-078",
        workType: "Maintenance",
        description: "Quarterly VRV system check",
        technicianName: "Sarah Williams",
        duration: 150,
        partsUsed: ["Air Filters (4)"],
        resolution: "follow_up_needed",
        notes: "Minor refrigerant leak detected in Zone 2. Follow-up scheduled.",
      },
    ],
  },
  {
    id: "site-4",
    name: "Metro Hospital",
    contactName: "Dr. Sarah Martinez",
    contactPhone: "(555) 567-8901",
    contactEmail: "facilities@metrohospital.org",
    address: "456 Healthcare Ave",
    siteType: "commercial",
    equipmentList: ["Multiple Carrier Units", "BMS Integration"],
    totalVisits: 24,
    lastServiceDate: new Date(),
    rating: 5,
    notes: "Critical facility - 24/7 emergency service agreement.",
    serviceRecords: [
      {
        id: "sr-6",
        date: new Date(),
        workOrderNumber: "WO-2024-005",
        workType: "Emergency Repair",
        description: "Operating room AC failure",
        technicianName: "Current Technician",
        duration: 180,
        partsUsed: ["Compressor", "Refrigerant R-410A"],
        resolution: "resolved",
        notes: "Emergency repair completed. System restored to full operation.",
      },
    ],
  },
];

// Site type configuration
const SITE_TYPE_CONFIG: Record<
  CustomerSite["siteType"],
  { label: string; colorClass: string; bgClass: string }
> = {
  commercial: {
    label: "Commercial",
    colorClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-500/10",
  },
  residential: {
    label: "Residential",
    colorClass: "text-green-600 dark:text-green-400",
    bgClass: "bg-green-500/10",
  },
  industrial: {
    label: "Industrial",
    colorClass: "text-purple-600 dark:text-purple-400",
    bgClass: "bg-purple-500/10",
  },
};

// Resolution configuration
const RESOLUTION_CONFIG: Record<
  ServiceRecord["resolution"],
  { label: string; icon: typeof CheckCircle; colorClass: string; bgClass: string }
> = {
  resolved: {
    label: "Resolved",
    icon: CheckCircle,
    colorClass: "text-green-600 dark:text-green-400",
    bgClass: "bg-green-500/10",
  },
  partial: {
    label: "Partial",
    icon: AlertTriangle,
    colorClass: "text-yellow-600 dark:text-yellow-400",
    bgClass: "bg-yellow-500/10",
  },
  follow_up_needed: {
    label: "Follow-up Needed",
    icon: AlertTriangle,
    colorClass: "text-orange-600 dark:text-orange-400",
    bgClass: "bg-orange-500/10",
  },
};

/**
 * Get initials from name
 */
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Service Record Card
 */
function ServiceRecordCard({ record }: { record: ServiceRecord }) {
  const resolutionConfig = RESOLUTION_CONFIG[record.resolution];
  const ResolutionIcon = resolutionConfig.icon;

  return (
    <div className="border-l-2 border-muted pl-4 pb-4 ml-2">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-sm font-medium">{record.workType}</p>
          <p className="text-xs text-muted-foreground">
            {format(record.date, "MMM d, yyyy")} • {record.workOrderNumber}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(resolutionConfig.bgClass, resolutionConfig.colorClass, "border-0 text-xs")}
        >
          <ResolutionIcon className="w-3 h-3 mr-1" />
          {resolutionConfig.label}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-2">{record.description}</p>
      {record.partsUsed.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {record.partsUsed.map((part, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {part}
            </Badge>
          ))}
        </div>
      )}
      {record.notes && (
        <p className="text-xs text-muted-foreground italic">"{record.notes}"</p>
      )}
      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
        <User className="w-3 h-3" />
        <span>{record.technicianName}</span>
        <span>•</span>
        <Clock className="w-3 h-3" />
        <span>{Math.floor(record.duration / 60)}h {record.duration % 60}m</span>
      </div>
    </div>
  );
}

/**
 * Customer Site Card Component
 */
function CustomerSiteCard({
  site,
  isExpanded,
  onToggle,
}: {
  site: CustomerSite;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const siteTypeConfig = SITE_TYPE_CONFIG[site.siteType];
  const recentRecords = site.serviceRecords.slice(0, 3);

  return (
    <Card className="transition-all duration-200" data-testid={`customer-site-${site.id}`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3" onClick={onToggle}>
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(site.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  variant="outline"
                  className={cn(siteTypeConfig.bgClass, siteTypeConfig.colorClass, "border-0")}
                >
                  {siteTypeConfig.label}
                </Badge>
                {site.rating && (
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "w-3 h-3",
                          i < site.rating! ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>
              <h3 className="font-semibold">{site.name}</h3>
              <p className="text-sm text-muted-foreground">{site.contactName}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>

        {/* Summary stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          <div className="flex items-center gap-1">
            <History className="w-3 h-3" />
            <span>{site.totalVisits} visits</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>Last: {formatDistanceToNow(site.lastServiceDate, { addSuffix: true })}</span>
          </div>
        </div>

        {/* Address */}
        <div className="flex items-start gap-2 text-sm text-muted-foreground mb-2">
          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{site.address}</span>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="pt-4 mt-4 border-t space-y-4">
            {/* Contact info */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `tel:${site.contactPhone}`;
                }}
              >
                <Phone className="w-4 h-4 mr-1" />
                Call
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `mailto:${site.contactEmail}`;
                }}
              >
                <Mail className="w-4 h-4 mr-1" />
                Email
              </Button>
            </div>

            {/* Equipment list */}
            <div>
              <p className="text-sm font-medium mb-2">Equipment on Site</p>
              <div className="flex flex-wrap gap-1">
                {site.equipmentList.map((equipment, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {equipment}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Site notes */}
            {site.notes && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs font-medium mb-1">Site Notes</p>
                <p className="text-sm text-muted-foreground">{site.notes}</p>
              </div>
            )}

            {/* Recent service history */}
            <div>
              <p className="text-sm font-medium mb-3">Recent Service History</p>
              <div className="space-y-3">
                {recentRecords.map((record) => (
                  <ServiceRecordCard key={record.id} record={record} />
                ))}
              </div>
              {site.serviceRecords.length > 3 && (
                <Button variant="ghost" size="sm" className="w-full mt-2">
                  View all {site.serviceRecords.length} records
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HistoryPage() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [customerSites] = React.useState<CustomerSite[]>(SAMPLE_CUSTOMER_SITES);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [expandedSites, setExpandedSites] = React.useState<Set<string>>(new Set());

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Toggle site expansion
  const toggleSite = (siteId: string) => {
    setExpandedSites((prev) => {
      const next = new Set(prev);
      if (next.has(siteId)) {
        next.delete(siteId);
      } else {
        next.add(siteId);
      }
      return next;
    });
  };

  // Filter customer sites
  const filteredSites = React.useMemo(() => {
    if (!debouncedSearch) return customerSites;

    const search = debouncedSearch.toLowerCase();
    return customerSites.filter(
      (site) =>
        site.name.toLowerCase().includes(search) ||
        site.contactName.toLowerCase().includes(search) ||
        site.address.toLowerCase().includes(search) ||
        site.equipmentList.some((eq) => eq.toLowerCase().includes(search))
    );
  }, [customerSites, debouncedSearch]);

  // Calculate stats
  const stats = React.useMemo(() => {
    const totalVisits = customerSites.reduce((sum, site) => sum + site.totalVisits, 0);
    const followUps = customerSites.filter((site) =>
      site.serviceRecords.some((r) => r.resolution === "follow_up_needed")
    ).length;

    return {
      totalSites: customerSites.length,
      totalVisits,
      followUps,
    };
  }, [customerSites]);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background" data-testid="history-page">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/mobile/field-tech">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold">Site History</h1>
              <p className="text-xs text-muted-foreground">
                {filteredSites.length} {filteredSites.length === 1 ? "customer" : "customers"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
            className="h-9 w-9"
          >
            <RefreshCw className={cn("h-5 w-5", isLoading && "animate-spin")} />
          </Button>
        </div>
      </header>

      {/* Quick Stats */}
      <div className="px-4 py-3 bg-muted/30 border-b">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-semibold">{stats.totalSites}</p>
            <p className="text-xs text-muted-foreground">Customers</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{stats.totalVisits}</p>
            <p className="text-xs text-muted-foreground">Total Visits</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-orange-600">{stats.followUps}</p>
            <p className="text-xs text-muted-foreground">Follow-ups</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search customers, addresses, equipment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading history...</p>
          </div>
        ) : filteredSites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Building2 className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-2">No customers found</h2>
            <p className="text-sm text-muted-foreground">
              {debouncedSearch
                ? "No customers match your search"
                : "No customer history available"}
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {filteredSites.map((site) => (
              <CustomerSiteCard
                key={site.id}
                site={site}
                isExpanded={expandedSites.has(site.id)}
                onToggle={() => toggleSite(site.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
