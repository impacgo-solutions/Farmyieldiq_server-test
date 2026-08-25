// Pure helpers over an already-fetched admin_users row array (each row at
// least {id, reports_to_id}). Mirrors EmployeesProvider.wouldCreateHierarchyCycle
// on the Flutter side and test/support/fake_backend.dart's _wouldCreateCycle,
// so behavior stays identical between the fake test backend and this one.
// Named wouldCreateCycle (not wouldCreateHierarchyCycle) to match the existing
// export name already relied on by sales.controller.js in production.

export const wouldCreateCycle = (rows, employeeId, proposedManagerId) => {
  if (!proposedManagerId) return false;
  if (proposedManagerId === employeeId) return true;

  const byId = new Map(rows.map((r) => [r.id, r]));
  let currentId = proposedManagerId;
  const visited = new Set();
  while (currentId && !visited.has(currentId)) {
    if (currentId === employeeId) return true;
    visited.add(currentId);
    currentId = byId.get(currentId)?.reports_to_id ?? null;
  }
  return false;
};

export const getDirectReportIds = (rows, managerId) =>
  rows.filter((r) => r.reports_to_id === managerId).map((r) => r.id);

// ── Strict organizational hierarchy ─────────────────────────────────────
// Fixed reporting chain: President > Vice President > Branch Manager >
// Sales Manager > Sales Executive > Sales Associates. Index 0 outranks
// everything below it. The super admin (admin_users) sits above
// "President" — represented by ADMIN_ROLE since it has no employee_accounts
// row of its own. Any role_title outside this list (e.g. "Others", or a
// legacy free-text title) is unrestricted, exactly like before this was
// introduced — mirrors lib/admin/core/role_hierarchy.dart on the Flutter side.
export const ADMIN_ROLE = "ADMIN";

export const ROLE_HIERARCHY = [
  "President",
  "Vice President",
  "Branch Manager",
  "Sales Manager",
  "Sales Executive",
  "Sales Associates",
];

// The role a given hierarchy role's manager must hold. "President" reports
// to the super admin; everything else reports to the role directly above it.
export const REQUIRED_MANAGER_ROLE = {
  President: ADMIN_ROLE,
  "Vice President": "President",
  "Branch Manager": "Vice President",
  "Sales Manager": "Branch Manager",
  "Sales Executive": "Sales Manager",
  "Sales Associates": "Sales Executive",
};

const _RANK = new Map(ROLE_HIERARCHY.map((role, i) => [role, i]));

// -1 for the super admin, an index for a recognized hierarchy role, or null
// for anything outside the strict hierarchy (no rank to compare).
export const getRoleRank = (role) => (role === ADMIN_ROLE ? -1 : _RANK.has(role) ? _RANK.get(role) : null);

// Null return means "not part of the strict hierarchy" — callers should
// treat that as "no rule applies" (legacy free-choice behavior).
export const getRequiredManagerRole = (role) => REQUIRED_MANAGER_ROLE[role] ?? null;

// True when `callerRole` is allowed to create an employee with `targetRole`.
// The super admin can always create anything; otherwise only a role
// strictly above `targetRole` in the hierarchy may create it.
export const canCreateRole = (callerRole, targetRole) => {
  if (callerRole === ADMIN_ROLE) return true;
  const callerRank = getRoleRank(callerRole);
  const targetRank = getRoleRank(targetRole);
  if (callerRank === null || targetRank === null) return false;
  return callerRank < targetRank;
};
