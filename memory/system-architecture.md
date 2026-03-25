# WorkOn — Système Opérationnel Sans App

## Vue d'ensemble

```
                    ACQUISITION
            ┌──────────────────────────┐
            │  Facebook  Indeed  SEO   │
            │  Apollo    Gmail  Canva  │
            └──────────┬───────────────┘
                       ↓
              ┌────────────────┐
              │  FORMULAIRES   │
              │  Worker signup │
              │  Client mission│
              └───────┬────────┘
                      ↓
         ┌─────────────────────────┐
         │   GOHIGHLEVEL (HUB)    │
         │                         │
         │  CRM Contacts           │
         │  Pipeline Workers       │
         │  Pipeline Missions      │
         │  Pipeline Clients       │
         │  Automations            │
         │  Email/SMS sequences    │
         │  Forms & Landing pages  │
         └────┬──────┬──────┬─────┘
              │      │      │
              ↓      ↓      ↓
         ┌────┐ ┌──────┐ ┌──────┐
         │Notion│ │Stripe│ │Gmail │
         │ DB  │ │ Pay  │ │Notif │
         └────┘ └──────┘ └──────┘

Notion = Base de données opérationnelle (workers, missions, matching)
Stripe = Paiements (payment links, commission tracking)
Gmail  = Notifications manuelles + outreach
GHL    = Hub central (CRM, automations, séquences, formulaires)
```

---

## GoHighLevel — Configuration Complète

### Contacts (CRM)
Deux types de contacts dans GHL:

**Tag: Worker**
- Nom, Prénom
- Téléphone, Email
- Ville (Montréal, Laval, Longueuil, etc.)
- Catégories de services (ménage, déménagement, rénovation, peinture, etc.)
- Disponibilité (semaine, weekend, soir)
- Statut: Nouveau → Contacté → Qualifié → Actif → Inactif
- Custom fields: taux_horaire, experience_annees, permis_conduire, vehicule

**Tag: Client**
- Nom, Prénom (ou Nom entreprise)
- Téléphone, Email
- Ville
- Type: Particulier / Entreprise
- Statut: Nouveau → Mission postée → En cours → Complété → Récurrent

### Pipeline 1: Recrutement Workers
```
Étapes:
1. Nouveau lead       → Worker a rempli le formulaire ou trouvé via Apollo
2. Contacté           → Premier message envoyé (SMS ou email via GHL)
3. Appel qualif       → Appel de 5 min pour vérifier compétences/motivation
4. Qualifié           → Worker validé, ajouté au pool actif
5. Premier contrat    → Worker a complété sa première mission
6. Worker actif       → Worker récurrent dans le système
```

### Pipeline 2: Missions
```
Étapes:
1. Nouvelle demande   → Client a soumis un formulaire mission
2. Worker identifié   → Match trouvé dans le pool (Notion ou GHL)
3. Worker contacté    → Mission proposée au worker (SMS/email)
4. Worker accepté     → Worker a confirmé
5. Client confirmé    → Client notifié + payment link envoyé
6. Paiement reçu      → Stripe payment link payé
7. Mission en cours    → Worker exécute
8. Complétée          → Suivi envoyé aux deux parties
9. Review collecté    → Feedback client + worker
```

### Pipeline 3: Acquisition Clients
```
Étapes:
1. Lead entrant       → Via formulaire, SEO, réseaux sociaux
2. Contacté           → Réponse rapide (< 5 min si possible)
3. Mission créée      → Client a décrit son besoin
4. Converti           → Premier paiement reçu
5. Récurrent          → Client revient pour une 2e mission
```

### Automations GHL

#### Auto 1: Nouveau Worker
```
Trigger: Formulaire worker soumis
Actions:
  1. Créer contact avec tag "Worker"
  2. Ajouter au Pipeline Recrutement étape "Nouveau lead"
  3. Envoyer SMS: "Bienvenue! On a bien reçu ta candidature WorkOn. On te contacte dans les 24h."
  4. Envoyer email de bienvenue avec infos
  5. Notification interne (toi) pour appel qualif
  6. Wait 24h → si pas contacté → rappel interne
```

#### Auto 2: Nouvelle Mission Client
```
Trigger: Formulaire mission soumis
Actions:
  1. Créer contact avec tag "Client" (si nouveau)
  2. Créer opportunité dans Pipeline Missions étape "Nouvelle demande"
  3. Envoyer SMS client: "Merci! On cherche le meilleur worker pour votre mission. Réponse dans les 2h."
  4. Notification interne pour matching
  5. Wait 2h → si pas matché → escalade
```

#### Auto 3: Worker Accepte Mission
```
Trigger: Manuel (tu déplaces dans le pipeline) ou webhook
Actions:
  1. Envoyer SMS client: "Bonne nouvelle! [Worker] est disponible pour votre mission. Confirmez ici: [payment link]"
  2. Envoyer email avec détails mission + payment link Stripe
  3. Déplacer pipeline → "Client confirmé"
```

