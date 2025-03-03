'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ModeToggle } from "@/components/mode-toggle";
import { TimeDisplay } from "./components/TimeDisplay";
import { Clock, LogIn, LogOut, Calendar, PieChart } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header avec mode sombre et date/heure */}
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center px-4">
            <h1 className="text-2xl font-bold tracking-tight lg:text-3xl flex-1 text-center sm:text-left">
              Système de Pointage
            </h1>
            <ModeToggle />
          </div>
        </header>

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
                  >
                    <LogIn className="mr-2 h-5 w-5" />
                    Arrivée
                  </Button>
                  <Button 
                    size="lg"
                    className="h-16 text-lg font-medium"
                    variant="outline"
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
                      <p className="text-2xl font-semibold">--h --m</p>
                    </div>
                    <div className="rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors">
                      <p className="text-sm text-muted-foreground">Retards</p>
                      <p className="text-2xl font-semibold">0</p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">Ce mois</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors">
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="text-2xl font-semibold">--h --m</p>
                    </div>
                    <div className="rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors">
                      <p className="text-sm text-muted-foreground">Ponctualité</p>
                      <p className="text-2xl font-semibold">0%</p>
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
                <Button variant="outline" size="sm" className="hidden sm:flex">
                  Voir tout
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-10">
                <p className="text-lg text-muted-foreground">Aucun pointage trouvé</p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  Les pointages apparaîtront ici une fois enregistrés
                </p>
              </div>
              <Button variant="outline" className="w-full sm:hidden mt-4">
                Voir tout l'historique
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
