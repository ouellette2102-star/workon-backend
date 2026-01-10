# Screenshots Guide — WorkOn Store Assets

> Convention de nommage et spécifications pour les screenshots

---

## 📐 Dimensions requises

### iOS (App Store)

| Device | Dimensions | Dossier |
|--------|------------|---------|
| iPhone 6.5" (14 Pro Max) | 1290 x 2796 px | `ios/iphone-6.5/` |
| iPhone 5.5" (8 Plus) | 1242 x 2208 px | `ios/iphone-5.5/` |
| iPad Pro 12.9" | 2048 x 2732 px | `ios/ipad-12.9/` |

### Android (Google Play)

| Device | Dimensions | Dossier |
|--------|------------|---------|
| Phone | 1080 x 1920 px min | `android/phone/` |
| Tablet 7" | 1200 x 1920 px min | `android/tablet-7/` |
| Tablet 10" | 1600 x 2560 px min | `android/tablet-10/` |

---

## 📝 Convention de nommage

```
{numero}_{scene}_{locale}.png

Exemples:
01_home_feed_fr.png
02_mission_detail_fr.png
03_worker_profile_fr.png
04_payment_secure_fr.png
05_messages_chat_fr.png
06_consent_modal_fr.png
```

---

## 🎬 Scènes obligatoires

| # | Scène | Description | Fichier |
|---|-------|-------------|---------|
| 1 | Home / Feed | Liste des missions | `01_home_feed_fr.png` |
| 2 | Mission Detail | Détail complet d'une mission | `02_mission_detail_fr.png` |
| 3 | Worker Profile | Profil avec évaluations | `03_worker_profile_fr.png` |
| 4 | Payment | Écran paiement sécurisé | `04_payment_secure_fr.png` |
| 5 | Messages | Chat entre parties | `05_messages_chat_fr.png` |
| 6 | Consent Modal | Modal de consentement légal | `06_consent_modal_fr.png` |

---

## 🎬 Scènes optionnelles (recommandées)

| # | Scène | Description | Fichier |
|---|-------|-------------|---------|
| 7 | Create Mission | Formulaire création mission | `07_create_mission_fr.png` |
| 8 | Offers List | Liste des offres reçues | `08_offers_list_fr.png` |
| 9 | Contract | Écran de contrat | `09_contract_fr.png` |
| 10 | Settings | Paramètres / Profil | `10_settings_fr.png` |

---

## ⚠️ Règles importantes

### À FAIRE ✅
- Screenshots en français (Québec)
- Données réalistes mais fictives
- Interface propre, sans notifications système
- Mode portrait uniquement
- Couleurs et branding WorkOn cohérents

### À NE PAS FAIRE ❌
- Pas de données personnelles réelles
- Pas de texte "Lorem ipsum" ou placeholder
- Pas de barre de statut avec info personnelle
- Pas de notifications non liées à l'app
- Pas de watermarks ou badges "beta"

---

## 📱 Checklist par plateforme

### iOS
- [ ] iPhone 6.5" (6 screenshots min)
- [ ] iPhone 5.5" (6 screenshots min)
- [ ] iPad 12.9" (si app universelle)
- [ ] Format PNG ou JPEG
- [ ] Pas de transparence
- [ ] sRGB color space

### Android
- [ ] Phone (6 screenshots min)
- [ ] Tablet 7" (si supporté)
- [ ] Tablet 10" (si supporté)
- [ ] Format PNG ou JPEG (max 8MB)
- [ ] Ratio 16:9 recommandé

---

## 🎨 Guidelines visuelles

### Status bar
- iOS: Utiliser la status bar par défaut (ou masquer)
- Android: Mode immersif ou status bar standard

### Device frame
- Optionnel mais recommandé pour cohérence
- Utiliser les frames officiels Apple/Google
- Ou sans frame (plein écran)

### Texte overlay (optionnel)
- Police lisible (min 24pt)
- Contraste suffisant
- Pas plus de 2 lignes
- En haut ou en bas, pas au milieu

