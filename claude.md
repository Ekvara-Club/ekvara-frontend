# CLAUDE.md — EKVARA

## 1. Rôle de ce fichier

Ce fichier contient le contexte permanent du projet EKVARA.

Il doit être lu avant toute modification du backend ou du frontend.

Les demandes ponctuelles données dans le chat complètent ce fichier mais ne doivent pas conduire à modifier l'architecture générale sans justification.

Avant de coder :

1. inspecter l'existant ;
2. réutiliser les patterns déjà présents ;
3. vérifier le schéma Prisma et les endpoints existants ;
4. éviter toute duplication ;
5. rester strictement dans le périmètre demandé.

Ne jamais inventer un endpoint, un champ, une règle métier ou une structure de données sans avoir vérifié l'existant.

# 2. Produit

EKVARA est une application web de suivi sportif orientée Taekwondo.

L'objectif du MVP est de permettre à un athlète de centraliser :

- son dashboard ;
- ses entraînements ;
- ses compétitions ;
- ses objectifs ;
- son poids ;
- ses métriques physiques et techniques ;
- sa progression ;
- son passeport sportif ;
- son palmarès ;
- une bibliothèque d'exercices.

Le produit est actuellement centré sur l'ATHLÈTE.

Les fonctionnalités coach, club avancé, groupes, analytics complexes, IA, abonnements et automatisations sont hors MVP sauf demande explicite.

# 3. Philosophie de développement

Priorités :

1. simplicité ;
2. fiabilité ;
3. cohérence avec l'existant ;
4. typage strict ;
5. tests ;
6. UX claire ;
7. optimisation uniquement lorsqu'elle devient nécessaire.

Toujours préférer la solution minimale qui répond réellement au besoin.

Ne pas faire d'over-engineering.

Ne pas ajouter :

- nouvelle table ;
- nouvelle migration ;
- nouvelle dépendance ;
- nouvel endpoint ;
- nouvel enum ;
- nouvelle abstraction ;
- nouveau module ;

si l'existant permet déjà de résoudre proprement le problème.

Ne jamais refactorer une partie non concernée uniquement pour la rendre "plus propre".

# 4. Repositories locaux

Backend :

/Users/kais/Dev/EkvaraBackend

Frontend :

/Users/kais/Dev/EkvaraFrontend

Toujours vérifier dans quel repository la tâche doit être réalisée avant de modifier quoi que ce soit.

# 5. Stack backend

Backend :

- Node.js
- NestJS
- TypeScript
- Prisma
- PostgreSQL
- Jest
- Supertest
- class-validator
- JWT
- cookie HttpOnly

Architecture habituelle :

Controller
→ Service
→ Repository
→ Prisma
→ PostgreSQL

Respecter cette séparation.

Controller :

- HTTP ;
- paramètres ;
- validation ;
- guards ;
- codes de réponse.

Service :

- règles métier ;
- orchestration ;
- transformations.

Repository :

- accès Prisma ;
- requêtes DB ;
- aucun comportement HTTP.

Éviter d'accéder directement à Prisma depuis les controllers.

# 6. Stack frontend

Frontend :

- React
- TypeScript
- Vite
- Tailwind CSS
- fetch natif

Pas de grosse librairie UI.

Pas de nouvelle dépendance sans nécessité réelle.

Le routage actuel est volontairement minimal et utilise :

- window.history.pushState
- popstate
- pathname

Ne pas ajouter react-router-dom uniquement pour quelques routes tant que cela n'est pas nécessaire.

Architecture habituelle :

Page
→ service API
→ backend

Les composants visuels doivent autant que possible rester présentationnels.

Un composant de card ne doit pas effectuer son propre fetch si la page peut lui fournir les données par props.

# 7. Authentification

L'application possède maintenant une vraie authentification.

Ne jamais revenir à un athleteId codé en dur.

Le frontend utilise :

AuthProvider
useAuth()

L'athlète courant vient de :

useAuth().athlete

Toutes les requêtes métier liées à l'athlète doivent utiliser :

athlete.id

Il ne doit plus exister de :

VITE_DEV_ATHLETE_ID

dans le frontend.

