# Ansible pour automatisation --- Registry privé sur Synology

## Objectif

Mettre en place un **registry Docker privé hébergé sur un NAS Synology**
et l'intégrer dans le pipeline CI/CD existant basé sur :

-   GitHub Actions (build & push)
-   Ansible (déploiement)
-   Kubernetes (cluster cible)

Flux global :

1.  GitHub Actions build l'image
2.  GitHub Actions push vers le registry privé Synology
3.  Ansible déploie l'image sur Kubernetes

------------------------------------------------------------------------

## Prérequis

### Synology

-   DSM 7.x
-   Container Manager installé
-   Accès SSH activé
-   Dossier persistant : `/volume1/docker/registry`

### Kubernetes

-   Cluster accessible
-   kubectl fonctionnel
-   Namespace cible créé

### GitHub

Secrets nécessaires :

-   SYNO_REGISTRY_HOST
-   SYNO_REGISTRY_USER
-   SYNO_REGISTRY_PASSWORD

------------------------------------------------------------------------

# Étape 1 --- Activer SSH

DSM → Panneau de configuration → Terminal & SNMP → Activer SSH

Connexion :

``` bash
ssh user@ip_du_synology
```

------------------------------------------------------------------------

# Étape 2 --- Créer les dossiers

``` bash
sudo mkdir -p /volume1/docker/registry/{data,auth,certs}
sudo chown -R user:users /volume1/docker/registry
```

------------------------------------------------------------------------

# Étape 3 --- Générer le fichier htpasswd

``` bash
cd /volume1/docker/registry/auth

docker run --rm --entrypoint htpasswd httpd:2 -Bbn registryuser "REGISTRY_PASSWORD" > htpasswd
```

------------------------------------------------------------------------

# Étape 4 --- docker-compose.yml

Créer :

`/volume1/docker/registry/docker-compose.yml`

``` yaml
services:
  registry:
    image: registry:2
    container_name: syno-registry
    restart: unless-stopped
    ports:
      - "5050:5000"
    environment:
      - REGISTRY_AUTH=htpasswd
      - REGISTRY_AUTH_HTPASSWD_REALM=SynologyRegistry
      - REGISTRY_AUTH_HTPASSWD_PATH=/auth/htpasswd
      - REGISTRY_STORAGE_FILESYSTEM_ROOTDIRECTORY=/var/lib/registry
    volumes:
      - /volume1/docker/registry/data:/var/lib/registry
      - /volume1/docker/registry/auth:/auth
```

Lancer depuis Container Manager → Project → Import → Run

------------------------------------------------------------------------

# Étape 5 --- Test du registry

``` bash
docker login ip_synology:5050
docker pull alpine:3.20
docker tag alpine:3.20 ip_synology:5050/test/alpine:3.20
docker push ip_synology:5050/test/alpine:3.20
```

------------------------------------------------------------------------

# Étape 6 --- GitHub Actions

`.github/workflows/deploy.yml`

``` yaml
name: deploy

on:
  push:
    branches: ["main"]
  workflow_dispatch:

jobs:
  build-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set tag
        id: meta
        run: echo "TAG=${GITHUB_SHA::7}" >> $GITHUB_OUTPUT

      - name: Login
        run: |
          echo "${ secrets.SYNO_REGISTRY_PASSWORD }" | docker login           "${ secrets.SYNO_REGISTRY_HOST }"           -u "${ secrets.SYNO_REGISTRY_USER }"           --password-stdin

      - name: Build
        run: |
          docker build -t "${ secrets.SYNO_REGISTRY_HOST }/myapp/backend:${ steps.meta.outputs.TAG }" .

      - name: Push
        run: |
          docker push "${ secrets.SYNO_REGISTRY_HOST }/myapp/backend:${ steps.meta.outputs.TAG }"
```

------------------------------------------------------------------------

# Étape 7 --- Kubernetes imagePullSecret

``` bash
kubectl -n myapp create secret docker-registry syno-regcred   --docker-server="registry_host"   --docker-username="registryuser"   --docker-password="REGISTRY_PASSWORD"
```

Dans le Deployment :

``` yaml
spec:
  template:
    spec:
      imagePullSecrets:
        - name: syno-regcred
      containers:
        - name: backend
          image: registry_host/myapp/backend:TAG
```

------------------------------------------------------------------------

# Étape 8 --- Intégration Ansible

`group_vars/all/registry.yml`

``` yaml
registry_host: "registry.ton-domaine.tld"
registry_repo: "myapp/backend"
```

Template Deployment :

``` yaml
image: "{ registry_host }/{ registry_repo }:{ app_tag }"
```

------------------------------------------------------------------------

# Workflows GitHub séparés

-   deploy.yml → automatique sur push
-   bootstrap.yml → workflow_dispatch uniquement
-   maintenance.yml → workflow_dispatch uniquement

------------------------------------------------------------------------

# Dépannage

-   Port 5000 occupé → utiliser 5050:5000
-   Reverse Proxy DSM recommandé pour HTTPS
-   Vérifier que le firewall Synology autorise le port externe

------------------------------------------------------------------------

