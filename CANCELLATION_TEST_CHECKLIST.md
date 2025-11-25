# Checklist de test - Logique d'annulation de location

## ✅ Vérifications effectuées

### 1. Pages de liste (PAS de boutons d'annulation)
- ✅ `tenants.component.html` - Aucun bouton d'annulation
- ✅ `owners.component.html` - Aucun bouton d'annulation  
- ✅ `collectors.component.html` - Aucun bouton d'annulation
- ✅ `rentals.component.html` - Aucun bouton d'annulation

### 2. Pages de détail (Boutons d'annulation présents)

#### 2.1 Tenant Detail (`tenants-detail.component.html`)
- ✅ Modal d'abandon avec conditions d'abandon
- ✅ Bouton "Abandonner" dans le tableau des locations
- ✅ Condition: `*ngIf="isRentalActive(detail.rental) && detail.rental?.status !== 'cancelled'"`
- ✅ Méthode: `openAbandonmentModal(rental)`
- ✅ Validation: Raison requise + acceptation des conditions

#### 2.2 Owner Detail (`owners-detail.component.html`)
- ✅ Modal d'expulsion avec informations sur l'expulsion
- ✅ Bouton "Expulser" dans le tableau des appartements
- ✅ Condition: `*ngIf="getStatus(apt) === 'Occupé' && getActiveRentalForApartment(apt.id)"`
- ✅ Méthode: `openEvictionModal(apartment)`
- ✅ Validation: Raison requise + acceptation des conditions

#### 2.3 Collector Detail (`collectors-detail.component.html`)
- ✅ Modal d'annulation avec informations sur l'annulation
- ✅ Bouton "Annuler location" dans les actions des paiements
- ✅ Condition: `*ngIf="payment.status !== 'paid' && (payment.rentalId || payment.raw?.rentalId) && isRentalActiveForCancellation(...)"`
- ✅ Méthode: `openCancellationModal(rentalId)`
- ✅ Validation: Raison requise + acceptation des conditions

#### 2.4 Rental Detail (`rentals-detail.component.html`)
- ✅ Modal d'annulation admin avec informations sur la location
- ✅ Bouton d'annulation dans le header (bouton avec icône)
- ✅ Condition: `*ngIf="rental?.status === 'active'"`
- ✅ Méthode: `openAdminCancellationModal()`
- ✅ Affichage du statut de la location avec badge
- ✅ Affichage de la raison d'annulation si annulée

### 3. Services (`rentals.service.ts`)
- ✅ Interface `Rental` étendue avec champs d'annulation
- ✅ Méthode `cancelRentalByTenantAbandonment()` - Annulation par abandon
- ✅ Méthode `cancelRentalByOwnerEviction()` - Annulation par expulsion
- ✅ Méthode `cancelRentalByCollector()` - Annulation par recouvreur
- ✅ Méthode `cancelRentalByAdmin()` - Annulation par admin
- ✅ Vérifications de sécurité (propriétaire, recouvreur, etc.)
- ✅ Libération automatique de l'appartement
- ✅ Mise à jour des statuts

## 🧪 Tests à effectuer

### Test 1: Abandon par locataire
1. Aller sur la page de détail d'un locataire
2. Vérifier que le bouton "Abandonner" est visible pour les locations actives
3. Cliquer sur "Abandonner"
4. Vérifier que la modal s'affiche avec les conditions d'abandon
5. Remplir la raison et accepter les conditions
6. Confirmer l'abandon
7. Vérifier que la location est annulée (statut = 'cancelled', type = 'tenant_abandonment')
8. Vérifier que l'appartement est libéré (status = 'free')
9. Vérifier que le bouton "Abandonner" disparaît

### Test 2: Expulsion par propriétaire
1. Aller sur la page de détail d'un propriétaire
2. Sélectionner un bâtiment avec des appartements occupés
3. Vérifier que le bouton "Expulser" est visible pour les appartements occupés
4. Cliquer sur "Expulser"
5. Vérifier que la modal s'affiche avec les informations sur l'expulsion
6. Remplir la raison et accepter les conditions
7. Confirmer l'expulsion
8. Vérifier que la location est annulée (statut = 'cancelled', type = 'owner_eviction')
9. Vérifier que l'appartement est libéré (status = 'free')
10. Vérifier que le bouton "Expulser" disparaît

