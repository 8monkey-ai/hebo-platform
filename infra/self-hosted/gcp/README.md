# Hebo self-hosted on GCP

Provisions a single Compute Engine VM running Hebo (all-in-one container),
Postgres, GreptimeDB, and Caddy via `docker compose`, fronted by HTTPS.

Build and deploy are separate steps: `build.sh` produces a versioned image
and pushes it; `deploy.sh` points a (possibly already-running) VM at
whichever version you choose. This means you can build several versions and
pick which one a given server runs, without rebuilding on every deploy.

## Files

| File | Role |
|---|---|
| `build.sh` | Builds an image tagged with the environment + a version, pushes it to GHCR. Doesn't touch any VM. |
| `deploy.sh` | Points a VM at a specific already-built version. First run for an environment also provisions the static IP, firewall, disk, and VM. |
| `lib-domains.sh` | Shared by both — sourced, not run directly. Reserves the static IP and computes the 5 service hostnames. |
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

## Build

```bash
cd infra/self-hosted/gcp
./build.sh qa                  # version defaults to the current git short SHA
./build.sh qa v2-manual-test    # or name it explicitly
```

Prints the pushed tag and the exact `deploy.sh` command to run next.

**After the first push to a new environment**, set the GHCR package to
public (one-time per package, no clean API for this — use the UI):

`https://github.com/orgs/3cat-Sdn-Bhd/packages/container/hebo-platform-selfhosted/settings`
→ Danger Zone → Change visibility → Public

Without this, the VM has no pull credentials and `docker compose pull` will
fail on first boot.

## Deploy

```bash
./deploy.sh qa a1b2c3d          # deploy that exact version to qa
./deploy.sh production v1.4.0
```

For `production` (`DOMAIN_MODE=custom`), the script prints the A records to
create and pauses until you confirm DNS is live — Let's Encrypt needs the
hostnames resolving before it can issue certs.

Re-running `deploy.sh` with a different version against an existing VM
updates its startup-script metadata but doesn't restart anything by itself
— apply it with the command the script prints at the end.

## After deploying

Watch first-boot provisioning (Docker install, image pull, Let's Encrypt):

```bash
gcloud compute ssh hebo-<env> --zone <zone> --tunnel-through-iap -- \
  'sudo journalctl -u google-startup-scripts -f'
```

Visit the Console URL printed at the end of `deploy.sh`'s output.

## Setting real secrets

Neither script sets real secrets — only a random `AUTH_SECRET` is generated
on first boot. For OAuth/SMTP/LLM provider keys, SSH in and edit
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
- **No CI wiring** — `build.sh`/`deploy.sh` are run locally by hand. Worth
  revisiting if this grows beyond one person deploying.
- **No ingress sharing story with other projects on the same VM yet** —
  Caddy currently owns 80/443 on the box. If another project needs to
  coexist on the same VM, that needs to be resolved before deploying both
  there (see git history on this file's directory for prior discussion).
