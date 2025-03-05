export interface Pointage {
  id: string;
  userId: string;
  type: 'arrivee' | 'depart';
  date: string;
  retard?: boolean;
  retardMinutes?: number;
  sortieAnticipee?: boolean;
  heuresSupplementaires?: number;
}

export interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
}

export interface PointageWithUser extends Pointage {
  user: User;
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