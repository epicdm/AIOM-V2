import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Edit2, LayoutGrid, RotateCcw, User } from "lucide-react";
import { authClient } from "~/lib/auth-client";
import { WidgetGrid, registerBuiltInWidgets } from "~/components/widgets";
import { useWidgets } from "~/hooks/useWidgets";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";
import type { UserRole } from "~/db/schema";
import { USER_ROLES } from "~/db/schema";
import { roleDashboardDefaults } from "~/config/dashboard-defaults";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHome,
});

// Register widgets on module load
registerBuiltInWidgets();

// Role display names for the UI
const roleDisplayNames: Record<UserRole, string> = {
  md: "Managing Director",
  "field-tech": "Field Technician",
  admin: "Administrator",
  sales: "Sales",
};

function DashboardHome() {
  const { data: session } = authClient.useSession();

  // Get user's role from session (if available) or allow role switching for demo
  const userRoleFromSession = (session?.user as { role?: UserRole } | undefined)?.role ?? null;

  const {
    instances,
    reorderWidgets,
    removeWidget,
    updateConfig,
    resetToDefault,
    resetToRoleDefault,
    isSaving,
    userRole,
    setUserRole,
  } = useWidgets(userRoleFromSession);
  const [isEditing, setIsEditing] = React.useState(false);

  // Sync user role from session when it changes
  React.useEffect(() => {
    if (userRoleFromSession && userRoleFromSession !== userRole) {
      setUserRole(userRoleFromSession);
    }
  }, [userRoleFromSession, userRole, setUserRole]);

  // Get role description for display
  const roleDescription = userRole
    ? roleDashboardDefaults[userRole].description
    : "Customize your dashboard with widgets";

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                Welcome back, {session?.user?.name || "there"}!
              </h1>
              {userRole && (
                <Badge variant="outline" className="text-xs" data-testid="user-role-badge">
                  <User className="w-3 h-3 mr-1" />
                  {roleDisplayNames[userRole]}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-2">
              {roleDescription}
            </p>
          </div>

          {/* Dashboard Controls */}
          <div className="flex items-center gap-2">
            {/* Saving Indicator */}
            {isSaving && (
              <span className="text-xs text-muted-foreground animate-pulse">
                Saving...
              </span>
            )}

            {/* Role Switcher (for demo/testing - shows only when no role from session) */}
            {!userRoleFromSession && (
              <Select
                value={userRole || "none"}
                onValueChange={(value) => setUserRole(value === "none" ? null : (value as UserRole))}
              >
                <SelectTrigger className="w-[180px]" data-testid="role-selector">
                  <SelectValue placeholder="Select role..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Role</SelectItem>
                  {USER_ROLES.map((role) => (
                    <SelectItem key={role} value={role} data-testid={`role-option-${role}`}>
                      {roleDisplayNames[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Reset Button (visible in edit mode) */}
            {isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetToRoleDefault}
                className="gap-2"
                data-testid="reset-layout-button"
              >
                <RotateCcw className="w-4 h-4" />
                Reset Layout
              </Button>
            )}

            {/* Edit Mode Toggle */}
            <Button
              variant={isEditing ? "default" : "outline"}
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className={cn("gap-2", isEditing && "bg-primary")}
              data-testid="edit-dashboard-button"
            >
              {isEditing ? (
                <>
                  <LayoutGrid className="w-4 h-4" />
                  Done Editing
                </>
              ) : (
                <>
                  <Edit2 className="w-4 h-4" />
                  Customize
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Role Info Banner */}
        {userRole && !isEditing && (
          <div className="bg-muted/50 border rounded-lg p-4 text-sm" data-testid="role-info-banner">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {roleDashboardDefaults[userRole].name}
                </p>
                <p className="text-muted-foreground mt-1">
                  {roleDashboardDefaults[userRole].description}
                </p>
              </div>
              <Badge variant="secondary">
                {instances.length} widgets
              </Badge>
            </div>
          </div>
        )}

        {/* Edit Mode Banner */}
        {isEditing && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-sm" data-testid="edit-mode-banner">
            <p className="font-medium text-primary">
              Edit Mode Active
            </p>
            <p className="text-muted-foreground mt-1">
              Click the "+" button to add new widgets, use the menu on each
              widget to resize or remove it, or drag widgets to reorder them.
              {userRole && (
                <span className="block mt-1">
                  <strong>Note:</strong> Some widgets may be restricted based on your role ({roleDisplayNames[userRole]}).
                </span>
              )}
            </p>
          </div>
        )}

        {/* Widget Grid */}
        <WidgetGrid
          instances={instances}
          isEditing={isEditing}
          onReorder={reorderWidgets}
          onRemove={removeWidget}
          onConfigChange={updateConfig}
          userRole={userRole}
          data-testid="widget-grid"
        />

        {/* Empty State */}
        {instances.length === 0 && !isEditing && (
          <div className="text-center py-16" data-testid="empty-state">
            <LayoutGrid className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No widgets yet</h2>
            <p className="text-muted-foreground mb-4">
              {userRole
                ? `Customize your ${roleDisplayNames[userRole]} dashboard by adding widgets`
                : "Customize your dashboard by adding widgets"}
            </p>
            <Button onClick={() => setIsEditing(true)} className="gap-2">
              <Edit2 className="w-4 h-4" />
              Start Customizing
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
