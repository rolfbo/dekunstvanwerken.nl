# GitHub and Git Setup Documentation

This document explains the steps taken to configure Git on the server and establish a secure connection with GitHub. This is essential for version control and deploying code to the server.

## 1. Git Global Configuration
We have configured Git with your identity. This ensures that every commit you make is correctly attributed to you.

- **User Name:** Rolf Bosscha
- **User Email:** rolfbosscha@me.com

**Commands used:**
```bash
git config --global user.name "Rolf Bosscha"
git config --global user.email "rolfbosscha@me.com"
```

---

## 2. SSH Key Generation
To allow the server to communicate with GitHub securely without requiring a password for every action, we generated an SSH key. We used the **ED25519** algorithm, which is modern, fast, and very secure.

- **Private Key:** `~/.ssh/id_ed25519` (Keep this secret!)
- **Public Key:** `~/.ssh/id_ed25519.pub` (This is what we share with GitHub)

**Command used:**
```bash
ssh-keygen -t ed25519 -C "rolfbosscha@me.com" -f ~/.ssh/id_ed25519 -N ""
```

---

## 3. Adding the Key to GitHub
To complete the connection, the public key must be added to your GitHub account.

1.  **Get the public key:**
    ```bash
    cat ~/.ssh/id_ed25519.pub
    ```
2.  **Copy the output.** It should look like this: `ssh-ed25519 AAAAC3... rolfbosscha@me.com`
3.  **Go to GitHub:** Log in to your account.
4.  **Navigate to Settings:** Click your profile photo -> **Settings**.
5.  **SSH and GPG keys:** In the left sidebar, click **SSH and GPG keys**.
6.  **New SSH key:** Click the green **New SSH key** button.
7.  **Title:** Give it a name (e.g., "Debian Server").
8.  **Key:** Paste your public key into the "Key" field.
9.  **Add SSH key:** Click the **Add SSH key** button.

---

## 4. Verifying the Connection
Once the key is added, you can test if the server can connect to GitHub.

**Command:**
```bash
ssh -T git@github.com
```

**Expected Output:**
If successful, you will see a message like:
`Hi rolfbosscha! You've successfully authenticated, but GitHub does not provide shell access.`

---

## 5. GitHub CLI (gh) Installation
The GitHub CLI allows you to interact with GitHub directly from the command line - creating repositories, managing issues, and more.

**Install command:**
```bash
sudo apt update && sudo apt install -y gh
```

**Authenticate with GitHub:**
```bash
gh auth login
```
Follow the prompts to authenticate via browser.

---

## 6. Repository Information
The project code is hosted on GitHub at the following location:

- **Repository URL:** https://github.com/rolfbo/dekunstvanwerken.nl
- **Clone via SSH:** `git clone git@github.com:rolfbo/dekunstvanwerken.nl.git`
- **Clone via HTTPS:** `git clone https://github.com/rolfbo/dekunstvanwerken.nl.git`

**Useful commands:**
```bash
# Pull latest changes from GitHub
git pull origin main

# Push local changes to GitHub
git add .
git commit -m "Your commit message"
git push origin main

# Check repository status
git status
```

---

## Conclusion
Git is now installed and configured. The project repository is live on GitHub and ready for collaboration and deployment.
