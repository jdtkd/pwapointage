'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, LogIn, LogOut, Clock, AlertTriangle, Timer, ChevronLeft, ChevronRight } from "lucide-react";
import { usePointages } from "@/lib/hooks/usePointages";
import { useState, useMemo } from "react";
import Link from "next/link";
import { Pointage } from "@/lib/types";
import { ValidationService } from "@/lib/services/validationService";
import { useStatistiques } from "@/lib/hooks/useStatistiques";

interface PointageJournalier {
  date: string;
  arrivee?: Pointage;
  depart?: Pointage;
  duree?: string;
  retard: boolean;
  heuresSupplementaires: number;
  sortieAnticipee: boolean;
  dureeMinutes: number;
  retardMinutes: number;
}

export default function Historique() {
  const { pointages, isLoading } = usePointages();
  const { statsMois } = useStatistiques(pointages);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Regrouper et calculer les pointages par jour avec la même logique que useStatistiques
  const pointagesJournaliers = useMemo(() => {
    const pointagesFiltres = pointages.filter(pointage => {
      const date = new Date(pointage.date);
      return date.getMonth() === currentMonth.getMonth() &&
             date.getFullYear() === currentMonth.getFullYear();
    });

    const groupedByDay = pointagesFiltres.reduce((acc, pointage) => {
      const dateKey = new Date(pointage.date).toLocaleDateString('fr-FR');
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          retard: false,
          heuresSupplementaires: 0,
          sortieAnticipee: false,
          dureeMinutes: 0,
          retardMinutes: 0
        };
      }
      
      if (pointage.type === 'arrivee') {
        acc[dateKey].arrivee = pointage;
        acc[dateKey].retard = pointage.retard || false;
        acc[dateKey].retardMinutes = pointage.retardMinutes || 0;
      } else {
        acc[dateKey].depart = pointage;
        acc[dateKey].sortieAnticipee = pointage.sortieAnticipee || false;
      }

      // Calculer la durée et les heures supplémentaires si on a l'arrivée et le départ
      if (acc[dateKey].arrivee && acc[dateKey].depart) {
        const dureeMinutes = Math.floor(
          (new Date(acc[dateKey].depart.date).getTime() - new Date(acc[dateKey].arrivee.date).getTime()) / 60000
        );
        acc[dateKey].dureeMinutes = dureeMinutes;
        acc[dateKey].duree = `${Math.floor(dureeMinutes / 60)}h ${dureeMinutes % 60}m`;
        acc[dateKey].heuresSupplementaires = pointage.heuresSupplementaires || 0;
      }

      return acc;
    }, {} as Record<string, PointageJournalier>);

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
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      {/* Header fixe */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="icon" className="md:hidden">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-xl font-semibold">Historique</h1>
          <Link href="/" className="hidden md:block">
            <Button variant="outline" size="sm">Retour</Button>
          </Link>
        </div>
      </header>

      <main className="container py-4 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5" />
                {currentMonth.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
              </CardTitle>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" onClick={() => changerMois(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => changerMois(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {pointagesJournaliers.length > 0 ? (
              <div className="space-y-3">
                {pointagesJournaliers.map((jour) => (
                  <div 
                    key={jour.date} 
                    className={`rounded-lg border p-3 space-y-3
                      hover:bg-accent/50 transition-colors
                      ${jour.retard ? 'border-destructive/50' : ''}
                      ${jour.sortieAnticipee ? 'border-yellow-500/50' : ''}
                      ${jour.heuresSupplementaires > 0 ? 'border-blue-500/50' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-muted">
                          <span className="text-sm font-medium">
                            {new Date(jour.date).toLocaleString('fr-FR', { day: 'numeric' })}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(jour.date).toLocaleString('fr-FR', { weekday: 'short' })}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 bg-green-500/10 rounded-lg px-3 py-1.5">
                            <LogIn className="h-4 w-4 text-green-500" />
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">
                                {jour.arrivee ? new Date(jour.arrivee.date).toLocaleTimeString('fr-FR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : '--:--'}
                              </span>
                              <span className="text-xs text-muted-foreground">Arrivée</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 bg-blue-500/10 rounded-lg px-3 py-1.5">
                            <LogOut className="h-4 w-4 text-blue-500" />
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">
                                {jour.depart ? new Date(jour.depart.date).toLocaleTimeString('fr-FR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : '--:--'}
                              </span>
                              <span className="text-xs text-muted-foreground">Départ</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {jour.duree && (
                          <div className="flex items-center gap-2 bg-accent rounded-lg px-3 py-1.5">
                            <Clock className="h-4 w-4" />
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{jour.duree}</span>
                              <span className="text-xs text-muted-foreground">Durée totale</span>
                            </div>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1 justify-end">
                          {jour.retard && (
                            <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive">
                              <AlertTriangle className="h-3 w-3" />
                              {jour.retardMinutes}m de retard
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
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">Aucun pointage pour ce mois</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Navigation fixe en bas pour mobile */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4 md:hidden">
        <div className="container">
          <Link href="/">
            <Button className="w-full">Retour à l'accueil</Button>
          </Link>
        </div>
      </div>
    </div>
  );
} 