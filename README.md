
RESTOPRO Backend

API de gestion d'un restaurant développée avec Django, Django REST
Framework et PostgreSQL.

    Note importante : ce document est basé sur les éléments du projet
    examinés pendant le développement. Les routes du module Dépenses sont
    confirmées par les tests. Les autres préfixes d'URL et les noms exacts
    de certains champs doivent être vérifiés dans config/urls.py, les
    fichiers urls.py et les serializers avant de traiter cette
    documentation comme un contrat API définitif.

Sommaire

    Présentation
    Technologies et applications
    Installation
    Configuration
    Démarrage et migrations
    Authentification et rôles
    Référence des API
    Filtres et codes HTTP
    Tests et qualité
    Sécurité et production
    Compléter la documentation des
    routes

1. Présentation

RESTOPRO centralise les principales opérations d'un restaurant :

    gestion des comptes et des rôles ;
    gestion des catégories et des plats ;
    gestion des clients ;
    création et suivi des commandes ;
    enregistrement, confirmation et remboursement des paiements ;
    émission des factures ;
    suivi des dépenses ;
    tableau de bord et rapports ;
    paramètres du restaurant.

2. Technologies et applications

Technologies identifiées dans le projet :

    Python 3.12 ;
    Django ;
    Django REST Framework (DRF) ;
    PostgreSQL ;
    django-filter.

Applications présentes dans apps/ :

Application Responsabilité

accounts Utilisateurs, authentification et rôles
categories Catégories du menu
menu Plats et disponibilité
customers Clients
orders Commandes et lignes de commande
payments Paiements
invoices Factures
expenses Dépenses
dashboard Indicateurs et rapports
restaurant_settings Paramètres du restaurant

Structure indicative :
backend/
├── config/
│   ├── settings.py
│   └── urls.py
├── apps/
│   ├── accounts/
│   ├── categories/
│   ├── customers/
│   ├── dashboard/
│   ├── expenses/
│   ├── invoices/
│   ├── menu/
│   ├── orders/
│   ├── payments/
│   └── restaurant_settings/
├── manage.py
└── requirements.txt
3. Installation

Prérequis : Python compatible avec le projet, PostgreSQL et pip.

Depuis le dossier backend/ :
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

Si requirements.txt n'existe pas, on peut en générer un depuis
l'environnement de développement :
pip freeze > requirements.txt

Vérifier les versions installées :
python --version
python -m pip show Django djangorestframework django-filter
4. Configuration

Le projet utilise des variables d'environnement pour la connexion
PostgreSQL. Les noms ci-dessous sont des exemples à vérifier dans
config/settings.py :
DB_NAME=restopro_db
DB_USER=restopro_user
DB_PASSWORD=CHANGE_ME
DB_HOST=127.0.0.1
DB_PORT=5432

Selon la configuration, le projet peut également nécessiter
SECRET_KEY, DEBUG, ALLOWED_HOSTS, les paramètres CORS et les
paramètres d'authentification.

Sécurité : ne jamais versionner un vrai mot de passe ou une clé
secrète. Utiliser un fichier .env exclu de Git et fournir un
.env.example avec des valeurs fictives.
5. Démarrage et migrations
python manage.py check
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver

Le serveur de développement est normalement accessible à
http://127.0.0.1:8000/.

Base d'URL utilisée dans les exemples :
http://127.0.0.1:8000
6. Authentification et rôles

Le modèle utilisateur personnalisé définit ces rôles :

Valeur stockée Libellé

ADMIN Administrateur
MANAGER Gestionnaire
CASHIER Caissier

Le champ role est distinct des attributs Django is_staff et
is_superuser. Les permissions sont contrôlées par les vues et les
classes de permission du projet.

Le mécanisme exact d'authentification (JWT, session, token ou autre)
doit être confirmé dans config/settings.py et les routes du module
accounts. Si JWT est activé, un appel protégé utilise généralement :
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
Accept: application/json

Ne pas supposer que JWT est configuré sans vérifier les paramètres du
projet.
7. Référence des API

Les routes marquées « à confirmer » sont des routes indicatives et
doivent être comparées au routeur réellement déclaré dans le projet.
7.1 Dépenses --- expenses

Préfixe confirmé dans les tests : /api/expenses/.

Méthode Route Description

GET /api/expenses/ Liste des dépenses

POST /api/expenses/ Création d'une dépense

GET /api/expenses/{id}/ Détail d'une dépense

PUT / PATCH /api/expenses/{id}/ Modification selon
permissions

DELETE /api/expenses/{id}/ Suppression selon
permissions

GET /api/expenses/summary/ Résumé des dépenses

GET /api/expenses/monthly-summary/ Résumé mensuel
GET /api/expenses/category-summary/ Résumé par catégorie

Les trois routes d'action sont à confirmer dans le routeur et les
décorateurs @action du ViewSet.

