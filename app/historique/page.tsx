'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, LogIn, LogOut, Clock, AlertTriangle, Timer } from "lucide-react";
import { usePointages } from "@/lib/hooks/usePointages";
import { useState, useMemo } from "react";
import Link from "next/link";
import { Pointage } from "@/lib/types";
import { ValidationService } from "@/lib/services/validationService";

interface PointageJournalier {
  date: string;
  arrivee?: Pointage;
  depart?: Pointage;
  duree?: string;
  retard: boolean;
  heuresSupplementaires: number;
  sortieAnticipee: boolean;
}

export default function Historique() {
  const { pointages, isLoading } = usePointages();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Regrouper et calculer les pointages par jour
  const pointagesJournaliers = useMemo(() => {
    const pointagesFiltres = pointages.filter(pointage => {
      const date = new Date(pointage.date);
      return date.getMonth() === currentMonth.getMonth() &&
             date.getFullYear() === currentMonth.getFullYear();
    });

    // Grouper les pointages par jour
    const groupedByDay = pointagesFiltres.reduce((acc, pointage) => {
      const dateKey = new Date(pointage.date).toLocaleDateString('fr-FR');
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          retard: false,
          heuresSupplementaires: 0,
          sortieAnticipee: false
        };
      }
      
      if (pointage.type === 'arrivee') {
        acc[dateKey].arrivee = pointage;
      } else {
        acc[dateKey].depart = pointage;
      }

      // Calculer les statistiques si on a l'arrivée et le départ
      if (acc[dateKey].arrivee && acc[dateKey].depart) {
        const statut = ValidationService.calculerStatutJournee(
          acc[dateKey].arrivee,
          acc[dateKey].depart
        );

        acc[dateKey].retard = statut.retard;
        acc[dateKey].heuresSupplementaires = statut.heuresSupplementaires;
        acc[dateKey].sortieAnticipee = statut.sortieAnticipee;
        acc[dateKey].duree = `${Math.floor(statut.dureeMinutes / 60)}h ${Math.round(statut.dureeMinutes % 60)}m`;
      }

      return acc;
    }, {} as Record<string, PointageJournalier>);

    // Convertir l'objet en tableau et trier par date décroissante
    return Object.values(groupedByDay).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [pointages, currentMonth]);

  // Changer de mois
  const changerMois = (delta: number) => {
    setCurrentMonth(prev => {
      const nouvelle = new Date(prev);
      nouvelle.setMonth(prev.getMonth() + delta);
      return nouvelle;
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <Link href="/">
          <Button variant="outline">Retour</Button>
        </Link>
        <h1 className="text-2xl font-bold">Historique des Pointages</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-6 w-6" />
              {currentMonth.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => changerMois(-1)}>
                Mois précédent
              </Button>
              <Button variant="outline" size="sm" onClick={() => changerMois(1)}>
                Mois suivant
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {pointagesJournaliers.length > 0 ? (
            <div className="space-y-4">
              {pointagesJournaliers.map((jour) => (
                <div 
                  key={jour.date} 
                  className={`flex items-center justify-between p-4 rounded-lg border 
                    hover:bg-accent/50 transition-colors
                    ${jour.retard ? 'border-destructive/50' : ''}
                    ${jour.sortieAnticipee ? 'border-yellow-500/50' : ''}
                    ${jour.heuresSupplementaires > 0 ? 'border-blue-500/50' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-muted">
                      <span className="text-sm font-medium">
                        {new Date(jour.date).toLocaleString('fr-FR', { day: 'numeric' })}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(jour.date).toLocaleString('fr-FR', { weekday: 'short' })}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <LogIn className="h-4 w-4 text-green-500" />
                        <span className="text-sm">
                          {jour.arrivee ? new Date(jour.arrivee.date).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '--:--'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <LogOut className="h-4 w-4 text-blue-500" />
                        <span className="text-sm">
                          {jour.depart ? new Date(jour.depart.date).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '--:--'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {jour.duree && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{jour.duree}</span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      {jour.retard && (
                        <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive">
                          <AlertTriangle className="h-3 w-3" />
                          Retard
                        </div>
                      )}
                      {jour.sortieAnticipee && (
                        <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-500">
                          <AlertTriangle className="h-3 w-3" />
                          Sortie anticipée
                        </div>
                      )}
                      {jour.heuresSupplementaires > 0 && (
                        <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-500">
                          <Timer className="h-3 w-3" />
                          +{Math.floor(jour.heuresSupplementaires / 60)}h{Math.round(jour.heuresSupplementaires % 60)}m
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-lg text-muted-foreground">Aucun pointage pour ce mois</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 