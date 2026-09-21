# Plataforma de Deploy Engeradios

Fonte oficial de deploy.

Proibido:

- docker rename
- docker run manual
- docker stop manual para deploy

Obrigatorio:

- deploy.sh
- rollback.sh
- healthcheck.sh

Todo deploy deve passar por healthcheck.