#### Auto 4: Paiement Reçu
```
Trigger: Stripe webhook → GHL
Actions:
  1. Déplacer pipeline → "Paiement reçu"
  2. SMS worker: "Mission confirmée! Détails: [lieu, date, heure]. Contact client: [téléphone]"
  3. SMS client: "Paiement reçu! [Worker] vous contactera pour confirmer les détails."
  4. Déplacer → "Mission en cours"
```

#### Auto 5: Suivi Post-Mission
```
Trigger: 24h après date de mission
Actions:
  1. SMS client: "Comment s'est passée votre mission avec [Worker]? Répondez 1-5"
  2. SMS worker: "Comment s'est passé le contrat avec [Client]? Répondez 1-5"
  3. Si note ≥ 4 → demander review Google
  4. Si note ≤ 2 → notification interne pour suivi
  5. Déplacer → "Review collecté"
```

#### Auto 6: Séquence Nurture Client (pas de mission immédiate)
```
Trigger: Client inscrit mais pas de mission après 3 jours
Actions:
  Jour 3: Email "On peut vous aider à trouver un worker pour votre prochain projet"
  Jour 7: SMS "Besoin d'un coup de main? Répondez OUI et on s'en occupe"
  Jour 14: Email avec témoignage client + offre première mission
```

### Formulaires GHL

#### Formulaire 1: Inscription Worker
```
Champs:
- Prénom, Nom
- Téléphone (obligatoire)
- Email
- Ville (dropdown: Montréal, Laval, Longueuil, Rive-Nord, Rive-Sud, Québec)
- Catégories de services (multi-select: ménage, déménagement, rénovation, peinture,
  assemblage, jardinage, homme à tout faire, nettoyage, livraison, IT)
- Disponibilité (checkboxes: semaine jour, semaine soir, weekend)
- As-tu un véhicule? (oui/non)
- Années d'expérience (1-2, 3-5, 5+)
- Taux horaire souhaité ($)
- Comment as-tu entendu parler de WorkOn?
```

#### Formulaire 2: Demande de Mission (Client)
```
Champs:
- Prénom, Nom (ou Nom entreprise)
- Téléphone (obligatoire)
- Email
- Type de service (dropdown: même liste que worker)
- Description de la mission (texte libre)
- Adresse / Ville
- Date souhaitée
- Budget estimé ($)
- Récurrent? (une fois / hebdomadaire / mensuel)
```

---

## Notion — Bases de Données Opérationnelles (CRÉÉES)

### DB 1: Workers WorkOn
- **URL**: https://www.notion.so/f61c11c9d3124b20aa9c50bf06b29a1a
- **Data source**: collection://546aed78-2040-4c63-962e-39b479bf0bad
- **Colonnes**: Nom, Téléphone, Email, Ville, Services (multi), Disponibilité (multi), Taux horaire, Véhicule, Expérience, Statut, Missions complétées, Note moyenne, Source, Date inscription

### DB 2: Clients WorkOn
- **URL**: https://www.notion.so/ff17697850fb4975a3f5cd496d11e901
- **Data source**: collection://38608143-f3eb-4fa5-a108-402f25acad48
- **Colonnes**: Nom, Téléphone, Email, Ville, Type, Statut, Total dépensé, Note moyenne, Source, Date inscription

### DB 3: Missions WorkOn
- **URL**: https://www.notion.so/6ee5c74b989f4e428d6a907d5dd967c6
- **Data source**: collection://ecf3d998-79c1-48c2-aa66-d8c07c735f2a
- **Colonnes**: Mission, Service, Description, Adresse, Date mission, Budget, Commission WorkOn, Récurrent, Statut, Montant payé, Payment link, Note client, Note worker, Date création

---

## Stripe — Configuration Paiements

### Méthode: Payment Links
Pour chaque mission acceptée:
1. Créer un Stripe Payment Link avec le montant exact
2. Envoyer au client via GHL (SMS + email)
3. Quand payé → webhook trigger GHL automation
4. Commission WorkOn: 15% retenu, 85% versé au worker

### Configuration requise:
- Stripe account en mode live
- Webhook Stripe → GHL pour "payment_intent.succeeded"
- Produit générique "Mission WorkOn" avec prix variable

---

## Acquisition — Plan d'Exécution

### Priorité 1: Recruter 20 Workers Montréal (Jour 1-4)

#### Canal A: Facebook Groups (/growth + Chrome)
```
Cibles:
- "Travailleurs autonomes Montréal"
- "Emplois Montréal"
- "Homme à tout faire Montréal"
- "Ménage résidentiel Montréal"
- "Déménagement Montréal"

Message type:
"Tu es travailleur autonome à Montréal? WorkOn te connecte avec des clients
qui ont besoin de tes services. Inscription gratuite, paiement rapide,
tu choisis tes missions. Inscris-toi: [lien formulaire GHL]"

Volume: 5-10 groupes, 2 posts par groupe
```

#### Canal B: Indeed / Kijiji (/growth + Chrome)
```
Rechercher:
- "travailleur autonome" Montréal
- "homme à tout faire"
- "ménage" contractuel
- "déménageur" disponible

Scraper les profils → Contact direct par email/téléphone via Apollo enrichment
```

