Présentation
1.1 Contexte

La majorité des petits et moyens éleveurs de moutons au Mali gèrent encore leurs élevages à l'aide de cahiers ou uniquement de mémoire.

Cette méthode entraîne plusieurs difficultés :

difficulté à connaître le nombre exact de moutons ;
oubli des traitements sanitaires ;
absence d'historique des animaux ;
mauvaise gestion financière ;
difficulté à analyser les performances de l'élevage.

L'objectif est de développer une application mobile simple permettant de centraliser toutes les informations essentielles d'un élevage.

2. Objectifs
Objectif principal

Permettre à un éleveur de gérer facilement son troupeau depuis son téléphone.

Objectifs spécifiques

L'application devra permettre :

gérer le troupeau ;
enregistrer les informations de chaque mouton ;
suivre les interventions sanitaires ;
recevoir des rappels automatiques ;
enregistrer les ventes ;
enregistrer les dépenses ;
suivre la situation financière ;
consulter rapidement les statistiques du troupeau.
3. Public cible

L'application est destinée :

aux petits éleveurs ;
aux fermes familiales ;
aux exploitations de taille moyenne.
4. Fonctionnalités
Module 1 : Tableau de bord

Le tableau de bord constitue la page d'accueil.

Informations affichées
Troupeau
Nombre total de moutons
Nombre de mâles
Nombre de femelles
Nombre d'adultes
Nombre de jeunes
Répartition par race

Exemple :

Total : 58

Adultes : 37

Jeunes : 21

Mâles : 18

Femelles : 40

Race Locale : 28

Balami : 20

Touabire : 10
Santé

Afficher :

Nombre de traitements réalisés aujourd'hui
Nombre de rappels prévus
Nombre de moutons nécessitant une intervention
Finances

Afficher :

Recettes du mois
Dépenses du mois
Solde actuel
Activités récentes

Exemple

Vaccination de M023

Vente de M011

Ajout d'un nouveau mouton

Achat d'aliments
Module 2 : Gestion du troupeau

Ce module permet de gérer les animaux.

Ajouter un mouton

Informations :

Numéro d'identification
Nom (facultatif)
Photo
Race
Sexe
Date de naissance
Âge estimé (si inconnu)
Couleur
Origine

Origine :

Né dans la ferme
Acheté

Statut :

Vivant
Vendu
Décédé
Modifier un mouton

Toutes les informations doivent être modifiables.

Consulter un mouton

Chaque mouton possède une fiche numérique.

La fiche affiche :

Informations générales

Photo

Historique des soins

Historique financier

Historique complet

Rechercher un mouton

Recherche par :

numéro
nom
race
sexe

Filtres :

adultes
jeunes
vivants
vendus
décédés
Module 3 : Santé

Chaque intervention est enregistrée dans l'historique du mouton.

Types d'intervention

Vaccination

Vermifuge

Injection

Vitamines

Consultation

Traitement

Autre

Informations enregistrées

Date

Produit

Quantité

Coût

Observation

Prochaine intervention

Rappels

L'utilisateur peut programmer un rappel.

Exemple

Injection

Aujourd'hui

↓

Prochaine injection

Dans 30 jours

Les rappels apparaissent automatiquement sur le tableau de bord.

Module 4 : Finances
Recettes

Le système doit permettre d'enregistrer :

Vente de mouton
Vente de fumier
Autres revenus
Vente

Informations :

Date

Client

Montant

Mode de paiement

Observation

Modes de paiement

Espèces

Mobile Money

Virement bancaire

Chèque

Autre

Dépenses

L'utilisateur peut enregistrer :

Achat de moutons
Alimentation
Médicaments
Transport
Main-d'œuvre
Construction
Autres dépenses

Pour chaque dépense :

Date

Montant

Catégorie

Description

Mode de paiement

Observation

Tableau financier

Afficher automatiquement :

Recettes

Dépenses

Solde

Bénéfice

Filtres :

Aujourd'hui

Cette semaine

Ce mois

Cette année

Module 5 : Notifications

L'application doit générer automatiquement des notifications.

Notifications prévues

Vaccination à effectuer

Vermifuge à effectuer

Injection programmée

Rappel personnalisé

5. Workflow général
Connexion
      │
      ▼

Tableau de bord
      │
      ├──────────────┐
      ▼              ▼

Gestion          Santé
du troupeau        │
      │            ▼
      │     Ajouter intervention
      │            │
      │            ▼
      │      Programmer rappel
      │
      ▼
Consulter fiche mouton
      │
      ▼
Historique complet
      │
      ▼
Finances
      │
      ▼
Ajouter recette ou dépense
      │
      ▼
Mise à jour automatique du tableau de bord
6. Workflow de la santé
Choisir un mouton
        │
        ▼

Choisir une intervention

        │
        ▼

Saisir

Produit

Quantité

Coût

Observation

        │
        ▼

Définir un rappel

        │
        ▼

Enregistrement

        │
        ▼

Notification automatique
7. Workflow des ventes
Sélectionner un mouton

        │
        ▼

Saisir le client

        │
        ▼

Saisir le montant

        │
        ▼

Choisir le mode de paiement

        │
        ▼

Validation

        │
        ▼

Ajout dans les recettes
8. Workflow des dépenses
Nouvelle dépense

        │
        ▼

Choisir la catégorie

        │
        ▼

Saisir le montant

        │
        ▼

Choisir le mode de paiement

        │
        ▼

Validation

        │
        ▼

Ajout dans les dépenses
9. Exigences fonctionnelles
Authentification sécurisée.
Gestion CRUD des moutons.
Historique complet de chaque mouton.
Notifications locales.
Recherche rapide.
Tableau de bord dynamique.
Calcul automatique des statistiques.
Calcul automatique des recettes et dépenses.
10. Exigences non fonctionnelles
Interface moderne et intuitive.
Utilisation simple sur smartphone.
Fonctionnement hors ligne avec synchronisation ultérieure (optionnel pour une V2).
Temps de chargement inférieur à 2 secondes.
Sauvegarde sécurisée des données.
Design responsive.
Données organisées et facilement exportables.