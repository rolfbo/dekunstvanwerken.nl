# Deployment Setup

The site auto-deploys to the `dkvw` server on every push to `main` via the
GitHub Actions workflow `.github/workflows/deploy.yml`.

Mechanism: `rsync -avz --delete` over SSH, using a dedicated deploy key.

## One-time setup

### 1. Generate a dedicated deploy SSH keypair (on your local machine)

```bash
ssh-keygen -t ed25519 -f ~/.ssh/dkvw_deploy -N '' -C 'github-actions-dekunstvanwerken'
```

This creates `~/.ssh/dkvw_deploy` (private) and `~/.ssh/dkvw_deploy.pub` (public).

### 2. Authorise the public key on the server

```bash
ssh-copy-id -i ~/.ssh/dkvw_deploy.pub dkvw
# or, manually:
cat ~/.ssh/dkvw_deploy.pub | ssh dkvw 'mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys'
```

### 3. Prepare the target directory on the server

```bash
ssh dkvw '
  sudo mkdir -p /var/www/dekunstvanwerken.nl
  sudo chown -R $USER:$USER /var/www/dekunstvanwerken.nl
'
```

Make sure your web server (nginx/apache) serves that directory as the
document root for `dekunstvanwerken.nl`. SSL via Let's Encrypt is covered
in `dns_ssl_setup.md`.

### 4. Add the four secrets to the GitHub repository

Repo settings → Secrets and variables → Actions → New repository secret:

| Secret              | Value                                                |
|---------------------|------------------------------------------------------|
| `SSH_HOST`          | The hostname or IP behind the `dkvw` alias           |
| `SSH_USER`          | The SSH login user on the server                     |
| `SSH_PATH`          | `/var/www/dekunstvanwerken.nl` (no trailing slash)   |
| `SSH_PRIVATE_KEY`   | Full contents of `~/.ssh/dkvw_deploy` (private key)  |

For `SSH_PRIVATE_KEY`, paste the entire file including the
`-----BEGIN OPENSSH PRIVATE KEY-----` / `-----END OPENSSH PRIVATE KEY-----`
lines.

### 5. First deploy

Either push any commit to `main`, or trigger manually:
Actions tab → "Deploy to dkvw" → "Run workflow" → main.

## What gets deployed

Everything in the repo root **except**:

- `.git/`, `.github/`, `.gitignore`
- `instructions/` (developer docs, not public)
- `node_modules/`
- `*.md` (Markdown docs, not public)

`--delete` is used, so files removed from the repo are also removed from the
server. Don't store any server-only assets inside `/var/www/dekunstvanwerken.nl`
that aren't in the repo &mdash; they'll be wiped on the next deploy.

## Troubleshooting

- **Workflow fails on "Sanity-check required secrets":** one or more of
  `SSH_HOST` / `SSH_USER` / `SSH_PATH` / `SSH_PRIVATE_KEY` isn't set.
- **`Permission denied (publickey)`:** the deploy key's `.pub` isn't in
  the right `~/.ssh/authorized_keys` on the server, or `SSH_USER` doesn't
  match.
- **`rsync: failed to set times`:** target directory isn't writable by
  `SSH_USER`. Fix with `sudo chown -R <user> /var/www/dekunstvanwerken.nl`.
- **Host key changed:** server was rebuilt. The `ssh-keyscan` step picks
  up the new key on each run, so it should self-heal, but if it doesn't,
  delete and re-add the host secrets.
