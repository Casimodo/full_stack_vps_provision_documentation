# 🚀 k3s + Traefik HTTPS + MariaDB + Node.js — Ansible + GitHub Actions
**First install / Deploy / Maintenance** — modèle public (zéro secrets dans Git)

Ce repo est un modèle complet pour :
- **First install (1 fois)** : préparer un serveur OVH vierge (sécurité + k3s + cert-manager + k9s)
- **Deploy (à chaque push)** : build/push l’image + rolling update (zéro downtime si replicas >= 2)
- **Maintenance (au besoin)** : mises à jour sécurité OS + exemple d’upgrade MariaDB

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

# ✅ Les 3 workflows (Actions)

Dans GitHub : **Actions**

1) **First Install** (manuel)  
   - fichier : `.github/workflows/first_install.yml`  
   - à lancer quand le serveur est vierge

2) **Deploy** (automatique à chaque push sur `main`)  
   - fichier : `.github/workflows/deploy.yml`

3) **Maintenance** (manuel)  
   - fichier : `.github/workflows/maintenance.yml`  
   - mises à jour système + upgrade MariaDB (exemple)

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
| `MARIADB_ROOT_PASSWORD` | `...` | root DB |
| `MARIADB_DATABASE` | `appdb` | DB |
| `MARIADB_USER` | `appuser` | user DB |
| `MARIADB_PASSWORD` | `...` | mdp user DB |

⚠️ **Important :** si `MARIADB_IMAGE` est vide, Kubernetes refusera le StatefulSet (**image required**).  
Mets au minimum : `mariadb:11`.

---

# 4) First install (manuel, 1 fois)

Dans GitHub :
- **Actions ➜ First Install ➜ Run workflow**

Ce workflow :
- configure UFW + Fail2ban
- change le port SSH (ex: 2022) et le garde ouvert
- installe k3s + helm + cert-manager + k9s
- configure kubeconfig pour root (`/root/.kube/config`)

Après ça, toutes les connexions CI se font sur `SSH_PORT`.

---

# 5) Deploy (automatique à chaque push)

À chaque `git push` sur `main` :
- build/push image app sur GHCR
- Ansible `deploy.yml` :
  - crée/maj le secret DB
  - applique MariaDB (StatefulSet + PVC)
  - applique l’app (Deployment rolling update + PDB + Service)
  - applique l’Ingress TLS

✅ Pour **zéro downtime** sur l’app : `APP_REPLICAS >= 2`.

---

# 6) Maintenance (manuel)

Dans GitHub :
- **Actions ➜ Maintenance ➜ Run workflow**

Ça fait :
- `apt update && apt upgrade` (+ autoremove/autoclean)
- reboot si nécessaire
- exemple : upgrade MariaDB via `MARIADB_IMAGE` (puis wait Ready)

⚠️ Une upgrade majeure DB peut nécessiter un plan (backup/restore). Le repo montre le mécanisme CI/CD.

---

# 7) Vérifications

## App
- `https://app.ton-domaine.com/` ➜ `Hello World`
- `https://app.ton-domaine.com/health/db` ➜ `MariaDB connect: OK`

## Certificat TLS “non valide” (check rapide)
Sur le serveur :
```bash
KUBECONFIG=/etc/rancher/k3s/k3s.yaml kubectl -n demo get certificate,secret,ingress
KUBECONFIG=/etc/rancher/k3s/k3s.yaml kubectl -n demo describe certificate
KUBECONFIG=/etc/rancher/k3s/k3s.yaml kubectl -n demo get order,challenge
```

Causes fréquentes :
- DNS pas propagé / mauvais A record
- port 80 bloqué (UFW OK mais firewall OVH externe)
- tu visites l’IP au lieu du domaine

---

# 🖥 k9s
Sur le serveur :
```bash
k9s
```

---

# 📄 License
MIT — voir `LICENSE`.
