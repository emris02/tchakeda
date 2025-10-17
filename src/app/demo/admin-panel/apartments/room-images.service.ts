import { Injectable } from '@angular/core';

export interface RoomType {
  label: string;
  image: string;
  category: string;
  keywords: string[];
}

@Injectable({
  providedIn: 'root'
})
export class RoomImagesService {
  
  // Catégories de pièces pour un meilleur organisation
  private roomCategories = {
    LIVING_SPACES: 'Espaces de vie',
    BEDROOMS: 'Chambres',
    KITCHENS: 'Cuisines',
    BATHROOMS: 'Salles de bain',
    OUTDOOR: 'Extérieurs',
    UTILITY: 'Utilitaires',
    OTHER: 'Autres'
  };

  // Mapping détaillé des types de pièces avec métadonnées
  private roomTypes: RoomType[] = [
    {
      label: 'Chambre',
      image: 'assets/images/rooms/bedroom.jpg',
      category: this.roomCategories.BEDROOMS,
      keywords: ['chambre', 'chambres', 'bedroom', 'chambre principale', 'suite parentale']
    },
    {
      label: 'Chambre d\'amis',
      image: 'assets/images/rooms/guest-bedroom.jpg',
      category: this.roomCategories.BEDROOMS,
      keywords: ['chambre amis', 'chambre invités', 'guest room', 'chambre visiteurs']
    },
    {
      label: 'Salon',
      image: 'assets/images/rooms/living-room.jpg',
      category: this.roomCategories.LIVING_SPACES,
      keywords: ['salon', 'séjour', 'living', 'salle de séjour', 'living room']
    },
    {
      label: 'Salon moderne',
      image: 'assets/images/rooms/modern-living-room.jpg',
      category: this.roomCategories.LIVING_SPACES,
      keywords: ['salon moderne', 'séjour contemporain', 'modern living']
    },
    {
      label: 'Cuisine',
      image: 'assets/images/rooms/kitchen.jpg',
      category: this.roomCategories.KITCHENS,
      keywords: ['cuisine', 'kitchen', 'cuisine équipée', 'coin cuisine']
    },
    {
      label: 'Cuisine moderne',
      image: 'assets/images/rooms/modern-kitchen.jpg',
      category: this.roomCategories.KITCHENS,
      keywords: ['cuisine moderne', 'cuisine contemporaine', 'modern kitchen']
    },
    {
      label: 'Salle de bain',
      image: 'assets/images/rooms/bathroom.jpg',
      category: this.roomCategories.BATHROOMS,
      keywords: ['salle de bain', 'salle de bains', 'bathroom', 'salle d\'eau']
    },
    {
      label: 'Salle de bain moderne',
      image: 'assets/images/rooms/modern-bathroom.jpg',
      category: this.roomCategories.BATHROOMS,
      keywords: ['salle de bain moderne', 'bathroom moderne', 'salle d\'eau contemporaine']
    },
    {
      label: 'Balcon',
      image: 'assets/images/rooms/balcony.jpg',
      category: this.roomCategories.OUTDOOR,
      keywords: ['balcon', 'balcons', 'balcony', 'terrasse balcon']
    },
    {
      label: 'Terrasse',
      image: 'assets/images/rooms/terrace.jpg',
      category: this.roomCategories.OUTDOOR,
      keywords: ['terrasse', 'terrace', 'patio', 'terrasse extérieure']
    },
    {
      label: 'Jardin',
      image: 'assets/images/rooms/garden.jpg',
      category: this.roomCategories.OUTDOOR,
      keywords: ['jardin', 'garden', 'jardin privatif', 'espace vert']
    },
    {
      label: 'Bureau',
      image: 'assets/images/rooms/office.jpg',
      category: this.roomCategories.OTHER,
      keywords: ['bureau', 'office', 'espace travail', 'study room']
    },
    {
      label: 'Garage',
      image: 'assets/images/rooms/garage.jpg',
      category: this.roomCategories.UTILITY,
      keywords: ['garage', 'garages', 'parking', 'box']
    },
    {
      label: 'Cave',
      image: 'assets/images/rooms/cellar.jpg',
      category: this.roomCategories.UTILITY,
      keywords: ['cave', 'cellar', 'sous-sol', 'cave à vin']
    },
    {
      label: 'Grenier',
      image: 'assets/images/rooms/attic.jpg',
      category: this.roomCategories.UTILITY,
      keywords: ['grenier', 'attic', 'combles', 'sous-toit']
    },
    {
      label: 'Buanderie',
      image: 'assets/images/rooms/laundry.jpg',
      category: this.roomCategories.UTILITY,
      keywords: ['buanderie', 'laundry', 'local technique', 'cellier']
    },
    {
      label: 'Dressing',
      image: 'assets/images/rooms/dressing.jpg',
      category: this.roomCategories.BEDROOMS,
      keywords: ['dressing', 'walk-in', 'dressing room', 'penderie']
    },
    {
      label: 'Salle à manger',
      image: 'assets/images/rooms/dining-room.jpg',
      category: this.roomCategories.LIVING_SPACES,
      keywords: ['salle à manger', 'dining', 'salle repas', 'coin repas']
    },
    {
      label: 'Studio',
      image: 'assets/images/rooms/studio.jpg',
      category: this.roomCategories.LIVING_SPACES,
      keywords: ['studio', 'loft', 'atelier', 'studio meublé']
    },
    {
      label: 'Veranda',
      image: 'assets/images/rooms/veranda.jpg',
      category: this.roomCategories.OUTDOOR,
      keywords: ['veranda', 'véranda', 'jardin d\'hiver', 'sunroom']
    }
  ];