## Backend auth

Authentification JWT via cookie HttpOnly.

Le secret JWT est obligatoire au démarrage.

Les routes privées utilisent :

JwtAuthGuard

Les routes appartenant à un athlète utilisent également :

AthleteOwnershipGuard

Pattern :

@UseGuards(JwtAuthGuard, AthleteOwnershipGuard)

## Frontend auth

Les appels authentifiés utilisent :

credentials: "include"

Un 401 métier doit déclencher le mécanisme centralisé existant :

notifyUnauthorized()

AuthContext nettoie alors la session et l'application redirige vers /login.

IMPORTANT :

401
→ session invalide
→ déconnexion / redirection login

403
→ utilisateur connecté mais accès interdit
→ NE PAS déconnecter automatiquement.

Ne jamais exposer ou essayer de lire le cookie HttpOnly côté JavaScript.

# 8. Utilisateur / Athlete

Le compte applicatif repose sur :

app_user

et le profil sportif sur :

athlete

`/auth/me` renvoie actuellement directement la structure athlete avec sa relation app_user.

La forme est proche de :

{
"id": "...",
"user_id": "...",
"club_id": null,
"categorie_age": null,
"...": "...",
"club": null,
"app_user": {
"id": "...",
"email": "...",
"nom": "...",
"prenom": "...",
"langue": "fr"
}
}

Ne pas inventer une autre forme sans modifier explicitement le contrat backend.

# 9. Dashboard

Le dashboard principal existe.

Il contient actuellement :

- CompetitionCard
- NextTrainingCard
- WeightCard
- GoalCard
- ProgressCard

Chaque domaine charge ses propres données.

Endpoints principaux :

GET /athletes/:athleteId/competitions/next

GET /athletes/:athleteId/trainings/next

GET /athletes/:athleteId/weight-summary

GET /athletes/:athleteId/goals/active

GET /athletes/:athleteId/progress/highlights

Les cards gèrent généralement :

- loading ;
- success ;
- empty ;
- error.

Une erreur sur une card ne doit pas casser tout le dashboard.

# 10. Compétitions

Le projet possède un catalogue global de compétitions.

Sources déjà implémentées :

- FFTDA
- World Taekwondo

Import FFTDA et World Taekwondo déjà existants.

Le modèle competition possède notamment :

- nom
- organisateur
- source
- source_external_id
- date_debut
- date_fin
- lieu
- pays
- niveau
- etc.

IMPORTANT :

competition.date_debut et date_fin sont des DATE métier, pas des timestamps d'entraînement.

Côté frontend, éviter :

new Date(dateOnlyString)

lorsqu'un décalage timezone pourrait changer le jour.

Utiliser le pattern existant de parsing date-only :

slice(0, 10)
→ split("-")
→ Date locale.

# 11. Participations

La relation athlète ↔ compétition passe par :

participation

Une compétition globale ne signifie pas automatiquement qu'un athlète y participe.

Endpoints existants :

POST /athletes/:athleteId/competitions/:competitionId/participate

GET /athletes/:athleteId/competitions

GET /athletes/:athleteId/competitions/next

PATCH /athletes/:athleteId/competitions/:competitionId/result

Statuts inactifs actuellement conventionnés :

- annule
- retire

## Résultats de compétition

Les champs existants sont :

- classement
- medaille
- victoires
- defaites
- points_gagnes

Le PATCH résultat ne doit actuellement modifier que :

- classement
- medaille
- victoires
- defaites

Ne pas modifier automatiquement :

- statut
- points_gagnes
- categorie_poids
- categorie_age

### Médaille

Valeurs métier actuelles :

- "or"
- "argent"
- "bronze"
- null

Distinction IMPORTANTE :

champ absent
→ ne pas modifier la médaille

medaille: "bronze"
→ enregistrer bronze

medaille: null
→ retirer la médaille

Ne jamais transformer `null` en `undefined`.

`medaille: null` compte comme un champ explicitement fourni pour la validation du PATCH.

### Résultat temporel

Un résultat ne peut être renseigné qu'après la fin de la compétition.

Date effective :

competition.date_fin ?? competition.date_debut

