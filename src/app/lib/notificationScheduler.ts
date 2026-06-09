/**
 * Utility para agendar Local Push Notifications
 * Usa a Notification API nativa do navegador/Android
 */

export interface ScheduledNotification {
  id: string;
  title: string;
  description?: string;
  scheduledTime: Date;
  agenda_id?: string;
}

// Mapa de notificações agendadas para poder cancelá-las
const scheduledNotifications = new Map<string, NodeJS.Timeout>();

/**
 * Solicita permissão para mostrar notificações
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Este navegador não suporta Notificações');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * Agenda uma notificação local para um tempo futuro
 * Retorna um ID para cancelar a notificação se necessário
 */
export function scheduleNotification(
  title: string,
  options: {
    description?: string;
    scheduleTime: Date;
    agendaId?: string;
    onNotify?: () => void;
  }
): string {
  const notificationId = `notif-${Date.now()}-${Math.random()}`;
  const now = new Date();
  const delayMs = options.scheduleTime.getTime() - now.getTime();

  if (delayMs <= 0) {
    console.warn('Tempo agendado já passou:', options.scheduleTime);
    return notificationId;
  }

  // Agenda a notificação
  const timeoutId = setTimeout(() => {
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body: options.description || '',
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: `agenda-${options.agendaId || 'generic'}`,
        requireInteraction: true, // Força o usuário a fechar manualmente
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      notification.onclose = () => {
        scheduledNotifications.delete(notificationId);
      };

      if (options.onNotify) {
        options.onNotify();
      }
    }

    scheduledNotifications.delete(notificationId);
  }, delayMs);

  scheduledNotifications.set(notificationId, timeoutId);
  return notificationId;
}

/**
 * Cancela uma notificação agendada
 */
export function cancelScheduledNotification(notificationId: string): boolean {
  const timeoutId = scheduledNotifications.get(notificationId);
  if (timeoutId) {
    clearTimeout(timeoutId);
    scheduledNotifications.delete(notificationId);
    return true;
  }
  return false;
}

/**
 * Cancela todas as notificações agendadas
 */
export function cancelAllScheduledNotifications(): void {
  scheduledNotifications.forEach((timeoutId) => {
    clearTimeout(timeoutId);
  });
  scheduledNotifications.clear();
}

/**
 * Helper: calcula o tempo para disparar a notificação (X minutos antes)
 */
export function calculateNotificationTime(
  eventDate: string,
  eventTime: string,
  minutesBefore: number = 30
): Date {
  const dateStr = `${eventDate}T${eventTime || '00:00'}`;
  const eventDateTime = new Date(dateStr);
  const notifyTime = new Date(eventDateTime.getTime() - minutesBefore * 60 * 1000);
  return notifyTime;
}

/**
 * Agenda notificações para todos os eventos de um dia específico
 * Retorna array de IDs das notificações agendadas
 */
export async function scheduleNotificationsForActivities(
  activities: Array<{
    id: string;
    title: string;
    date: string;
    time: string;
  }>,
  minutesBefore: number = 30
): Promise<string[]> {
  // Pede permissão primeiro
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    console.warn('Permissão de notificação negada');
    return [];
  }

  const today = new Date().toISOString().split('T')[0];
  const scheduledIds: string[] = [];

  activities.forEach((activity) => {
    // Filtra só atividades de hoje
    if (activity.date !== today) return;

    // Se não tem hora, ignora
    if (!activity.time) return;

    const notifyTime = calculateNotificationTime(
      activity.date,
      activity.time,
      minutesBefore
    );

    const now = new Date();
    // Só agenda se o tempo de notificação não passou
    if (notifyTime > now) {
      const notificationId = scheduleNotification(
        `Lembrete: ${activity.title}`,
        {
          description: `Sua atividade começa em ${minutesBefore} minutos`,
          scheduleTime: notifyTime,
          agendaId: activity.id,
        }
      );

      scheduledIds.push(notificationId);
    }
  });

  return scheduledIds;
}
