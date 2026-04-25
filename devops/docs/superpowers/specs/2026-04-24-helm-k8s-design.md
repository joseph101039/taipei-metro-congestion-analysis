# Helm + Kubernetes 本地部署設計

**日期**: 2026-04-24  
**目標**: 將 metro monorepo 的 server 和 web 部署到 Docker Desktop Kubernetes，使用 Helmfile 管理兩個獨立 Helm chart。

---

## 目錄結構

```
devops/helm/
  helmfile.yaml                  # 頂層 orchestrator，一個指令部署兩個 chart
  values/
    common.yaml                  # 共用設定（namespace, domain, image tag 等）
    server.yaml                  # server 專用 overrides
    web.yaml                     # web 專用 overrides
  charts/
    server/                      # server Helm chart
      Chart.yaml
      values.yaml
      templates/
        deployment.yaml
        service.yaml
        configmap.yaml           # DB_HOST, DB_PORT, DB_NAME
        secret.yaml              # DB_USER, DB_PASSWORD
        ingress.yaml
    web/                         # web Helm chart
      Chart.yaml
      values.yaml
      templates/
        deployment.yaml
        service.yaml
        ingress.yaml
```

---

## Kubernetes 資源

### Server chart

| 資源 | 說明 |
|------|------|
| Deployment | 跑 `node dist/index.js`，replica 1 |
| Service (ClusterIP) | 暴露 port 3000，供 web nginx proxy 呼叫 |
| ConfigMap | `DB_HOST`, `DB_PORT`, `DB_NAME` |
| Secret | `DB_USER`, `DB_PASSWORD` |
| Ingress | `api.metro.local` → server Service port 3000 |

### Web chart

| 資源 | 說明 |
|------|------|
| Deployment | 跑 nginx，serve 靜態 build，replica 1 |
| Service (ClusterIP) | 暴露 port 80 |
| Ingress | `metro.local` → web Service port 80 |

### Namespace

兩個 chart 都部署到 `metro` namespace。

---

## Dockerfile 變更

### Server（重寫為 production multi-stage build）

```dockerfile
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Web（不動）

現有 multi-stage build（nginx:alpine）保持原樣。

---

## nginx.conf 變更

Web 的 `nginx.conf` 裡 `proxy_pass` 目標改為 k8s Service DNS：

```nginx
location /api/ {
    proxy_pass http://metro-server.metro.svc.cluster.local:3000;
    ...
}
```

不使用 ConfigMap 渲染——URL 由 chart template 直接固定，namespace 和 service name 在同一個 helmfile 部署環境裡是確定的。

---

## Image 策略

使用 `imagePullPolicy: Never`——在本機 `docker build` 後，Docker Desktop k8s 直接使用本機 Docker daemon 的 image，不需要 registry。

**每次部署前的 build 指令：**

```bash
docker build -t metro-server:local ../server
docker build -t metro-web:local ../web
```

**Helm values 設定：**

```yaml
image:
  repository: metro-server
  tag: local
  pullPolicy: Never
```

---

## Ingress 安裝

使用 nginx-ingress controller。Docker Desktop Kubernetes 安裝指令：

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.1/deploy/static/provider/cloud/deploy.yaml
```

等待 ingress controller ready：

```bash
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s
```

---

## /etc/hosts 設定

在 `/etc/hosts` 加入以下兩行（需要 sudo）：

```
127.0.0.1 metro.local
127.0.0.1 api.metro.local
```

---

## Helmfile 使用方式

```bash
# 安裝 helmfile（若未安裝）
brew install helmfile

# 部署所有 chart
cd devops/helm
helmfile sync

# 只部署 server
helmfile sync --selector name=server

# 移除所有
helmfile destroy
```

---

## helmfile.yaml 結構

```yaml
repositories: []

helmDefaults:
  createNamespace: true

releases:
  - name: server
    namespace: metro
    chart: ./charts/server
    values:
      - values/common.yaml
      - values/server.yaml

  - name: web
    namespace: metro
    chart: ./charts/web
    values:
      - values/common.yaml
      - values/web.yaml
```

---

## values/common.yaml 結構

```yaml
namespace: metro
domain:
  web: metro.local
  api: api.metro.local
```

---

## 部署順序

1. `docker build` server 和 web image
2. `kubectl apply` 安裝 nginx-ingress
3. 更新 `/etc/hosts`
4. `helmfile sync` 部署兩個 chart
5. 瀏覽器開啟 `http://metro.local`

---

## 實作 Checklist

### 前置作業
- [ ] 確認 Docker Desktop Kubernetes 已啟用
- [ ] 安裝 helmfile（`brew install helmfile`）
- [ ] 安裝 nginx-ingress controller
- [ ] 更新 `/etc/hosts`（加入 `metro.local` 和 `api.metro.local`）

### Dockerfile
- [ ] 重寫 `../server/Dockerfile`（multi-stage production build）
- [ ] 更新 `../web/nginx.conf`（`proxy_pass` 改為 k8s Service DNS）

### Helm charts — Server
- [ ] 建立 `devops/helm/charts/server/Chart.yaml`
- [ ] 建立 `devops/helm/charts/server/values.yaml`
- [ ] 建立 `templates/deployment.yaml`
- [ ] 建立 `templates/service.yaml`
- [ ] 建立 `templates/configmap.yaml`（DB env vars）
- [ ] 建立 `templates/secret.yaml`（DB credentials）
- [ ] 建立 `templates/ingress.yaml`（`api.metro.local`）

### Helm charts — Web
- [ ] 建立 `devops/helm/charts/web/Chart.yaml`
- [ ] 建立 `devops/helm/charts/web/values.yaml`
- [ ] 建立 `templates/deployment.yaml`
- [ ] 建立 `templates/service.yaml`
- [ ] 建立 `templates/ingress.yaml`（`metro.local`）

### Helmfile
- [ ] 建立 `devops/helm/helmfile.yaml`
- [ ] 建立 `devops/helm/values/common.yaml`
- [ ] 建立 `devops/helm/values/server.yaml`
- [ ] 建立 `devops/helm/values/web.yaml`

### 驗證
- [ ] `docker build -t metro-server:local ../server` 成功
- [ ] `docker build -t metro-web:local ../web` 成功
- [ ] `helmfile sync` 無錯誤
- [ ] `kubectl get pods -n metro` 全部 Running
- [ ] 瀏覽器開啟 `http://metro.local` 正常顯示
- [ ] `http://api.metro.local/api/lines` 回傳資料