La compétition doit être strictement terminée.

Une compétition multi-jours encore en cours ne peut pas recevoir son résultat final.

# 12. Poids

Module weights déjà existant.

Concepts :

weight_log
weight_target

Endpoints utilisés notamment :

POST /athletes/:athleteId/weights

POST /athletes/:athleteId/weight-targets

GET /athletes/:athleteId/weight-summary

Le résumé expose notamment :

- currentWeight
- measuredAt
- target
- differenceToTarget
- weeklyChange

## weeklyChange

La référence est :

mesure actuelle
→ cutoff = date actuelle - 7 jours
→ dernière mesure avec date_mesure <= cutoff

Pas de mesure suffisamment ancienne :
→ weeklyChange = null

Le calcul est effectué à la lecture, jamais stocké.

# 13. Goals

Module goals déjà existant.

Concepts :

athlete_goal
goal_step

Endpoint dashboard :

GET /athletes/:athleteId/goals/active

La progression est dérivée des étapes :

completed
total
percentage

Les étapes possèdent notamment :

- titre
- ordre
- completed

L'objectif actif privilégie la date cible la plus proche.

Les objectifs sans date passent après les objectifs datés.

# 14. Metrics / Progression

Tables :

metric_type
metric_measurement

## metric_type

Possède notamment :

- code
- nom
- unite
- description
- improvement_direction

Valeurs de direction actuelles :

higher
lower

`improvement_direction` est nullable.

Exemples actuels :

endurance
→ higher

force
→ higher

souplesse
→ higher

technique
→ higher

temps_reaction
→ lower

vitesse
→ higher

## Comparaison

Toujours comparer les deux mesures les plus récentes selon :

mesure_le

et PAS :

created_at

Cas :

aucune mesure
→ unknown

une seule mesure
→ unknown

direction inconnue
→ unknown

valeur identique
→ stable

amélioration
→ improved

régression
→ regressed

Pourcentage :

higher :

((current - previous) / previous) \* 100

lower :

((previous - current) / previous) \* 100

Si previous === 0 :

percentage = null

Le pourcentage est calculé à la lecture et jamais persisté.

## Endpoints

GET /athletes/:athleteId/progress/highlights

→ uniquement les métriques améliorées.

GET /athletes/:athleteId/metrics/overview

→ toutes les métriques, y compris :

- improved
- stable
- regressed
- unknown

Ne jamais déterminer une amélioration uniquement à partir du signe brut de delta.

Exemple :

temps de réaction :
420 ms → 380 ms

delta brut = -40

mais :

status = improved

et percentage positif.

# 15. Trainings

Modèle :

training_session

Champs importants :

- athlete_id
- titre
- type_seance
- sous_type
- date_debut
- date_fin
- lieu
- niveau
- description
- statut

Une ligne représente actuellement une séance d'un athlète.

Pas de système de groupes pour le MVP.

Endpoints :

POST /athletes/:athleteId/trainings

GET /athletes/:athleteId/trainings

GET /athletes/:athleteId/trainings/next

GET trainings accepte également :

?from=...
&to=...

Les deux paramètres doivent être fournis ensemble.

Les bornes sont inclusives.

## Prochain entraînement

Une séance future est éligible.

Une séance commencée avec date_fin future reste éligible.

Une séance commencée sans date_fin est considérée passée pour cette logique.

Les séances avec statut :

annule

sont exclues du prochain entraînement.

# 16. Page Activité

Route :

/activite

La page contient :

- navigation par semaine ;
- grille semaine desktop ;
- liste verticale mobile ;
- entraînements ;
- section compétitions ;
- ajout d'entraînement ;
- ajout de compétition.

## Navigation semaine

Le frontend calcule :

- lundi ;
- dimanche ;
- jours de la semaine.

Puis appelle :

GET /athletes/:athleteId/trainings?from=...&to=...

Les compétitions sont chargées séparément.

Ne pas créer une table ou un endpoint générique `activities` sans besoin explicite.

## Ajouter un entraînement

Utilise :

POST /athletes/:athleteId/trainings

Après création :

→ fermer la modal
→ recharger les entraînements
→ pas de window.location.reload()

