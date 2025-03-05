import { prisma } from '../db';
import { Prisma, TypePointage } from '@prisma/client';
import { addHours, isSameDay, startOfDay, endOfDay, subDays } from 'date-fns';

export class PointageService {
  // Créer un nouveau pointage
  static async creerPointage(userId: string, type: TypePointage) {
    const parametres = await this.getParametresActifs();
    const maintenant = new Date();
    const retard = await this.verifierRetard(maintenant, type);

    return prisma.pointage.create({
      data: {
        userId,
        type,
        date: maintenant,
        retard: retard.estEnRetard,
        retardMinutes: retard.minutes,
        heuresSupplementaires: 0, // Sera mis à jour lors du pointage de départ
        dureeMinutes: 0, // Sera calculé lors du pointage de départ
      },
      include: {
        user: true,
      },
    });
  }

  // Récupérer les pointages d'un utilisateur
  static async getPointagesUtilisateur(userId: string, debut?: Date, fin?: Date) {
    return prisma.pointage.findMany({
      where: {
        userId,
        date: {
          gte: debut ?? subDays(new Date(), 30),
          lte: fin ?? new Date(),
        },
      },
      orderBy: {
        date: 'desc',
      },
      include: {
        user: true,
      },
    });
  }

  // Calculer les statistiques journalières
  static async calculerStatistiquesJour(date: Date) {
    const debut = startOfDay(date);
    const fin = endOfDay(date);

    const pointages = await prisma.pointage.findMany({
      where: {
        date: {
          gte: debut,
          lte: fin,
        },
      },
    });

    const stats = {
      totalPointages: pointages.length,
      totalRetards: pointages.filter(p => p.retard).length,
      totalHeuresMinutes: this.calculerDureeTotale(pointages),
      heuresSupplementaires: pointages.reduce((acc, p) => acc + (p.heuresSupplementaires || 0), 0),
      tauxPonctualite: this.calculerTauxPonctualite(pointages),
    };

    return prisma.statistiquesJournalieres.upsert({
      where: {
        date: debut,
      },
      update: stats,
      create: {
        date: debut,
        ...stats,
      },
    });
  }

  // Vérifier si un pointage est en retard
  private static async verifierRetard(date: Date, type: TypePointage): Promise<{ estEnRetard: boolean; minutes: number }> {
    if (type !== TypePointage.arrivee) return { estEnRetard: false, minutes: 0 };

    const parametres = await this.getParametresActifs();
    const [heures, minutes] = parametres.heureDebutJournee.split(':').map(Number);
    const limiteArrivee = new Date(date);
    limiteArrivee.setHours(heures, minutes + parametres.toleranceRetardMinutes, 0, 0);

    if (date > limiteArrivee) {
      const diffMinutes = Math.floor((date.getTime() - limiteArrivee.getTime()) / 60000);
      return { estEnRetard: true, minutes: diffMinutes };
    }

    return { estEnRetard: false, minutes: 0 };
  }

  // Récupérer les paramètres actifs
  private static async getParametresActifs() {
    return prisma.parametresPointage.findFirst({
      where: {
        actif: true,
      },
    }) || this.getParametresParDefaut();
  }

  // Paramètres par défaut
  private static getParametresParDefaut() {
    return {
      heureDebutJournee: "09:00",
      heureFinJournee: "17:00",
      pauseDejeunerDebut: "12:00",
      pauseDejeunerFin: "13:00",
      toleranceRetardMinutes: 5,
      dureeJourneeMinutes: 480,
    };
  }

  // Calculer la durée totale
  private static calculerDureeTotale(pointages: Prisma.PointageGetPayload<{}>[]): number {
    let dureeTotal = 0;
    const pointagesParJour = this.grouperPointagesParJour(pointages);

    for (const pointagesJour of Object.values(pointagesParJour)) {
      dureeTotal += this.calculerDureeJour(pointagesJour);
    }

    return dureeTotal;
  }

  // Calculer le taux de ponctualité
  private static calculerTauxPonctualite(pointages: Prisma.PointageGetPayload<{}>[]): number {
    if (pointages.length === 0) return 100;
    const pointagesArrivee = pointages.filter(p => p.type === TypePointage.arrivee);
    if (pointagesArrivee.length === 0) return 100;

    const retards = pointagesArrivee.filter(p => p.retard).length;
    return Math.round(((pointagesArrivee.length - retards) / pointagesArrivee.length) * 100);
  }

  // Grouper les pointages par jour
  private static grouperPointagesParJour(pointages: Prisma.PointageGetPayload<{}>[]) {
    return pointages.reduce((acc, pointage) => {
      const date = startOfDay(pointage.date).toISOString();
      if (!acc[date]) acc[date] = [];
      acc[date].push(pointage);
      return acc;
    }, {} as Record<string, Prisma.PointageGetPayload<{}>[]>);
  }

  // Calculer la durée d'une journée
  private static calculerDureeJour(pointagesJour: Prisma.PointageGetPayload<{}>[]): number {
    let duree = 0;
    const arrivees = pointagesJour.filter(p => p.type === TypePointage.arrivee);
    const departs = pointagesJour.filter(p => p.type === TypePointage.depart);

    for (let i = 0; i < Math.min(arrivees.length, departs.length); i++) {
      const dureeMinutes = Math.floor(
        (departs[i].date.getTime() - arrivees[i].date.getTime()) / 60000
      );
      duree += dureeMinutes;
    }

    return duree;
  }
} 