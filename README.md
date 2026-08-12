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

## Structure

- `src/api/client.ts` — client HTTP (calque de `web/src/api/client.ts`), auth par Bearer token.
- `src/types/` — sous-ensemble des types partagés avec le web (dupliqués, pas de package partagé).
- `src/lib/AuthContext.tsx`, `src/lib/permissions.tsx` — auth et matrice de droits, calqués sur le web.
- `src/screens/` — Connexion, Stock, Caisse, Commandes, Livraisons.
- `src/navigation/` — stack d'auth + bottom tabs, onglets filtrés par la matrice de droits.

## Hors scope (v1)

Pas de mode hors-ligne, pas de scan code-barres — voir le plan de session pour le détail des choix.