## Ajouter une compétition

Le flux utilise :

GET /competitions

puis :

POST /athletes/:athleteId/competitions/:competitionId/participate

Il ne crée PAS une nouvelle compétition manuellement.

Les compétitions déjà ajoutées doivent être exclues du catalogue autant que possible.

Le 409 backend reste le filet de sécurité.

# 17. Exercises

Table :

exercise

Catalogue global.

Champs :

- id
- titre
- type_exercice
- panel_technique
- niveau
- description
- video_url
- gratuit

Endpoints :

GET /exercises

GET /exercises/:id

Protection :

JwtAuthGuard uniquement.

Pas d'AthleteOwnershipGuard car le catalogue est global.

## Seed

Le catalogue de développement contient actuellement 8 exercices.

Le seed est idempotent.

Script :

npm run seed:exercises

Ne pas inventer de video_url.

Si video_url est null :

→ ne pas afficher de lecteur vidéo.

## Frontend Exercises

Route :

/exercices

Recherche effectuée côté frontend.

La recherche doit être insensible :

- à la casse ;
- aux accents.

Exemple :

"reaction"

doit trouver :

"réaction"

Filtres principaux :

- type_exercice
- niveau

La fiche exercice utilise une modal et les données déjà chargées.

Ne pas effectuer un deuxième GET /exercises/:id uniquement pour ouvrir la modal si les données nécessaires sont déjà présentes.

# 18. Passeport sportif

Route :

/passeport

Accessible depuis le menu profil.

La page contient :

- profil athlète ;
- statistiques carrière ;
- progression ;
- palmarès.

Sources :

useAuth()

GET /athletes/:athleteId/competitions

GET /athletes/:athleteId/metrics/overview

## Statistiques carrière

Calculées côté frontend à partir des participations.

Pas de statistiques stockées en base.

Une compétition est considérée disputée lorsque :

1. elle est passée ;

ET

2. elle possède un signal de résultat.

Signal résultat actuel :

classement !== null

OU

medaille !== null

OU

victoires > 0

OU

defaites > 0

`points_gagnes` n'est actuellement pas utilisé dans cette règle.

Stats calculées :

- compétitions disputées ;
- victoires ;
- défaites ;
- podiums.

Podium :

classement entre 1 et 3

OU

medaille non nulle.

## Palmarès

Afficher uniquement les compétitions passées.

Si aucun résultat :

"Résultat non renseigné"

Ne jamais inventer de résultat.

## Saisie résultat

Le Passeport permet de renseigner ou modifier un résultat via :

CompetitionResultModal

Après sauvegarde :

→ recharger les participations
→ recalculer immédiatement statistiques + palmarès
→ pas de reload complet.

# 19. Exercices et vidéos

Pour le MVP :

video_url est un lien externe.

Pas de :

- stockage vidéo ;
- upload vidéo ;
- CDN vidéo ;
- transcodage ;
- infrastructure média.

Si une vraie vidéo est fournie plus tard, utiliser une intégration adaptée à la plateforme.

Ne jamais inventer une URL de vidéo pour remplir le catalogue.

# 20. Dates et fuseaux horaires

ATTENTION : deux types de dates coexistent.

## training_session

date_debut/date_fin :

timestamps avec heure.

Frontend :

new Date(iso)

est approprié pour afficher l'heure locale.

## competition

date_debut/date_fin :

DATE métier.

Ne pas les traiter naïvement comme des timestamps UTC si cela risque de changer le jour affiché.

Réutiliser les helpers/date parsing déjà présents.

# 21. Prisma / migrations

Le projet est maintenant géré par Prisma Migrate.

Une baseline a été créée pour adopter une base PostgreSQL existante.

Migration baseline :

20260818194845_init

Elle a été marquée comme déjà appliquée et n'a pas recréé la base.

Première migration réellement appliquée après baseline :

20260818194925_add_metric_type_improvement_direction

IMPORTANT :

Ne jamais :

- reset la DB ;
- supprimer les données ;
- recréer le schéma ;
- lancer une migration destructive ;
- utiliser db push aveuglément ;

