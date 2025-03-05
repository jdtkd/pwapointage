"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Pointage } from "@/lib/types";
import { LogIn, LogOut, AlertTriangle, Timer } from "lucide-react";

export const columns: ColumnDef<Pointage & { nomComplet: string; email: string }>[] = [
  {
    accessorKey: "nomComplet",
    header: "Utilisateur",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "date",
    header: "Date et Heure",
    cell: ({ row }) => {
      const date = new Date(row.getValue("date"));
      return date.toLocaleString('fr-FR', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    },
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => {
      const type = row.getValue("type") as string;
      return (
        <Badge variant={type === 'arrivee' ? 'default' : 'secondary'}>
          {type === 'arrivee' ? 'Arrivée' : 'Départ'}
        </Badge>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Statut",
    cell: ({ row }) => {
      const pointage = row.original;
      let status = "À l'heure";
      let variant: "default" | "destructive" | "warning" = "default";

      if (pointage.type === 'arrivee' && pointage.retard) {
        status = "Retard";
        variant = "destructive";
      } else if (pointage.type === 'depart' && pointage.sortieAnticipee) {
        status = "Sortie anticipée";
        variant = "warning";
      }

      return <Badge variant={variant}>{status}</Badge>;
    },
  }
]; 