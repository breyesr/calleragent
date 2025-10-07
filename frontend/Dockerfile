FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install || true
COPY . .
EXPOSE 3002
CMD ["npm","run","dev"]
