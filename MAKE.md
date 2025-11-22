# Makefile pour WorkOn Backend

Ce fichier contient des commandes make utiles pour le développement. Si vous n'avez pas `make` installé, vous pouvez utiliser les équivalents npm directement.

## Installation de make (optionnel)

### Windows
```bash
# Avec Chocolatey
choco install make

# Ou utiliser les commandes npm directement
```

### macOS
```bash
# Déjà installé par défaut, ou via Xcode Command Line Tools
xcode-select --install
```

### Linux
```bash
# Ubuntu/Debian
sudo apt-get install make

# Fedora
sudo dnf install make
```

## Commandes disponibles

### Développement
```bash
make dev          # Démarrer en mode développement
make build        # Build l'application
make start        # Démarrer en production
```

### Base de données
```bash
make db-migrate   # Appliquer les migrations
make db-seed      # Seed la base de données
make db-studio    # Ouvrir Prisma Studio
make db-reset     # Réinitialiser la base de données
```

### Tests
```bash
make test         # Tests unitaires
make test-watch   # Tests en mode watch
make test-cov     # Tests avec couverture
make test-e2e     # Tests E2E
```

### Qualité
```bash
make lint         # Linter le code
make format       # Formatter le code
```

### Docker
```bash
make docker-up    # Démarrer avec Docker Compose
make docker-down  # Arrêter Docker Compose
make docker-logs  # Voir les logs
```

## Makefile complet

Créez un fichier `Makefile` à la racine du backend avec :

```makefile
.PHONY: help dev build start db-migrate db-seed db-studio db-reset test test-watch test-cov test-e2e lint format docker-up docker-down docker-logs

help:
	@echo "Commandes disponibles:"
	@echo "  make dev          - Démarrer en mode développement"
	@echo "  make build        - Build l'application"
	@echo "  make start        - Démarrer en production"
	@echo "  make db-migrate   - Appliquer les migrations"
	@echo "  make db-seed      - Seed la base de données"
	@echo "  make db-studio    - Ouvrir Prisma Studio"
	@echo "  make db-reset     - Réinitialiser la base de données"
	@echo "  make test         - Tests unitaires"
	@echo "  make test-watch   - Tests en mode watch"
	@echo "  make test-cov     - Tests avec couverture"
	@echo "  make test-e2e     - Tests E2E"
	@echo "  make lint         - Linter le code"
	@echo "  make format       - Formatter le code"
	@echo "  make docker-up    - Démarrer avec Docker Compose"
	@echo "  make docker-down  - Arrêter Docker Compose"
	@echo "  make docker-logs  - Voir les logs"

dev:
	npm run start:dev

build:
	npm run build

start:
	npm run start:prod

db-migrate:
	npm run migrate

db-seed:
	npm run seed

db-studio:
	npm run prisma:studio

db-reset:
	npm run migrate:reset

test:
	npm run test

test-watch:
	npm run test:watch

test-cov:
	npm run test:cov

test-e2e:
	npm run test:e2e

lint:
	npm run lint

format:
	npm run format

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f backend
```

