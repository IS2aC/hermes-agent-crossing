# ───────── Hermes Agent Crossing ─────────
PORT=8080
PUBLIC_URL=https://crossing.example.com
CROSSING_ADMIN_USER=admin
# Générer : docker run --rm ghcr.io/<owner>/hermes-agent-crossing:latest hash-password 'mon-mot-de-passe'
CROSSING_ADMIN_PASSWORD_HASH=
# openssl rand -base64 48
CROSSING_SESSION_SECRET=
CROSSING_CONFIG_PATH=/data/crossing.config.yaml
CROSSING_DATA_DIR=/data
LOG_LEVEL=info

# ───────── Hermes : API server (chat, runs, santé) ─────────
# Côté Hermes : API_SERVER_ENABLED=true, API_SERVER_KEY=..., API_SERVER_HOST adapté à la topologie
HERMES_API_URL=http://host.docker.internal:8642
HERMES_API_KEY=                     # clé du profil par défaut
# Clés par profil (multiplexage /p/<profile>/ : chaque profil a sa propre API_SERVER_KEY)
HERMES_KEY_JARVIS=
HERMES_KEY_DEV_MANAGER=
HERMES_KEY_AGENT_X=
HERMES_KEY_DESIGNER=
HERMES_KEY_TESTER=
HERMES_KEY_REVIEWER=
HERMES_KEY_VEILLEUR=

# ───────── Hermes : Dashboard API (profils, modèles, kanban, analytics) ─────────
HERMES_DASHBOARD_URL=http://host.docker.internal:9119
# Même valeur que HERMES_DASHBOARD_SESSION_TOKEN côté Hermes (bind loopback)
HERMES_DASHBOARD_SESSION_TOKEN=
# Alternative si le dashboard Hermes utilise l'auth username/password
HERMES_DASHBOARD_USER=
HERMES_DASHBOARD_PASSWORD=

# ───────── Timeouts ─────────
HERMES_TIMEOUT_MS=3000
HERMES_RETRY_MAX=3
