"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Menu,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Database,
  AlertCircle,
  LayoutPanelLeft,
  Smartphone,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MENU_ICON_OPTIONS } from "@/lib/menuIcons";
import type { MenuType } from "@/lib/menuService";
import { toast } from "@/components/ui/toast";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

interface MenuRow {
  id?: string;
  type: MenuType;
  item_order: number;
  item_id: string;
  label: string;
  href: string;
  icon: string;
  badge?: number | null;
  roles?: string[] | null;
  lawtop_module?: string | null;
}

const TYPE_LABELS: Record<MenuType, string> = {
  lnb: "LNB (PC 사이드바)",
  mobile_main: "모바일 하단 메인",
  mobile_more: "모바일 더보기",
};

export default function AdminMenusPage() {
  const [items, setItems] = useState<MenuRow[]>([]);
  const [source, setSource] = useState<"db" | "default">("default");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MenuRow | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchMenus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/menus");
      const json = await res.json();
      setItems(Array.isArray(json.data) ? json.data : []);
      setSource(json.source ?? "default");
    } catch {
      setItems([]);
      setSource("default");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  const byType = (type: MenuType) =>
    items.filter((r) => r.type === type).sort((a, b) => a.item_order - b.item_order);

  const handleSaveDefault = async () => {
    setSaving(true);
    try {
      for (const row of items) {
        if (row.id) continue;
        await fetch("/api/admin/menus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: row.type,
            item_id: row.item_id,
            label: row.label,
            href: row.href,
            icon: row.icon,
            item_order: row.item_order,
            badge: row.badge ?? undefined,
            roles: row.roles ?? undefined,
            lawtop_module: row.lawtop_module ?? undefined,
          }),
        });
      }
      toast.success("기본 메뉴가 DB에 저장되었습니다.");
      fetchMenus();
    } catch (e) {
      toast.error("저장에 실패했습니다. DB 연결을 확인하세요.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 메뉴 항목을 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/admin/menus/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("삭제되었습니다.");
      fetchMenus();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "삭제에 실패했습니다.");
    }
  };

  const handleEdit = (row: MenuRow) => {
    setEditing({ ...row });
    setModalOpen(true);
  };

  const handleAdd = (type: MenuType) => {
    const nextOrder = Math.max(0, ...items.filter((r) => r.type === type).map((r) => r.item_order + 1));
    setEditing({
      type,
      item_order: nextOrder,
      item_id: "",
      label: "",
      href: "",
      icon: "FileText",
    });
    setModalOpen(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      if (editing.id) {
        const res = await fetch(`/api/admin/menus/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: editing.type,
            item_id: editing.item_id,
            label: editing.label,
            href: editing.href,
            icon: editing.icon,
            item_order: editing.item_order,
            badge: editing.badge ?? undefined,
            roles: editing.roles ?? undefined,
            lawtop_module: editing.lawtop_module ?? undefined,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        toast.success("수정되었습니다.");
      } else {
        const res = await fetch("/api/admin/menus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: editing.type,
            item_id: editing.item_id,
            label: editing.label,
            href: editing.href,
            icon: editing.icon,
            item_order: editing.item_order,
            badge: editing.badge ?? undefined,
            roles: editing.roles ?? undefined,
            lawtop_module: editing.lawtop_module ?? undefined,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        toast.success("추가되었습니다.");
      }
      setModalOpen(false);
      setEditing(null);
      fetchMenus();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Menu size={26} className="text-primary-600" />
            메뉴 관리
          </h1>
          <p className="text-sm text-text-muted mt-1">
            이용자 화면(LNB·모바일)에 노출되는 메뉴를 등록·편집·삭제합니다.
          </p>
        </div>
        {source === "default" && items.length > 0 && (
          <Button
            onClick={handleSaveDefault}
            disabled={saving}
            leftIcon={<Database size={16} />}
          >
            기본 메뉴를 DB에 저장
          </Button>
        )}
      </div>

      {source === "default" && items.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-warning-50 border border-warning-200">
          <AlertCircle size={20} className="text-warning-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-warning-800">현재 기본 메뉴를 표시 중입니다.</p>
            <p className="text-xs text-warning-700 mt-0.5">
              Supabase를 연결한 뒤 위 &quot;기본 메뉴를 DB에 저장&quot;을 누르면 메뉴를 편집·삭제할 수 있습니다.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-text-muted">
          불러오는 중...
        </div>
      ) : (
        (["lnb", "mobile_main", "mobile_more"] as MenuType[]).map((type) => (
          <motion.section
            key={type}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                {type === "lnb" && <LayoutPanelLeft size={18} />}
                {type === "mobile_main" && <Smartphone size={18} />}
                {type === "mobile_more" && <MoreHorizontal size={18} />}
                {TYPE_LABELS[type]}
              </h2>
              {source === "db" && (
                <Button size="sm" variant="outline" leftIcon={<Plus size={14} />} onClick={() => handleAdd(type)}>
                  추가
                </Button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/70 text-xs text-text-muted font-medium">
                    <th className="text-left px-5 py-3 w-10">순서</th>
                    <th className="text-left px-5 py-3">라벨</th>
                    <th className="text-left px-5 py-3">경로</th>
                    <th className="text-left px-5 py-3 w-24">아이콘</th>
                    <th className="text-left px-5 py-3 w-20">배지</th>
                    {source === "db" && <th className="text-right px-5 py-3 w-24">작업</th>}
                  </tr>
                </thead>
                <tbody>
                  {byType(type).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-6 text-center text-sm text-text-muted">
                        메뉴가 없습니다. {source === "db" && "추가 버튼으로 등록하세요."}
                      </td>
                    </tr>
                  ) : (
                    byType(type).map((row) => (
                      <tr key={row.id ?? `${row.type}-${row.item_id}`} className="border-t border-slate-50 text-sm">
                        <td className="px-5 py-3 tabular-nums text-text-muted">{row.item_order}</td>
                        <td className="px-5 py-3 font-medium text-slate-800">{row.label}</td>
                        <td className="px-5 py-3 text-text-muted">{row.href}</td>
                        <td className="px-5 py-3 text-xs text-slate-600">{row.icon}</td>
                        <td className="px-5 py-3">{row.badge != null ? row.badge : "-"}</td>
                        {source === "db" && row.id && (
                          <td className="px-5 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleEdit(row)}
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-primary-600"
                              title="편집"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(row.id!)}
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-danger-50 hover:text-danger-600 ml-1"
                              title="삭제"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.section>
        ))
      )}

      <Dialog.Root open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) setEditing(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl border border-slate-200 p-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
            <Dialog.Title className="text-lg font-semibold text-slate-900">
              {editing?.id ? "메뉴 편집" : "메뉴 추가"}
            </Dialog.Title>
            <form onSubmit={handleModalSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">타입</label>
                <select
                  value={editing?.type ?? "lnb"}
                  onChange={(e) => setEditing((p) => (p ? { ...p, type: e.target.value as MenuType } : null))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                  required
                >
                  <option value="lnb">LNB (PC 사이드바)</option>
                  <option value="mobile_main">모바일 하단 메인</option>
                  <option value="mobile_more">모바일 더보기</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">메뉴 ID (영문)</label>
                <input
                  type="text"
                  value={editing?.item_id ?? ""}
                  onChange={(e) => setEditing((p) => (p ? { ...p, item_id: e.target.value } : null))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                  placeholder="dashboard, cases"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">라벨</label>
                <input
                  type="text"
                  value={editing?.label ?? ""}
                  onChange={(e) => setEditing((p) => (p ? { ...p, label: e.target.value } : null))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                  placeholder="대시보드"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">경로 (href)</label>
                <input
                  type="text"
                  value={editing?.href ?? ""}
                  onChange={(e) => setEditing((p) => (p ? { ...p, href: e.target.value } : null))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                  placeholder="/ 또는 /cases"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">아이콘</label>
                <select
                  value={editing?.icon ?? "FileText"}
                  onChange={(e) => setEditing((p) => (p ? { ...p, icon: e.target.value } : null))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                >
                  {MENU_ICON_OPTIONS.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">순서</label>
                  <input
                    type="number"
                    value={editing?.item_order ?? 0}
                    onChange={(e) => setEditing((p) => (p ? { ...p, item_order: Number(e.target.value) } : null))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">배지 (숫자)</label>
                  <input
                    type="number"
                    value={editing?.badge ?? ""}
                    onChange={(e) => setEditing((p) => (p ? { ...p, badge: e.target.value === "" ? undefined : Number(e.target.value) } : null))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                    min={0}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">권한 (쉼표 구분, 비우면 전체)</label>
                <input
                  type="text"
                  value={(editing?.roles ?? []).join(", ")}
                  onChange={(e) => setEditing((p) => (p ? { ...p, roles: e.target.value ? e.target.value.split(",").map((s) => s.trim()).filter(Boolean) : undefined } : null))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                  placeholder="관리자, 변호사"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Dialog.Close asChild>
                  <Button type="button" variant="ghost">취소</Button>
                </Dialog.Close>
                <Button type="submit" disabled={saving}>{editing?.id ? "수정" : "추가"}</Button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
