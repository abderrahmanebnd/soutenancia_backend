# Étape 1 : Utiliser une image de base Node.js
FROM node:18-alpine

# Étape 2 : Définir le répertoire de travail
WORKDIR /app

# Étape 3 : Copier les fichiers de package.json et package-lock.json
COPY package*.json ./

# Étape 4 : Installer les dépendances de production
RUN npm install --production

# Étape 5 : Copier le reste du code de l'application
COPY . .

# Étape 6 : Appliquer les migrations Prisma (avec un délai pour éviter un problème de connexion)
RUN sleep 10 && npx prisma generate && npx prisma db push || echo "Prisma migrate failed but continuing..."


# Étape 7 : Exposer le port
EXPOSE 3000

# Étape 8 : Lancer l'application
CMD ["node", "server.js"]