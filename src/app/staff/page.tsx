"use client";

import { useState, useEffect } from "react";
import { mockStaff } from "@/lib/mockData";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Plus, Mail, Phone, Building2, Smartphone } from "lucide-react";
import { motion } from "framer-motion";
import type { StaffMember } from "@/lib/types";
import { toast } from "@/components/ui/toast";

export default function StaffPage() {
  const [staffList, setStaffList] = useState<StaffMember[]>(mockStaff);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "STAFF_ADD" && Array.isArray(e.data?.payload)) {
        const added = e.data.payload as StaffMember[];
        setStaffList((prev) => [...added, ...prev]);
        toast.success(`${added.length}명이 추가되었습니다.`);
      }
      if (e.data?.type === "STAFF_EDIT_GET_DATA" && e.source) {
        (e.source as Window).postMessage({ type: "STAFF_DATA", payload: staffList }, window.location.origin);
      }
      if (e.data?.type === "STAFF_UPDATE" && e.data?.payload) {
        const updated = e.data.payload as StaffMember;
        setStaffList((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        toast.success("직원 정보가 수정되었습니다.");
      }
      if (e.data?.type === "STAFF_DELETE" && e.data?.payload) {
        const id = e.data.payload as string;
        setStaffList((prev) => prev.filter((s) => s.id !== id));
        toast.success("직원이 삭제되었습니다.");
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [staffList]);

  const openAddWindow = () => {
    const w = 520;
    const h = 720;
    const left = Math.max(0, (window.screen.width - w) / 2);
    const top = Math.max(0, (window.screen.height - h) / 2);
    window.open(
      "/staff/add",
      "staff-add",
      `width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );
  };

  const openEditWindow = (staffId: string) => {
    const w = 520;
    const h = 640;
    const left = Math.max(0, (window.screen.width - w) / 2);
    const top = Math.max(0, (window.screen.height - h) / 2);
    window.open(
      `/staff/edit?id=${encodeURIComponent(staffId)}`,
      "staff-edit",
      `width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );
  };

  const displayPhone = (s: StaffMember) => {
    if (s.companyPhone || s.personalPhone) {
      return [s.companyPhone, s.personalPhone].filter(Boolean).join(" / ");
    }
    return s.phone;
  };

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">직원 관리</h1>
          <p className="text-sm text-text-muted mt-0.5">전체 {staffList.length}명</p>
        </div>
        <Button size="sm" leftIcon={<Plus size={14} />} onClick={openAddWindow}>
          직원 추가
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {staffList.map((staff, i) => (
          <motion.div
            key={staff.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onDoubleClick={() => openEditWindow(staff.id)}
            className="bg-white rounded-2xl border border-slate-200 shadow-card p-5 hover:shadow-card-hover transition-all hover:-translate-y-0.5 cursor-pointer"
            title="더블클릭 시 직원 정보 편집"
          >
            <div className="flex items-start gap-4">
              <Avatar name={staff.name} size="lg" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">{staff.name}</h3>
                  <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">{staff.role}</span>
                </div>
                <div className="text-sm text-text-muted mt-0.5">{staff.department}</div>
                <div className="flex flex-col gap-1 mt-3">
                  <div className="flex items-center gap-1.5 text-xs text-text-muted">
                    <Mail size={11} /> {staff.email}
                  </div>
                  {(staff.companyPhone || staff.personalPhone) ? (
                    <>
                      {staff.companyPhone && (
                        <div className="flex items-center gap-1.5 text-xs text-text-muted">
                          <Building2 size={11} /> {staff.companyPhone}
                        </div>
                      )}
                      {staff.personalPhone && (
                        <div className="flex items-center gap-1.5 text-xs text-text-muted">
                          <Smartphone size={11} /> {staff.personalPhone}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-text-muted">
                      <Phone size={11} /> {staff.phone}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
