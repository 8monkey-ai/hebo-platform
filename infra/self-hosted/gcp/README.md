# Hebo self-hosted on GCP

Provisions a single Compute Engine VM running Hebo (all-in-one container),
Postgres, GreptimeDB, and Caddy via `docker compose`, fronted by HTTPS.

## Files

| File | Role |
|---|---|
| `deploy.sh` | Entry point — `./deploy.sh <environment>`. Reserves a static IP, builds/pushes the image, sets up firewall/disk/VM. Safe to re-run (updates in place instead of failing). |
| `build-image.sh` | Builds the Hebo image with the environment's real domains baked into the console bundle, pushes it to GHCR. Not run directly — called by `deploy.sh`. |
| `startup-script.sh.tmpl` | Template rendered onto the VM at boot. Installs Docker, mounts the data disk, writes the compose file + Caddyfile, brings the stack up. |
| `environments/qa.env` | QA config — sslip.io hostnames, no domain needed. |
| `environments/production.env` | Production config — edit `BASE_DOMAIN` before first use. |

## Why the console needs a custom image

The published `8monkey/hebo-platform` image bakes `localhost:8521/8522/8523`
into the console's JS bundle at build time (Vite `VITE_API_URL` etc.), which
only works for browsers running on the same machine as the container. This
setup rebuilds the image per environment with the real public domains baked
in instead (see `apps/console/app/lib/env.ts` and `infra/docker/Dockerfile`).

The image only ever contains public domain names — never secrets — so it's
safe to publish as a public package, same trust model as the upstream image.

## One-time setup

**GHCR push access** — images publish to `ghcr.io/3cat-sdn-bhd/hebo-platform-selfhosted`:

```bash
gh auth refresh -h github.com -s write:packages,read:packages
echo $(gh auth token) | docker login ghcr.io -u buibaoanh --password-stdin
```

**GCP** — `gcloud` should already be authenticated with billing enabled on
the target project:

```bash
gcloud config get-value project
gcloud auth list
```

## Deploy

```bash
cd infra/self-hosted/gcp
./deploy.sh qa           # sslip.io hostnames, zero domain setup
./deploy.sh production   # edit environments/production.env's BASE_DOMAIN first
```

For `production` (`DOMAIN_MODE=custom`), the script prints the A records to
create and pauses until you confirm DNS is live — Let's Encrypt needs the
hostnames resolving before it can issue certs.

**After the first push to a new environment**, set the GHCR package to
public (one-time per package, no clean API for this — use the UI):

`https://github.com/orgs/3cat-Sdn-Bhd/packages/container/hebo-platform-selfhosted/settings`
→ Danger Zone → Change visibility → Public

Without this, the VM has no pull credentials and `docker compose pull` will
fail on first boot.

## After deploying

Watch first-boot provisioning (Docker install, image pull, Let's Encrypt):

```bash
gcloud compute ssh hebo-<env> --zone <zone> --tunnel-through-iap -- \
  'sudo journalctl -u google-startup-scripts -f'
```

Visit the Console URL printed at the end of `deploy.sh`'s output.

## Setting real secrets

`deploy.sh` never sets real secrets — only a random `AUTH_SECRET` is
generated on first boot. For OAuth/SMTP/LLM provider keys, SSH in and edit
`/opt/hebo/.env` directly, then restart:

```bash
gcloud compute ssh hebo-<env> --zone <zone> --tunnel-through-iap
sudo nano /opt/hebo/.env
cd /opt/hebo && sudo docker compose up -d
```

## What's intentionally not here

- **No `destroy.sh`** — tearing down an environment means manually deleting
  the VM, disk, static IP, and firewall rules via `gcloud`, in that order.
- **No Terraform-style state/plan** — `deploy.sh` is imperative gcloud
  commands with `create || echo "already exists"` idempotency, not a real
  state-tracked apply.
- **No ingress sharing story with other projects on the same VM yet** —
  Caddy currently owns 80/443 on the box. If another project needs to
  coexist on the same VM, that needs to be resolved before deploying both
  there (see git history on this file's directory for prior discussion).
