/**
 * 권한 관리: 역할 목록 및 상태 스키마
 * app_settings.roles, app_settings.role_permissions 에 저장
 */

export type RoleStatus = "active" | "pending_deletion";

export interface Role {
  id: string;
  name: string;
  status: RoleStatus;
  sortOrder?: number;
}

export const ADMIN_ROLE_ID = "admin";

export const SETTINGS_KEYS = {
  roles: "roles",
  rolePermissions: "role_permissions",
} as const;

export function createRoleId(): string {
  return "role-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
}

export const DEFAULT_ROLE_NAMES = ["관리자", "변호사", "사무장", "사무원", "인턴"] as const;

const DEFAULT_IDS: Record<string, string> = {
  관리자: ADMIN_ROLE_ID,
  변호사: "role-lawyer",
  사무장: "role-manager",
  사무원: "role-staff",
  인턴: "role-intern",
};

export function getDefaultRoles(): Role[] {
  return DEFAULT_ROLE_NAMES.map((name, i) => ({
    id: DEFAULT_IDS[name] ?? createRoleId(),
    name,
    status: "active" as RoleStatus,
    sortOrder: i,
  }));
}
