# Guide de vérification de la visibilité des boutons d'annulation

## ✅ Modifications apportées

### 1. **Tenants Detail** (`tenants-detail.component.html`)
- ✅ Bouton "Abandonner" ajouté dans le tableau des locations
- ✅ Condition : `*ngIf="isRentalActive(detail.rental)"`
- ✅ Méthode `isRentalActive()` améliorée pour gérer les locations sans statut (anciennes données)

### 2. **Owners Detail** (`owners-detail.component.html`)
- ✅ Bouton "Expulser" ajouté dans le tableau des appartements
- ✅ Condition : `*ngIf="getStatus(apt) === 'Occupé' && getActiveRentalForApartment(apt.id)"`
- ✅ Méthode `getActiveRental()` améliorée pour gérer les locations sans statut

### 3. **Collectors Detail** (`collectors-detail.component.html`)
- ✅ Bouton "Annuler location" ajouté dans les actions des paiements
- ✅ Condition : `*ngIf="payment.status !== 'paid' && (payment.rentalId || payment.raw?.rentalId) && isRentalActiveForCancellation(...)"`
- ✅ Méthode `isRentalActiveForCancellation()` améliorée pour gérer les locations sans statut

### 4. **Rentals Service** (`rentals.service.ts`)
- ✅ Méthode `getActiveRental()` améliorée pour accepter les locations sans statut
- ✅ Vérification de la date de fin ET du statut

## 🔍 Comment vérifier que les boutons sont visibles

### Pour les Locataires (Tenants)
1. Aller sur la page de détail d'un locataire
2. Aller dans la section "Historique de location"
3. Vérifier que pour chaque location active, il y a un bouton "Abandonner" dans la colonne "Actions"
4. **Condition** : La location doit avoir une date de fin dans le futur OU aujourd'hui

### Pour les Propriétaires (Owners)
1. Aller sur la page de détail d'un propriétaire
2. Sélectionner un bâtiment avec des appartements occupés
3. Aller dans l'onglet "Appartements"
4. Vérifier que pour chaque appartement occupé avec une location active, il y a un bouton "Expulser" dans la colonne "Actions"
5. **Condition** : L'appartement doit avoir un locataire ET une location active

### Pour les Recouvreurs (Collectors)
1. Aller sur la page de détail d'un recouvreur
2. Aller dans la section "Factures et paiements"
3. Vérifier que pour chaque paiement en attente avec une location active, il y a un bouton "Annuler location" dans la colonne "Actions"
4. **Condition** : Le paiement doit être en attente ET avoir une location active

## 🐛 Problèmes possibles et solutions

### Problème 1 : Les boutons ne s'affichent pas
**Cause possible** : Les locations n'ont pas de statut défini ET leur date de fin est dans le passé

**Solution** :
1. Vérifier que les locations ont bien une date de fin dans le futur
2. Vérifier que les locations n'ont pas le statut 'cancelled' ou 'ended'
3. Si les locations n'ont pas de statut, elles doivent avoir une date de fin valide

### Problème 2 : Les boutons ne s'affichent pas pour les anciennes locations
**Cause possible** : Les anciennes locations n'ont pas de statut défini

**Solution** :
- Les méthodes `isRentalActive()` et `getActiveRental()` ont été modifiées pour accepter les locations sans statut
- Une location sans statut est considérée comme active si sa date de fin est dans le futur ou aujourd'hui

### Problème 3 : Les boutons ne s'affichent pas dans le collector
**Cause possible** : Les paiements n'ont pas de `rentalId` défini

**Solution** :
- La méthode `loadCollectorPayments()` ajoute maintenant `rentalId` directement dans l'entrée de paiement
- Vérifier que les recoveries ont bien un `rentalId` défini

## 📋 Checklist de vérification

### Pour tester les boutons d'annulation :

1. **Locataire** :
   - [ ] Aller sur la page de détail d'un locataire
   - [ ] Vérifier qu'il y a des locations dans l'historique
   - [ ] Vérifier que les locations actives ont un bouton "Abandonner"
   - [ ] Cliquer sur "Abandonner" et vérifier que la modale s'affiche

2. **Propriétaire** :
   - [ ] Aller sur la page de détail d'un propriétaire
   - [ ] Sélectionner un bâtiment avec des appartements occupés
   - [ ] Vérifier que les appartements occupés ont un bouton "Expulser"
   - [ ] Cliquer sur "Expulser" et vérifier que la modale s'affiche

3. **Recouvreur** :
   - [ ] Aller sur la page de détail d'un recouvreur
   - [ ] Aller dans la section "Factures et paiements"
   - [ ] Vérifier que les paiements en attente ont un bouton "Annuler location"
   - [ ] Cliquer sur "Annuler location" et vérifier que la modale s'affiche

## 🔧 Debug

### Pour déboguer la visibilité des boutons :

1. **Ouvrir la console du navigateur** (F12)
2. **Vérifier les données** :
   ```javascript
   // Dans la console, pour un locataire
   console.log('Locations:', this.rentalDetails);
   console.log('Location active?', this.isRentalActive(this.rentalDetails[0].rental));
   
   // Pour un propriétaire
   console.log('Appartements:', this.selectedBuildingApartments);
   console.log('Location active?', this.getActiveRentalForApartment(apartmentId));
   
   // Pour un recouvreur
   console.log('Paiements:', this.filteredPayments);
   console.log('Location active?', this.isRentalActiveForCancellation(rentalId));
   ```

3. **Vérifier les conditions** :
   - Les locations doivent avoir une date de fin dans le futur
   - Les locations ne doivent pas avoir le statut 'cancelled' ou 'ended'
   - Les appartements doivent avoir un locataire
   - Les paiements doivent être en attente

## 📝 Notes importantes

1. **Compatibilité avec les anciennes données** :
   - Les locations sans statut sont considérées comme actives si leur date de fin est dans le futur
   - Les locations avec le statut 'active' sont toujours considérées comme actives si leur date de fin est valide

2. **Conservation des données** :
   - Lors de l'annulation, les données de l'ancien occupant sont conservées
   - Seul le statut de l'appartement est mis à jour (de 'rent' à 'free')
   - L'historique de location est conservé

3. **Boutons uniquement sur les pages de détail** :
   - Les boutons d'annulation ne sont PAS visibles sur les pages de liste
   - Les boutons sont uniquement visibles sur les pages de détail

## 🎯 Résultat attendu

- ✅ Les boutons "Abandonner", "Expulser" et "Annuler location" sont visibles sur les pages de détail
- ✅ Les boutons ne sont PAS visibles sur les pages de liste
- ✅ Les boutons s'affichent uniquement pour les locations actives
- ✅ Les données de l'ancien occupant sont conservées après annulation
- ✅ L'appartement est libéré après annulation (statut = 'free')

