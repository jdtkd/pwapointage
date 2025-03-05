import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Pointage, PointageWithUser, User } from '@/lib/types';

export interface GlobalStats {
  totalUtilisateurs: number;
  totalPointagesJour: number;
  totalRetardsJour: number;
  totalHeuresSupplementairesJour: number;
  pointagesEnCours: PointageWithUser[];
  statistiquesParUtilisateur: Map<string, {
    totalHeures: number;
    totalMinutes: number;
    retards: number;
    heuresSupplementaires: number;
    dernierPointage?: PointageWithUser;
  }>;
}

export function useGlobalStats() {
  const [stats, setStats] = useState<GlobalStats>({
    totalUtilisateurs: 0,
    totalPointagesJour: 0,
    totalRetardsJour: 0,
    totalHeuresSupplementairesJour: 0,
    pointagesEnCours: [],
    statistiquesParUtilisateur: new Map()
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Récupérer tous les utilisateurs
        const { data: users } = await supabase
          .from('users')
          .select('*')
          .eq('actif', true);

        // Récupérer tous les pointages du jour
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { data: pointages } = await supabase
          .from('pointages')
          .select('*, user:users(*)')
          .gte('date', today.toISOString());

        if (users && pointages) {
          const statsParUser = new Map();
          const pointagesEnCours: PointageWithUser[] = [];

          users.forEach(user => {
            const pointagesUser = pointages.filter(p => p.userId === user.id);
            const dernierPointage = pointagesUser[pointagesUser.length - 1];
            
            if (dernierPointage?.type === 'arrivee') {
              pointagesEnCours.push(dernierPointage);
            }

            const userStats = pointagesUser.reduce((acc, p) => {
              if (p.type === 'depart' && p.dureeMinutes) {
                acc.totalMinutes += p.dureeMinutes;
              }
              if (p.retard) acc.retards++;
              if (p.heuresSupplementaires) {
                acc.heuresSupplementaires += p.heuresSupplementaires;
              }
              return acc;
            }, {
              totalHeures: 0,
              totalMinutes: 0,
              retards: 0,
              heuresSupplementaires: 0,
              dernierPointage
            });

            userStats.totalHeures = Math.floor(userStats.totalMinutes / 60);
            userStats.totalMinutes = userStats.totalMinutes % 60;

            statsParUser.set(user.id, userStats);
          });

          setStats({
            totalUtilisateurs: users.length,
            totalPointagesJour: pointages.length,
            totalRetardsJour: pointages.filter(p => p.retard).length,
            totalHeuresSupplementairesJour: pointages.reduce((acc, p) => acc + (p.heuresSupplementaires || 0), 0),
            pointagesEnCours,
            statistiquesParUtilisateur: statsParUser
          });
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Écouter les changements en temps réel
    const channel = supabase
      .channel('global-stats')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pointages'
      }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { stats, isLoading };
} 