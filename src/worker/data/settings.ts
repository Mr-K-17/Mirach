import type { CommunitySettingsRecord } from "./types.ts";

/**
 * Retrieves the singleton community settings row (id = 1).
 */
export async function getCommunitySettings(
  db: D1Database
): Promise<CommunitySettingsRecord> {
  const settings = await db
    .prepare(
      "SELECT id, registration_open, require_admin_approval_for_all, max_group_size, media_quota_bytes_per_user, reapply_cooldown_days, delete_for_everyone_window_ms FROM community_settings WHERE id = 1"
    )
    .first<CommunitySettingsRecord>();

  if (!settings) {
    throw new Error("Community settings singleton record missing in D1");
  }

  return settings;
}

/**
 * Updates specific fields of the community settings record.
 */
export async function updateCommunitySettings(
  db: D1Database,
  patch: Partial<Omit<CommunitySettingsRecord, "id">>
): Promise<void> {
  const current = await getCommunitySettings(db);

  const updated: CommunitySettingsRecord = {
    ...current,
    ...patch,
    id: 1
  };

  await db
    .prepare(
      "UPDATE community_settings SET registration_open = ?1, require_admin_approval_for_all = ?2, max_group_size = ?3, media_quota_bytes_per_user = ?4, reapply_cooldown_days = ?5, delete_for_everyone_window_ms = ?6 WHERE id = 1"
    )
    .bind(
      updated.registration_open,
      updated.require_admin_approval_for_all,
      updated.max_group_size,
      updated.media_quota_bytes_per_user,
      updated.reapply_cooldown_days,
      updated.delete_for_everyone_window_ms
    )
    .run();
}
