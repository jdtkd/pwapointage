import { useEffect, useState } from 'react';
import { NotificationService } from '../services/notificationService';

export function useNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const notificationService = NotificationService.getInstance();

  useEffect(() => {
    const checkNotificationSupport = async () => {
      const supported = notificationService.isSupported();
      setIsSupported(supported);

      if (supported) {
        const enabled = await notificationService.init();
        setIsEnabled(enabled);
      }
    };

    checkNotificationSupport();
  }, []);

  const sendNotification = async (
    title: string,
    options?: NotificationOptions
  ) => {
    return notificationService.sendNotification(title, options);
  };

  const planifierRappel = async (
    heure: number,
    minute: number,
    message: string = 'N\'oubliez pas de pointer !'
  ) => {
    await notificationService.planifierRappel(heure, minute, message);
  };

  const notifierRetard = async (minutes: number) => {
    await notificationService.notifierRetard(minutes);
  };

  const notifierHeuresSupplementaires = async (minutes: number) => {
    await notificationService.notifierHeuresSupplementaires(minutes);
  };

  return {
    isSupported,
    isEnabled,
    sendNotification,
    planifierRappel,
    notifierRetard,
    notifierHeuresSupplementaires
  };
} 