Filtres et fonctions de recherche observés dans la vue :

    filtres : category, payment_method, date ;
    recherche sur title et description ;
    tri notamment par date, amount et created_at ;
    paramètres de plage de dates date_from et date_to dans la
    logique de la vue.

Exemple de création :
POST /api/expenses/
Content-Type: application/json
{
  "title": "Achat de gaz",
  "category": "GAS",
  "amount": "15000.00",
  "date": "2026-10-20",
  "description": "Recharge de gaz pour la cuisine",
  "payment_method": "CASH"
}

Le champ created_by est affecté par le serveur à l'utilisateur
authentifié ; il ne doit pas être choisi par le client.

Catégories observées : SUPPLIES, SALARY, ELECTRICITY, WATER,
GAS, RENT, TRANSPORT, MAINTENANCE, OTHER.

Modes de paiement observés : CASH, ORANGE_MONEY, WAVE, BANK,
OTHER.

Les dépenses nécessitent une authentification et la permission
IsAdminOrManager. Le caissier ne doit pas pouvoir les gérer.
7.2 Commandes --- orders

Préfixe indicatif à confirmer : /api/orders/.

Méthode Route indicative Description

GET /api/orders/ Liste des commandes

POST /api/orders/ Création d'une commande

GET /api/orders/{id}/ Détail d'une commande

PATCH /api/orders/{id}/ Modification autorisée
selon règles métier

POST /api/orders/{id}/change-status/ Changement de statut
métier

Les routes doivent être confirmées dans config/urls.py et
apps/orders/urls.py.

Statuts observés : PENDING, PREPARING, READY, SERVED,
CANCELLED.

Types de commande observés : DINE_IN, TAKEAWAY, DELIVERY.

Règles métier observées dans le code discuté :

    numéro automatique de commande au format CMD-YYYYMMDD-XXXXXXXX ;
    lignes de commande conservant le nom du plat et le prix unitaire au
    moment de la commande ;
    calcul du montant total à partir des lignes ;
    au moins un plat par commande ;
    quantité positive et refus des plats dupliqués dans une même
    commande ;
    vérification de la disponibilité du plat ;
    une commande annulée ne peut plus être modifiée ;
    transitions prévues : PENDING → PREPARING ou CANCELLED,
    PREPARING → READY ou CANCELLED, READY → SERVED ou
    CANCELLED ;
    les commandes servies ou annulées ne peuvent plus changer de statut.

Exemple indicatif de payload (vérifier les noms exacts des champs dans
apps/orders/serializers.py) :
{
  "order_type": "TAKEAWAY",
  "customer": null,
  "notes": "Sans piment",
  "items": [
    {
      "dish": 1,
      "quantity": 2
    }
  ]
}
7.3 Paiements --- payments

Préfixe indicatif à confirmer : /api/payments/.

Méthode Route indicative Description

GET /api/payments/ Liste des paiements

POST /api/payments/ Enregistrer un paiement
en attente

GET /api/payments/{id}/ Détail d'un paiement

POST /api/payments/{id}/confirm/ Confirmer un paiement

POST /api/payments/{id}/refund/ Marquer un paiement
comme remboursé

Modes observés : CASH, ORANGE_MONEY, WAVE, OTHER.

Statuts observés : PENDING, CONFIRMED, FAILED, REFUNDED.

Règles métier observées :

    un paiement nouvellement créé est en attente ;
    created_by, confirmed_by et les dates de confirmation sont gérés
    côté serveur ;
    la confirmation et le remboursement sont réservés aux rôles
    autorisés ;
    le montant payé en attente ou confirmé est vérifié pour éviter de
    dépasser le total de la commande ;
    les paiements sont refusés pour les commandes annulées ou servies
    selon les validations actuelles ;
    les opérations financières utilisent des transactions et des verrous
    de base de données dans les actions sensibles.

Exemple indicatif (confirmer le nom exact des champs dans
apps/payments/serializers.py) :
{
  "order": 1,
  "amount": "15000.00",
  "method": "CASH",
  "reference": "",
  "notes": "Paiement au comptoir"
}
7.4 Factures --- invoices

Préfixe indicatif à confirmer : /api/invoices/.

Méthode Route indicative Description

GET /api/invoices/ Liste des factures

GET /api/invoices/{id}/ Détail d'une facture

POST /api/invoices/issue/ Émettre une facture via
l'action métier

Règles métier observées :

    numéro de facture généré au format FAC-YYYYMMDD-XXXXXXXX ;
    une seule facture par commande ;
    instantané du nom et du téléphone du client ainsi que des lignes
    facturées ;
    remise positive ou nulle et ne dépassant pas le sous-total ;
    pas de facture pour une commande annulée ou sans ligne ;
    émission dans une transaction ;
    la facture et le paiement sont suivis séparément : l'émission d'une
    facture ne signifie pas que la commande est payée.

