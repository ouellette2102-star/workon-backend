# Pull Request

## Description

<!-- Décrire les changements apportés -->

## Type de changement

- [ ] Bug fix
- [ ] Nouvelle fonctionnalité
- [ ] Breaking change
- [ ] Documentation

## Checklist

### Code
- [ ] Le code suit les conventions du projet
- [ ] J'ai effectué un self-review de mon code
- [ ] J'ai commenté mon code, particulièrement dans les parties complexes
- [ ] Mes changements ne génèrent pas de nouveaux warnings
- [ ] J'ai ajouté des tests pour prouver que ma correction/fonctionnalité fonctionne
- [ ] Les tests unitaires et E2E passent localement
- [ ] J'ai mis à jour la documentation si nécessaire

### Sécurité
- [ ] Aucun secret n'est hardcodé dans le code
- [ ] Les variables d'environnement sont documentées dans `env.example`
- [ ] Les validations d'input sont en place
- [ ] Les permissions et rôles sont vérifiés

### Base de données
- [ ] Les migrations Prisma sont créées et testées
- [ ] Le script de seed fonctionne avec les nouvelles données
- [ ] Les contraintes de base de données sont appropriées

### Tests
- [ ] Les tests unitaires passent (`npm run test`)
- [ ] Les tests E2E passent (`npm run test:e2e`)
- [ ] La couverture de code est maintenue ou améliorée

### Déploiement
- [ ] Les variables d'environnement nécessaires sont documentées
- [ ] Le Dockerfile fonctionne correctement
- [ ] Les migrations peuvent être déployées en production

## Tests manuels effectués

<!-- Lister les tests manuels effectués -->

- [ ] Test d'inscription/connexion
- [ ] Test de création de mission
- [ ] Test de réservation de mission
- [ ] Test de paiement (si applicable)
- [ ] Test de signature de contrat (si applicable)

## Screenshots / Logs

<!-- Si applicable, ajouter des screenshots ou logs -->

## Issues liées

<!-- Référencer les issues liées -->

Closes #(issue)

## Notes additionnelles

<!-- Toute autre information pertinente -->

