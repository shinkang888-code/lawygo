"use client";

import { useState } from "react";
import { X, SlidersHorizontal, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FilterConfig } from "@/lib/types";

interface FilterTrayProps {
  filters: FilterConfig[];
  onFilterAdd: (filter: FilterConfig) => void;
  onFilterRemove: (field: string) => void;
  onFilterClear: () => void;
}

const filterOptions = [
  {
    field: "status" as const,
    label: "진행상태",
    options: ["진행중", "종결", "사임"],
  },
  {
    field: "caseType" as const,
    label: "사건종류",
    options: ["형사", "민사", "헌법", "행정", "가사"],
  },
  {
    field: "assignedStaff" as const,
    label: "담당 변호사",
    options: ["김민준", "이서연", "박지훈"],
  },
  {
    field: "court" as const,
    label: "기관",
    options: [
      "서울고등법원",
      "서울중앙지방법원",
      "서울동부지방법원",
      "인천지방법원",
      "수원지방법원",
      "헌법재판소",
      "검찰청",
      "경찰서",
    ],
  },
];

export function FilterTray({
  filters,
  onFilterAdd,
  onFilterRemove,
  onFilterClear,
}: FilterTrayProps) {
  const [openPopover, setOpenPopover] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <div className="flex items-center gap-0.5 text-[11px] text-text-muted">
        <SlidersHorizontal size={12} />
        <span>필터:</span>
      </div>

      {/* Filter popover buttons */}
      {filterOptions.map((opt) => {
        const activeFilter = filters.find((f) => f.field === opt.field);
        return (
          <div key={opt.field} className="relative">
            <button
              onClick={() => setOpenPopover(openPopover === opt.field ? null : opt.field)}
              className={cn(
                "flex items-center gap-0.5 text-[11px] rounded-md px-2 py-1 border transition-all",
                activeFilter
                  ? "bg-primary-600 text-white border-primary-600 font-medium"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              {opt.label}
              {activeFilter && (
                <span className="bg-white/25 rounded px-1 text-xs">
                  {String(activeFilter.value)}
                </span>
              )}
              <ChevronDown size={10} className={cn("transition-transform", openPopover === opt.field && "rotate-180")} />
            </button>

            {openPopover === opt.field && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-40 min-w-[140px] overflow-hidden animate-fade-up">
                <div className="py-0.5">
                  {opt.options.map((o) => {
                    const isActive = String(activeFilter?.value) === o;
                    return (
                      <button
                        key={o}
                        onClick={() => {
                          if (isActive) {
                            onFilterRemove(opt.field);
                          } else {
                            onFilterAdd({
                              field: opt.field,
                              operator: "equals",
                              value: o,
                              label: `${opt.label}: ${o}`,
                            });
                          }
                          setOpenPopover(null);
                        }}
                        className={cn(
                          "w-full text-left px-2.5 py-1.5 text-xs transition-colors",
                          isActive
                            ? "bg-primary-50 text-primary-700 font-medium"
                            : "text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        {o}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Active filter chips */}
      {filters.map((f) => (
        <span
          key={f.field}
          className="inline-flex items-center gap-0.5 text-[11px] bg-primary-100 text-primary-700 rounded-full px-2 py-0.5 font-medium"
        >
          {f.label}
          <button
            onClick={() => onFilterRemove(f.field)}
            className="text-primary-400 hover:text-primary-700 transition-colors"
          >
            <X size={10} />
          </button>
        </span>
      ))}

      {filters.length > 0 && (
        <button
          onClick={onFilterClear}
          className="text-[11px] text-danger-600 hover:text-danger-700 font-medium underline"
        >
          전체 초기화
        </button>
      )}
    </div>
  );
}
