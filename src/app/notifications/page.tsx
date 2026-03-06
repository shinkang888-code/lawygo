"use client";

import { mockNotifications } from "@/lib/mockData";
import { formatDate } from "@/lib/utils";
import { Bell, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function NotificationsPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900">알림</h1>
        <Button variant="outline" size="sm" leftIcon={<Check size={13} />}>모두 읽음 처리</Button>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden divide-y divide-slate-50">
        {mockNotifications.map((n) => (
          <div key={n.id} className={cn("flex gap-4 p-4 cursor-pointer transition-colors hover:bg-slate-50", !n.isRead && "bg-primary-50/50")}>
            <div className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
              n.type === "urgent_date" ? "bg-danger-100 text-danger-600" :
              n.type === "approval_request" ? "bg-primary-100 text-primary-600" :
              "bg-warning-100 text-warning-600"
            )}>
              <Bell size={15} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-800">{n.title}</div>
              <div className="text-sm text-slate-600 mt-0.5">{n.message}</div>
              <div className="text-xs text-text-muted mt-1">{formatDate(n.createdAt, "time")}</div>
            </div>
            {!n.isRead && <div className="w-2 h-2 bg-primary-500 rounded-full mt-1.5 flex-shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  );
}