sans demande explicite.

Avant toute modification Prisma :

1. inspecter schema.prisma ;
2. vérifier si la modification est réellement nécessaire ;
3. privilégier une migration additive ;
4. expliquer le changement ;
5. vérifier les données existantes.

# 22. Données de développement

Il existe plusieurs données de développement utiles.

Ne jamais supprimer ou réinitialiser automatiquement les données existantes pour faire passer un test.

Les tests d'intégration doivent nettoyer uniquement leurs propres données.

Une participation Belgian Open est utilisée comme donnée de développement pour tester le Palmarès.

État de référence actuel :

- classement : 3
- médaille : bronze
- victoires : 3
- défaites : 1
- statut : inscrit
- points_gagnes : 0

Si un test manuel modifie cette donnée, la remettre dans cet état à la fin sauf instruction contraire.

# 23. Tests backend

Le projet possède :

- tests unitaires ;
- tests HTTP avec Supertest ;
- tests d'intégration PostgreSQL réelle.

Quand une règle dépend réellement d'une requête Prisma :

- tri ;
- filtre ;
- nulls ;
- contraintes ;
- update partiel ;
- comportement SQL ;

préférer un test d'intégration réel plutôt que prétendre qu'un mock valide cette logique.

Avant de considérer une tâche backend terminée :

npm test

puis :

npm run build

Aucune régression existante n'est acceptable.

# 24. Build frontend

Avant de considérer une tâche frontend terminée :

npm run build

Le build TypeScript doit réussir sans erreur.

Éviter `any`.

Créer des types correspondant aux réponses API réellement observées.

Ne pas inventer une réponse camelCase si le backend renvoie du snake_case.

# 25. Tests réels

Lorsque pertinent, tester réellement :

Frontend
→ HTTP
→ NestJS
→ Prisma
→ PostgreSQL

Ne pas affirmer :

"fonctionne"

uniquement parce que TypeScript compile.

Pour une fonctionnalité API importante, vérifier idéalement :

- cas nominal ;
- empty ;
- validation ;
- auth ;
- erreur ;
- persistance réelle si pertinente.

# 26. Gestion des erreurs frontend

Les erreurs doivent rester locales autant que possible.

Exemple :

une card dashboard échoue
→ la card affiche son erreur
→ le dashboard reste utilisable.

Ne jamais afficher à l'utilisateur :

- stack trace ;
- erreur Prisma brute ;
- erreur Nest interne ;
- message réseau technique type "Failed to fetch"

si un message utilisateur propre peut être affiché.

Les erreurs métier backend propres peuvent être affichées lorsqu'elles sont destinées à l'utilisateur.

# 27. Conventions frontend

Réutiliser les patterns existants.

Cards :

- présentationnelles ;
- props ;
- loading ;
- empty ;
- error ;
- success.

Pages :

- orchestration ;
- fetch ;
- état ;
- navigation.

Services :

- appels HTTP ;
- types stricts ;
- credentials include ;
- gestion centralisée du 401.

Ne pas utiliser window.location.reload() pour rafraîchir une donnée.

Après une mutation :

→ rappeler la fonction de chargement concernée.

# 28. Responsive

Le produit doit fonctionner desktop ET mobile.

Pattern général Tailwind :

mobile-first.

Exemples :

grid-cols-1
sm:grid-cols-2
md:grid-cols-...
lg:grid-cols-...

Ne pas créer une deuxième page mobile.

Les mêmes données et composants doivent être réutilisés.

# 29. Sécurité

Ne jamais faire confiance à athleteId uniquement parce qu'il vient du frontend.

Les routes athlete-scoped doivent conserver :

JwtAuthGuard

- AthleteOwnershipGuard

Ne jamais contourner les guards pour faciliter un test.

Ne jamais exposer :

- password_hash ;
- JWT_SECRET ;
- cookie d'auth ;
- informations internes inutiles.

# 30. Règles métier générales

Ne jamais utiliser un test truthy lorsque 0, null et undefined ont des significations différentes.

Exemples critiques :

victoires = 0
→ valeur valide

defaites = 0
→ valeur valide

medaille = null
→ demande explicite de suppression

