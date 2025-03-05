import { useMemo } from 'react';
import { Pointage } from '@/lib/types';

const PAUSE_DEJEUNER_MINUTES = 60; // Pause déjeuner standard d'une heure

interface DureeCalculee {
  dureePresence: number;
  dureeTravailEffectif: number;
  dureeStr: string;
}

export interface StatistiquesJour {
  arrivee?: Pointage;
  depart?: Pointage;
  durees: DureeCalculee;
  retard: boolean;
  retardMinutes: number;
}

export interface StatistiquesCumul {
  totalMinutes: number;
  totalHeures: number;
  totalMinutesRestantes: number;
  totalJours: number;
  moyenneHeuresParJour: number;
  retardsTotal: number;
}

function calculerDurees(arrivee?: Pointage, depart?: Pointage): DureeCalculee {
  if (!arrivee || !depart) {
    return {
      dureePresence: 0,
      dureeTravailEffectif: 0,
      dureeStr: '--:--'
    };
  }

  const dureePresenceMinutes = Math.floor(
    (new Date(depart.date).getTime() - new Date(arrivee.date).getTime()) / 60000
  );

  // Si la durée de présence est supérieure à 6h, on déduit la pause déjeuner
  const dureeTravailEffectifMinutes = dureePresenceMinutes > 360 
    ? dureePresenceMinutes - PAUSE_DEJEUNER_MINUTES 
    : dureePresenceMinutes;

  return {
    dureePresence: dureePresenceMinutes,
    dureeTravailEffectif: dureeTravailEffectifMinutes,
    dureeStr: `${Math.floor(dureeTravailEffectifMinutes / 60)}h ${dureeTravailEffectifMinutes % 60}m`
  };
}

export function useStatistiques(pointages: Pointage[]) {
  // Statistiques du jour
  const statsJour = useMemo(() => {
    const aujourdhui = new Date().toDateString();
    const pointagesAujourdhui = pointages.filter(p => 
      new Date(p.date).toDateString() === aujourdhui
    );

    const arrivee = pointagesAujourdhui.find(p => p.type === 'arrivee');
    const depart = pointagesAujourdhui.find(p => p.type === 'depart');
    const durees = calculerDurees(arrivee, depart);

    return {
      arrivee,
      depart,
      durees,
      retard: arrivee?.retard || false,
      retardMinutes: arrivee?.retardMinutes || 0
    };
  }, [pointages]);

  // Statistiques cumulées
  const statsCumul = useMemo(() => {
    const stats = pointages.reduce((acc, pointage) => {
      if (pointage.type === 'depart') {
        const arriveeCorrespondante = pointages.find(
          p => p.type === 'arrivee' && 
          new Date(p.date).toDateString() === new Date(pointage.date).toDateString()
        );

        if (arriveeCorrespondante) {
          const durees = calculerDurees(arriveeCorrespondante, pointage);
          acc.totalMinutes += durees.dureeTravailEffectif;
          if (arriveeCorrespondante.retard) {
            acc.retardsTotal += 1;
          }
          acc.totalJours += 1;
        }
      }
      return acc;
    }, {
      totalMinutes: 0,
      retardsTotal: 0,
      totalJours: 0
    });

    return {
      ...stats,
      totalHeures: Math.floor(stats.totalMinutes / 60),
      totalMinutesRestantes: stats.totalMinutes % 60,
      moyenneHeuresParJour: stats.totalJours > 0 
        ? Math.round((stats.totalMinutes / stats.totalJours) / 60 * 10) / 10 
        : 0
    };
  }, [pointages]);

  return {
    statsJour,
    statsCumul
  };
} 