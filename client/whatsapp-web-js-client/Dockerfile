FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install
RUN npm install bootstrap bootstrap-icons axios xlsx react-input-mask emoji-picker-react --legacy-peer-deps
COPY . .
RUN npm run build
RUN npm install -g serve
EXPOSE 3001
CMD ["serve", "-s", "build", "-l", "3001"]
