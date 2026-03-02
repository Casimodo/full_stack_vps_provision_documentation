# 🚀 k3s + Traefik HTTPS + MariaDB + Node.js (Hello World) — Full Auto with Ansible + GitHub Actions

> **But :** partir d’un **serveur OVH vierge** (SSH only) et obtenir un **déploiement automatique** :  
> `git push` ➜ build + déploiement ➜ **HTTPS actif** ➜ app Node.js **Hello World** + check **MariaDB connect: OK**

---

## Badges (remplace `OWNER` / `REPO`)

![License](https://img.shields.io/github/license/OWNER/REPO)
![Release](https://img.shields.io/github/v/release/OWNER/REPO)
![Stars](https://img.shields.io/github/stars/OWNER/REPO?style=social)
![Forks](https://img.shields.io/github/forks/OWNER/REPO?style=social)
![Issues](https://img.shields.io/github/issues/OWNER/REPO)
![CI](https://img.shields.io/github/actions/workflow/status/OWNER/REPO/deploy.yml?branch=main)

---

## ✨ Ce que ce repo fait

✅ Bootstrap serveur (sécurité + paquets + firewall) via **Ansible**  
✅ Installe **k3s** (Kubernetes léger)  
✅ Expose l’app via **Traefik**  
✅ HTTPS automatique via **cert-manager + Let’s Encrypt**  
✅ Déploie une app Node.js minimale :
- `/` ➜ `Hello World`
- `/health/db` ➜ `MariaDB connect: OK` (ou erreur lisible)

✅ Zéro `kubectl` manuel : Ansible exécute tout (y compris les manifests).  
✅ Secrets / URLs **jamais committés** : uniquement **GitHub Secrets** (repo public safe).

---

# 📦 Arborescence recommandée

```
.
├─ ansible/
│  ├─ inventory.ini
│  ├─ bootstrap.yml
│  ├─ deploy.yml
│  └─ roles/
│     ├─ common/
│     ├─ k3s/
│     └─ hardening/
├─ k8s/
│  ├─ namespace.yaml
│  ├─ mariadb.yaml
│  ├─ app.yaml
│  ├─ ingress.yaml
│  └─ issuer-letsencrypt.yaml
├─ app/
│  ├─ Dockerfile
│  ├─ package.json
│  └─ server.js
├─ .github/workflows/
│  └─ deploy.yml
├─ LICENSE
└─ README.md
```

---

# 0) Pré-requis

## Côté serveur
- Ubuntu 22.04/24.04 (recommandé)
- Accès SSH **root** au départ (mot de passe fourni par le fournisseur)

## Côté poste client (ton PC)
👉 Pour exécuter Ansible, il te faut **un environnement Linux** sur ton PC :
- soit **WSL (Windows Subsystem for Linux)**,
- soit une VM Linux,
- soit une machine Linux.

> **Important :** PuTTY seul ne suffit pas pour lancer Ansible.
> Ansible tourne côté client (WSL/Linux), puis se connecte en SSH.

---

# 1) Étape unique : SSH manuel (bootstrap sécurité)

Objectif : ne **plus** utiliser le mot de passe root ensuite.

## 1.1 Générer une clé SSH (sur ton PC, dans WSL/Linux)
```bash
ssh-keygen -t ed25519 -C "k3s-ansible"
```
(Entrée = defaults. Mets une passphrase si possible.)

## 1.2 Copier la clé sur le serveur (encore avec mot de passe root)
```bash
ssh-copy-id ubuntu@IP_DU_SERVEUR
```

✅ Test :
```bash
ssh ubuntu@IP_DU_SERVEUR "echo OK"
```

À partir de là :
- Ansible peut se connecter **sans mot de passe**
- tu peux (et devrais) **désactiver** le login root par mot de passe ensuite (Ansible le fera).

---

# 2) Configuration DNS OVH

Dans OVH (zone DNS) :

- Enregistrement **A**
  - `app.ton-domaine.com` ➜ `IP_DU_SERVEUR`

Attends la propagation DNS (quelques minutes à quelques heures).

---

# 3) Créer le repo GitHub (public)

1. Crée un repo public `REPO`
2. Pousse ce projet dedans (sans secrets)
3. **Ne commite jamais** :
   - mots de passe DB
   - tokens
   - clés privées
   - URLs internes sensibles

---

# 4) GitHub Secrets (obligatoire pour repo public)

Dans GitHub : **Settings ➜ Secrets and variables ➜ Actions ➜ New repository secret**

## 4.1 Secrets minimaux à créer

| Secret | Exemple | Rôle |
|---|---|---|
| `SSH_HOST` | `123.123.123.123` | IP serveur OVH |
| `SSH_USER` | `root` *(ou user admin)* | utilisateur SSH |
| `SSH_PRIVATE_KEY` | contenu de ta clé privée | connexion CI ➜ serveur |
| `APP_DOMAIN` | `app.ton-domaine.com` | domaine HTTPS |
| `LETSENCRYPT_EMAIL` | `toi@email.com` | email Let’s Encrypt |
| `MARIADB_ROOT_PASSWORD` | `...` | mot de passe root DB |
| `MARIADB_DATABASE` | `appdb` | nom DB |
| `MARIADB_USER` | `appuser` | user DB |
| `MARIADB_PASSWORD` | `...` | mdp user DB |

### ⚠️ IMPORTANT : `SSH_PRIVATE_KEY`
GitHub Actions doit pouvoir SSH sur ton serveur.

1) Sur ton PC (WSL/Linux), affiche ta clé privée :
```bash
cat ~/.ssh/id_ed25519
```
2) Copie **tout** le contenu dans le secret GitHub `SSH_PRIVATE_KEY`.

> Ne mets **jamais** ta clé privée dans le repo.

### Recommandation (pro)
Crée un utilisateur dédié (ex: `deployer`) et désactive root SSH ensuite.  
Ce README garde root au départ pour rester simple, puis Ansible harden.

---

# 5) Installer Ansible (sur ton PC, WSL/Linux)

Ubuntu / Debian :
```bash
sudo apt update
sudo apt install -y ansible
ansible --version
```

---

# 6) Exécution locale (première mise en place)

## 6.1 Inventory Ansible (copier le fichier attention de ne pas le mettre dans le github)
`ansible/inventory.ini`
```ini
[servers]
IP_DU_SERVEUR ansible_user=root
```

## 6.2 Bootstrap serveur (sécurité + k3s)
```bash
ansible-playbook -i ansible/inventory.ini ansible/bootstrap.yml
```

Ce playbook doit :
- installer dépendances
- configurer firewall (UFW) : 22, 80, 443
- installer k3s
- configurer kubectl
- (optionnel) hardening SSH

✅ À partir d’ici, tu n’as plus besoin de SSH manuel.

---

# 7) Déploiement applicatif (manifests K8s)

## 7.1 Manifests Kubernetes (k8s/)
- `mariadb.yaml` : MariaDB (avec PVC si tu veux la persistance)
- `app.yaml` : déploiement Node.js
- `issuer-letsencrypt.yaml` : cert-manager issuer
- `ingress.yaml` : Traefik route + TLS

## 7.2 Déploiement via Ansible (local)
```bash
ansible-playbook -i ansible/inventory.ini ansible/deploy.yml
```

👉 `deploy.yml` doit :
- copier le dossier `k8s/` sur le serveur
- appliquer les manifests (via `kubectl apply -f ...` ou module `kubernetes.core.k8s`)

---

# 8) CI/CD : `git push` ➜ déploiement auto

## 8.1 Workflow GitHub Actions

`.github/workflows/deploy.yml` (principe) :
- checkout repo
- installe Ansible
- écrit un `inventory.ini` à partir des secrets
- SSH vers serveur avec `SSH_PRIVATE_KEY`
- lance `ansible/bootstrap.yml` (optionnel) et `ansible/deploy.yml`

**Important :**
- en prod, on évite de relancer “bootstrap” à chaque push (on le fait une fois, puis seulement “deploy”).

---

# 9) Application Node.js minimale (Hello + DB OK)

## 9.1 Endpoints
- `GET /` ➜ `Hello World`
- `GET /health/db` ➜ `MariaDB connect: OK`

## 9.2 Variables d’environnement (injectées par Kubernetes)
L’app doit lire :
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`

Ces valeurs viennent d’un **Secret** Kubernetes, lui-même généré à partir des **GitHub Secrets** (via Ansible).

> C’est ça qui rend le repo public : tu ne commits aucun secret.

---

# 🔐 Sécurité (résumé pragmatique)

Minimum recommandé :
- SSH par **clé** uniquement (pas de password)
- UFW : uniquement 22/80/443
- k3s à jour
- namespaces séparés
- secrets dans GitHub Actions + Kubernetes Secrets
- pas de credentials en clair dans `k8s/*.yaml`

---

# ✅ Check final

Quand tout est en place :

- `https://app.ton-domaine.com/` affiche `Hello World`
- `https://app.ton-domaine.com/health/db` affiche `MariaDB connect: OK`
- Un `git push` met à jour automatiquement le déploiement

---

# 🗣 English (phrases pro utiles)

- **Explain the flow**
  - “I bootstrap the server once, then all deployments are automated through Ansible and GitHub Actions.”

- **About secrets**
  - “All sensitive values are stored as GitHub repository secrets and injected at deploy time.”

- **About Kubernetes**
  - “Traefik handles ingress routing and HTTPS certificates via Let’s Encrypt.”

---

# 📄 License

Ce projet est sous licence **MIT**.  
Voir le fichier `LICENSE`.