  // Images par défaut
  private defaultImages = {
    apartment: 'assets/images/rooms/default-apartment.jpg',
    room: 'assets/images/rooms/default-room.jpg',
    error: 'assets/images/rooms/error-image.jpg'
  };

  // Cache pour les images déjà résolues
  private imageCache = new Map<string, string>();

  constructor() {
    this.preloadImages();
  }

  /**
   * Retourne l'image appropriée pour un type de pièce donné
   */
  getRoomImage(roomLabel: string): string {
    if (!roomLabel) {
      return this.defaultImages.room;
    }

    // Vérifie le cache d'abord
    const cacheKey = roomLabel.toLowerCase().trim();
    if (this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey)!;
    }

    const normalizedLabel = this.normalizeString(roomLabel);
    let bestMatch: RoomType | null = null;
    let bestScore = 0;

    // Recherche la meilleure correspondance
    for (const roomType of this.roomTypes) {
      const score = this.calculateMatchScore(normalizedLabel, roomType);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = roomType;
      }
    }

    // Seuil minimum pour une correspondance acceptable
    const image = bestScore >= 0.3 ? bestMatch?.image : this.defaultImages.room;
    
    // Met en cache le résultat
    this.imageCache.set(cacheKey, image!);
    
    return image!;
  }

  /**
   * Calcule un score de correspondance entre le label et un type de pièce
   */
  private calculateMatchScore(label: string, roomType: RoomType): number {
    let score = 0;
    
    // Vérifie les mots-clés exacts
    for (const keyword of roomType.keywords) {
      const normalizedKeyword = this.normalizeString(keyword);
      
      if (label === normalizedKeyword) {
        score = 1.0; // Correspondance exacte
        break;
      }
      
      if (label.includes(normalizedKeyword) || normalizedKeyword.includes(label)) {
        score = Math.max(score, 0.8); // Correspondance partielle
      }
    }

    // Vérifie la similarité avec le label principal
    const mainLabel = this.normalizeString(roomType.label);
    if (label === mainLabel) {
      score = 1.0;
    } else if (label.includes(mainLabel) || mainLabel.includes(label)) {
      score = Math.max(score, 0.7);
    }

    return score;
  }

  /**
   * Normalise une chaîne pour la comparaison
   */
  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
      .replace(/[^\w\s]/g, ' ') // Remplace la ponctuation par des espaces
      .replace(/\s+/g, ' '); // Supprime les espaces multiples
  }

  /**
   * Retourne l'image par défaut pour un appartement
   */
  getDefaultApartmentImage(): string {
    return this.defaultImages.apartment;
  }

  /**
   * Retourne l'image par défaut pour une pièce
   */
  getDefaultRoomImage(): string {
    return this.defaultImages.room;
  }

  /**
   * Retourne l'image d'erreur
   */
  getErrorImage(): string {
    return this.defaultImages.error;
  }

  /**
   * Vérifie si une image est une image par défaut
   */
  isDefaultImage(imagePath: string): boolean {
    return Object.values(this.defaultImages).includes(imagePath) ||
           imagePath.includes('assets/images/rooms/');
  }

  /**
   * Retourne tous les types de pièces disponibles
   */
  getAvailableRoomTypes(): RoomType[] {
    return [...this.roomTypes];
  }

  /**
   * Retourne les types de pièces par catégorie
   */
  getRoomTypesByCategory(): { [category: string]: RoomType[] } {
    const categorized: { [category: string]: RoomType[] } = {};
    
    this.roomTypes.forEach(roomType => {
      if (!categorized[roomType.category]) {
        categorized[roomType.category] = [];
      }
      categorized[roomType.category].push(roomType);
    });

    return categorized;
  }

  /**
   * Retourne les catégories disponibles
   */
  getRoomCategories(): string[] {
    return Object.values(this.roomCategories);
  }

  /**
   * Recherche des types de pièces par terme
   */
  searchRoomTypes(searchTerm: string): RoomType[] {
    if (!searchTerm) {
      return this.roomTypes;
    }

    const normalizedSearch = this.normalizeString(searchTerm);
    
    return this.roomTypes.filter(roomType => 
      roomType.keywords.some(keyword => 
        this.normalizeString(keyword).includes(normalizedSearch)
      ) ||
      this.normalizeString(roomType.label).includes(normalizedSearch)
    );
  }

  /**
   * Suggère des types de pièces basés sur un label partiel
   */
  suggestRoomTypes(partialLabel: string, limit: number = 5): RoomType[] {
    if (!partialLabel) {
      return this.roomTypes.slice(0, limit);
    }

    const normalizedPartial = this.normalizeString(partialLabel);
    const scoredTypes = this.roomTypes.map(roomType => ({
      roomType,
      score: this.calculateMatchScore(normalizedPartial, roomType)
    }));

    return scoredTypes
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.roomType);
  }

  /**
   * Précharge les images pour de meilleures performances
   */
  private preloadImages(): void {
    const allImages = [
      ...this.roomTypes.map(rt => rt.image),
      ...Object.values(this.defaultImages)
    ];

    const uniqueImages = [...new Set(allImages)];

    uniqueImages.forEach(imageSrc => {
      const img = new Image();
      img.src = imageSrc;
    });
  }

  /**
   * Vérifie si une image existe (pour la gestion d'erreurs)
   */
  async checkImageExists(imagePath: string): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = imagePath;
    });
  }

  /**
   * Retourne l'URL sécurisée d'une image avec fallback
   */
  getSafeImageUrl(imagePath: string, fallbackType: 'room' | 'apartment' | 'error' = 'room'): string {
    if (!imagePath) {
      return this.defaultImages[fallbackType];
    }

    // Vérifie si c'est une URL de données (base64)
    if (imagePath.startsWith('data:')) {
      return imagePath;
    }

    // Vérifie si c'est une URL absolue
    if (imagePath.startsWith('http')) {
      return imagePath;
    }

    // Pour les chemins relatifs, s'assurer qu'ils pointent vers assets
    if (!imagePath.startsWith('assets/') && !imagePath.startsWith('/assets/')) {
      return this.defaultImages[fallbackType];
    }

    return imagePath;
  }

  /**
   * Nettoie le cache des images
   */
  clearCache(): void {
    this.imageCache.clear();
  }

  /**
   * Retourne des statistiques d'utilisation du cache
   */
  getCacheStats(): { size: number; hits: number } {
    // Implémentation basique - à étendre avec un vrai système de tracking
    return {
      size: this.imageCache.size,
      hits: 0 // À implémenter avec un vrai compteur
    };
  }
}