# 🛍️ Reasonable Store — 3-Tier Kubernetes Application

A production-ready e-commerce web application built with a **3-tier architecture**:

```
┌─────────────────────────────────────────────────────────────────┐
│                         KUBERNETES CLUSTER                      │
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐    ┌───────────┐  │
│  │   TIER 1: WEB    │    │  TIER 2: API     │    │  TIER 3:  │  │
│  │                  │    │                  │    │    DB     │  │
│  │  React + Nginx   │───▶│  Node.js/Express │───▶│ PostgreSQL│  │
│  │  (2+ replicas)   │    │  (2+ replicas)   │    │ StatefulSet│  │
│  │  Port: 80        │    │  Port: 5000      │    │ Port:5432 │  │
│  └──────────────────┘    └──────────────────┘    └───────────┘  │
│           ▲                       ▲                              │
│           └──────────┬────────────┘                             │
│                  INGRESS                                         │
│              (nginx-ingress)                                     │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
reasonable-store/
├── frontend/               # React SPA (Tier 1)
│   ├── src/
│   │   ├── App.js          # Main app with all pages & routing
│   │   ├── App.css         # All styles
│   │   ├── api.js          # Axios API client
│   │   └── index.js
│   ├── public/index.html
│   ├── nginx.conf          # Nginx config with API proxy
│   ├── Dockerfile
│   └── package.json
│
├── backend/                # Node.js API (Tier 2)
│   ├── src/
│   │   ├── index.js        # Express app entry
│   │   ├── db.js           # PostgreSQL pool
│   │   └── routes/
│   │       ├── health.js
│   │       ├── categories.js
│   │       ├── products.js
│   │       ├── queries.js  # Customer queries + email notify
│   │       ├── gallery.js  # Photo upload
│   │       └── cart.js
│   ├── Dockerfile
│   └── package.json
│
├── db/
│   └── schema.sql          # DB schema + seed data (Tier 3)
│
├── k8s/                    # Kubernetes manifests
│   ├── 00-namespace.yaml
│   ├── 01-secrets.yaml
│   ├── 02-configmap.yaml
│   ├── 03-pvc.yaml
│   ├── 04-postgres.yaml    # StatefulSet + Service
│   ├── 04b-schema-configmap.yaml
│   ├── 05-backend.yaml     # Deployment + Service
│   ├── 06-frontend.yaml    # Deployment + Service
│   ├── 07-ingress.yaml     # Ingress + TLS
│   └── 08-hpa.yaml         # Auto-scaling
│
├── docker-compose.yml      # Local development
└── README.md
```

## 🚀 Deployment

### Option A: Local Development (Docker Compose)

```bash
# 1. Clone and enter project
cd reasonable-store

# 2. (Optional) Set email creds in docker-compose.yml
# Edit SMTP_USER, SMTP_PASS, STORE_EMAIL under 'backend' service

# 3. Start all services
docker compose up --build

# App runs at: http://localhost:3000
# API runs at: http://localhost:5000/api
```

---

### Option B: Kubernetes Deployment

#### Prerequisites
- `kubectl` configured for your cluster
- Docker registry access (Docker Hub / GCR / ECR)
- nginx-ingress-controller installed
- metrics-server installed (for HPA)

#### Step 1 — Build & Push Docker Images

```bash
# Backend
docker build -t your-registry/reasonable-store-backend:latest ./backend
docker push your-registry/reasonable-store-backend:latest

# Frontend
docker build -t your-registry/reasonable-store-frontend:latest ./frontend
docker push your-registry/reasonable-store-frontend:latest
```

#### Step 2 — Configure Secrets

```bash
# Encode your real values
echo -n "YourStrongPassword123!" | base64
echo -n "your@gmail.com" | base64
echo -n "gmail-app-password" | base64
echo -n "store@yourdomain.com" | base64

# Edit k8s/01-secrets.yaml with the encoded values
```

#### Step 3 — Update Image References

Edit `k8s/05-backend.yaml` and `k8s/06-frontend.yaml`:
```yaml
image: your-registry/reasonable-store-backend:latest
image: your-registry/reasonable-store-frontend:latest
```

#### Step 4 — Update Domain

Edit `k8s/07-ingress.yaml`:
```yaml
- host: reasonablestore.yourdomain.com
```

#### Step 5 — Deploy Everything

```bash
# Apply all manifests in order
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-secrets.yaml
kubectl apply -f k8s/02-configmap.yaml
kubectl apply -f k8s/03-pvc.yaml
kubectl apply -f k8s/04b-schema-configmap.yaml
kubectl apply -f k8s/04-postgres.yaml
kubectl apply -f k8s/05-backend.yaml
kubectl apply -f k8s/06-frontend.yaml
kubectl apply -f k8s/07-ingress.yaml
kubectl apply -f k8s/08-hpa.yaml

# Or apply all at once
kubectl apply -f k8s/
```

#### Step 6 — Verify

```bash
# Check all pods are running
kubectl get pods -n reasonable-store

# Check services
kubectl get svc -n reasonable-store

# Check ingress
kubectl get ingress -n reasonable-store

# View backend logs
kubectl logs -l app=backend -n reasonable-store -f

# Check HPA status
kubectl get hpa -n reasonable-store
```

---

## 🔌 REST API Endpoints

| Method | Endpoint                   | Description                      |
|--------|----------------------------|----------------------------------|
| GET    | /api/health                | Health check                     |
| GET    | /api/categories            | List all categories              |
| GET    | /api/products              | List products (filter/search)    |
| GET    | /api/products/:id          | Get single product               |
| POST   | /api/products              | Create product (admin)           |
| PUT    | /api/products/:id          | Update product (admin)           |
| DELETE | /api/products/:id          | Delete product (admin)           |
| POST   | /api/queries               | Submit customer query + email    |
| GET    | /api/queries               | List all queries (admin)         |
| GET    | /api/gallery               | List gallery photos              |
| POST   | /api/gallery/upload        | Upload photos (multipart)        |
| DELETE | /api/gallery/:id           | Delete photo                     |
| GET    | /api/cart/:sessionId       | Get cart                         |
| POST   | /api/cart                  | Add item to cart                 |
| DELETE | /api/cart/:id              | Remove cart item                 |

---

## ✉️ Email Notifications

When a customer submits a query:
1. **Store owner** receives a formatted HTML email with all details
2. **Customer** receives an auto-reply with their query reference ID

Set via environment variables / Kubernetes secrets:
- `SMTP_USER` — Gmail address
- `SMTP_PASS` — Gmail App Password (not your account password)
- `STORE_EMAIL` — Where owner notifications are sent

> **Gmail App Password**: Google Account → Security → 2FA → App Passwords

---

## 🔒 Security Notes

- All secrets stored in Kubernetes Secrets (base64 encoded)
- Never commit real secrets to Git
- Use cert-manager + Let's Encrypt for HTTPS in production
- Consider adding JWT auth middleware for admin routes
- Set `NODE_ENV=production` in all deployments

---

## 📊 Scaling

The HPA automatically scales:
- **Backend**: 2–8 pods at 70% CPU / 80% memory
- **Frontend**: 2–6 pods at 70% CPU

Manual scale:
```bash
kubectl scale deployment backend --replicas=4 -n reasonable-store
```
