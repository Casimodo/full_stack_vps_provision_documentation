# 🚀 k3s + Traefik HTTPS + MariaDB + Node.js (Hello World) — Full Auto with Ansible + GitHub Actions (v2)

> **Objectif :** serveur OVH vierge ➜ `git push` ➜ déploiement auto (k3s) ➜ HTTPS Let’s Encrypt ➜ app Node “Hello World” + endpoint DB “MariaDB connect: OK”  
> **Repo public :** aucun secret dans Git, tout passe par **GitHub Secrets**.

---

## Badges (remplace `OWNER/REPO`)

![License](https://img.shields.io/github/license/OWNER/REPO)
![Release](https://img.shields.io/github/v/release/OWNER/REPO)
![Stars](https://img.shields.io/github/stars/OWNER/REPO?style=social)
![Forks](https://img.shields.io/github/forks/OWNER/REPO?style=social)
![Issues](https://img.shields.io/github/issues/OWNER/REPO)
![CI](https://img.shields.io/github/actions/workflow/status/OWNER/REPO/deploy.yml?branch=main)

---

## ✨ Ce que ce repo met en place

### Déploiement
- k3s (Kubernetes léger) + Traefik (Ingress)
- cert-manager + Let’s Encrypt (HTTPS automatique)
- MariaDB (StatefulSet + PVC)
- Node.js (Hello World + health DB)

### Sécurité & admin serveur
- SSH par **clé** + port SSH configurable (ex: 2022)
- UFW configuré (ouvre **SSH_PORT**, 80, 443)
- Fail2ban (protection brute-force SSH)
- k9s installé sur le serveur (monitoring “kubectl” friendly)

### CI/CD
- Build & push image Docker sur GHCR
- Ansible “deploy” applique les manifests et crée les secrets k8s
- Aucun `kubectl` manuel à faire

---

# 📦 Arborescence

```
.
├─ ansible/
│  ├─ ansible.cfg
│  ├─ inventory.ini.example
│  ├─ bootstrap.yml
│  ├─ deploy.yml
│  └─ group_vars/all.yml.example
├─ k8s/
│  ├─ namespace.yaml
│  ├─ mariadb.yaml
│  └─ templates/
│     ├─ app.yaml.j2
│     ├─ ingress.yaml.j2
│     └─ issuer-letsencrypt.yaml.j2
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

## Serveur OVH
- Ubuntu 22.04/24.04 recommandé
- Accès SSH initial (souvent `root` + mot de passe OVH)

## Ton PC (Windows)
- Recommandé : **WSL Ubuntu** (pour gérer les clés SSH et éventuellement lancer Ansible localement)
- Ensuite : tout peut tourner depuis GitHub Actions

---

# 1) Étape unique : installer une clé SSH (et tester)

Dans WSL :

```bash
ssh-keygen -t ed25519 -C "k3s-ansible"
ssh-copy-id root@IP_DU_SERVEUR
ssh -i ~/.ssh/id_ed25519 root@IP_DU_SERVEUR "echo OK"
```

---

# 2) DNS OVH

Zone DNS OVH :
- record **A** : `app.ton-domaine.com` ➜ `IP_DU_SERVEUR`

---

# 3) GitHub Secrets (OBLIGATOIRE — repo public)

GitHub ➜ **Settings ➜ Secrets and variables ➜ Actions ➜ New repository secret**

| Secret | Exemple | Rôle |
|---|---|---|
| `SSH_HOST` | `123.123.123.123` | IP serveur |
| `SSH_USER` | `root` *(ou deployer)* | user SSH |
| `SSH_PORT` | `2022` | port SSH après hardening |
| `SSH_PRIVATE_KEY` | contenu `~/.ssh/id_ed25519` | clé privée pour CI |
| `APP_DOMAIN` | `app.ton-domaine.com` | domaine public |
| `LETSENCRYPT_EMAIL` | `toi@email.com` | email ACME |
| `MARIADB_ROOT_PASSWORD` | `...` | root DB |
| `MARIADB_DATABASE` | `appdb` | DB |
| `MARIADB_USER` | `appuser` | user DB |
| `MARIADB_PASSWORD` | `...` | mdp user DB |

🔒 **Aucun secret ne doit être committé.**

---

# 4) Bootstrap (une fois) — inclut SSH port, UFW, Fail2ban, k3s, cert-manager, k9s

## ⚠️ Important : port SSH
Le playbook va :
- ouvrir le **nouveau port** dans UFW
- configurer sshd pour écouter sur ce port (ex: 2022)
- recharger SSH
- garder l’accès SSH

👉 Si tu changes `ssh_port`, assure-toi d’avoir ajouté le secret GitHub `SSH_PORT` **et** que ton pare-feu OVH (si tu en utilises un) autorise aussi ce port.

### Exécution locale (optionnelle)
1) Copie `ansible/inventory.ini.example` ➜ `ansible/inventory.ini` (mettre IP + user + port initial 22)
2) Copie `ansible/group_vars/all.yml.example` ➜ `ansible/group_vars/all.yml` (mettre domaine, email, ssh_port, etc.)
3) Lance :

```bash
cd ansible
ansible-playbook -i inventory.ini bootstrap.yml
```

---

# 5) Déploiement (à chaque push)

Le workflow :
1) build/push l’image app sur GHCR
2) se connecte en SSH (port `SSH_PORT`)
3) lance Ansible `deploy.yml`
4) applique manifests (MariaDB + app + ingress TLS)

---

# 6) Vérification

- `https://app.ton-domaine.com/` ➜ `Hello World`
- `https://app.ton-domaine.com/health/db` ➜ `MariaDB connect: OK`

---

# 🖥 k9s (sur le serveur)

Après bootstrap, sur le serveur :

```bash
k9s
```

k9s utilise le kubeconfig k3s installé à `/root/.kube/config`.

---

# 🔐 Sécurité (résumé)

- SSH key only (recommandé) + port custom (ex: 2022)
- UFW : SSH_PORT / 80 / 443
- Fail2ban actif sur SSH
- Secrets uniquement dans GitHub Secrets + Kubernetes Secrets

---

# 🗣 English (phrases pro)

- “SSH is only used for the initial bootstrap. After that, deployments are fully automated via Ansible and GitHub Actions.”
- “We store all sensitive values in GitHub Secrets and inject them at deploy time.”

---

# 📄 License
MIT — voir `LICENSE`.
