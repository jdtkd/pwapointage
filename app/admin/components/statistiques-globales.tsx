'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pointage } from "@/lib/types";
import { ValidationService } from "@/lib/services/validationService";
import { useMemo } from "react";

interface StatistiquesGlobalesProps {
  pointages: Pointage[];
}

export function StatistiquesGlobales({ pointages }: StatistiquesGlobalesProps) {
  const stats = useMemo(() => {
    const maintenant = new Date();
    const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
    const debutSemaine = new Date(maintenant);
    debutSemaine.setDate(maintenant.getDate() - maintenant.getDay());
    debutSemaine.setHours(0, 0, 0, 0);

    // Grouper les pointages par jour
    const pointagesParJour = pointages.reduce((acc, p) => {
      const date = new Date(p.date).toDateString();
      if (!acc[date]) acc[date] = [];
      acc[date].push(p);
      return acc;
    }, {} as Record<string, Pointage[]>);

    let totalHeuresMois = 0;
    let totalRetardsMois = 0;
    let totalHeuresSupMois = 0;
    let joursPresenceMois = 0;

    let totalHeuresSemaine = 0;
    let totalRetardsSemaine = 0;
    let totalHeuresSupSemaine = 0;
    let joursPresenceSemaine = 0;

    Object.entries(pointagesParJour).forEach(([dateStr, pointagesJour]) => {
      const date = new Date(dateStr);
      const arrivee = pointagesJour.find(p => p.type === 'arrivee');
      const depart = pointagesJour.find(p => p.type === 'depart');

      if (arrivee && depart) {
        const statut = ValidationService.calculerStatutJournee(arrivee, depart);

        // Statistiques du mois
        if (date >= debutMois) {
          joursPresenceMois++;
          totalHeuresMois += statut.dureeMinutes;
          if (statut.retard) totalRetardsMois++;
          totalHeuresSupMois += statut.heuresSupplementaires;
        }

        // Statistiques de la semaine
        if (date >= debutSemaine) {
          joursPresenceSemaine++;
          totalHeuresSemaine += statut.dureeMinutes;
          if (statut.retard) totalRetardsSemaine++;
          totalHeuresSupSemaine += statut.heuresSupplementaires;
        }
      }
    });

    return {
      mois: {
        heures: Math.floor(totalHeuresMois / 60),
        minutes: Math.round(totalHeuresMois % 60),
        retards: totalRetardsMois,
        heuresSupplementaires: Math.round(totalHeuresSupMois),
        joursPresence: joursPresenceMois,
        tauxPonctualite: joursPresenceMois > 0 
          ? Math.round(((joursPresenceMois - totalRetardsMois) / joursPresenceMois) * 100)
          : 100
      },
      semaine: {
        heures: Math.floor(totalHeuresSemaine / 60),
        minutes: Math.round(totalHeuresSemaine % 60),
        retards: totalRetardsSemaine,
        heuresSupplementaires: Math.round(totalHeuresSupSemaine),
        joursPresence: joursPresenceSemaine
      }
    };
  }, [pointages]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Statistiques du Mois</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Temps total</p>
              <p className="text-2xl font-bold">
                {stats.mois.heures}h {stats.mois.minutes}m
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Jours de présence</p>
              <p className="text-2xl font-bold">{stats.mois.joursPresence}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Retards</p>
              <p className="text-2xl font-bold">{stats.mois.retards}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Taux de ponctualité</p>
              <p className="text-2xl font-bold">{stats.mois.tauxPonctualite}%</p>
            </div>
          </div>
          {stats.mois.heuresSupplementaires > 0 && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">Heures supplémentaires</p>
              <p className="text-2xl font-bold text-blue-500">
                +{Math.floor(stats.mois.heuresSupplementaires / 60)}h
                {Math.round(stats.mois.heuresSupplementaires % 60)}m
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Statistiques de la Semaine</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Temps total</p>
              <p className="text-2xl font-bold">
                {stats.semaine.heures}h {stats.semaine.minutes}m
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Jours de présence</p>
              <p className="text-2xl font-bold">{stats.semaine.joursPresence}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Retards</p>
              <p className="text-2xl font-bold">{stats.semaine.retards}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Heures supp.</p>
              <p className="text-2xl font-bold">
                {Math.floor(stats.semaine.heuresSupplementaires / 60)}h
                {Math.round(stats.semaine.heuresSupplementaires % 60)}m
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 