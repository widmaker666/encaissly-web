import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { creatriceService, notificationService } from "@/services/api";
import { getErrorMessage } from "@/lib/errors";
import styles from "./Notifications.module.css";

// Port de encaissly-mobile/pages/Notifications/index.tsx — même logique
// (lu/non-lu, invitation à rejoindre une boutique, tout marquer comme lu).

interface Notification {
  id: string;
  type: string;
  message: string;
  metadata?: { creatriceId?: string; boutiqueId?: string; boutiqueName?: string };
  read: boolean;
  createdAt: string;
}

function formatRelative(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const hhmm = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  if (date.toDateString() === now.toDateString()) return `Aujourd'hui ${hhmm}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `Hier ${hhmm}`;
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function getTypeEmoji(type: string): string {
  if (type === "VENTE") return "💰";
  if (type === "INVITATION_BOUTIQUE") return "🏪";
  if (type === "ABONNEMENT") return "⭐";
  return "📌";
}

export default function Notifications() {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: notificationService.getAll,
    staleTime: 0,
  });

  // Les notifications lues ailleurs (mobile, autre onglet) doivent se refléter
  // en arrivant sur cette page — équivalent du useFocusEffect mobile.
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  const { mutate: acceptInvitation, isPending: accepting } = useMutation({
    mutationFn: ({ creatriceId, boutiqueId }: { creatriceId: string; boutiqueId: string }) =>
      creatriceService.acceptInvitation(creatriceId, boutiqueId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-count"] });
    },
    onError: (err) => alert(getErrorMessage(err, "Impossible de rejoindre la boutique.")),
  });

  const { mutate: markAll, isPending: markingAll } = useMutation({
    mutationFn: notificationService.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-count"] });
    },
  });

  return (
    <div>
      <div className={styles.header}>
        <h2>Notifications</h2>
        {unreadCount > 0 && (
          <button type="button" className={styles.markAllBtn} onClick={() => markAll()} disabled={markingAll}>
            {markingAll ? "…" : "Tout lire"}
          </button>
        )}
      </div>

      {isLoading ? (
        <p className={styles.notice}>Chargement…</p>
      ) : !notifications || notifications.length === 0 ? (
        <p className={styles.notice}>🔔 Aucune notification pour l'instant.</p>
      ) : (
        <div className={styles.list}>
          {notifications.map((notif) => (
            <div key={notif.id} className={notif.read ? styles.card : `${styles.card} ${styles.cardUnread}`}>
              <div className={notif.read ? styles.dotRead : styles.dotUnread} />
              <div className={styles.content}>
                <div className={styles.top}>
                  <span className={styles.typeBadge}>
                    {getTypeEmoji(notif.type)} {notif.type}
                  </span>
                  <span className={styles.date}>{formatRelative(notif.createdAt)}</span>
                </div>
                <p className={notif.read ? `${styles.message} ${styles.messageRead}` : styles.message}>{notif.message}</p>

                {notif.type === "INVITATION_BOUTIQUE" && notif.metadata?.creatriceId && (
                  <div className={styles.actionRow}>
                    <span className={styles.inviteTxt}>Boutique : {notif.metadata.boutiqueName}</span>
                    <button
                      type="button"
                      className={styles.joinBtn}
                      disabled={accepting}
                      onClick={() =>
                        acceptInvitation({ creatriceId: notif.metadata!.creatriceId!, boutiqueId: notif.metadata!.boutiqueId ?? "" })
                      }
                    >
                      Rejoindre
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
