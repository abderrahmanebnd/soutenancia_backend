FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
#port 3000
EXPOSE 3000
#Cette commande exécute les migrations (si des changements de schéma ont été définis) puis démarre ton serveur
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]