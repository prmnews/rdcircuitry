"use client";

import UserKpiGrid from "@/components/dashboard/UserKpiGrid";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor system performance and user statistics
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <UserKpiGrid />
        
        {/* Additional dashboard components can be added here */}
      </div>
    </div>
  );
} 