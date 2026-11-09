export interface SessionRecord {
  id: string;
  user_id: string;
  token_hash: string;
  created_at: number;
  last_used_at: number;
  expires_at: number;
  reauth_at: number | null;
  user_agent_summary: string | null;
  revoked_at: number | null;
}

export interface AuditLogRecord {
  id: number;
  actor_id: string;
  action: string;
  subject_type: string;
  subject_id: string;
  metadata: string;
  created_at: number;
}

export interface CommunitySettingsRecord {
  id: number;
  registration_open: number;
  require_admin_approval_for_all: number;
  max_group_size: number;
  media_quota_bytes_per_user: number;
  reapply_cooldown_days: number;
  delete_for_everyone_window_ms: number | null;
}
