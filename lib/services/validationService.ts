import { Pointage } from "../types";

export class ValidationService {
  private static readonly HEURE_MIN_ARRIVEE = 8 * 60 + 25; // 8h25 en minutes
  private static readonly HEURE_MAX_DEPART = 20 * 60 + 30; // 20h30 en minutes
  private static readonly DUREE_TRAVAIL_STANDARD = 8 * 60; // 8h en minutes
  private static readonly DELAI_MINIMUM_ENTRE_POINTAGES = 5 * 60 * 1000; // 5 minutes en millisecondes

  private static getMinutes(date: Date): number {
    return date.getHours() * 60 + date.getMinutes();
  }

  public static validerPointageArrivee(date: Date): { 
    valide: boolean; 
    message: string;
  } {
    const minutes = this.getMinutes(date);

    if (minutes < this.HEURE_MIN_ARRIVEE) {
      return {
        valide: false,
        message: "Le pointage est trop tôt. Veuillez attendre 8h25."
      };
    }

    if (minutes > this.HEURE_MAX_DEPART) {
      return {
        valide: false,
        message: "Le pointage est trop tard. La limite est 20h30."
      };
    }

    return {
      valide: true,
      message: "Pointage d'arrivée valide"
    };
  }

  public static validerPointageDepart(dateDepart: Date, pointageArrivee?: Pointage): { 
    valide: boolean; 
    message: string;
    heuresSupplementaires?: number;
    sortieAnticipee?: boolean;
  } {
    const minutesDepart = this.getMinutes(dateDepart);

    if (minutesDepart > this.HEURE_MAX_DEPART) {
      return {
        valide: false,
        message: "Le pointage est trop tard. La limite est 20h30."
      };
    }

    if (!pointageArrivee) {
      return {
        valide: true,
        message: "Pointage de départ enregistré (pas d'arrivée trouvée)"
      };
    }

    const dateArrivee = new Date(pointageArrivee.date);
    const dureeMinutes = (dateDepart.getTime() - dateArrivee.getTime()) / (1000 * 60);

    // Calculer les heures supplémentaires ou la sortie anticipée
    const difference = dureeMinutes - this.DUREE_TRAVAIL_STANDARD;
    
    if (difference > 0) {
      return {
        valide: true,
        message: `Pointage de départ valide avec ${Math.floor(difference / 60)}h${Math.floor(difference % 60)}m supplémentaires`,
        heuresSupplementaires: difference
      };
    }

    return {
      valide: true,
      message: dureeMinutes < this.DUREE_TRAVAIL_STANDARD 
        ? "Attention : sortie anticipée" 
        : "Pointage de départ valide",
      sortieAnticipee: dureeMinutes < this.DUREE_TRAVAIL_STANDARD
    };
  }

  public static calculerStatutJournee(arrivee?: Pointage, depart?: Pointage): {
    retard: boolean;
    heuresSupplementaires: number;
    sortieAnticipee: boolean;
    dureeMinutes: number;
    retardMinutes: number;
  } {
    if (!arrivee || !depart) {
      return {
        retard: false,
        heuresSupplementaires: 0,
        sortieAnticipee: false,
        dureeMinutes: 0,
        retardMinutes: 0
      };
    }

    const dateArrivee = new Date(arrivee.date);
    const dateDepart = new Date(depart.date);
    const minutesArrivee = this.getMinutes(dateArrivee);
    const dureeMinutes = Math.round((dateDepart.getTime() - dateArrivee.getTime()) / 1000 / 60);

    // Heure normale d'arrivée : 9h00
    const heureNormaleArrivee = new Date(dateArrivee);
    heureNormaleArrivee.setHours(9, 0, 0, 0);

    // Heure normale de départ : 18h00
    const heureNormaleDepart = new Date(dateDepart);
    heureNormaleDepart.setHours(18, 0, 0, 0);

    const retard = dateArrivee > heureNormaleArrivee;
    const sortieAnticipee = dateDepart < heureNormaleDepart;
    const heuresSupplementaires = dateDepart > heureNormaleDepart ? 
      Math.round((dateDepart.getTime() - heureNormaleDepart.getTime()) / 1000 / 60) : 0;

    return {
      dureeMinutes,
      retard,
      sortieAnticipee,
      heuresSupplementaires,
      retardMinutes: retard ? 
        Math.round((dateArrivee.getTime() - heureNormaleArrivee.getTime()) / 1000 / 60) : 0
    };
  }

  static verifierDoublon(
    typePointage: 'arrivee' | 'depart',
    heurePointage: Date,
    pointages: Pointage[]
  ): { valide: boolean; message: string } {
    // Filtrer les pointages du jour
    const pointagesJour = pointages.filter(p => {
      const datePointage = new Date(p.date);
      return (
        datePointage.getDate() === heurePointage.getDate() &&
        datePointage.getMonth() === heurePointage.getMonth() &&
        datePointage.getFullYear() === heurePointage.getFullYear()
      );
    });

    // Vérifier le dernier pointage
    const dernierPointage = pointagesJour[pointagesJour.length - 1];

    // Vérifier le délai minimum entre les pointages
    if (dernierPointage) {
      const dernierPointageDate = new Date(dernierPointage.date);
      const tempsEcoule = heurePointage.getTime() - dernierPointageDate.getTime();

      if (tempsEcoule < this.DELAI_MINIMUM_ENTRE_POINTAGES) {
        return {
          valide: false,
          message: `Veuillez attendre au moins 5 minutes entre deux pointages. Temps restant: ${
            Math.ceil((this.DELAI_MINIMUM_ENTRE_POINTAGES - tempsEcoule) / 1000 / 60)
          } minutes`
        };
      }

      // Vérifier la cohérence des types de pointage
      if (typePointage === 'arrivee') {
        if (dernierPointage.type === 'arrivee') {
          return {
            valide: false,
            message: 'Vous avez déjà pointé votre arrivée aujourd\'hui'
          };
        }
      } else if (typePointage === 'depart') {
        if (dernierPointage.type === 'depart') {
          return {
            valide: false,
            message: 'Vous avez déjà pointé votre départ aujourd\'hui'
          };
        }
        if (pointagesJour.length === 0 || dernierPointage.type !== 'arrivee') {
          return {
            valide: false,
            message: 'Vous devez d\'abord pointer votre arrivée'
          };
        }
      }
    } else if (typePointage === 'depart') {
      return {
        valide: false,
        message: 'Vous devez d\'abord pointer votre arrivée'
      };
    }

    return { valide: true, message: 'Pointage valide' };
  }
} 