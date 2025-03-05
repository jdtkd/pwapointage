import { prisma } from '../db';
import { TypeNotification } from '@prisma/client';
import { addDays } from 'date-fns';

export class NotificationService {
  private static instance: NotificationService;
  private permission: NotificationPermission = 'default';

  private constructor() {
    // Singleton
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public isSupported(): boolean {
    return 'Notification' in window;
  }

  public async init(): Promise<boolean> {
    if (!this.isSupported()) {
      console.log('Ce navigateur ne supporte pas les notifications desktop');
      return false;
    }

    try {
      this.permission = await Notification.requestPermission();
      return this.permission === 'granted';
    } catch (error) {
      console.error('Erreur lors de la demande de permission:', error);
      return false;
    }
  }

  public async sendNotification(title: string, options?: NotificationOptions): Promise<boolean> {
    if (!this.isSupported() || this.permission !== 'granted') {
      console.log('Permission non accordée pour les notifications');
      return false;
    }

    try {
      const notification = new Notification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        ...options
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return true;
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification:', error);
      return false;
    }
  }

  public async notifierRetard(minutes: number): Promise<boolean> {
    return this.sendNotification('Retard détecté', {
      body: `Vous avez ${minutes} minutes de retard aujourd'hui.`,
      tag: 'retard',
      data: { type: 'retard', minutes }
    });
  }

  public async notifierHeuresSupplementaires(minutes: number): Promise<boolean> {
    return this.sendNotification('Heures supplémentaires', {
      body: `Vous avez effectué ${minutes} minutes supplémentaires.`,
      tag: 'heures-sup',
      data: { type: 'heures-sup', minutes }
    });
  }

  public async planifierRappel(heure: number, minutes: number, message: string = 'N\'oubliez pas de pointer !'): Promise<boolean> {
    if (!this.isSupported()) {
      console.log('Les notifications ne sont pas supportées');
      return false;
    }

    try {
      const now = new Date();
      const rappel = new Date(now);
      rappel.setHours(heure, minutes, 0, 0);

      // Si l'heure est déjà passée, planifier pour le lendemain
      if (rappel < now) {
        rappel.setDate(rappel.getDate() + 1);
      }

      const delai = rappel.getTime() - now.getTime();

      setTimeout(() => {
        this.sendNotification('Rappel de pointage', {
          body: message,
          requireInteraction: true,
          tag: 'rappel-pointage'
        });
      }, delai);

      return true;
    } catch (error) {
      console.error('Erreur lors de la planification du rappel:', error);
      return false;
    }
  }

  // Créer une nouvelle notification
  static async creerNotification(
    userId: string,
    type: TypeNotification,
    message: string,
    priorite: number = 0,
    expiresIn: number = 7 // expire dans 7 jours par défaut
  ) {
    return prisma.notification.create({
      data: {
        userId,
        type,
        message,
        priorite,
        expiresAt: addDays(new Date(), expiresIn),
      },
    });
  }

  // Récupérer les notifications non lues d'un utilisateur
  static async getNotificationsNonLues(userId: string) {
    return prisma.notification.findMany({
      where: {
        userId,
        lu: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: [
        {
          priorite: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
    });
  }

  // Marquer une notification comme lue
  static async marquerCommeLue(id: string) {
    return prisma.notification.update({
      where: { id },
      data: { lu: true },
    });
  }

  // Marquer toutes les notifications d'un utilisateur comme lues
  static async marquerToutesCommeLues(userId: string) {
    return prisma.notification.updateMany({
      where: {
        userId,
        lu: false,
      },
      data: {
        lu: true,
      },
    });
  }

  // Nettoyer les notifications expirées
  static async nettoyerNotificationsExpirees() {
    return prisma.notification.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }

  // Créer une notification de retard
  static async notifierRetard(userId: string, retardMinutes: number) {
    return this.creerNotification(
      userId,
      TypeNotification.RETARD,
      `Vous êtes en retard de ${retardMinutes} minutes.`,
      2
    );
  }

  // Créer une notification d'heures supplémentaires
  static async notifierHeuresSupplementaires(userId: string, minutes: number) {
    return this.creerNotification(
      userId,
      TypeNotification.HEURES_SUPPLEMENTAIRES,
      `Vous avez effectué ${Math.floor(minutes / 60)}h${minutes % 60}m supplémentaires.`,
      1
    );
  }

  // Créer une notification de sortie anticipée
  static async notifierSortieAnticipee(userId: string) {
    return this.creerNotification(
      userId,
      TypeNotification.SORTIE_ANTICIPEE,
      'Vous êtes parti avant l\'heure de fin de journée.',
      2
    );
  }
} 