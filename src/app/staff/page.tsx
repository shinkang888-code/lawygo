"use client";

import { mockStaff } from "@/lib/mockData";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Plus, Mail, Phone } from "lucide-react";
import { motion } from "framer-motion";

export default function StaffPage() {
  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">직원 관리</h1>
          <p className="text-sm text-text-muted mt-0.5">전체 {mockStaff.length}명</p>
        </div>
        <Button size="sm" leftIcon={<Plus size={14} />}>직원 추가</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockStaff.map((staff, i) => (
          <motion.div
            key={staff.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-card p-5 hover:shadow-card-hover transition-all hover:-translate-y-0.5 cursor-pointer"
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
                  <div className="flex items-center gap-1.5 text-xs text-text-muted">
                    <Phone size={11} /> {staff.phone}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