### Test 3: Annulation par recouvreur
1. Aller sur la page de détail d'un recouvreur
2. Aller dans l'onglet "Factures et paiements"
3. Vérifier que le bouton "Annuler location" est visible pour les paiements en attente
4. Cliquer sur "Annuler location"
5. Vérifier que la modal s'affiche avec les informations sur l'annulation
6. Remplir la raison et accepter les conditions
7. Confirmer l'annulation
8. Vérifier que la location est annulée (statut = 'cancelled', type = 'collector_cancellation')
9. Vérifier que l'appartement est libéré (status = 'free')
10. Vérifier que le bouton "Annuler location" disparaît

### Test 4: Annulation par admin
1. Aller sur la page de détail d'une location
2. Vérifier que le bouton d'annulation est visible dans le header (icône)
3. Cliquer sur le bouton d'annulation
4. Vérifier que la modal s'affiche avec les informations sur la location
5. Remplir la raison
6. Confirmer l'annulation
7. Vérifier que la location est annulée (statut = 'cancelled', type = 'admin_cancellation')
8. Vérifier que l'appartement est libéré (status = 'free')
9. Vérifier que le badge de statut affiche "Annulée (Admin)"
10. Vérifier que le bouton d'annulation disparaît

### Test 5: Vérification des conditions d'affichage
1. Vérifier que les boutons ne sont PAS visibles sur les pages de liste
2. Vérifier que les boutons sont visibles UNIQUEMENT sur les pages de détail
3. Vérifier que les boutons disparaissent après annulation
4. Vérifier que les boutons ne s'affichent pas pour les locations déjà annulées

### Test 6: Vérification des données
1. Vérifier que les champs d'annulation sont sauvegardés dans la location
2. Vérifier que la raison d'annulation est affichée dans les détails
3. Vérifier que le type d'annulation est correctement enregistré
4. Vérifier que la date d'annulation est enregistrée
5. Vérifier que l'appartement est bien libéré après annulation

## 📋 Checklist de vérification visuelle

### Pages de liste
- [ ] `tenants.component.html` - Pas de bouton "Abandonner"
- [ ] `owners.component.html` - Pas de bouton "Expulser"
- [ ] `collectors.component.html` - Pas de bouton "Annuler location"
- [ ] `rentals.component.html` - Pas de bouton d'annulation

### Pages de détail
- [ ] `tenants-detail.component.html` - Bouton "Abandonner" visible pour locations actives
- [ ] `owners-detail.component.html` - Bouton "Expulser" visible pour appartements occupés
- [ ] `collectors-detail.component.html` - Bouton "Annuler location" visible pour paiements en attente
- [ ] `rentals-detail.component.html` - Bouton d'annulation visible dans le header pour locations actives

### Modales
- [ ] Modal d'abandon s'affiche correctement
- [ ] Modal d'expulsion s'affiche correctement
- [ ] Modal d'annulation recouvreur s'affiche correctement
- [ ] Modal d'annulation admin s'affiche correctement
- [ ] Toutes les modales ont les champs de validation requis

### Statuts
- [ ] Le statut de la location est affiché correctement
- [ ] Le type d'annulation est affiché correctement
- [ ] La raison d'annulation est affichée si présente
- [ ] La date d'annulation est affichée si présente

## 🐛 Problèmes potentiels à vérifier

1. **Collector Detail**: Vérifier que `payment.raw?.rentalId` ou `payment.rentalId` existe toujours
2. **Owner Detail**: Vérifier que `getActiveRentalForApartment()` retourne bien la location active
3. **Tenant Detail**: Vérifier que `isRentalActive()` fonctionne correctement
4. **Rental Detail**: Vérifier que le statut est bien affiché et mis à jour

## ✅ Résultat attendu

- Tous les boutons d'annulation sont visibles uniquement sur les pages de détail
- Aucun bouton d'annulation n'est visible sur les pages de liste
- Les modales s'affichent correctement avec toutes les informations
- Les validations fonctionnent correctement
- Les locations sont bien annulées avec les bonnes informations
- Les appartements sont bien libérés après annulation
- Les statuts sont correctement mis à jour et affichés

