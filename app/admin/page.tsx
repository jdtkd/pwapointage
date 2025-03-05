'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePointages } from "@/lib/hooks/usePointages";
import { Clock, Users, Calendar, PieChart, Timer, AlertTriangle, LogIn, LogOut } from "lucide-react";
import Link from "next/link";
import { DataTable } from "./components/data-table";
import { columns } from "./components/columns";
import { StatistiquesGlobales } from "./components/statistiques-globales";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pointage, User, PointageWithUser } from "@/lib/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function AdminDashboard() {
  const { pointages, isLoading } = usePointages();
  const [pointagesWithUsers, setPointagesWithUsers] = useState<PointageWithUser[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [pointagesAujourdhui, setPointagesAujourdhui] = useState<PointageWithUser[]>([]);

  // Fonction pour formater la durée
  const formatDuree = useCallback((arrivee: Date, depart: Date) => {
    const dureeMinutes = Math.floor((depart.getTime() - arrivee.getTime()) / 60000);
    const heures = Math.floor(dureeMinutes / 60);
    const minutes = dureeMinutes % 60;
    return `${heures}h ${minutes}m`;
  }, []);

  // Écouter les changements en temps réel
  useEffect(() => {
    const channel = supabase
      .channel('pointages-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pointages'
      }, async (payload) => {
        // Rafraîchir les données
        const { data: newPointages } = await supabase
          .from('pointages')
          .select('*')
          .order('date', { ascending: false });
          
        if (newPointages) {
          const enrichedPointages = await enrichPointagesWithUsers(newPointages);
          setPointagesWithUsers(enrichedPointages);
          updatePointagesAujourdhui(enrichedPointages);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Enrichir les pointages avec les informations utilisateurs
  const enrichPointagesWithUsers = async (pointages: Pointage[]) => {
    const { data: usersData } = await supabase
      .from('users')
      .select('id, nom, prenom, email');

    return pointages.map(pointage => {
      const user = usersData?.find(u => u.id === pointage.userId);
      return {
        ...pointage,
        user: user || { id: 'unknown', nom: 'Inconnu', prenom: 'Inconnu', email: 'inconnu@example.com' }
      };
    });
  };

  // Mettre à jour les pointages du jour
  const updatePointagesAujourdhui = (pointages: PointageWithUser[]) => {
    const aujourdhui = new Date().toDateString();
    const pointagesDuJour = pointages.filter(p => 
      new Date(p.date).toDateString() === aujourdhui
    );
    setPointagesAujourdhui(pointagesDuJour);
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, nom, prenom, email');

        if (usersData) {
          setUsers(usersData);
          const enrichedPointages = await enrichPointagesWithUsers(pointages);
          setPointagesWithUsers(enrichedPointages);
          updatePointagesAujourdhui(enrichedPointages);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
      } finally {
        setIsLoadingUsers(false);
      }
    }

    if (!isLoading && pointages.length > 0) {
      fetchData();
    }
  }, [pointages, isLoading]);

  if (isLoading || isLoadingUsers) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Tableau de Bord Administrateur</h1>
        <Link href="/">
          <Button variant="outline">Retour à l'accueil</Button>
        </Link>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="realtime">Temps réel</TabsTrigger>
          <TabsTrigger value="pointages">Historique</TabsTrigger>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Utilisateurs actifs
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {users.length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Pointages aujourd'hui
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {pointages.filter(p => 
                    new Date(p.date).toDateString() === new Date().toDateString()
                  ).length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Retards ce mois
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {pointages.filter(p => 
                    p.retard && 
                    new Date(p.date).getMonth() === new Date().getMonth()
                  ).length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Heures supplémentaires
                </CardTitle>
                <Timer className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.floor(pointages.reduce((acc, p) => 
                    acc + (p.heuresSupplementaires || 0), 0
                  ) / 60)}h
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Taux de ponctualité
                </CardTitle>
                <PieChart className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round((1 - (pointages.filter(p => p.retard).length / pointages.length)) * 100)}%
                </div>
              </CardContent>
            </Card>
          </div>

          <StatistiquesGlobales pointages={pointages} />
        </TabsContent>

        <TabsContent value="realtime">
          <Card>
            <CardHeader>
              <CardTitle>Pointages en Temps Réel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {users.map(user => {
                    const pointagesUser = pointagesAujourdhui.filter(p => p.userId === user.id);
                    const dernierPointage = pointagesUser[pointagesUser.length - 1];
                    const arrivee = pointagesUser.find(p => p.type === 'arrivee');
                    const depart = pointagesUser.find(p => p.type === 'depart');

                    return (
                      <Card key={user.id} className={`
                        ${dernierPointage?.type === 'arrivee' ? 'border-green-500/50' : ''}
                        ${dernierPointage?.type === 'depart' ? 'border-blue-500/50' : ''}
                        ${!dernierPointage ? 'border-muted' : ''}
                      `}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">
                            {user.prenom} {user.nom}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center gap-2 bg-green-500/10 rounded-lg p-2">
                              <LogIn className="h-4 w-4 text-green-500" />
                              <div>
                                <p className="text-xs text-muted-foreground">Arrivée</p>
                                <p className="text-sm font-medium">
                                  {arrivee ? format(new Date(arrivee.date), 'HH:mm') : '--:--'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 bg-blue-500/10 rounded-lg p-2">
                              <LogOut className="h-4 w-4 text-blue-500" />
                              <div>
                                <p className="text-xs text-muted-foreground">Départ</p>
                                <p className="text-sm font-medium">
                                  {depart ? format(new Date(depart.date), 'HH:mm') : '--:--'}
                                </p>
                              </div>
                            </div>
                          </div>
                          {arrivee && depart && (
                            <div className="flex items-center gap-2 bg-accent rounded-lg p-2">
                              <Clock className="h-4 w-4" />
                              <div>
                                <p className="text-xs text-muted-foreground">Durée</p>
                                <p className="text-sm font-medium">
                                  {formatDuree(new Date(arrivee.date), new Date(depart.date))}
                                </p>
                              </div>
                            </div>
                          )}
                          {dernierPointage?.retard && (
                            <div className="flex items-center gap-2 text-xs text-destructive">
                              <AlertTriangle className="h-3 w-3" />
                              <span>{dernierPointage.retardMinutes}m de retard</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pointages">
          <Card>
            <CardHeader>
              <CardTitle>Historique des Pointages</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable 
                columns={columns} 
                data={pointagesWithUsers.map(p => ({
                  id: p.id,
                  type: p.type,
                  date: p.date,
                  retard: p.retard,
                  sortieAnticipee: p.sortieAnticipee,
                  heuresSupplementaires: p.heuresSupplementaires,
                  userId: p.userId,
                  nomComplet: `${p.user.prenom} ${p.user.nom}`,
                  email: p.user.email
                }))} 
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Liste des Utilisateurs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Prénom</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Nombre de pointages</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.nom}</TableCell>
                        <TableCell>{user.prenom}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          {pointages.filter(p => p.userId === user.id).length}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 