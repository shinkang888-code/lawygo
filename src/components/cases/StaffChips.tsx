"use client";

import { useState } from "react";
import { parseStaffList } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";

interface StaffChipsProps {
  staffStr: string;
  max?: number;
}

export function StaffChips({ staffStr, max = 2 }: StaffChipsProps) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const staffList = parseStaffList(staffStr);

  if (staffList.length === 0) {
    return <span className="text-xs text-slate-400">-</span>;
  }

  const visible = staffList.slice(0, max);
  const hidden = staffList.slice(max);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {visible.map((name) => (
        <span
          key={name}
          className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 rounded-full px-2 py-0.5 font-medium hover:bg-slate-200 transition-colors"
        >
          <Avatar name={name} size="xs" />
          {name}
        </span>
      ))}
      {hidden.length > 0 && (
        <div className="relative">
          <span
            className="inline-flex items-center text-xs bg-primary-100 text-primary-700 rounded-full px-2 py-0.5 font-medium cursor-default"
            onMouseEnter={() => setTooltipVisible(true)}
            onMouseLeave={() => setTooltipVisible(false)}
          >
            +{hidden.length}
          </span>
          {tooltipVisible && (
            <div className="absolute bottom-full left-0 mb-1.5 bg-slate-900 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap z-50 shadow-xl animate-fade-up">
              {hidden.join(", ")}
              <div className="absolute top-full left-3 border-4 border-transparent border-t-slate-900" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
