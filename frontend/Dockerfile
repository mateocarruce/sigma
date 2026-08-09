FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

# Modo desarrollo con hot-reload (Vite dev server).
# Para producción, se cambiará por un build + servidor estático (nginx).
CMD ["npm", "run", "dev"]
