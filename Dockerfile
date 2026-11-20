# MindLoop all-in-one: FastAPI backend + Next.js frontend in one container.
# Build:  docker build -t mindloop .
# Run:    docker run -p 3000:3000 -p 8000:8000 mindloop
# AWS:    push to ECR, run on App Runner / ECS / EC2 — single image, zero config.
FROM node:20-slim AS web-build
WORKDIR /web
COPY apps/web/package*.json ./
RUN npm install --no-audit --no-fund
COPY apps/web ./
RUN npm run build

FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
ENV DATABASE_URL=sqlite:///./mindloop.db
ENV MINDLOOP_API_KEY=demo-key-change-me
ENV CORS_ORIGINS=*
WORKDIR /srv
COPY services/api/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY services/api ./api
COPY --from=web-build /web /srv/web
WORKDIR /srv/web
RUN npm install --omit=dev --no-audit --no-fund || npm install --no-audit --no-fund
ENV NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_KEY=demo-key-change-me
EXPOSE 3000 8000
CMD ["sh", "-c", "cd /srv/api && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 & cd /srv/web && npm start -- --port 3000 --hostname 0.0.0.0"]
