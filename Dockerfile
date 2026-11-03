FROM node:24-bookworm-slim
WORKDIR /opt/rowanvale
COPY --chown=node:node app ./app
COPY --chown=node:node hosting ./hosting
COPY --chown=node:node package.json ./package.json
RUN mkdir -p /data/rowanvale && chown node:node /data/rowanvale
USER node
ENV NODE_ENV=production PORT=8080 ROWANVALE_DATA_DIR=/data/rowanvale
EXPOSE 8080
VOLUME ["/data/rowanvale"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD node -e "require('node:http').get({host:'127.0.0.1',port:process.env.PORT,path:'/healthz',headers:{host:new URL(process.env.PUBLIC_URL).host}},r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
CMD ["node","hosting/server.cjs"]
