FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --production
COPY . .
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