#### Canal C: Apollo Prospecting (/data)
```
Recherche:
- Title: "travailleur autonome", "entrepreneur", "freelance"
- Location: Montreal, QC
- Enrichir avec email + téléphone
- Envoyer séquence Gmail d'invitation
```

#### Canal D: Réseau personnel
```
- Demander à tes contacts s'ils connaissent des workers
- Post sur ton LinkedIn/Facebook personnel
- Message direct à 10 personnes qui pourraient recommander
```

### Priorité 2: Premiers Clients (Jour 3-7)

#### Canal A: Réseau immédiat
```
- Poster dans tes groupes Facebook personnels
- "Besoin d'un ménage, déménagement, rénovation?
   On trouve le bon travailleur pour toi en 2h.
   Remplis le formulaire: [lien]"
```

#### Canal B: Facebook Groups Clients
```
Cibles:
- "Recommandations Montréal"
- "Entraide Montréal"
- Groupes de quartier (Plateau, Rosemont, Villeray, etc.)
- "Propriétaires Montréal"

Message:
"Besoin d'un coup de main? WorkOn trouve un travailleur fiable
pour vous en moins de 2h. Ménage, déménagement, rénovation,
peinture... Gratuit pour poster: [lien formulaire]"
```

#### Canal C: SEO Quick Wins (/content)
```
Si un site existe — créer 3 pages:
- "Trouver un homme à tout faire Montréal"
- "Service de ménage résidentiel Montréal"
- "Déménagement pas cher Montréal"
```

---

## Plan 7 Jours

### JOUR 1 — Infrastructure
| Tâche | Responsable | Outil |
|-------|-------------|-------|
| Créer formulaire Worker dans GHL | /architect | GHL |
| Créer formulaire Mission Client dans GHL | /architect | GHL |
| Créer Pipeline Recrutement Workers dans GHL | /architect | GHL |
| Créer Pipeline Missions dans GHL | /architect | GHL |
| Créer Notion DB Workers | /chief | Notion |
| Créer Notion DB Missions | /chief | Notion |
| Créer Notion DB Clients | /chief | Notion |
| Configurer Stripe product + payment link template | /architect | Stripe |
| Créer automation "Nouveau Worker" dans GHL | /architect | GHL |
| Créer automation "Nouvelle Mission" dans GHL | /architect | GHL |

### JOUR 2 — Contenu + Préparation Acquisition
| Tâche | Responsable | Outil |
|-------|-------------|-------|
| Écrire message recrutement worker (3 versions) | /content | Direct |
| Écrire message acquisition client (3 versions) | /content | Direct |
| Créer 3 visuels recrutement worker | /content | Canva |
| Créer 2 visuels acquisition client | /content | Canva |
| Lister 15 Facebook groups cibles (workers) | /data | Chrome |
| Lister 10 Facebook groups cibles (clients) | /data | Chrome |
| Préparer séquence email worker Apollo | /content | Gmail |

### JOUR 3 — Lancement Recrutement Workers
| Tâche | Responsable | Outil |
|-------|-------------|-------|
| Poster dans 10 groupes Facebook (workers) | /growth | Chrome |
| Lancer recherche Apollo workers Montréal | /data | Apollo |
| Envoyer 20 emails directs aux workers trouvés | /growth | Gmail |
| Poster sur Kijiji "on recrute des workers" | /growth | Chrome |
| Poster sur ton LinkedIn personnel | /growth | Chrome |

### JOUR 4 — Qualification Workers + Début Clients
| Tâche | Responsable | Outil |
|-------|-------------|-------|
| Appeler/qualifier les workers inscrits | Toi | Téléphone |
| Entrer workers qualifiés dans Notion DB | /chief | Notion |
| Activer automation GHL pour workers | /architect | GHL |
| Poster dans 5 groupes Facebook (clients) | /growth | Chrome |
| Poster demande de mission test (auto-test du flow) | /growth | GHL form |

### JOUR 5 — Acquisition Clients Active
| Tâche | Responsable | Outil |
|-------|-------------|-------|
| Poster dans 10 groupes Facebook (clients) | /growth | Chrome |
| Envoyer message à ton réseau (10 personnes) | /growth | Gmail |
| Créer automation "mission → matching" dans GHL | /architect | GHL |
| Créer Stripe payment link pour 1ère mission | /architect | Stripe |
| Tester le flow complet: formulaire → matching → paiement | /chief | All |

### JOUR 6 — Première Mission
| Tâche | Responsable | Outil |
|-------|-------------|-------|
| Matcher première demande client avec worker | Toi + /chief | Notion + GHL |
| Envoyer payment link au client | /architect | Stripe + GHL |
| Confirmer mission au worker | /growth | GHL SMS |
| Suivre l'exécution | /chief | Notion |

### JOUR 7 — Review + Optimisation
| Tâche | Responsable | Outil |
|-------|-------------|-------|
| Collecter feedback client + worker | /chief | GHL auto |
| Review: combien de workers recrutés? | /chief | Notion |
| Review: combien de missions demandées? | /chief | Notion |
| Identifier les blocages du flow | /ceo | All |
| Ajuster les messages si taux de réponse faible | /content | Direct |
| Planifier semaine 2 | /ceo + /chief | Notion |
