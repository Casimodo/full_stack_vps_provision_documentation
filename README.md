# 🚀 k3s + Traefik HTTPS + MariaDB + Node.js — Ansible + GitHub Actions (Bootstrap / Deploy / Maintenance)

Ce repo est conçu comme **modèle complet** :

1) **Bootstrap (1 fois, manuel)**  
   - hardening (SSH port, UFW, Fail2ban)  
   - k3s + helm + cert-manager + k9s  
2) **Deploy (à chaque push)**  
   - build/push image app (GHCR)  
   - rolling update (replicas)  
   - secrets injectés (repo public safe)  
3) **Maintenance (au besoin, manuel)**  
   - **mise à jour sécurité du système** (apt upgrade)  
   - **exemple de montée de version MariaDB** (changement d’image + apply)  

---

## Badges (remplace `OWNER/REPO`)
![License](https://img.shields.io/github/license/OWNER/REPO)
![Release](https://img.shields.io/github/v/release/OWNER/REPO)
![Stars](https://img.shields.io/github/stars/OWNER/REPO?style=social)
![Forks](https://img.shields.io/github/forks/OWNER/REPO?style=social)
![Issues](https://img.shields.io/github/issues/OWNER/REPO)
![Deploy](https://img.shields.io/github/actions/workflow/status/OWNER/REPO/deploy.yml?branch=main)
![Bootstrap](https://img.shields.io/github/actions/workflow/status/OWNER/REPO/bootstrap.yml?branch=main)
![Maintenance](https://img.shields.io/github/actions/workflow/status/OWNER/REPO/maintenance.yml?branch=main)

---

# ✅ Les 3 workflows

## 1) Bootstrap (manuel)
GitHub ➜ **Actions ➜ Bootstrap ➜ Run workflow**  
➡️ Installe la base (k3s + sécurité + cert-manager + k9s).

Fichier : `.github/workflows/bootstrap.yml`

## 2) Deploy (automatique)
Chaque `push` sur `main` :
- build/push image app (GHCR)
- ansible `deploy.yml` (k8s apply + rolling update)

Fichier : `.github/workflows/deploy.yml`

## 3) Maintenance (manuel)
GitHub ➜ **Actions ➜ Maintenance ➜ Run workflow**  
➡️ Met à jour le système (sécurité) + exemple upgrade MariaDB.

Fichier : `.github/workflows/maintenance.yml`

---

# 🔐 Secrets GitHub (repo public)

GitHub ➜ **Settings ➜ Secrets and variables ➜ Actions ➜ New repository secret**

| Secret | Exemple | Rôle |
|---|---|---|
| `SSH_HOST` | `123.123.123.123` | IP serveur |
| `SSH_USER` | `root` | user SSH |
| `SSH_PORT` | `2022` | port SSH final |
| `SSH_PRIVATE_KEY` | contenu `~/.ssh/id_ed25519` | clé CI |
| `APP_DOMAIN` | `app.ton-domaine.com` | domaine |
| `LETSENCRYPT_EMAIL` | `toi@email.com` | ACME |
| `APP_REPLICAS` | `2` | nb pods app |
| `MARIADB_IMAGE` | `mariadb:11` | **image MariaDB** (upgrade) |
| `MARIADB_ROOT_PASSWORD` | `...` | root DB |
| `MARIADB_DATABASE` | `appdb` | DB |
| `MARIADB_USER` | `appuser` | user DB |
| `MARIADB_PASSWORD` | `...` | mdp user DB |

> Le secret `MARIADB_IMAGE` te permet de **monter la version** (ex: `mariadb:10.11` ➜ `mariadb:11`).

---

# 🧱 Données MariaDB : comment éviter de perdre tes données ?

- MariaDB est un **StatefulSet**
- il crée un **PVC** (volume persistant)
- un `kubectl apply` ne supprime pas le PVC

✅ Les données restent tant que tu ne supprimes pas les PVC / namespace.  
⚠️ Une **montée de version majeure** (ex: 10 ➜ 11) peut exiger un plan d’upgrade (backup/restore), selon ton usage.

---

# 🟢 Zéro interruption (site)
Pour zéro downtime :
- `APP_REPLICAS >= 2`
- rolling update `maxUnavailable: 0`
- readinessProbe OK

Le repo applique ça dans `k8s/templates/app.yaml.j2`.

---

# 🔧 Certificat HTTPS “non valide” (check rapide)
- Utilise le **domaine** (pas l’IP)
- Vérifie que le `Certificate` est Ready :
```bash
KUBECONFIG=/etc/rancher/k3s/k3s.yaml kubectl -n demo get ingress,secret,certificate
```
- Debug :
```bash
KUBECONFIG=/etc/rancher/k3s/k3s.yaml kubectl -n demo get order,challenge
KUBECONFIG=/etc/rancher/k3s/k3s.yaml kubectl -n demo describe certificate
```

---

# 🧰 Maintenance : updates sécurité + upgrade MariaDB

## A) Mise à jour système
Le playbook `ansible/maintenance.yml` :
- `apt update`
- `apt upgrade`
- supprime les paquets inutiles
- (optionnel) reboot si nécessaire

## B) Exemple upgrade MariaDB
Le même playbook applique :
- `k8s/mariadb.yaml` en remplaçant l’image par `{{ mariadb_image }}`
- attend le redémarrage du pod MariaDB

### ⚠️ Important (upgrade DB)
Une montée de version MariaDB **peut** demander :
- backup avant upgrade
- validation après upgrade

Dans un vrai projet :
- fais un dump avant : `mysqldump`
- ou utilise une solution de backup (ex: Velero / snapshots)

Ce repo reste volontairement simple, mais montre le **mécanisme complet** d’upgrade via CI/CD.

---

# 🖥 k9s (sur le serveur)
Après bootstrap :
```bash
k9s
```

---

# 📄 License
MIT — voir `LICENSE`.
