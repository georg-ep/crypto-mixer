FROM --platform=linux/amd64 node:18
LABEL MAINTAINER="TODO"
ENV NODE_ENV development
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./
EXPOSE 3000
RUN npm install
RUN npm install -g typescript nodemon
COPY . ./app
RUN npx prisma generate
CMD [ "npm", "run", "start" ]

