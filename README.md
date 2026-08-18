# KFSTORE — App mobile interne

App React Native (Expo) pour les vendeurs, caissiers et livreurs des boutiques KFSTORE. Consomme la même API que le back-office web (`../backend`).

## Démarrage

1. Copier `.env.example` en `.env` et mettre l'IP LAN de ta machine de dev (pas `localhost`, injoignable depuis un téléphone/simulateur) :
   ```
   EXPO_PUBLIC_API_BASE=http://<IP_LAN>:8000/api/v1
   ```
2. Démarrer le backend en écoutant sur toutes les interfaces réseau, pas seulement localhost :
   ```
   cd ../backend && .venv/bin/uvicorn app.main:app --reload --host 0.0.0.0
   ```
3. Installer les dépendances et lancer le bundler :
   ```
   npm install
   npm start
   ```
4. Scanner le QR code avec l'app **Expo Go** (iOS/Android) sur un téléphone connecté au même réseau Wi-Fi. Aucune installation de simulateur nécessaire.

**Si le téléphone n'arrive pas à joindre le backend en IP LAN** (VPN, réseau d'entreprise segmenté...), relancer avec `npx expo start --tunnel` : ça passe par un tunnel externe au lieu du Wi-Fi local, plus lent mais contourne les soucis de réseau local. Il faudra alors aussi rendre le backend joignable depuis l'extérieur (ou pointer temporairement `EXPO_PUBLIC_API_BASE` vers un backend déployé).

**Simulateur iOS** : mettre `EXPO_PUBLIC_API_BASE=http://localhost:8000/api/v1` dans `.env` (le simulateur partage le réseau de la machine hôte, contrairement à un téléphone physique) puis `npx expo start --ios`. Vérifié fonctionnel le 2026-08-12 (connexion, Stock, Caisse, Commandes avec données réelles).

## Structure

- `src/api/client.ts` — client HTTP (calque de `web/src/api/client.ts`), auth par Bearer token.
- `src/types/` — sous-ensemble des types partagés avec le web (dupliqués, pas de package partagé).
- `src/lib/AuthContext.tsx`, `src/lib/permissions.tsx` — auth et matrice de droits, calqués sur le web.
- `src/lib/offline.ts` — cache local (AsyncStorage) et file d'attente des ventes en mode
  dégradé (caisse/stock), synchronisation automatique au retour du réseau.
- `src/screens/` — Connexion, Stock, Caisse, Commandes, Livraisons, notifications push, gestion
  du profil.
- `src/navigation/` — stack d'auth + bottom tabs, onglets filtrés par la matrice de droits.

## Fonctionnalités notables

- **Mode hors-ligne** (caisse + consultation du stock) : bannière d'état, file d'attente locale,
  synchronisation automatique au retour du réseau. Activable/désactivable côté back-office
  (Sécurité → Paramètres application → "Mode hors-ligne").
- **Notifications push** (Expo Push API) : livraison affectée, remise en attente, alertes gérant.
- **Impression/partage de facture** (PDF) depuis le détail d'une commande.
- Rôle **livreur** avec écrans dédiés d'affectation et de suivi de livraison.

## Hors scope

Pas de scan code-barres — voir le plan de session pour le détail des choix.
