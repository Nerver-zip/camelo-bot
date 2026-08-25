# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS build
WORKDIR /app

RUN apt-get update \
    && apt-get install --no-install-recommends -y g++ make \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
RUN make clean all \
    && npm prune --omit=dev

FROM node:22-bookworm-slim
WORKDIR /app

RUN apt-get update \
    && apt-get install --no-install-recommends -y chromium tini procps \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 --shell /usr/sbin/nologin app

COPY --from=build --chown=app:app /app /app
RUN mkdir -p /app/src/local/dump /app/src/local/charts /app/src/automessages/mirrors \
    && chown -R app:app /app

ENV NODE_ENV=production \
    CHROME_PATH=/usr/bin/chromium \
    HOME=/home/app
USER app

ENTRYPOINT ["/usr/bin/tini", "--"]
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD pgrep -f "node src/bot.js" >/dev/null || exit 1
CMD ["node", "src/bot.js"]
