export const roleRank = {
  reader: 1,
  viewer: 1,
  api_user: 1,
  researcher: 2,
  analyst: 2,
  journalist: 2,
  editor: 3,
  org_admin: 4,
  admin: 5,
} as const;

export type Role = keyof typeof roleRank;

export function allows(role: Role, minimum: Role): boolean {
  return roleRank[role] >= roleRank[minimum];
}
