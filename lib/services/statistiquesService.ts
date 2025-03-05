import { prisma } from '../db';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export class StatistiquesService {
  // Obtenir les statistiques de la semaine
  static async getStatistiquesSemaine(date: Date = new Date()) {
    const debut = startOfWeek(date, { weekStartsOn: 1 });
    const fin = endOfWeek(date, { weekStartsOn: 1 });

    const stats = await prisma.statistiquesJournalieres.findMany({
      where: {
        date: {
          gte: debut,
          lte: fin,
        },
      },
    });

    return {
      totalHeures: Math.floor(stats.reduce((acc, s) => acc + s.totalHeuresMinutes, 0) / 60),
      totalMinutes: stats.reduce((acc, s) => acc + s.totalHeuresMinutes, 0) % 60,
      retards: stats.reduce((acc, s) => acc + s.totalRetards, 0),
      heuresSupplementaires: stats.reduce((acc, s) => acc + s.heuresSupplementaires, 0),
    };
  }

  // Obtenir les statistiques du mois
  static async getStatistiquesMois(date: Date = new Date()) {
    const debut = startOfMonth(date);
    const fin = endOfMonth(date);

    const stats = await prisma.statistiquesJournalieres.findMany({
      where: {
        date: {
          gte: debut,
          lte: fin,
        },
      },
    });

    const totalJours = stats.length;
    const totalRetards = stats.reduce((acc, s) => acc + s.totalRetards, 0);

    return {
      totalHeures: Math.floor(stats.reduce((acc, s) => acc + s.totalHeuresMinutes, 0) / 60),
      totalMinutes: stats.reduce((acc, s) => acc + s.totalHeuresMinutes, 0) % 60,
      tauxPonctualite: totalJours > 0 
        ? Math.round(((totalJours - totalRetards) / totalJours) * 100)
        : 100,
      heuresSupplementaires: stats.reduce((acc, s) => acc + s.heuresSupplementaires, 0),
    };
  }

  // Obtenir l'évolution des statistiques sur plusieurs mois
  static async getEvolutionStatistiques(nombreMois: number = 6) {
    const debut = startOfMonth(subMonths(new Date(), nombreMois - 1));
    const fin = endOfMonth(new Date());

    const stats = await prisma.statistiquesJournalieres.findMany({
      where: {
        date: {
          gte: debut,
          lte: fin,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    return this.grouperStatistiquesParMois(stats);
  }

  // Grouper les statistiques par mois
  private static grouperStatistiquesParMois(stats: any[]) {
    return stats.reduce((acc, stat) => {
      const moisAnnee = stat.date.toISOString().slice(0, 7);
      if (!acc[moisAnnee]) {
        acc[moisAnnee] = {
          totalHeuresMinutes: 0,
          totalRetards: 0,
          heuresSupplementaires: 0,
          nombreJours: 0,
        };
      }

      acc[moisAnnee].totalHeuresMinutes += stat.totalHeuresMinutes;
      acc[moisAnnee].totalRetards += stat.totalRetards;
      acc[moisAnnee].heuresSupplementaires += stat.heuresSupplementaires;
      acc[moisAnnee].nombreJours += 1;

      return acc;
    }, {});
  }

  // Mettre à jour les statistiques journalières
  static async mettreAJourStatistiquesJour(date: Date) {
    const debut = startOfWeek(date, { weekStartsOn: 1 });
    const fin = endOfWeek(date, { weekStartsOn: 1 });

    const pointages = await prisma.pointage.findMany({
      where: {
        date: {
          gte: debut,
          lte: fin,
        },
      },
    });

    // Calcul des statistiques
    const statsJour = {
      totalPointages: pointages.length,
      totalRetards: pointages.filter(p => p.retard).length,
      totalHeuresMinutes: pointages.reduce((acc, p) => acc + (p.dureeMinutes || 0), 0),
      heuresSupplementaires: pointages.reduce((acc, p) => acc + (p.heuresSupplementaires || 0), 0),
    };

    // Mise à jour ou création des statistiques
    return prisma.statistiquesJournalieres.upsert({
      where: {
        date: date,
      },
      update: statsJour,
      create: {
        date: date,
        ...statsJour,
      },
    });
  }
} 