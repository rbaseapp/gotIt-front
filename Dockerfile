FROM node:24-alpine@sha256:50c8e8ca1d27439048670df5883f32d57cf81cff6233222c893fd0d9884cbd81 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_GOOGLE_CLIENT_ID=336996428812-1gi15gthgo0dt01gbg7rukilcod8lb9i.apps.googleusercontent.com
ARG VITE_FACEBOOK_APP_ID=
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID VITE_FACEBOOK_APP_ID=$VITE_FACEBOOK_APP_ID VITE_DEMO_MODE=false
RUN npm run build

FROM node:24-alpine@sha256:50c8e8ca1d27439048670df5883f32d57cf81cff6233222c893fd0d9884cbd81 AS production
ENV NODE_ENV=production PORT=10000
WORKDIR /app
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node server ./server
USER node
EXPOSE 10000
CMD ["node", "server/gateway.mjs"]
