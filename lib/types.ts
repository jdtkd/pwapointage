export interface Pointage {
  id: string;
  type: 'arrivee' | 'depart';
  date: Date | string;
  retard?: boolean;
  retardMinutes?: number;
  heuresSupplementaires?: number;
}

export interface PointageJournalier {
  date: string;
  arrivee?: Pointage;
  depart?: Pointage;
  retard: boolean;
  heuresSupplementaires: number;
  sortieAnticipee: boolean;
  duree?: string;
}

export interface StatistiquesJour {
  heures: number;
  minutes: number;
  retard: boolean;
  heuresSupplementaires: number;
  sortieAnticipee: boolean;
}

export interface StatistiquesSemaine {
  totalHeures: number;
  totalMinutes: number;
  retards: number;
  heuresSupplementaires: number;
}

export interface StatistiquesMois {
  totalHeures: number;
  totalMinutes: number;
  tauxPonctualite: number;
  heuresSupplementaires: number;
} 