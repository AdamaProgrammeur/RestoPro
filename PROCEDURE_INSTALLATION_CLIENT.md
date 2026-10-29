# Procédure d’installation de RestoPro sur le PC du client

Ce guide explique comment installer RestoPro en local, créer son raccourci sur le Bureau, puis ouvrir la page de connexion. L’application et sa base restent sur le PC du restaurant. PostgreSQL n’est pas nécessaire pour cette installation : RestoPro utilise une base SQLite locale.

## 1. Préparer les fichiers

1. Copier le dossier complet du projet RestoPro sur le PC du client, dans un emplacement qui ne sera pas déplacé ensuite. Par exemple :
   - Windows : `C:\RestoPro`
   - Linux : `/home/nom-du-client/RestoPro`
2. Vérifier que le dossier `backend` contient bien `manage.py`, `requirements.txt`, `install_windows.bat` et `install_linux.sh`.
3. Le PC doit être connecté à Internet pendant la première installation pour télécharger Python (si nécessaire) et les dépendances du logiciel.

## 2. Installer sur Windows

1. Installer **Python 3.12** depuis [python.org](https://www.python.org/downloads/). Pendant l’installation de Python, cocher **Add Python to PATH**.
2. Ouvrir le dossier `RestoPro\backend`.
3. Double-cliquer sur `install_windows.bat`.
4. Si Windows affiche une confirmation, choisir **Exécuter**.
5. Attendre l’installation des dépendances et la création de la base locale.
6. À la demande, créer le compte administrateur initial : choisir un nom d’utilisateur, une adresse e-mail si elle est demandée, puis un mot de passe. Conserver ces identifiants pour le client.
7. À la fin, vérifier que l’icône **RestoPro** apparaît sur le Bureau.

## 3. Installer sur Linux

1. Vérifier que Python 3.12 ou supérieur est installé.
2. Ouvrir un terminal dans le dossier du projet.
3. Lancer :

   ```bash
   cd /chemin/vers/RestoPro/backend
   ./install_linux.sh
   ```

4. À la demande, créer le compte administrateur initial et conserver ses identifiants.
5. Vérifier que le raccourci **RestoPro** a été créé dans le dossier Bureau configuré pour la session Linux. Selon l’environnement Linux, au premier double-clic, choisir **Autoriser le lancement** ou **Faire confiance et lancer**.

## 4. Ouvrir RestoPro et se connecter

1. Double-cliquer sur l’icône **RestoPro** du Bureau.
2. Le serveur local démarre en arrière-plan et RestoPro s’ouvre dans le navigateur par défaut.
3. La page **Connexion · RestoPro** s’affiche à l’adresse locale `http://127.0.0.1:8000/`.
4. Saisir le nom d’utilisateur et le mot de passe créés pendant l’installation, puis cliquer sur **Se connecter**.

Après connexion, l’utilisateur arrive sur son espace de gestion. Pour les ouvertures suivantes, un double-clic sur la même icône suffit. Si le navigateur ne s’ouvre pas, saisir `http://127.0.0.1:8000/` dans sa barre d’adresse.

## 5. Données et précautions

- La base de données locale est `backend/restopro_local.sqlite3`.
- Les logos et images chargés dans l’application sont conservés dans `backend/media/`.
- Sauvegarder régulièrement ces deux éléments sur un support séparé. Ne pas les supprimer lors d’une mise à jour ou d’une réinstallation.
- Garder le dossier du projet à son emplacement initial après l’installation, car le raccourci du Bureau pointe vers cet emplacement.
- Cette procédure installe RestoPro pour une utilisation locale sur ce PC. Pour utiliser le logiciel depuis plusieurs postes, il faudra héberger le serveur sur un ordinateur accessible par le réseau.

## Dépannage rapide

| Problème | Action |
| --- | --- |
| `py` ou Python est introuvable sur Windows | Installer Python 3.12 et cocher **Add Python to PATH**, puis relancer `install_windows.bat`. |
| L’installation ne télécharge pas les dépendances | Vérifier la connexion Internet, puis relancer le script d’installation. |
| L’icône ouvre une erreur serveur | Vérifier que le dossier du projet n’a pas été déplacé. Sur Windows, consulter `backend/restopro-server-error.log`; sur Linux, `backend/restopro-server.log`. |
| Le navigateur affiche une erreur de connexion | Attendre quelques secondes et recharger `http://127.0.0.1:8000/`. |
| Les identifiants sont refusés | Vérifier la casse du nom d’utilisateur et du mot de passe. Le mot de passe distingue majuscules et minuscules. |
