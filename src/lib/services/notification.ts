/**
 * Notification Service — BACKEND-CONNECTED
 * --------------------------------------------------------------------
 * Calls the StyleSync Express backend at /api/v1/notifications/* for
 * customer notifications.
 *
 * Customer isolation: backend uses JWT customerId, never frontend input.
 *
 * Realtime: the current backend doesn't expose websocket-based realtime
 * updates. The subscribe function returns a no-op until realtime is wired
 * up. Components can poll periodically to refresh notifications.
 */

import { api } from "@/lib/backend/client";
import type { NotificationRecord, NotificationCategory } from "@/lib/types";

// ─── Backend response shape ────────────────────────────────────
interface BackendNotification {
  id: string;
  customerId?: string;
  category?: string;
  type?: string;
  title: string;
  body?: string;
  description?: string;
  message?: string;
  read?: boolean;
  isRead?: boolean;
  actionLabel?: string | null;
  actionType?: string | null;
  actionPayload?: string | null;
  metadata?: any;
  createdAt?: string;
  sentAt?: string;
}

/** Get all notifications for the authenticated customer (most recent first). */
export async function getNotifications(_customer_id: string, include_read: boolean = true): Promise<NotificationRecord[]> {
  const result = await api.get<BackendNotification[] | { notifications: BackendNotification[] }>(
    "/notifications",
    { query: { unreadOnly: !include_read } }
  );
  const rows = Array.isArray(result) ? result : (result?.notifications || []);
  return rows.map(mapToNotification);
}

/** Mark a single notification as read. */
export async function markNotificationRead(_customer_id: string, notificationId: string): Promise<void> {
  await api.patch(`/notifications/${notificationId}/read`, {});
}

/** Mark all notifications as read. */
export async function markAllNotificationsRead(_customer_id: string): Promise<void> {
  await api.post("/notifications/mark-all-read", {});
}

/** Clear all read notifications. */
export async function clearReadNotifications(_customer_id: string): Promise<void> {
  await api.del("/notifications/clear-read");
}

/** Get the count of unread notifications (for the badge). */
export async function getUnreadCount(_customer_id: string): Promise<number> {
  try {
    const result = await api.get<{ unreadCount?: number; count?: number; total?: number }>(
      "/notifications/unread-count"
    );
    return result?.unreadCount ?? result?.count ?? result?.total ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Subscribe to realtime notification updates. Returns an unsubscribe function.
 * --------------------------------------------------------------------
 * No-op until backend realtime is wired up. Callers can poll instead:
 *
 *   useEffect(() => {
 *     const id = setInterval(() => getNotifications("").then(set), 30_000);
 *     return () => clearInterval(id);
 *   }, []);
 */
export function subscribeToNotifications(
  _customer_id: string,
  _onUpdate: (notifications: NotificationRecord[]) => void
): () => void {
  return () => {};
}

// ─── Mapper ────────────────────────────────────────────────────
function mapToNotification(n: BackendNotification): NotificationRecord {
  // Normalize category — backend may use uppercase / different casing
  const rawCat = (n.category || n.type || "system").toLowerCase();
  const category: NotificationCategory = ["booking", "availability", "ai", "salon", "review", "system"].includes(rawCat as any)
    ? rawCat as NotificationCategory
    : "system";

  return {
    id: n.id,
    customer_id: n.customerId || "",
    category,
    title: n.title,
    description: n.description || n.body || n.message || "",
    timestamp: n.createdAt || n.sentAt || "",
    read: !!(n.isRead ?? n.read),
    action_label: n.actionLabel || null,
    action_type: n.actionType || null,
    action_payload: n.actionPayload || (n.metadata ? JSON.stringify(n.metadata) : null),
    created_at: n.createdAt || "",
  };
}
