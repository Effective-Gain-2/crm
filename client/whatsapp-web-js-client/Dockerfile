FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
RUN npm install bootstrap bootstrap-icons axios xlsx react-input-mask emoji-picker-react --legacy-peer-deps
COPY . .
RUN npm run build


FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]