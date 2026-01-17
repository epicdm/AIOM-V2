/**
 * Smart Search Page
 * Dashboard route for the AI-powered unified search interface
 */

import { createFileRoute } from "@tanstack/react-router";
import { SmartSearchView } from "~/components/SmartSearchView";

export const Route = createFileRoute("/dashboard/search")({
  component: SearchPage,
});

function SearchPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 h-[calc(100vh-3.5rem)]">
      <SmartSearchView
        className="h-full"
        showStats={true}
        onResultSelect={(result) => {
          // Navigate to the appropriate detail page based on result type
          console.log("Selected result:", result);
          // TODO: Implement navigation logic based on result type
          // For example:
          // if (result.type === "task") navigate({ to: "/dashboard/tasks/$taskId", params: { taskId: result.id } });
          // if (result.type === "contact") navigate({ to: "/dashboard/contacts/$contactId", params: { contactId: result.id } });
        }}
      />
    </div>
  );
}
