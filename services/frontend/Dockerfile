# ---------- Build Stage ----------
    FROM node:20-alpine AS build

    WORKDIR /app
    
    COPY package*.json ./
    RUN npm install
    
    COPY . .
    RUN npm run build
    
    # ---------- Runtime Stage ----------
    FROM nginx:alpine
    
    # Copy built files
    COPY --from=build /app/dist /usr/share/nginx/html
    
    # Copy nginx configuration
    COPY nginx.conf /etc/nginx/conf.d/default.conf
    
    EXPOSE 80
    
    CMD ["nginx", "-g", "daemon off;"]
    