medaille = undefined / champ absent
→ ne pas modifier

Toujours utiliser des comparaisons explicites.

# 31. Ce qui est volontairement repoussé

Sauf demande explicite, ne pas construire maintenant :

- application mobile native ;
- groupes complexes ;
- séances multi-athlètes ;
- back-office coach complet ;
- rôles avancés ;
- calendrier mensuel complexe ;
- drag & drop ;
- récurrence d'entraînements ;
- notifications ;
- synchronisation Google/Apple Calendar ;
- analytics avancés ;
- radar complexe ;
- recommandations IA ;
- génération IA d'entraînements ;
- favoris exercices ;
- commentaires exercices ;
- upload vidéo ;
- abonnement/paiement ;
- marketplace ;
- table Activity générique ;
- création manuelle de compétition ;
- architecture microservices.

# 32. Méthode obligatoire avant une nouvelle fonctionnalité

Pour une fonctionnalité non triviale, commencer par inspecter :

1. schema.prisma ;
2. modules backend concernés ;
3. DTO existants ;
4. repositories ;
5. services ;
6. controllers ;
7. tests ;
8. types frontend ;
9. services API frontend ;
10. composants/pages existants.

Puis déterminer :

- ce qui existe déjà ;
- ce qui peut être réutilisé ;
- ce qui manque réellement ;
- si Prisma doit être modifié ;
- si un nouvel endpoint est réellement nécessaire.

Ne jamais commencer directement par créer des fichiers si une analyse préalable peut éviter une mauvaise décision.

# 33. Lorsqu'une tâche demande uniquement une analyse

Si le prompt contient :

"NE CODE RIEN"

ou indique explicitement une tâche d'analyse :

NE MODIFIER AUCUN FICHIER.

Ne pas :

- créer ;
- supprimer ;
- renommer ;
- migrer ;
- seeder ;
- formater automatiquement.

Retourner uniquement :

- constat ;
- architecture existante ;
- recommandations ;
- risques ;
- modification minimale éventuelle.

# 34. Rapport après implémentation

À la fin d'une tâche, donner un rapport factuel.

Inclure selon le cas :

- fichiers créés ;
- fichiers modifiés ;
- endpoint(s) ;
- payload(s) ;
- forme de réponse ;
- règle métier implémentée ;
- tests ;
- build ;
- test réel ;
- données réellement observées ;
- problèmes rencontrés ;
- décisions prises ;
- limites restantes.

Ne jamais dire qu'un comportement a été testé réellement s'il ne l'a pas été.

Distinguer :

- vérifié par lecture du code ;
- couvert par test unitaire ;
- couvert par test HTTP ;
- couvert par intégration PostgreSQL ;
- testé manuellement dans le navigateur.

# 35. État actuel fonctionnel du MVP

Fonctionnel actuellement :

AUTH

- inscription
- connexion
- session HttpOnly
- /auth/me
- logout
- ownership

DASHBOARD

- prochaine compétition
- prochain entraînement
- poids
- objectif
- progression

ACTIVITÉ

- semaine
- entraînements
- navigation semaine
- ajout entraînement
- compétitions
- ajout participation compétition

COMPÉTITIONS

- catalogue
- imports FFTDA
- imports World Taekwondo
- participations
- résultat de compétition

POIDS

- pesées
- objectif
- résumé
- évolution hebdomadaire

OBJECTIFS

- objectifs
- étapes
- progression

MÉTRIQUES

- mesures
- polarité higher/lower
- highlights
- overview

EXERCICES

- catalogue
- recherche
- filtres
- fiche

PASSEPORT

- profil
- statistiques carrière
- progression
- palmarès
- saisie/modification résultat

# 36. Principe final

EKVARA est encore un MVP.

Avant d'ajouter quelque chose, toujours se demander :

"Est-ce nécessaire pour répondre au besoin utilisateur actuel ?"

Si non :
ne pas le construire.

Si une solution simple et cohérente avec l'existant fonctionne :
la préférer.

Si une décision importante n'est pas déterminable à partir du code, du schéma ou du ticket :
la signaler clairement plutôt que l'inventer.