Payload indicatif pour l'action d'émission (confirmer la clé exacte de
la commande dans apps/invoices/views.py) :
{
  "order": 1,
  "discount": "0.00",
  "notes": ""
}
7.5 Tableau de bord --- dashboard

Routes connues dans la configuration discutée, à vérifier dans
apps/dashboard/urls.py :

Méthode Route indicative Description

GET /api/dashboard/ Vue d'ensemble
GET /api/dashboard/sales/ Ventes par jour
GET /api/dashboard/top-dishes/ Plats les plus vendus
GET /api/dashboard/reports/ Rapport synthétique

Paramètres de date observés : date_from et date_to.

Les indicateurs calculés comprennent notamment les montants de
commandes, les paiements confirmés et en attente, les dépenses, une
estimation de solde, les ventes quotidiennes et les plats les plus
vendus. Les commandes annulées sont exclues de plusieurs calculs. Les
vues exigent une authentification et la permission administrateur
définie dans cette application.

Point métier important : le total des commandes, les paiements
effectivement confirmés et le chiffre d'affaires encaissé ne sont pas
nécessairement équivalents. La définition de chaque indicateur doit être
validée avant l'affichage dans le frontend.
7.6 Comptes, catégories, menu, clients et paramètres

Applications concernées : accounts, categories, menu, customers
et restaurant_settings.

Les routes et champs précis de ces modules ne sont pas confirmés dans
les informations disponibles ici. Pour éviter de documenter des
endpoints qui n'existent pas, les vérifier dans les fichiers urls.py,
les ViewSets et les serializers avant de compléter les tableaux de
routes.
8. Filtres et codes HTTP

Codes HTTP usuels :

Code Signification

200 OK Requête réussie
201 Created Ressource créée
204 No Content Action réussie sans contenu de réponse
400 Bad Request Données invalides ou règle métier non respectée
401 Unauthorized Authentification absente ou invalide
403 Forbidden Utilisateur authentifié mais non autorisé
404 Not Found Ressource introuvable
405 Method Not Allowed Méthode HTTP non autorisée
500 Internal Server Error Erreur serveur inattendue

Les paramètres de recherche, de tri et de pagination dépendent des
filter_backends, du routeur et des réglages DRF configurés dans le
projet.
9. Tests et qualité

Commandes utiles :
# Vérifier la configuration Django
python manage.py check

# Lancer tous les tests détectés
python manage.py test

# Tester un module spécifique
python manage.py test apps.expenses --verbosity 2
python manage.py test apps.orders --verbosity 2
python manage.py test apps.payments --verbosity 2
python manage.py test apps.invoices --verbosity 2

# Vérifier les migrations sans créer de fichiers
python manage.py makemigrations --check --dry-run

# Afficher l'état des migrations
python manage.py showmigrations

État observé pendant la rédaction : 4 tests automatisés ont été
détectés et réussis, tous dans apps/expenses/tests.py. Les autres
fichiers tests.py existent mais aucun test n'a été trouvé dans leur
contenu examiné. Ajouter des tests aux autres applications avant de
considérer toute l'API comme couverte.

Si makemigrations --check --dry-run signale des différences, examiner
les migrations proposées et les modèles avant de les appliquer. Ne
jamais supprimer une migration appliquée sans plan de migration
explicite.
10. Sécurité et production

Avant le déploiement :

    désactiver DEBUG en production ;
    configurer SECRET_KEY via une variable d'environnement ;
    configurer ALLOWED_HOSTS, CORS et CSRF selon l'architecture ;
    utiliser HTTPS ;
    ne pas committer .env ou des identifiants ;
    appliquer les permissions sur les endpoints côté serveur ;
    valider les montants et statuts côté serveur ;
    utiliser des transactions pour les opérations financières ;
    sauvegarder régulièrement PostgreSQL et tester la restauration ;
    journaliser les opérations importantes, notamment les confirmations
    et remboursements ;
    séparer commandes créées, factures émises et paiements réellement
    confirmés dans les indicateurs financiers.

11. Compléter la documentation des routes

Pour produire une référence d'API exacte, examiner ces fichiers s'ils
existent :
config/urls.py
config/settings.py
apps/accounts/urls.py
apps/categories/urls.py
apps/menu/urls.py
apps/customers/urls.py
apps/orders/urls.py
apps/payments/urls.py
apps/invoices/urls.py
apps/expenses/urls.py
apps/dashboard/urls.py
apps/restaurant_settings/urls.py

Lister les fichiers urls.py disponibles :
find apps -name urls.py -print

Vérifier les routeurs DRF, les @action, les permissions, les champs
des serializers et les préfixes montés dans config/urls.py avant de
publier ce README comme documentation API définitive.

Projet : RESTOPRO
Développeur : Adama Programmeur
Description : API de gestion de restaurant --- menu, commandes,
paiements, factures, dépenses et tableau de bord.
