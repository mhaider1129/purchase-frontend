const ROLE_ALIASES = {
  warehouse_manager: 'warehousemanager',
  warehousekeeper: 'warehousekeeper',
  warehouse_keeper: 'warehousekeeper',
};

export const normalizeRole = (role) => {
  if (typeof role !== 'string') return '';
  const normalized = role.trim().toLowerCase();
  if (!normalized) return '';
  return ROLE_ALIASES[normalized] ?? normalized;
};

export const normalizeRoleList = (roles = []) => {
  if (!Array.isArray(roles)) return [];
  const seen = new Set();
  const normalizedRoles = [];

  roles.forEach((role) => {
    const normalizedRole = normalizeRole(role);
    if (!normalizedRole || seen.has(normalizedRole)) return;
    seen.add(normalizedRole);
    normalizedRoles.push(normalizedRole);
  });

  return normalizedRoles;
};

export const roleMatches = (userRole, allowedRoles) => {
  if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) return true;
  const normalizedUserRole = normalizeRole(userRole);
  if (!normalizedUserRole) return false;
  return normalizeRoleList(allowedRoles).includes(normalizedUserRole);
};