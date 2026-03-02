# 🚀 k3s + Traefik HTTPS + MariaDB + Node.js — Ansible + GitHub Actions
**First install / Deploy / Maintenance** — modèle public (zéro secrets dans Git)

Ce repo est un modèle complet pour :
- **First install (1 fois)** : préparer un serveur OVH vierge (sécurité + k3s + cert-manager + k9s)
- **Deploy (à chaque push)** : build/push l’image + rolling update (zéro downtime si replicas >= 2)
- **Maintenance (au besoin)** : mises à jour sécurité OS + mise à jour k9s + exemple d’upgrade MariaDB

---

## Badges (remplace `OWNER/REPO`)

![License](https://img.shields.io/github/license/OWNER/REPO)
![Release](https://img.shields.io/github/v/release/OWNER/REPO)
![Stars](https://img.shields.io/github/stars/OWNER/REPO?style=social)
![Forks](https://img.shields.io/github/forks/OWNER/REPO?style=social)
![Issues](https://img.shields.io/github/issues/OWNER/REPO)
![Deploy](https://img.shields.io/github/actions/workflow/status/OWNER/REPO/deploy.yml?branch=main)
![First install](https://img.shields.io/github/actions/workflow/status/OWNER/REPO/first_install.yml?branch=main)
![Maintenance](https://img.shields.io/github/actions/workflow/status/OWNER/REPO/maintenance.yml?branch=main)

---

## 🎯 Objectif final

-   Serveur OVH vierge (accès SSH uniquement)
-   Push GitHub ➜ déploiement automatique
-   HTTPS automatique (Traefik + Let's Encrypt)
-   Base MariaDB
-   Application Node.js
-   Mise à jour automatique via CI/CD

------------------------------------------------------------------------

# 🧱 Architecture cible

    GitHub (push)
        │
        ▼
    GitHub Actions (CI/CD)
        │
        ▼
    Serveur OVH
     ├── k3s
     ├── Traefik
     ├── NodeJS App
     └── MariaDB

------------------------------------------------------------------------

## Installer Ansible

Ubuntu / WSL :

``` bash
sudo apt update
sudo apt install ansible -y
```

Vérifier :

``` bash
ansible --version
```

---

# ✅ Les 3 workflows (Actions)

Dans GitHub : **Actions**

1) **First Install** (manuel)  
   - fichier : `.github/workflows/first_install.yml`  
   - à lancer quand le serveur est vierge

2) **Deploy** (automatique à chaque push sur `main`)  
   - fichier : `.github/workflows/deploy.yml`

3) **Maintenance** (manuel)  
   - fichier : `.github/workflows/maintenance.yml`  
   - mises à jour système + **update k9s** + upgrade MariaDB (exemple)

---

# 0) Pré-requis

## Serveur OVH
- Ubuntu 22.04/24.04 recommandé
- Accès SSH initial (souvent `root` + mot de passe OVH)

## Ton PC Windows
- Recommandé : **WSL Ubuntu** (pour gérer les clés SSH et tester facilement)

---

# 1) Générer une clé SSH et tester l’accès (IMPORTANT)

Dans WSL :

```bash
# 1) clé SSH (ed25519)
ssh-keygen -t ed25519 -C "k3s-ansible"

# 2) copie de la clé publique sur le serveur (1ère fois avec password)
ssh-copy-id root@IP_DU_SERVEUR

# 3) test (doit répondre OK sans password)
ssh -i ~/.ssh/id_ed25519 root@IP_DU_SERVEUR "echo OK"
```

Si ça demande encore un password :
```bash
ssh -vvv -i ~/.ssh/id_ed25519 root@IP_DU_SERVEUR "echo OK"
```
et vérifie `/root/.ssh/authorized_keys` + permissions (`700` sur `.ssh`, `600` sur `authorized_keys`).

---

# 2) DNS OVH

Dans la zone DNS :
- record **A** : `app.ton-domaine.com` ➜ `IP_DU_SERVEUR`

> Let’s Encrypt délivre un certificat pour le **domaine**, pas pour l’IP.

---

# 3) GitHub Secrets (OBLIGATOIRE — repo public)

GitHub ➜ **Settings ➜ Secrets and variables ➜ Actions ➜ New repository secret**

| Secret | Exemple | Rôle |
|---|---|---|
| `SSH_HOST` | `123.123.123.123` | IP serveur |
| `SSH_USER` | `root` | user SSH |
| `SSH_PORT` | `2022` | port SSH final |
| `SSH_PRIVATE_KEY` | contenu `~/.ssh/id_ed25519` | clé privée pour CI |
| `APP_DOMAIN` | `app.ton-domaine.com` | domaine |
| `LETSENCRYPT_EMAIL` | `toi@email.com` | email ACME |
| `APP_REPLICAS` | `2` | nb pods app |
| `MARIADB_IMAGE` | `mariadb:11` | image MariaDB (upgrade) |
| `K9S_VERSION` | `v0.50.18` | version k9s |
| `MARIADB_ROOT_PASSWORD` | `...` | root DB |
| `MARIADB_DATABASE` | `appdb` | DB |
| `MARIADB_USER` | `appuser` | user DB |
| `MARIADB_PASSWORD` | `...` | mdp user DB |

---


## Étape 3 — Voir les pods
**Très souvent**, tu ne vois “rien” car :
- k9s n’utilise pas le bon kubeconfig
- ou tu es dans le mauvais namespace

Sur le serveur :
```bash
sudo -i
k9s
```

Dans k9s :
- `:ns` puis `demo`
- ou `:ns` puis `all`

Alternative (forcer kubeconfig) :
```bash
KUBECONFIG=/etc/rancher/k3s/k3s.yaml k9s
```

---

# 📄 License
MIT — voir `LICENSE`.
