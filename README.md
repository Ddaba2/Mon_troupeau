# Mon Troupeau

Application mobile de gestion d'élevage de moutons, pensée pour les petits et moyens éleveurs au Mali. Fonctionne **hors ligne**, avec synchronisation optionnelle vers un serveur distant.

Le cahier des charges complet se trouve dans [`cahier_des_charges.md`](cahier_des_charges.md) à la racine du dépôt.

## Origine du projet

Cette application est née de la transformation d'une app existante de gestion d'élevage de **pigeons** (React + Capacitor). La stack et l'architecture ont été conservées à l'identique ; c'est le domaine métier qui a été entièrement remplacé (couples/œufs/pigeonneaux → moutons). Ce choix a permis de réutiliser telle quelle toute l'infrastructure générique : authentification par PIN, gestion des rôles, base SQLite hors-ligne, export PDF/JSON, notifications locales, synchronisation.

## Stack technique

- **React 18** + **TypeScript**
- **Capacitor 6** — packaging natif Android (et compatible iOS)
- **Vite** — bundler / serveur de dev
- **Tailwind CSS** — styles
- **SQLite** en local, avec deux backends selon la plateforme :
  - Navigateur / dev : [`sql.js`](https://github.com/sql-js/sql.js) (WASM), persistance dans `localStorage`
  - Android natif : [`@capacitor-community/sqlite`](https://github.com/capacitor-community/sqlite)
- **jsPDF** — export de rapports PDF
- **@capacitor/local-notifications** — rappels sanitaires natifs (Android/iOS uniquement, non implémenté sur le web)
- **lucide-react** — icônes

Tout le code applicatif vit dans le dossier [`mobile/`](mobile/) (c'est là que se trouvent `package.json`, `src/`, `android/`, etc.).

## Structure du projet

```
Moutons/
├── cahier_des_charges.md      # spécification fonctionnelle d'origine
├── README.md                  # ce fichier
└── mobile/                    # application React + Capacitor
    ├── src/
    │   ├── components/
    │   │   ├── moutons/       # module Troupeau (liste, fiche, formulaire)
    │   │   ├── health/        # module Santé
    │   │   ├── sales/         # ventes (partie "Recettes" des Finances)
    │   │   ├── expenses/      # dépenses
    │   │   ├── finances/      # page Finances (Recettes/Dépenses/Tableau)
    │   │   ├── statistics/    # page Statistiques
    │   │   ├── admin/         # gestion utilisateurs, journal d'activité
    │   │   ├── auth/          # setup initial, connexion, clavier PIN
    │   │   ├── layout/        # navigation basse, bandeau de sync
    │   │   ├── ui/            # composants génériques (modal, skeleton)
    │   │   └── Dashboard.tsx  # tableau de bord (page d'accueil)
    │   ├── context/           # AppContext (stats globales), AuthContext
    │   ├── db/                # DatabaseService (schéma SQL + double backend)
    │   ├── hooks/              # useDarkMode, useNetwork, usePermissions
    │   ├── services/          # accès aux données + logique métier par domaine
    │   ├── types/              # types TypeScript partagés
    │   └── utils/               # crypto (PIN), export PDF/JSON
    ├── android/                # projet Android généré par Capacitor
    ├── public/                 # assets statiques (logo, wasm sqlite)
    └── capacitor.config.ts     # configuration Capacitor (nom d'app, plugins)
```

## Fonctionnalités

### Tableau de bord (page d'accueil)
- **Bloc Troupeau** : total de moutons, mâles, femelles, adultes, jeunes, répartition par race
- **Bloc Santé** : traitements réalisés aujourd'hui, rappels prévus, moutons nécessitant une intervention
- **Bloc Finances** : recettes du mois, dépenses du mois, solde actuel (cumulé)
- **Activités récentes** : les 6 derniers événements du journal d'activité (ajout/modif mouton, vente, soin, dépense, connexion/déconnexion…)
- Alerte des rappels sanitaires en attente, actions rapides vers les autres modules

### Gestion du troupeau
- Fiche par mouton : numéro d'identification, nom (facultatif), photo, race, sexe, date de naissance ou âge estimé, couleur, origine (né dans la ferme / acheté), statut (vivant / vendu / décédé)
- Recherche (numéro, nom, race, sexe) et filtres (statut, adultes/jeunes — seuil à 12 mois, `ADULT_THRESHOLD_MONTHS` dans `MoutonsList.tsx`)
- Fiche individuelle avec onglets **Infos**, **Santé**, **Finances**, **Historique complet**

### Santé
- Interventions : vaccination, vermifuge, injection, vitamines, consultation, traitement, autre
- Champs : date, produit, quantité, coût, observation, date de prochaine intervention
- Ciblage par mouton précis ou par tout le troupeau
- Recherche, filtres par type/période, mise en évidence des rappels en retard

### Finances
Regroupe deux volets sous un même module (accessible depuis l'onglet "Finances") :
- **Recettes** (réutilise le module Ventes) : vente de mouton, vente de fumier, autre revenu — date, client, montant, mode de paiement, observation
- **Dépenses** : catégories achat de moutons / alimentation / médicaments / transport / main-d'œuvre / construction / autre — date, montant, description, mode de paiement, observation
- **Tableau financier** : recettes, dépenses, solde/bénéfice calculés automatiquement, filtrable par période (aujourd'hui, cette semaine, ce mois, cette année)

### Statistiques
- Répartition du troupeau (sexe, âge, race, statut)
- Suivi sanitaire par catégorie
- Revenus par mois, ventes par type, modes de paiement
- Synthèse recettes/dépenses/solde sur une période libre
- Export **JSON** et **PDF** des données complètes

### Notifications
- Génération automatique de rappels locaux à partir des dates de prochaine intervention du module Santé
- Titres différenciés : "Vaccination à effectuer", "Vermifuge à effectuer", "Injection programmée", "Rappel personnalisé" (autres types)
- Activables/désactivables dans Réglages — **fonctionnent uniquement sur Android/iOS natif**, pas dans un navigateur

### Utilisateurs & rôles
Deux modes configurés au premier lancement :
- **Solo** : un seul utilisateur, pas d'écran de connexion
- **Multi-utilisateurs** : chaque personne a un nom + PIN à 4 chiffres, avec un rôle :

| Action | Admin | Gérant | Employé |
|---|---|---|---|
| Ajouter / modifier | ✅ | ✅ | ✅ |
| Supprimer | ✅ | ✅ | ❌ |
| Enregistrer une vente | ✅ | ✅ | ❌ |
| Voir les statistiques | ✅ | ✅ | ❌ |
| Exporter (PDF/JSON) | ✅ | ✅ | ❌ |
| Gérer les utilisateurs | ✅ | ❌ | ❌ |
| Réinitialiser les données | ✅ | ❌ | ❌ |
| Réglages avancés (sync, nom de ferme) | ✅ | ❌ | ❌ |

- Verrouillage de compte après 3 PIN incorrects (5 minutes), déverrouillage manuel possible par un admin
- Journal d'activité complet consultable dans Réglages (admin)

### Synchronisation (optionnelle)
- Push/pull vers une API distante configurable dans Réglages (URL + token)
- Chaque table (`moutons`, `health_records`, `sales`, `expenses`) a un indicateur `synced` et un `server_id`
- Traduction automatique des clés étrangères locales ↔ serveur ; auto-sync au retour de connexion si des données sont en attente

## Modèle de données (SQLite)

| Table | Contenu |
|---|---|
| `users` | comptes utilisateurs (nom, rôle, hash de PIN, verrouillage) |
| `activity_log` | journal des actions (ajouts, ventes, connexions…) |
| `app_settings` | réglages clé/valeur (mode ferme, nom de ferme, préférences) |
| `moutons` | fiche animal complète, y compris cache de vente (`sale_price`, `sale_date`, `buyer_name`) |
| `health_records` | interventions sanitaires, liées à un mouton ou à tout le troupeau |
| `sales` | ventes (mouton / fumier / autre revenu) |
| `expenses` | dépenses par catégorie |

Le schéma exact est défini dans [`src/db/DatabaseService.ts`](mobile/src/db/DatabaseService.ts) ; les types TypeScript correspondants sont dans [`src/types/index.ts`](mobile/src/types/index.ts).

## Installation & développement

```bash
cd mobile
npm install        # installe les dépendances + copie sql-wasm (postinstall)
npm run dev        # serveur de dev Vite, http://localhost:5173
```

En mode navigateur, la base SQLite est un fichier WASM chargé en mémoire et persisté dans `localStorage` (clé `mon_troupeau_mali_v1`) — pratique pour développer/tester sans appareil Android.

## Build & déploiement Android

```bash
npm run build         # tsc + build Vite (dossier dist/)
npm run android:sync  # build + npx cap sync android
npm run android:open  # ouvre le projet dans Android Studio
npm run android:run   # build + sync + lance sur un appareil/émulateur connecté
```

`appId` Android : `com.montroupeau.mali` (défini dans `capacitor.config.ts`, répercuté dans `android/app/build.gradle` et le package Java `android/app/src/main/java/com/montroupeau/mali/`).

Après toute modification touchant `android/` ou `capacitor.config.ts`, relancer `npx cap sync android` puis un *clean build* dans Android Studio.

## Points connus / limites

- **Notifications locales** : non implémentées par Capacitor sur le web ; à tester sur un appareil ou émulateur Android réel.
- **Taille du bundle** : le build Vite signale un chunk JS > 500 Ko (jsPDF + html2canvas essentiellement) — sans impact fonctionnel, un découpage en `manualChunks` pourrait être envisagé si le temps de chargement devient un problème.
- **Mode solo** : un seul compte "Admin" fictif (id `0`) est utilisé, sans PIN — adapté à un éleveur seul qui ne souhaite pas de connexion à chaque ouverture.

## Historique des grandes étapes de la transformation

1. État des lieux du code pigeon et plan de migration
2. Schéma de base de données adapté au métier mouton
3. Module Gestion du troupeau
4. Module Santé
5. Module Finances (Recettes + Dépenses + Tableau financier)
6. Notifications locales adaptées aux 4 catégories de rappels
7. Module Statistiques
8. Tableau de bord conforme au cahier des charges, connecté aux données réelles
9. Passe de nettoyage (identité de l'app, code mort, libellés)#   M o n _ t r o u p e a u  
 