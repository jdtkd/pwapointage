'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ModeToggle } from "@/components/mode-toggle";
import { TimeDisplay } from "./components/TimeDisplay";
import { Clock, Calendar, PieChart, Bell, Timer } from "lucide-react";
import { usePointages } from "@/lib/hooks/usePointages";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { useCallback, useState, useMemo } from "react";
import Link from "next/link";
import { useStatistiques } from "@/lib/hooks/useStatistiques";

export default function Home() {
  const { pointages, isLoading, addPointage } = usePointages();
  const { statsJour, statsCumul } = useStatistiques(pointages);
  const { isSupported, isEnabled, sendNotification } = useNotifications();
  const [error, setError] = useState<string | null>(null);

  // Calcul du cumul mensuel
  const cumulMensuel = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    return pointages.reduce((acc, pointage) => {
      const pointageDate = new Date(pointage.date);
      if (pointageDate.getMonth() === currentMonth && 
          pointageDate.getFullYear() === currentYear && 
          pointage.type === 'depart') {
        const arrivee = pointages.find(
          p => p.type === 'arrivee' && 
          new Date(p.date).toDateString() === pointageDate.toDateString()
        );
        if (arrivee) {
          const dureeMinutes = Math.floor(
            (pointageDate.getTime() - new Date(arrivee.date).getTime()) / 60000
          );
          acc += dureeMinutes;
        }
      }
      return acc;
    }, 0);
  }, [pointages]);

  const cumulMensuelStr = useMemo(() => {
    const heures = Math.floor(cumulMensuel / 60);
    const minutes = cumulMensuel % 60;
    return `${heures}h ${minutes}m`;
  }, [cumulMensuel]);

  const handlePointage = useCallback(async (type: 'arrivee' | 'depart') => {
    try {
      setError(null);
      await addPointage(type);

      if (isEnabled) {
        await sendNotification(
          `Pointage ${type === 'arrivee' ? 'd\'arrivée' : 'de départ'} enregistré`,
          {
            body: `Votre pointage a été enregistré à ${new Date().toLocaleTimeString('fr-FR')}`,
            icon: '/icons/icon-192x192.png',
            tag: `pointage-${type}`
          }
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue lors du pointage');
    }
  }, [addPointage, isEnabled, sendNotification]);

  const peutPointer = !statsJour.arrivee || (statsJour.arrivee && statsJour.depart);
  const typePointage = peutPointer ? 'arrivee' : 'depart';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <h1 className="text-lg font-semibold">Pointage</h1>
          <div className="flex items-center gap-2">
            {isSupported && (
              <Button
                variant="ghost"
                size="icon"
                className={isEnabled ? 'text-green-500' : 'text-muted-foreground'}
              >
                <Bell className="h-4 w-4" />
              </Button>
            )}
            <ModeToggle />
          </div>
        </div>
      </header>

      <main className="container py-4 space-y-4 pb-20">
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm">
            {error}
          </div>
        )}

        <Card className="shadow-sm">
          <CardHeader className="space-y-1">
            <TimeDisplay />
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Pointages du jour */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 flex-col items-center justify-center rounded-full bg-muted">
                  <span className="text-lg font-semibold">
                    {new Date().getDate()}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date().toLocaleDateString('fr-FR', { weekday: 'short' })}
                  </span>
                </div>
                
                <div className="flex flex-1 flex-col gap-2">
                  {/* Arrivée */}
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${statsJour.arrivee ? 'bg-green-500' : 'bg-muted'}`} />
                    <span className="text-sm font-medium">
                      {statsJour.arrivee 
                        ? new Date(statsJour.arrivee.date).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : '--:--'}
                    </span>
                    <span className="text-xs text-muted-foreground">Arrivée</span>
                    {statsJour.retard && (
                      <span className="ml-auto text-xs text-destructive">
                        {statsJour.retardMinutes}m de retard
                      </span>
                    )}
                  </div>
                  
                  {/* Départ */}
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${statsJour.depart ? 'bg-blue-500' : 'bg-muted'}`} />
                    <span className="text-sm font-medium">
                      {statsJour.depart 
                        ? new Date(statsJour.depart.date).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : '--:--'}
                    </span>
                    <span className="text-xs text-muted-foreground">Départ</span>
                  </div>
                </div>

                {/* Durée totale */}
                <div className="flex items-center gap-2 rounded-lg bg-accent/50 px-3 py-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{statsJour.durees.dureeStr}</span>
                    <span className="text-xs text-muted-foreground">Durée totale</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cumul du mois */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10">
              <div>
                <p className="text-sm text-muted-foreground">Cumul du mois</p>
                <p className="text-lg font-semibold text-blue-500">
                  {cumulMensuelStr}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
                </p>
              </div>
              <Timer className="h-5 w-5 text-blue-500" />
            </div>

            {/* Bouton de pointage */}
            <Button
              size="lg"
              onClick={() => handlePointage(typePointage)}
              className="w-full py-6 text-lg"
            >
              {peutPointer ? "Pointer l'arrivée" : "Pointer le départ"}
            </Button>
          </CardContent>
        </Card>

        {/* Navigation fixe en bas */}
        <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-2">
          <div className="container grid grid-cols-2 gap-2">
            <Link href="/historique" className="flex-1">
              <Button variant="outline" className="w-full">
                <Calendar className="h-4 w-4 mr-2" />
                Historique
              </Button>
            </Link>
            <Link href="/admin" className="flex-1">
              <Button variant="outline" className="w-full">
                <PieChart className="h-4 w-4 mr-2" />
                Stats
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
