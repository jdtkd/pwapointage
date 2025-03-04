import { useState, useEffect, useCallback } from 'react';
import { Pointage, StatistiquesSemaine, StatistiquesMois } from '../types';
import { ValidationService } from '../services/validationService';
import { useNotifications } from './useNotifications';

const STORAGE_KEY = 'pointages';
const HEURE_DEBUT_TRAVAIL = 9; // 9h00

export function usePointages() {
  const [pointages, setPointages] = useState<Pointage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { sendNotification } = useNotifications();

  // Charger les pointages depuis le localStorage au montage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setPointages(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des pointages:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sauvegarder les pointages dans le localStorage à chaque modification
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pointages));
      } catch (error) {
        console.error('Erreur lors de la sauvegarde des pointages:', error);
      }
    }
  }, [pointages, isLoading]);

  // Trouver le dernier pointage d'arrivée du jour
  const trouverDernierPointageArrivee = useCallback(() => {
    const aujourdhui = new Date().toLocaleDateString('fr-FR');
    return pointages
      .filter(p => new Date(p.date).toLocaleDateString('fr-FR') === aujourdhui && p.type === 'arrivee')
      .pop();
  }, [pointages]);

  // Ajouter un nouveau pointage avec validation
  const addPointage = useCallback(async (type: 'arrivee' | 'depart'): Promise<Pointage> => {
    const heurePointage = new Date();
    
    try {
      // Vérifier la validité du pointage
      const validation = ValidationService.verifierDoublon(type, heurePointage, pointages);
      
      if (!validation.valide) {
        throw new Error(validation.message);
      }

      // Créer le nouveau pointage
      const nouveauPointage: Pointage = {
        id: crypto.randomUUID(),
        type,
        date: heurePointage
      };

      // Si c'est un pointage de départ, calculer le statut de la journée
      if (type === 'depart') {
        const pointagesJour = pointages.filter(p => {
          const datePointage = new Date(p.date);
          return (
            datePointage.getDate() === heurePointage.getDate() &&
            datePointage.getMonth() === heurePointage.getMonth() &&
            datePointage.getFullYear() === heurePointage.getFullYear()
          );
        });

        const pointageArrivee = pointagesJour.find(p => p.type === 'arrivee');
        if (pointageArrivee) {
          const statut = ValidationService.calculerStatutJournee(pointageArrivee, nouveauPointage);
          nouveauPointage.retard = statut.retard;
          nouveauPointage.retardMinutes = statut.retardMinutes;
          nouveauPointage.heuresSupplementaires = statut.heuresSupplementaires;
        }
      }

      setPointages(prev => [...prev, nouveauPointage]);

      // Mettre à jour l'historique du navigateur
      if (typeof window !== 'undefined') {
        window.history.pushState(
          { pointageId: nouveauPointage.id },
          '',
          `/pointage/${nouveauPointage.id}`
        );
      }

      return nouveauPointage;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('Une erreur est survenue lors du pointage');
    }
  }, [pointages]);

  // Calculer les statistiques de la semaine
  const getStatistiquesSemaine = useCallback((): StatistiquesSemaine => {
    try {
      const now = new Date();
      const debutSemaine = new Date(now);
      debutSemaine.setDate(now.getDate() - now.getDay());
      debutSemaine.setHours(0, 0, 0, 0);
      
      const pointagesSemaine = pointages.filter(p => 
        new Date(p.date) >= debutSemaine
      );

      let totalMinutes = 0;
      let retards = 0;
      let heuresSupplementaires = 0;

      // Grouper les pointages par jour
      const pointagesParJour = pointagesSemaine.reduce((acc, p) => {
        const date = new Date(p.date).toDateString();
        if (!acc[date]) acc[date] = [];
        acc[date].push(p);
        return acc;
      }, {} as Record<string, Pointage[]>);

      // Calculer les statistiques pour chaque jour
      Object.values(pointagesParJour).forEach(pointagesJour => {
        const arrivee = pointagesJour.find(p => p.type === 'arrivee');
        const depart = pointagesJour.find(p => p.type === 'depart');

        if (arrivee && depart) {
          const statut = ValidationService.calculerStatutJournee(arrivee, depart);
          if (statut.retard) retards++;
          totalMinutes += statut.dureeMinutes;
          heuresSupplementaires += statut.heuresSupplementaires;
        }
      });

      return {
        totalHeures: Math.floor(totalMinutes / 60),
        totalMinutes: Math.round(totalMinutes % 60),
        retards,
        heuresSupplementaires: Math.round(heuresSupplementaires)
      };
    } catch (error) {
      console.error('Erreur lors du calcul des statistiques de la semaine:', error);
      return { totalHeures: 0, totalMinutes: 0, retards: 0, heuresSupplementaires: 0 };
    }
  }, [pointages]);

  // Calculer les statistiques du mois
  const getStatistiquesMois = useCallback((): StatistiquesMois => {
    try {
      const now = new Date();
      const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
      debutMois.setHours(0, 0, 0, 0);
      
      const pointagesMois = pointages.filter(p => 
        new Date(p.date) >= debutMois
      );

      let totalMinutes = 0;
      let joursPresence = 0;
      let joursRetard = 0;
      let heuresSupplementaires = 0;

      // Grouper les pointages par jour
      const pointagesParJour = pointagesMois.reduce((acc, p) => {
        const date = new Date(p.date).toDateString();
        if (!acc[date]) acc[date] = [];
        acc[date].push(p);
        return acc;
      }, {} as Record<string, Pointage[]>);

      // Calculer les statistiques pour chaque jour
      Object.values(pointagesParJour).forEach(pointagesJour => {
        const arrivee = pointagesJour.find(p => p.type === 'arrivee');
        const depart = pointagesJour.find(p => p.type === 'depart');

        if (arrivee && depart) {
          joursPresence++;
          const statut = ValidationService.calculerStatutJournee(arrivee, depart);
          if (statut.retard) joursRetard++;
          totalMinutes += statut.dureeMinutes;
          heuresSupplementaires += statut.heuresSupplementaires;
        }
      });

      const tauxPonctualite = joursPresence > 0 
        ? Math.round(((joursPresence - joursRetard) / joursPresence) * 100)
        : 100;

      return {
        totalHeures: Math.floor(totalMinutes / 60),
        totalMinutes: Math.round(totalMinutes % 60),
        tauxPonctualite,
        heuresSupplementaires: Math.round(heuresSupplementaires)
      };
    } catch (error) {
      console.error('Erreur lors du calcul des statistiques du mois:', error);
      return { 
        totalHeures: 0, 
        totalMinutes: 0, 
        tauxPonctualite: 100,
        heuresSupplementaires: 0 
      };
    }
  }, [pointages]);

  // Gérer la navigation dans l'historique
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.pointageId) {
        const pointage = pointages.find(p => p.id === event.state.pointageId);
        if (pointage) {
          console.log('Pointage sélectionné:', pointage);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [pointages]);

  return {
    pointages,
    isLoading,
    addPointage,
    getStatistiquesSemaine,
    getStatistiquesMois,
    trouverDernierPointageArrivee
  };
} 