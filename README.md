# ☕ Java Torréfié — Site Statique pour GitHub Pages

Site web statique présentant 60 fiches Java de Baba Niang, organisées en 10 chapitres thématiques.

## 🚀 Déploiement sur GitHub Pages

### Méthode 1 : Interface GitHub

1. Crée un nouveau repository sur GitHub (ex: `java-torrifie`)
2. Upload tous les fichiers de ce dossier à la racine du repository
3. Va dans **Settings** → **Pages**
4. Dans **Source**, sélectionne la branche `main` et le dossier `/ (root)`
5. Clique **Save**
6. Attends 1-2 minutes, ton site sera accessible à :
   `https://<ton-username>.github.io/java-torrifie/`

### Méthode 2 : En ligne de commande

```bash
# Initialiser le repo
git init
git add .
git commit -m "☕ Java Torréfié — site statique"

# Créer le repo sur GitHub puis push
git remote add origin https://github.com/<ton-username>/java-torrifie.git
git branch -M main
git push -u origin main

# Activer GitHub Pages dans Settings → Pages → Source: main / (root)
```

### Méthode 3 : GitHub Desktop

1. Télécharge GitHub Desktop
2. File → New Repository → choisis ce dossier
3. Publish repository
4. Sur GitHub.com : Settings → Pages → Source: main

## 📁 Structure des fichiers

```
java-torrifie-github-pages/
├── index.html              # Page principale (tout est inclus)
├── .nojekyll               # Désactive Jekyll (important!)
├── fiches/                 # 62 images JPG optimisées
│   ├── fiche-1.jpg
│   ├── fiche-2.jpg
│   └── ...
└── README.md               # Ce fichier
```

## ✨ Fonctionnalités

- ✅ 60 fiches Java en 10 chapitres
- ✅ Rendu Markdown avec coloration syntaxique Java
- ✅ Bouton "Voir l'image source" sur chaque fiche
- ✅ Sidebar avec suivi de section active
- ✅ Navigation mobile responsive
- ✅ Bouton copier le code
- ✅ Thème sombre café/torréfaction
- ✅ Aucune dépendance serveur (100% statique)

## 🎨 Design

- **Typographies** : Big Shoulders Display + IBM Plex Sans + IBM Plex Mono
- **Palette** : Fond sombre grain torréfié, accents colorés par chapitre
- **Responsive** : Mobile, tablette, desktop

## 👤 Auteur

Baba Niang

## 📝 Licence

Contenu pédagogique — usage libre pour l'apprentissage.
