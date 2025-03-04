'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ModeToggle } from "@/components/mode-toggle";
import { TimeDisplay } from "./components/TimeDisplay";
import { Clock, LogIn, LogOut, Calendar, PieChart, Timer, Bell } from "lucide-react";
import { usePointages } from "@/lib/hooks/usePointages";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { useCallback, useEffect, useState } from "react";
import { StatistiquesMois, StatistiquesSemaine } from "@/lib/types";
import Link from "next/link";

export default function Home() {
  const { pointages, isLoading, addPointage, getStatistiquesSemaine, getStatistiquesMois } = usePointages();
  const { isSupported, isEnabled, sendNotification, planifierRappel, notifierRetard, notifierHeuresSupplementaires } = useNotifications();
  const [statsSemaine, setStatsSemaine] = useState<StatistiquesSemaine>({ 
    totalHeures: 0, 
    totalMinutes: 0, 
    retards: 0,
    heuresSupplementaires: 0 
  });
  const [statsMois, setStatsMois] = useState<StatistiquesMois>({ 
    totalHeures: 0, 
    totalMinutes: 0, 
    tauxPonctualite: 100,
    heuresSupplementaires: 0 
  });
  const [error, setError] = useState<string | null>(null);
  
  // Mettre à jour les statistiques de manière sécurisée
  const updateStats = useCallback(() => {
    try {
      if (!isLoading) {
        setStatsSemaine(getStatistiquesSemaine());
        setStatsMois(getStatistiquesMois());
      }
    } catch (err) {
      console.error('Erreur lors de la mise à jour des statistiques:', err);
      setError('Erreur lors du calcul des statistiques');
    }
  }, [getStatistiquesSemaine, getStatistiquesMois, isLoading]);

  // Mettre à jour les stats au chargement et à chaque nouveau pointage
  useEffect(() => {
    updateStats();
  }, [pointages, updateStats]);

  // Gérer les pointages de manière sécurisée
  const handlePointage = useCallback(async (type: 'arrivee' | 'depart') => {
    try {
      setError(null);
      const result = await addPointage(type);

      // Envoyer une notification de confirmation
      if (isEnabled) {
        await sendNotification(
          `Pointage ${type === 'arrivee' ? 'd\'arrivée' : 'de départ'} enregistré`,
          {
            body: `Votre pointage a été enregistré à ${new Date().toLocaleTimeString('fr-FR')}`,
            icon: '/icons/icon-192x192.png',
            tag: `pointage-${type}`,
            data: { type, date: new Date() }
          }
        );

        // Vérifier les retards pour les pointages d'arrivée
        if (type === 'arrivee' && result.retard && result.retardMinutes) {
          await notifierRetard(result.retardMinutes);
        }

        // Vérifier les heures supplémentaires pour les pointages de départ
        if (type === 'depart' && result.heuresSupplementaires && result.heuresSupplementaires > 0) {
          await notifierHeuresSupplementaires(result.heuresSupplementaires);
        }
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
        // Notification d'erreur
        if (isEnabled) {
          await sendNotification('Erreur de pointage', {
            body: err.message,
            icon: '/icons/icon-192x192.png',
            tag: 'erreur-pointage',
            requireInteraction: true
          });
        }
      } else {
        setError('Une erreur est survenue lors du pointage');
      }
    }
  }, [addPointage, isEnabled, sendNotification, notifierRetard, notifierHeuresSupplementaires]);

  // Configurer les rappels de pointage avec messages personnalisés
  useEffect(() => {
    if (isEnabled) {
      // Rappel pour l'arrivée à 8h45
      planifierRappel(8, 45, 'N\'oubliez pas de pointer votre arrivée dans 15 minutes !');
      // Rappel pour le départ à 17h45
      planifierRappel(17, 45, 'N\'oubliez pas de pointer votre départ dans 15 minutes !');
    }
  }, [isEnabled, planifierRappel]);

  // Formater le temps pour l'affichage
  const formatTemps = useCallback((heures: number, minutes: number) => {
    return `${heures}h ${minutes}m`;
  }, []);

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
    <div className="min-h-screen bg-background transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header avec mode sombre et date/heure */}
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center px-4">
            <h1 className="text-2xl font-bold tracking-tight lg:text-3xl flex-1 text-center sm:text-left">
              Système de Pointage
            </h1>
            <div className="flex items-center gap-4">
              {isSupported && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={isEnabled ? 'text-green-500' : 'text-muted-foreground'}
                  title={isEnabled ? 'Notifications activées' : 'Notifications désactivées'}
                >
                  <Bell className="h-5 w-5" />
                </Button>
              )}
              <ModeToggle />
            </div>
          </div>
        </header>

        {error && (
          <div className="my-4 p-4 bg-destructive/10 text-destructive rounded-lg">
            {error}
          </div>
        )}

        <main className="py-6 space-y-6">
          {/* Section Pointage */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="order-first">
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Clock className="h-6 w-6" />
                  Pointage
                </CardTitle>
                <TimeDisplay />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button 
                    size="lg" 
                    className="h-16 text-lg font-medium"
                    variant="default"
                    onClick={() => handlePointage('arrivee')}
                  >
                    <LogIn className="mr-2 h-5 w-5" />
                    Arrivée
                  </Button>
                  <Button 
                    size="lg"
                    className="h-16 text-lg font-medium"
                    variant="outline"
                    onClick={() => handlePointage('depart')}
                  >
                    <LogOut className="mr-2 h-5 w-5" />
                    Départ
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Section Statistiques */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-6 w-6" />
                  Statistiques
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">Cette semaine</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors">
                      <p className="text-sm text-muted-foreground">Heures</p>
                      <p className="text-2xl font-semibold">
                        {formatTemps(statsSemaine.totalHeures, statsSemaine.totalMinutes)}
                      </p>
                      {statsSemaine.heuresSupplementaires > 0 && (
                        <p className="text-sm text-blue-500 flex items-center gap-1 mt-1">
                          <Timer className="h-3 w-3" />
                          +{Math.floor(statsSemaine.heuresSupplementaires / 60)}h
                          {Math.round(statsSemaine.heuresSupplementaires % 60)}m
                        </p>
                      )}
                    </div>
                    <div className="rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors">
                      <p className="text-sm text-muted-foreground">Retards</p>
                      <p className="text-2xl font-semibold">{statsSemaine.retards}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">Ce mois</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors">
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="text-2xl font-semibold">
                        {formatTemps(statsMois.totalHeures, statsMois.totalMinutes)}
                      </p>
                      {statsMois.heuresSupplementaires > 0 && (
                        <p className="text-sm text-blue-500 flex items-center gap-1 mt-1">
                          <Timer className="h-3 w-3" />
                          +{Math.floor(statsMois.heuresSupplementaires / 60)}h
                          {Math.round(statsMois.heuresSupplementaires % 60)}m
                        </p>
                      )}
                    </div>
                    <div className="rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors">
                      <p className="text-sm text-muted-foreground">Ponctualité</p>
                      <p className="text-2xl font-semibold">{statsMois.tauxPonctualite}%</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Section Historique */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-6 w-6" />
                  Historique des Pointages
                </CardTitle>
                <Link href="/historique">
                  <Button variant="outline" size="sm" className="hidden sm:flex">
                    Voir tout
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {pointages.length > 0 ? (
                <div className="space-y-4">
                  {pointages.slice(-5).reverse().map((pointage) => (
                    <div key={pointage.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-2">
                        {pointage.type === 'arrivee' ? (
                          <LogIn className="h-4 w-4 text-green-500" />
                        ) : (
                          <LogOut className="h-4 w-4 text-blue-500" />
                        )}
                        <span className="font-medium">
                          {pointage.type === 'arrivee' ? 'Arrivée' : 'Départ'}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(pointage.date).toLocaleString('fr-FR', {
                          dateStyle: 'short',
                          timeStyle: 'short'
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-lg text-muted-foreground">Aucun pointage trouvé</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">
                    Les pointages apparaîtront ici une fois enregistrés
                  </p>
                </div>
              )}
              <Link href="/historique">
                <Button variant="outline" className="w-full sm:hidden mt-4">
                  Voir tout l'historique
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
