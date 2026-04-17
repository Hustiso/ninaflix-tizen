FROM node:20-alpine
WORKDIR /app
COPY bridge/package.json ./
RUN npm install --production
COPY bridge/bridge.js ./
EXPOSE 3000
CMD ["node", "bridge.js"]
