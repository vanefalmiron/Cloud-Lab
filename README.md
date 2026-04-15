# ☁️ cloud-lab

Laboratorio personal para aprender Cloud Computing desde cero, partiendo de conocimientos en WildFly/Java EE hacia un stack moderno de contenedores, orquestación y CI/CD.

> **Objetivo**: construir un entorno de despliegues en la nube, 100% gratuito, que refleje el flujo de trabajo real de un entorno PRO.

---

## 📁 Estructura del repositorio

```
cloud-lab/
│
├── README.md
│
├── fase1-docker/
│   └── mi-app/
│       ├── app.js             ← app Node.js de prueba
│       └── Dockerfile         ← imagen del contenedor
│
├── fase2-kubernetes/
│   ├── deployment.yaml        ← definición del Deployment
│   └── service.yaml           ← exposición del servicio
│
├── fase3-cicd/
│   └── .github/
│       └── workflows/
│           └── deploy.yml     ← pipeline de GitHub Actions
│
└── fase4-cloud/
    └── terraform/             ← infraestructura como código (Oracle Cloud / AWS)
```

---

## 🗺️ Arquitectura del laboratorio

```
┌─────────────────────────────────────────────┐
│               Ubuntu Server VM               │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │              Docker                  │   │
│  │                                      │   │
│  │  ┌────────────┐                      │   │
│  │  │  mi-app    │                      │   │
│  │  │  :3000     │                      │   │
│  │  └────────────┘                      │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │           k3s (Kubernetes)           │   │  ← Fase 2
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
                      │
                      ▼
     ┌────────────────────────────────┐
     │     GitHub Actions (CI/CD)     │        ← Fase 3
     └────────────────────────────────┘
                      │
                      ▼
     ┌────────────────────────────────┐
     │  Oracle Cloud Free / AWS Free  │        ← Fase 4
     └────────────────────────────────┘
```

---

## 🧭 Fases del laboratorio

| Fase | Descripción | Estado |
|------|-------------|--------|
| 1 | Docker — contenedores y primera app | ✅ |
| 2 | Kubernetes con k3s | 🔄 |
| 3 | CI/CD con GitHub Actions | ⏳ |
| 4 | Despliegue en la nube (Oracle Cloud / AWS) | ⏳ |

---

## ✅ Fase 1 — Docker

### Concepto

Docker permite empaquetar una aplicación y todas sus dependencias en un **contenedor** — una unidad portátil que corre igual en cualquier entorno. Es la base de todo el stack moderno de despliegues.

### Instalación de Docker en Ubuntu

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependencias
sudo apt install -y ca-certificates curl gnupg

# Agregar repositorio oficial de Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin

# Usar Docker sin sudo
sudo usermod -aG docker $USER
newgrp docker
```

### Verificar instalación

```bash
docker --version
docker run hello-world
# Resultado esperado: "Hello from Docker!"
```

### Estructura de mi-app

```
mi-app/
├── app.js        ← servidor HTTP Node.js
└── Dockerfile    ← instrucciones para construir la imagen
```

```javascript
// app.js
const http = require('http');
http.createServer((req, res) => {
  res.end('Hola desde Docker');
}).listen(3000);
```

```dockerfile
# Dockerfile
FROM node:18
WORKDIR /app
COPY app.js .
EXPOSE 3000
CMD ["node", "app.js"]
```

### Qué hace cada línea del Dockerfile

| Instrucción | Descripción |
|---|---|
| `FROM node:18` | Imagen base oficial de Node.js versión 18 |
| `WORKDIR /app` | Directorio de trabajo dentro del contenedor |
| `COPY app.js .` | Copia el código fuente al contenedor |
| `EXPOSE 3000` | Declara el puerto que escucha la app |
| `CMD [...]` | Comando que arranca la app al iniciar el contenedor |

### Construir y ejecutar la app

```bash
# Construir la imagen
docker build -t mi-app mi-app/

# Ejecutar el contenedor en segundo plano
docker run -d -p 3000:3000 --name mi-app mi-app

# Verificar que responde
curl http://localhost:3000
# Resultado esperado: "Hola desde Docker"
```

### Comandos esenciales

| Acción | Comando |
|---|---|
| Ver contenedores activos | `docker ps` |
| Ver todos los contenedores | `docker ps -a` |
| Ver logs de la app | `docker logs mi-app` |
| Detener contenedor | `docker stop mi-app` |
| Iniciar contenedor | `docker start mi-app` |
| Eliminar contenedor | `docker rm mi-app` |
| Ver imágenes descargadas | `docker images` |
| Eliminar imagen | `docker rmi mi-app` |
| Entrar al contenedor | `docker exec -it mi-app bash` |

### 🧠 Lecciones aprendidas — Fase 1

| Problema | Causa | Solución |
|---|---|---|
| Portapapeles no funciona entre Windows y la VM | Guest Additions no instaladas en Ubuntu | `sudo apt install -y virtualbox-guest-utils virtualbox-guest-x11` y reiniciar la VM |
| `docker build` tardó ~30 minutos la primera vez | La imagen base `node:18` pesa ~900 MB y se descarga completa desde Docker Hub | Normal solo la primera vez — las siguientes usan caché local y tardan segundos |
| `docker logs mi-app` no mostraba nada | La app solo escribe en log cuando recibe una petición | Ejecutar `curl http://localhost:3000` primero y luego revisar los logs |

