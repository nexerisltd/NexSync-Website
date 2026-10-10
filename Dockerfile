# Stage 1: Dependencies - install production deps
FROM oven/bun:1 AS deps
WORKDIR /app

# Copy workspace configuration
COPY package.json ./

# Copy package files maintaining workspace structure
COPY apps/server/package.json ./apps/server/package.json
COPY packages/shared/package.json ./packages/shared/package.json
# --ignore-scripts: the root prepare script runs lefthook (a devDependency,
# absent under --production install) and git hooks have no place in a container
RUN bun install --production --ignore-scripts

# Stage 2: Build - bundle the server (bun start runs dist/index.js)
FROM oven/bun:1 AS build
WORKDIR /app
COPY --from=deps /app /app
COPY apps/server/src ./apps/server/src
COPY apps/server/tsconfig.json ./apps/server/tsconfig.json
COPY packages/shared ./packages/shared
WORKDIR /app/apps/server
RUN bun run build

# Stage 3: Runner - final production image (self-contained bundle, no node_modules)
FROM oven/bun:1-slim AS runner
WORKDIR /app/apps/server

# YouTube / YT Music playlist import needs yt-dlp, plus a JS runtime (Deno) so yt-dlp can
# solve YouTube's JavaScript challenges. The yt-dlp_linux binary bundles everything else.
# To update yt-dlp later, just rebuild the image (it always pulls the latest release).
COPY --from=denoland/deno:bin /deno /usr/local/bin/deno
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates \
 && curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux -o /usr/local/bin/yt-dlp \
 && chmod a+rx /usr/local/bin/yt-dlp \
 && apt-get purge -y --auto-remove curl \
 && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/apps/server/dist ./dist

EXPOSE 8080
ENV NODE_ENV=production
CMD ["bun", "dist/index.js"]