---

## 🔄 Fase 2 — Kubernetes con k3s

### Concepto

Kubernetes (K8s) es el estándar de la industria para **orquestar contenedores** en producción. Gestiona despliegues, escalado automático, balanceo de carga y recuperación ante fallos. k3s es una distribución 100% compatible pero ligera, ideal para laboratorios con recursos limitados.

| | Kubernetes completo | k3s |
|---|---|---|
| RAM mínima | ~2 GB solo para K8s | ~512 MB |
| Instalación | Compleja, múltiples componentes | Un solo comando |
| Compatibilidad | Estándar | 100% compatible |
| Uso real | EKS (AWS), GKE (Google) | Laboratorio, edge, IoT |

### Conceptos clave

| Concepto | Descripción |
|---|---|
| **Pod** | Unidad mínima — contiene uno o más contenedores |
| **Deployment** | Gestiona réplicas y actualizaciones de Pods |
| **Service** | Expone el Deployment a la red |
| **Namespace** | Agrupación lógica de recursos |
| **kubectl** | CLI para interactuar con el clúster |

### Instalación de k3s

```bash
curl -sfL https://get.k3s.io | sh -
```

### Verificar instalación

```bash
sudo kubectl get nodes
# Resultado esperado:
# NAME            STATUS   ROLES    AGE   VERSION
# ubuntu-server   Ready    master   1m    v1.28.x
```

### Desplegar mi-app en k3s

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mi-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: mi-app
  template:
    metadata:
      labels:
        app: mi-app
    spec:
      containers:
      - name: mi-app
        image: mi-app:latest
        ports:
        - containerPort: 3000
```

```bash
kubectl apply -f deployment.yaml
kubectl get pods
kubectl get deployments
```

### Comandos esenciales

| Acción | Comando |
|---|---|
| Ver nodos del clúster | `sudo kubectl get nodes` |
| Ver pods | `kubectl get pods` |
| Ver deployments | `kubectl get deployments` |
| Ver servicios | `kubectl get services` |
| Aplicar configuración | `kubectl apply -f archivo.yaml` |
| Eliminar recursos | `kubectl delete -f archivo.yaml` |
| Ver logs de un pod | `kubectl logs <pod>` |
| Detalle de un pod | `kubectl describe pod <pod>` |
| Entrar al pod | `kubectl exec -it <pod> -- bash` |

### 🧠 Lecciones aprendidas — Fase 2

*Se irán añadiendo conforme avance la fase.*

---

## ⏳ Fase 3 — CI/CD con GitHub Actions

### Concepto

- **CI** (Continuous Integration): cada push al repositorio dispara automáticamente el build y los tests.
- **CD** (Continuous Deployment): si todo pasa, despliega automáticamente al entorno destino.

### Pipeline planeado

```
Push a GitHub
     │
     ▼
GitHub Actions
     │
     ├── Build imagen Docker
     ├── Ejecutar tests
     ├── Push imagen a GitHub Container Registry (GHCR)
     └── Deploy a Kubernetes (Oracle Cloud)
```

### Workflow de ejemplo

```yaml
# .github/workflows/deploy.yml
name: CI/CD Pipeline
on:
  push:
    branches: [main]
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker image
        run: docker build -t mi-app .
      - name: Deploy to K8s
        run: kubectl apply -f deployment.yaml
```

### 🧠 Lecciones aprendidas — Fase 3

*Se irán añadiendo conforme avance la fase.*

---

## ⏳ Fase 4 — Despliegue en la Nube

### Plataformas gratuitas

| Plataforma | Free Tier | Uso en el lab |
|---|---|---|
| **Oracle Cloud** | 2 VMs ARM, 4 CPU, 24 GB RAM — siempre gratis | Lab principal en la nube |
| **AWS** | EC2 t2.micro 750 h/mes | Aprender el ecosistema más demandado en el mercado |

### Pasos planeados

```
1. Crear cuenta en Oracle Cloud Free Tier
2. Provisionar VM con Terraform
3. Instalar k3s en la VM cloud
4. Configurar GitHub Actions para deploy automático
```

### 🧠 Lecciones aprendidas — Fase 4

*Se irán añadiendo conforme avance la fase.*

---

## 🛠️ Entorno

- **OS (host)**: Windows
- **VM**: Ubuntu Server 22.04 LTS — VirtualBox
- **Docker**: 24.x
- **k3s**: v1.28.x
- **Node.js** (imagen base): 18 (vía Docker)

---

## 📝 Licencia

Uso personal / educativo.
