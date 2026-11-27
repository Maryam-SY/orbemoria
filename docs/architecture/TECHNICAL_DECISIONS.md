# Décisions techniques (ADR) — OrbeMoria

> Rôle BMAD : Architect · Version 1.0 (Phase 0)
> Statuts : **Acceptée** (imposée par le CDC ou l'existant, ou validée par l'équipe) · **Proposée** (en attente de validation, liée à un `OPEN-xx`) · **Remplacée par ADR-xxx**.
> Une ADR n'est jamais supprimée ; on en crée une nouvelle qui la remplace.

## Index

| ADR | Titre | Statut | OPEN |
|---|---|---|---|
| ADR-001 | Conserver Vite + React | Acceptée | — |
| ADR-002 | TypeScript strict (frontend et backend) | Acceptée | OPEN-02 |
| ADR-003 | Contenu en JSON versionné, pas de base de données (« site statique » amendé par ADR-016) | Acceptée, amendée | OPEN-18 |
| ADR-004 | Geler le backend Express existant | Remplacée par ADR-016 | OPEN-03 |
| ADR-005 | Pas de Docker | Acceptée (à réexaminer avec OPEN-18) | — |
| ADR-006 | Routage client avec react-router, état dans l'URL | Acceptée | OPEN-04 |
| ADR-007 | Carte 2D : fond raster dans SVG + marqueurs HTML, sans librairie cartographique | Proposée | OPEN-15 |
| ADR-008 | Pas de store global | Acceptée | — |
| ADR-009 | `Sourced<T>` + test d'intégrité du contenu (zod en devDependency) | Proposée | OPEN-17 |
| ADR-010 | Tailwind v4 + tokens COSMOS, primitives shadcn/base-ui conservées | Acceptée | OPEN-13 |
| ADR-011 | Garder oxlint comme linter | Acceptée | — |
| ADR-012 | Vitest + Testing Library, pas d'E2E navigateur dans le MVP | Proposée | — |
| ADR-013 | Déploiement Vercel + CI GitHub Actions | CI acceptée ; hébergement à réexaminer | OPEN-05, OPEN-18 |
| ADR-014 | Moteur narratif découplé de la technique d'animation | Acceptée | OPEN-10 |
| ADR-015 | Internationalisation : dictionnaires typés, sans librairie i18n | Acceptée | OPEN-06 |
| ADR-016 | Architecture frontend + backend (site dynamique) | Acceptée ; rôle de l'API tranché (OPEN-18) | OPEN-03, OPEN-18 |
| ADR-017 | Médias référencés par URL, pas stockés dans le dépôt | Acceptée de fait (appliquée depuis US-3.x) | — |
| ADR-018 | Accueil immersif « depth journey » sans bibliothèque | Acceptée | — |
| ADR-019 | Pages Destination et Récit en scroll immersif continu | Acceptée | — |
| ADR-020 | Modèles 3D NASA affichés avec `@google/model-viewer`, chargé à la demande | Acceptée (demande de l'équipe, 2026-11-14) | — |
| ADR-021 | Vidéo d'introduction de l'équipe et ciel commun au site | Acceptée (demande de l'équipe, 2026-11-14) | — |
| ADR-022 | Expérience « wow » : globes 3D, ciel animé, vol de photos, crédits sur About | Acceptée (demande de l'équipe, 2026-11-14) | — |
| ADR-023 | Une page par machine, hangar, son, narration, wolof et intro NASA | Acceptée (2026-11-14) | — |
| ADR-024 | Biographie propre à chaque machine et lecture suivie | Acceptée (2026-11-15) | — |
| ADR-025 | Les actes d'une vie remplacent le récit en six étapes ; direction artistique « Transmission » | Acceptée (2026-11-15) | PRD §2, STORY-003/005, V6 à revoir |
| ADR-026 | Hébergement : front et API dans un seul projet Vercel | Acceptée (décision de l'équipe, 2026-11-15) | Clôt OPEN-05 |
| ADR-027 | Photos compressées par l'optimisation d'images de Vercel (liens NASA conservés) | Acceptée (décision de l'équipe, 2026-11-15) | Complète ADR-017 |
| ADR-028 | Réalité augmentée des modèles NASA (WebXR, Quick Look) et QR code | Acceptée (demande de l'équipe, 2026-11-19) | Complète ADR-020 |

---

## ADR-001 — Conserver Vite + React

- **Statut** : Acceptée
- **Problème** : choisir le socle de l'application.
- **Options** : (a) Vite + React — déjà installé ; (b) Next.js / Astro (SSG) ; (c) Vanilla + Web Components.
- **Analyse** :
  - (a) Présent dans le dépôt, conforme au CDC §9, équipe déjà configurée, HMR rapide, build statique natif. − Rendu côté client uniquement (SEO limité, acceptable pour un hackathon).
  - (b) SSG/SEO meilleurs, Astro très adapté au contenu. − Changement de stack, courbe d'apprentissage, contredit l'existant et le CDC.
  - (c) Aucune dépendance. − Coût de développement élevé pour l'interactivité carte/récit.
- **Décision** : (a).
- **Conséquences** : SPA → nécessite un fallback `index.html` chez l'hébergeur (ADR-013).

## ADR-002 — TypeScript strict (frontend et backend)

- **Statut** : Acceptée le 2026-11-14 (OPEN-02) — étendue au backend à la demande de l'équipe
- **Problème** : le CDC exige TypeScript ; le dépôt est en JavaScript.
- **Options** : (a) migrer maintenant ; (b) rester en JS + JSDoc ; (c) migrer plus tard.
- **Analyse** :
  - (a) ≈ 8 fichiers à renommer, coût < 1 h ; permet `Sourced<T>`, unions de statuts, props typées — protège directement l'exactitude des données. − Ajout de `typescript` en devDependency.
  - (b) Pas de nouvelle dépendance. − Typage partiel, non conforme au CDC, pas de `tsc --noEmit` exploitable en CI.
  - (c) Coût croissant avec chaque composant ajouté.
- **Décision** : (a), `strict: true` + `noUncheckedIndexedAccess`, script `typecheck` dans les deux paquets. TypeScript 7.0 (compilateur natif), `moduleResolution: bundler` côté front, `NodeNext` côté back.
- **Conséquences** : `components.json` → `tsx: true` ; `jsconfig.json` remplacé par `tsconfig*.json` ; la CI inclut `typecheck`.

## ADR-003 — Site 100 % statique, contenu JSON, pas de base de données

- **Statut** : Acceptée (CDC §7), **amendée par ADR-016** : le site n'est plus « sans serveur » ; le principe « contenu en JSON versionné, pas de base de données » est maintenu en attendant OPEN-18.
- **Problème** : où stocker et comment servir le contenu ?
- **Options** : (a) JSON versionné dans le dépôt ; (b) base de données + API ; (c) CMS headless.
- **Analyse** :
  - (a) Zéro infrastructure, revue des contenus par PR (traçabilité scientifique), rédaction et développement en parallèle. − Pas d'édition WYSIWYG ; JSON verbeux pour les récits.
  - (b) Inutile : contenu en lecture seule, quelques dizaines d'entrées ; ajoute hébergement, sécurité, latence.
  - (c) Confort de rédaction. − Compte externe, dépendance réseau, temps de mise en place.
- **Décision** : (a).
- **Conséquences** : validation par test (ADR-009) ; si la rédaction des récits en JSON s'avère pénible, envisager Markdown + frontmatter en P1 (nouvelle ADR).

## ADR-004 — Geler le backend Express existant

- **Statut** : **Remplacée par ADR-016** (l'équipe veut un frontend et un backend)
- **Problème** : `backend/` existe alors que le CDC exclut tout serveur pour le MVP.
- **Options** : (a) le supprimer ; (b) le geler (conservé, non utilisé, non déployé) ; (c) l'utiliser pour servir le contenu.
- **Analyse** :
  - (a) Dépôt plus clair. − Suppression interdite sans validation ; travail d'un membre de l'équipe.
  - (b) Aucun risque, réversible. − Dossier inutile visible (documenté dans README).
  - (c) Contredit le CDC, ajoute un point de défaillance, coût d'hébergement.
- **Décision proposée** : (b).
- **Conséquences** : la CI ne construit que `frontend/` ; README signale le statut du dossier ; suppression éventuelle = décision humaine.

## ADR-005 — Pas de Docker

- **Statut** : Acceptée
- **Problème** : faut-il conteneuriser l'application ?
- **Options** : (a) non ; (b) Dockerfile (nginx servant `dist/`).
- **Analyse** : (b) n'apporte rien à un site statique déployé sur une plateforme statique, et ajoute un artefact à maintenir. L'environnement reproductible est garanti par `package-lock.json` + version Node fixée (`.nvmrc` / `engines`).
- **Décision** : (a).
- **Conséquences** : ajouter `.nvmrc` (Node 24) en phase 1.

## ADR-006 — Routage client avec react-router, état dans l'URL

- **Statut** : Acceptée le 2026-11-14 (OPEN-04) — react-router 8, `createBrowserRouter`, table de routes dans `src/app/routes.tsx`, URLs construites par `src/app/paths.ts`
- **Problème** : 4 pages + état de sélection et d'étape à rendre adressables (NAV-004).
- **Options** : (a) react-router ; (b) routeur maison (hash ou History API) ; (c) TanStack Router.
- **Analyse** :
  - (a) Standard, documenté, `useSearchParams`, error boundaries de route, lazy routes. − Une dépendance (~ dizaines de Ko gzip).
  - (b) Zéro dépendance. − À écrire et tester (params, 404, retour, focus) : temps de hackathon mal investi.
  - (c) Typage des routes excellent. − Moins familier, configuration plus lourde.
- **Décision proposée** : (a), version stable courante au moment de l'installation, mode `createBrowserRouter`.
- **Conséquences** : l'hébergeur doit réécrire toutes les routes vers `index.html` ; tests de composants enveloppés dans un `MemoryRouter`.

## ADR-007 — Carte 2D : fond raster dans SVG + marqueurs HTML, sans librairie cartographique

- **Statut** : Proposée (OPEN-15 pour le fond)
- **Problème** : afficher une carte 2D simplifiée, accessible, tactile, synchronisée avec la galerie.
- **Options** : (a) SVG maison (fond raster + marqueurs) ; (b) Leaflet / MapLibre avec tuiles planétaires ; (c) D3-geo ; (d) carte 3D (three.js / globe).
- **Analyse** :
  - (a) Conforme au CDC (« SVG maison »), aucun réseau externe, contrôle total de l'accessibilité, fonction de projection triviale et testable. − Pas de zoom/pan (acceptable en P0).
  - (b) Zoom réel, mais tuiles externes (disponibilité, licence), accessibilité des marqueurs à reprendre, poids, et risque de « carte précise » contraire au CDC §8.
  - (c) Projections avancées inutiles pour un équirectangulaire.
  - (d) Hors périmètre, coûteux sur mobile.
- **Décision proposée** : (a) — `<svg viewBox="0 0 360 180">` pour le fond et les tracés (P1), **marqueurs `<button>` HTML superposés** en pourcentage (cible tactile fixe ≥ 44 px, focus natif), regroupement des points proches en marqueurs de site.
- **Conséquences** : coordonnées normalisées est-positif [-180, 180] ; fond centré sur le méridien 0 ; mention « schématique » obligatoire ; error boundary autour de la carte.

## ADR-008 — Pas de store global

- **Statut** : Acceptée
- **Problème** : partager la sélection entre carte, galerie, fiche, fil d'Ariane.
- **Options** : (a) URL + props ; (b) Context React ; (c) Zustand/Redux.
- **Analyse** : l'état partagé se limite à `destinationId`, `machineId`, `step`, `from` — tous déjà dans l'URL. (b) et (c) dupliqueraient cet état et créeraient des désynchronisations avec le bouton retour.
- **Décision** : (a).
- **Conséquences** : un hook `useSelectedMachine()` encapsule la lecture/écriture de `?machine`.

## ADR-009 — `Sourced<T>` + test d'intégrité du contenu

- **Statut** : Proposée (OPEN-17)
- **Problème** : garantir qu'aucun fait affiché n'est dépourvu de source et que les références sont cohérentes (CDC §7, risque R2).
- **Options** : (a) types TS seuls ; (b) types + test d'intégrité écrit à la main ; (c) types + schémas zod utilisés **uniquement dans les tests** ; (d) zod à l'exécution.
- **Analyse** :
  - (a) Les imports JSON ne sont pas vérifiés finement par TypeScript (littéraux élargis) → insuffisant.
  - (b) Aucune dépendance. − Validateurs longs à écrire et à maintenir, messages d'erreur moins précis.
  - (c) Schémas déclaratifs, messages précis, **0 octet dans le bundle** (devDependency). − Une dépendance de dev.
  - (d) Protection runtime, mais coût bundle et inutile pour un contenu figé au build.
- **Décision proposée** : (c) — schémas zod pour la structure (V1, V2, V5, V9, V11, V12) + règles relationnelles en TypeScript (V3, V4, V6–V8, V10).
- **Conséquences** : `npm test` et la CI bloquent tout contenu invalide ; les types TS sont dérivés des schémas ou alignés par un test de compatibilité.

## ADR-010 — Tailwind v4 + tokens COSMOS, primitives shadcn/base-ui conservées

- **Statut** : Acceptée le 2026-11-14 (OPEN-13), **amendée le 2026-11-16** : les tokens COSMOS sont remplacés par la palette ORBEMORIA « Cosmic Knowledge » (variables `--orbemoria-*`, DESIGN_SYSTEM v2.0) ; même mécanisme — tokens dans `src/styles/tokens.css`, `<html class="dark">`, paquet `cn` retiré au profit de `@/lib/utils`
- **Problème** : le thème actuel (shadcn neutre, Geist) ne correspond pas à l'identité COSMOS.
- **Options** : (a) remplacer les variables du thème shadcn par les tokens COSMOS et charger les 3 polices via `@fontsource` ; (b) retirer shadcn et tout écrire en CSS ; (c) garder le thème neutre.
- **Analyse** :
  - (a) Réutilise l'outillage en place ; les primitives base-ui fournissent focus-trap, ARIA (Dialog, Popover) utiles pour la fiche et les sources. − 3 paquets de polices (OFL, auto-hébergées).
  - (b) Perte de primitives accessibles à réécrire.
  - (c) Non conforme à l'identité validée.
- **Décision proposée** : (a), thème sombre unique ; retrait de `@fontsource-variable/geist`.
- **Conséquences** : tokens documentés dans DESIGN_SYSTEM.md ; `Stellar Border` réservé au décoratif (contraste 1,5–1,9:1, insuffisant pour délimiter un composant interactif).

## ADR-011 — Garder oxlint comme linter

- **Statut** : Acceptée
- **Problème** : la consigne mentionne ESLint « si configuré » ; le dépôt utilise oxlint.
- **Options** : (a) oxlint ; (b) migrer vers ESLint ; (c) les deux.
- **Analyse** : oxlint est déjà configuré (règles React hooks), très rapide, supporte TypeScript et les règles jsx-a11y. ESLint apporterait un écosystème plus large au prix d'une configuration supplémentaire sans besoin identifié.
- **Décision** : (a) ; activer le plugin `jsx-a11y` et `typescript` d'oxlint en phase 1.
- **Conséquences** : `npm run lint` = oxlint ; QUALITY_GATES y fait référence.

## ADR-012 — Vitest + Testing Library, pas d'E2E navigateur dans le MVP

- **Statut** : Proposée
- **Problème** : quel niveau de test automatisé pour un hackathon ?
- **Options** : (a) Vitest + RTL (installé) ; (b) + Playwright E2E ; (c) tests manuels seuls.
- **Analyse** : (a) couvre logique, intégrité du contenu et interactions principales (sync, récit, focus) en jsdom ; (b) plus réaliste mais installation navigateurs, CI plus lente, temps d'écriture ; (c) insuffisant pour des agents qui modifient le code.
- **Décision proposée** : (a) + smoke test manuel scripté (QG-SMOKE) sur l'URL déployée.
- **Conséquences** : les comportements dépendant de la mise en page réelle (défilement, tailles tactiles) sont vérifiés manuellement (QG-RESP, QG-A11Y).

## ADR-013 — Déploiement Vercel + CI GitHub Actions

- **Statut** : **CI acceptée** (`.github/workflows/ci.yml`, matrice frontend/backend) ; hébergement **décidé par ADR-026** (front + API sur Vercel)
- **Problème** : publier un site statique public avec contrôles automatisés.
- **Options** : (a) Vercel ; (b) Netlify ; (c) Cloudflare Pages ; (d) GitHub Pages.
- **Analyse** :
  - (a)(b)(c) Détection Vite, HTTPS, prévisualisation par PR, réécritures SPA simples, sous-dossier `frontend/` supporté. Différences mineures pour ce besoin.
  - (d) Gratuit et intégré, mais réécriture SPA non native (astuce `404.html`) et pas de prévisualisation par PR.
- **Décision proposée** : (a) Vercel pour sa prévisualisation par PR et sa configuration minimale ; (b)/(c) restent des remplacements à coût quasi nul.
- **Conséquences** : `frontend/vercel.json` (réécriture SPA) ; CI GitHub Actions indépendante de l'hébergeur (lint, typecheck, test, build) ; aucun secret dans le dépôt ; liaison du compte Vercel par un humain.

## ADR-014 — Moteur narratif découplé de la technique d'animation

- **Statut** : Acceptée (respecte le report volontaire du CDC §5, OPEN-10)
- **Problème** : développer le récit sans avoir choisi entre scroll storytelling et parallax.
- **Options** : (a) choisir maintenant ; (b) moteur pas-à-pas contrôlé + point d'extension d'animation unique.
- **Analyse** : (a) prendrait une décision que le CDC réserve à l'équipe. (b) satisfait déjà les exigences fixées (Previous/Next, progression, sans animation) et permet d'ajouter une mise en page scroll consommant les mêmes données.
- **Décision** : (b) — `StoryExperience` contrôlé, animation confinée à `StoryTransition`.
- **Conséquences** : le pas-à-pas devient le repli permanent (STORY-009) ; toute technique future est un nouveau layout, sans changement du modèle de données.

## ADR-015 — Internationalisation : dictionnaires typés, sans librairie i18n

- **Statut** : Acceptée le 2026-11-14 (OPEN-06, demande explicite de « prévoir l'internationalisation »)
- **Problème** : l'interface MVP est en anglais (CDC), la traduction française est P2.
- **Options** : (a) chaînes en dur dans les composants ; (b) module `i18n/en.ts` typé ; (c) i18next / FormatJS.
- **Analyse** : (a) rend la traduction coûteuse ; (c) surdimensionné pour une langue ; (b) coût nul et prépare le P2.
- **Décision** : (b) étendue — `src/i18n/messages/en.ts` (source, `as const`) et `fr.ts` typé `Messages` (TypeScript refuse une clé manquante ; un test vérifie l'égalité des clés), `I18nProvider` + `useTranslation()` → `t('cle.pointee', { var })`, clés typées (autocomplétion, faute de frappe = erreur de compilation), repli sur l'anglais puis sur la clé, `<html lang>` synchronisé. Langue par défaut : `en`. Bascule vers react-i18next possible si besoin de pluriels complexes ou de chargement à la demande.
- **Conséquences** : aucun libellé visible en dur dans les composants (revue de code) ; le contenu scientifique (JSON) n'est **pas** dans ces dictionnaires — sa traduction est un sujet distinct (P2).

## ADR-016 — Architecture frontend + backend (site dynamique)

- **Statut** : Acceptée le 2026-11-14 (décision de l'équipe : « on veut un côté front et un backend ») ; **rôle fonctionnel de l'API ouvert (OPEN-18)**
- **Problème** : le CDC §7 prévoit un site statique sans serveur ; l'équipe veut un site dynamique avec un backend.
- **Options** : (a) rester 100 % statique (ADR-003/004) ; (b) frontend React + API Express en TypeScript ; (c) framework full-stack (Next.js, Remix/React Router framework mode).
- **Analyse** :
  - (a) Le plus simple à héberger, conforme au CDC. − Contraire à la décision de l'équipe.
  - (b) Réutilise l'existant (`backend/` Express 5), séparation nette, l'API peut servir le contenu et évoluer (recherche, quiz, statistiques anonymes). − Deux artefacts à déployer, CORS / proxy, l'interface doit gérer chargement et erreur réseau.
  - (c) Un seul projet, SSR possible. − Réécriture du frontend existant, courbe d'apprentissage en plein hackathon.
- **Décision** : (b). Backend en TypeScript (`backend/src/app.ts` construit l'app, `server.ts` écoute), tests avec Vitest + supertest, contrôlé par la même CI. En développement, Vite redirige `/api/*` vers `http://localhost:3000`.
- **Conséquences** :
  - L'hébergement doit couvrir un service Node (OPEN-05 réouverte).
  - Le contrat d'API (routes, formats, erreurs) devra être documenté avant son implémentation (OPEN-18).
  - Exigence de résilience : si l'API est indisponible, l'interface affiche un message clair et ne doit jamais afficher de donnée non sourcée.
  - Écart assumé avec le CDC §7, tracé ici.

### ADR-016 — complément (2026-11-14, OPEN-18 tranchée)

- Le contenu vit dans `backend/content/` (JSON versionnés, relus par PR). Le backend le charge au démarrage, le **valide** (règles V1–V12) et **refuse de démarrer** en cas d'erreur.
- API en lecture seule, localisée par `?lang=en` ou `?lang=fr` : contrat dans ARCHITECTURE §16.
- Toujours pas de base de données : la traçabilité scientifique passe par l'historique Git.

## ADR-017 — Médias référencés par URL, pas stockés dans le dépôt

- **Statut** : Proposée (choix fait pour le lot de contenu du 2026-11-14, à valider)
- **Problème** : l'équipe veut « tous les types d'images et de vidéos » des missions. Les vidéos et les images pleine résolution pèsent des centaines de Mo, et chaque média doit rester crédité et traçable.
- **Options** : (a) télécharger les fichiers dans `frontend/public/images/` ; (b) référencer les URL officielles (NASA, JPL, YouTube) avec légende, crédit et page source ; (c) mélange : références par défaut, copies optimisées uniquement pour les images affichées en premier.
- **Analyse** :
  - (a) Fonctionne même si les sites NASA sont indisponibles et donne le contrôle du poids. − Dépôt alourdi, droits à suivre fichier par fichier, travail d'optimisation.
  - (b) Rapide, toujours fidèle à la source, aucune donnée lourde dans Git. − Dépend de la disponibilité des sites NASA (les URL peuvent changer), pas de contrôle du poids des images.
  - (c) Bon compromis pour la démo. − Demande de trier les médias « de couverture ».
- **Décision proposée** : (b) maintenant, puis (c) en phase 5 pour les images de couverture (téléchargement **après accord humain**).
- **Conséquences** : entité `Media` (type, url, pageUrl, caption recopiée, alt fr/en, credit, license, missionIds, machineIds, sourceId). Contrôle des liens (QG-LINKS) indispensable avant la release ; jpl.nasa.gov renvoie 403 aux robots, donc ses pages se vérifient à la main.

## ADR-018 — Accueil immersif « depth journey » sans bibliothèque

- **Statut** : Acceptée le 2026-11-14 (demande explicite de l'équipe ; implémentée par US-2.1, PR #3)
- **Problème** : l'équipe veut un accueil centré sur la Lune et Mars, avec rotations au survol, distorsions au scroll et entrée « dans » la planète au clic, et que le scroll donne l'impression que **la page vient vers le visiteur** plutôt qu'un défilement vertical (barre de défilement masquée). SCOPE classait ces animations en P2 et DESIGN_SYSTEM limitait les animations à 200 ms.
- **Options** : (a) garder l'accueil sobre (conforme aux docs) ; (b) bibliothèque d'animation (GSAP, Framer Motion) ou 3D (three.js) ; (c) implémentation maison : CSS 3D, filtres SVG, canvas 2D, `requestAnimationFrame`, View Transitions natives.
- **Analyse** :
  - (a) Conforme, mais contraire à la demande de l'équipe.
  - (b) Rapide à écrire. − Nouvelles dépendances (poids, licence GSAP), WebGL coûteux sur mobile.
  - (c) Aucune dépendance, contrôle total de l'accessibilité. − Plus de code à maintenir, View Transitions absentes de certains navigateurs (repli : navigation simple).
- **Décision** : (c). `DepthJourney` (piste de scroll + scène `sticky` en perspective, caméra sur l'axe z, indicateur de parcours, snap de proximité, focus clavier qui déplace la caméra), `LivePlanet` (rotation, inclinaison, distorsion `feDisplacementMap`), `WarpField` (canvas), `viewTransition` de react-router pour le morph vers `/explore/:id`. Boucle d'animation unique par composant, écritures DOM directes, aucun rendu React par frame.
- **Conséquences** :
  - Exception tracée dans SCOPE (ligne P0) et DESIGN_SYSTEM (règle « Animations ») ; les animations avancées **dans les récits** restent P2.
  - `prefers-reduced-motion: reduce` : l'accueil devient des sections classiques, aucune animation ni transition (NFR-A11Y-006).
  - Barre de défilement masquée **uniquement** sur l'accueil (`html.depth-mode`), remplacée par un indicateur accessible.
  - À vérifier avant la démo : fluidité sur mobile bas de gamme, Safari et Firefox.

---

## ADR-019 — Pages Destination et Récit en scroll immersif continu

- **Statut** : Acceptée le 2026-11-14 (demande explicite de l'équipe, option A de `docs/project/stories/US-5.6.md` ; implémentée par US-5.6)
- **Problème** : l'équipe veut que **tout le site** soit une expérience au scroll « fixe », sans navigation compliquée, et pas seulement l'accueil (ADR-018). Le PRD impose pourtant pour le récit une liste d'étapes cliquable (STORY-004), Previous/Next et une progression qui ne dépend jamais du seul défilement (STORY-005), l'étape dans l'URL (NAV-004) et un récit complet sans animation (STORY-009). SCOPE classait le « scroll storytelling » des récits en P2.
- **Options** : (A) scroll continu partout, contrôles réduits à un HUD discret ; (B) un seul long scroll pour tout le site (casse NAV-004 : URLs, retour, partage) ; (C) scroll seul, sans boutons (contraire à STORY-004/005 et au clavier).
- **Décision** : (A), sans dépendance nouvelle.
  - **Destination** : planète épinglée (`PinnedDestinationPlanet`, une variable CSS `--p` écrite au scroll) qui s'enfonce en horizon derrière les missions ; une scène par mission ; scène finale « monde suivant » ; rail de sections (`JourneyRail`, ancres natives, scroll-spy par IntersectionObserver) à partir de `md`.
  - **Récit** : les 6 étapes rendues comme scènes plein écran d'un même scroll (`StepScene`) ; l'étape au centre de l'écran est écrite dans `?step=` (`replace`), les sauts (rail `StepRail`, `StoryControls` Previous/Next/Exit, touches ← →, retour navigateur) font `push` puis défilent vers la scène et y placent le focus. Couleur d'ambiance par étape (`@property --step-accent`).
  - **Global** : en-tête « verre » fixe, sélecteur EN/FR (choix mémorisé en `localStorage`), fond étoilé partagé, squelettes de chargement, `ScrollRestoration`.
- **Conséquences** :
  - Remplace le principe « un seul pas visible » d'ADR-014 : `StoryExperience` reste piloté par l'URL, la progression ne dépend toujours pas du seul scroll.
  - Exception d'animation étendue (DESIGN_SYSTEM §4) : apparitions au scroll ≤ 700 ms, transition de couleur d'ambiance 700 ms ; jamais porteuses d'information.
  - `prefers-reduced-motion: reduce` : planète non épinglée (rendue dans le héros), aucune apparition ni défilement animé ; les scènes restent des sections lisibles.
  - Rail de la destination masqué sous `md` (le scroll suffit, EQUIP-006 reste couvert à partir de `md`).
  - À vérifier avant la démo : Safari/Firefox (View Transitions, `@property`), mobile bas de gamme (`backdrop-filter`).

## ADR-020 — Modèles 3D NASA affichés avec `@google/model-viewer`, chargé à la demande

- **Statut** : Acceptée — demande écrite de l'équipe le 2026-11-14 (« ajoute les modèles 3D avec model-viewer »)
- **Problème** : montrer en vraie 3D, que l'on peut faire tourner, les machines dont la NASA publie un modèle. Les liens « 3D » du contenu étaient des pages NASA intégrées (`gltf_embed`) : l'une renvoyait une 404 portant le logo NASA (interdit par CLAUDE.md §7), l'autre pointait vers un domaine retiré.
- **Options** :
  - (a) `<iframe>` des pages NASA ;
  - (b) `@google/model-viewer` lisant les fichiers `.glb` des « NASA 3D Resources » ;
  - (c) `three.js` seul, avec une visionneuse maison.
- **Analyse** :
  - (a) Aucune dépendance. − Pages tierces qui changent ou disparaissent, habillage et logo NASA, aucune maîtrise de l'accessibilité.
  - (b) Composant web standard : rotation à la souris, au toucher et au clavier, `alt`, rotation auto désactivable, contrôle du `touch-action` pour garder le défilement de la page. Licence Apache-2.0 ; dépend de `three` (MIT) et `lit` (BSD-3). − Bibliothèque lourde : environ 1 Mo, 291 Ko gzip.
  - (c) Plus léger en théorie. − Rotation, éclairage, chargement Draco, accessibilité et gestion des erreurs à écrire et à maintenir : disproportionné pour un hackathon.
- **Décision** : (b), avec les règles suivantes.
  - **Chargement à la demande** : `import('@google/model-viewer')` n'a lieu qu'au clic sur « Turn it in 3D » (`ModelViewer3D`). Vite en fait un fichier séparé, et le bundle principal ne grossit que d'environ 5 Ko.
  - **Médias par URL (ADR-017)** : les `.glb` sont lus sur `assets.science.nasa.gov`, qui répond `Access-Control-Allow-Origin: *` (vérifié le 2026-11-14). Aucun modèle n'est copié dans le dépôt.
  - **Aucune requête vers Google** : par défaut, `model-viewer` télécharge son décodeur Draco sur `www.gstatic.com`. Les modèles NASA étant compressés en Draco, le décodeur est servi par le site, dans `frontend/public/draco/`. Les fichiers sont copiés tels quels depuis `three@0.183.2` (Apache-2.0, voir `NOTICE.txt`) et configurés avant l'import. L'emplacement KTX2 pointe aussi vers le site (aucun modèle actuel n'utilise KTX2).
  - **Défilement préservé** : `disable-zoom`, car le zoom à la molette appelle `preventDefault` et bloquerait le parcours. `touch-action="pan-y"`.
  - **Mouvement réduit** : pas de rotation automatique.
  - **Seuls les fichiers `.glb`/`.gltf` sont affichés** (`lib/journey.ts → modelOf`). Les autres médias `3d-model` restent de simples liens vers leur page.
- **Conséquences** :
  - Dépendances ajoutées dans `frontend/` : `@google/model-viewer@^4.4.0` et `three@^0.183.2` (dépendance pair, déclarée explicitement).
  - Vite affiche un avertissement de taille pour le fichier `model-viewer`. Il est attendu, puisque ce fichier n'est chargé qu'à la demande.
  - Les tests remplacent le module (`vi.mock`), car jsdom n'a pas WebGL.
  - Le rendu réel a été vérifié dans Chromium : WebGL logiciel, 1440 et 360 px.

---

## ADR-021 — Vidéo d'introduction de l'équipe et ciel commun au site

- **Statut** : Acceptée le 2026-11-14 (demande explicite de l'équipe ; US-2.4)
- **Problème** : l'équipe fournit une vidéo (9,5 s : surface de la Lune, titre « The Next Frontier », puis la Lune et Mars sur la Voie lactée) et veut qu'elle ouvre le site, que l'accueil apparaisse à sa fin (deux planètes en surbrillance, titre « Choisis ta destination » tapé à la machine), et que le fond de la vidéo devienne le fond de tout le site.
- **Décision** :
  - Fichiers **dans le dépôt** (`frontend/public/media/`) : contrairement aux médias NASA servis par référence (ADR-017), c'est un élément d'interface fourni par l'équipe. `intro.mp4` réencodée en H.264 sans piste audio (0,69 Mo, `faststart`), `intro-poster.jpg` (première image), `space-bg.jpg` (dernière image **sans les planètes**, retouchée : diffusion du ciel et réemploi du grain d'étoiles des bords de l'image, 1696 × 956, 161 Ko).
  - `IntroVideo` : plein écran au-dessus de l'accueil, **muette** (seule une vidéo muette démarre automatiquement), bouton « Passer l'intro » (focalisé) et touche Échap ; jouée **une fois par visite** (`sessionStorage`) ; ignorée sous `prefers-reduced-motion` et si le navigateur refuse la lecture ; en portrait, vidéo entière (`object-contain`). Badge « Contient des animations » (MEDIA-001 : les planètes de la vidéo sont des images de synthèse).
  - Fondu croisé de 900 ms : l'accueil s'allume pendant que la vidéo s'efface ; planètes en halo pulsé (`.planet-glow`) ; titre révélé lettre par lettre sans décaler la mise en page (le texte complet reste lu par les lecteurs d'écran).
  - Ciel commun : classe `.space-sky` sous le champ d'étoiles de toutes les pages (voile sombre `--sky-veil`) ; vignette du champ d'étoiles allégée pour laisser voir la Voie lactée.
- **Conséquences** : la musique de la vidéo n'est pas utilisée. **Origine et licence de la vidéo à confirmer par l'équipe**, puis crédit dans About (ABOUT-001). Aucune dépendance ajoutée.

## ADR-022 — Globes 3D WebGL, ciel NASA haute définition et effets sans flou d'arrière-plan

- **Statut** : Acceptée le 2026-11-14 (demande explicite de l'équipe : « images de plus haute qualité, plus réaliste, corriger le lag » ; US-5.11)
- **Problème** : (1) la page Destination tombait à ~4 images/s pendant le scroll (mesure navigateur : médiane 350 ms par image) ; (2) le ciel venait de la dernière image de la vidéo (848 × 478 agrandie) et les planètes de photos de 640 px : rendu flou, peu réaliste.
- **Causes mesurées** : le champ d'étoiles était 140 dégradés CSS **repeints** à chaque scroll ; une dizaine de panneaux `backdrop-filter: blur()` devaient être re-floutés à chaque image au-dessus d'un fond qui bouge ; la planète SVG re-rastérisait sa photo à chaque image.
- **Décision** :
  - **Globes** : la Lune et Mars sont des sphères WebGL éclairées par un soleil (terminateur réel, relief LOLA pour la Lune, fin liseré d'atmosphère pour Mars), avec `three` (déjà dépendance du projet, ADR-020) **chargé à la demande** (`import()` : morceau séparé, rien sur le premier chargement). La photo SVG s'affiche tant que le globe n'est pas prêt et reste le repli sans WebGL (tests, vieux navigateurs). Un globe ne se dessine que s'il est visible (IntersectionObserver ; sur l'accueil, opacité de la scène). Taille du tampon = **taille de mise en page** (`clientWidth`, jamais `getBoundingClientRect()` qui est agrandi par la perspective 3D de l'accueil), plafonnée à 720 px CSS × DPR ≤ 2. Typages minimaux locaux (`src/types/three.d.ts`) plutôt que `@types/three` (aucune dépendance ajoutée).
  - **Textures** (domaine public, dans `frontend/public/planets/globe/`, WebP 2k + 4k choisie selon la taille affichée) : NASA SVS « CGI Moon Kit » (LRO, version avec pôles) + LOLA ; USGS/NASA/JPL Viking MDIM 2.1 colorisée.
  - **Ciel** : NASA SVS « Deep Star Maps 2020 » (coordonnées galactiques, centre galactique), exposé, incliné de 16° et recadré par l'équipe → `public/media/sky-milkyway-{1280,1920}.webp`. Il remplace `space-bg.jpg` (conservé dans le dépôt, plus utilisé) ; dérive lente en `transform` uniquement.
  - **Étoiles** : chaque couche est peinte **une seule fois** dans un petit canvas ; le scroll ne fait que la déplacer (`translate3d`, GPU).
  - **Panneaux** : `glass` n'a plus de `backdrop-filter` (dégradé sombre + liseré lumineux) ; le vrai flou est réservé aux petites barres fixes (`glass-blur` : en-tête, contrôles du récit, bouton de l'intro).
- **Mesures** (navigateur intégré, 987 × 630, DPR 1,25, scroll programmé de 90 pas) : Destination Mars **avant** 16 images en 3 s (médiane 350 ms) → **après** médiane 16,7 ms, p95 17,2 ms, 0 image > 34 ms ; Lune : médiane 16,7 ms, p95 17,2 ms ; accueil : médiane 16,7 ms, p95 33,3 ms (identique à avant, avec 2 à 4 globes 3D en plus).
- **Conséquences** : poids des textures (Lune 2k 0,33 Mo, Mars 2k 0,49 Mo ; versions 4k ~1,1 Mo chargées seulement pour un grand globe) au-dessus de NFR-PERF-001 (≤ 300 Ko) : **dérogation à valider par l'équipe**. Crédits de ces visuels sur la page About.
- **Complément du 2026-11-14 (2e passe, demande de l'équipe : « un fond qui s'anime, qui avance », planètes centrées, défilement des images façon konkelectrical.com)** :
  - **Ciel vivant** (`SpaceScene`, monté **une fois** dans `Layout` : il continue de voler d'une page à l'autre) : un seul contexte WebGL plein écran, `three` chargé à la demande. Lueur de la Voie lactée = carte NASA SVS « Deep Star Maps 2020 » **sans étoiles** (`milkyway_2020_4k_gal`, → `public/media/sky-milkyway-pano.webp`, 0,5 Mo), car une carte étoilée agrandie rend des étoiles floues ; 3 600 étoiles lointaines nettes (points GPU, denses le long du plan galactique) tournent avec le ciel ; 3 200 étoiles en 3D viennent vers le visiteur (tunnel infini). Le scroll accélère le voyage (et le fait reculer en remontant). Ciel plus lumineux sur l'accueil, assombri sur les pages de lecture. Repli sans WebGL : ancien ciel photo + `Starfield`. Sous `prefers-reduced-motion` : une image fixe. Remplace `WarpField` sur l'accueil (fichier conservé, plus utilisé).
  - **Globes** : soleil plus frontal (le disque se lit en entier, centré), liseré froid côté nuit pour détacher la sphère du ciel, léger flottement CSS.
  - **Vol de photos** (`journey/PhotoFlight.tsx`, inspiré du principe de konkelectrical.com — **aucun code ni image repris**) : scène épinglée en perspective ; chaque photo d'un moment est accrochée à gauche ou à droite d'un couloir, tournée vers le visiteur, et approche puis passe pendant le scroll ; le texte du moment change dans un panneau de lecture. Utilisé par le journal de mission et les chapitres de chaque machine. Les photos du couloir sont décoratives (`aria-hidden`, badge MEDIA-001 visible) ; la liste des moments garde texte, légende, badge et image pour les lecteurs d'écran ; liste simple sous `prefers-reduced-motion`.
  - **Piège mesuré et corrigé** : des originaux NASA de 5000 × 3500 px dans une couche 3D en mouvement étaient re-rastérisés à chaque changement d'échelle (gels jusqu'à 2 s). Chaque photo du couloir est décodée **hors du fil principal** (`decode()` + `createImageBitmap` redimensionné à 1400 px), dessinée une fois dans un canvas, préparée **une à la fois** et seulement quand le couloir approche ; `will-change: transform` fige sa rastérisation.
  - **Mesures** (navigateur intégré 800 × 761, DPR 1,25, 100 `scrollTo` espacés de 33 ms sur toute la page Mars) : 1er passage (photos en cours de préparation) médiane 16,7 ms, p95 17,3 ms, 6 images > 34 ms, pire 216 ms ; 2e passage 0 image > 34 ms, pire 17,4 ms. Accueil : médiane 16,7 ms, p95 33,3 ms.

## ADR-023 — Une page par machine, hangar, son, narration, wolof et intro NASA

- **Statut** : Acceptée le 2026-11-14 (décisions de l'équipe, réponses du 2026-11-14 : « une page par machine », « voix du navigateur maintenant », « interface en wolof, récits plus tard », « nouvelle intro faite d'images NASA » ; US-5.12)
- **Problème** : le récit mélangeait les machines d'une même planète (« on ne sait pas de quel appareil tu parles ») ; il manquait la vie de chaque machine (durée prévue, fin réelle), le son, la narration, le wolof ; l'intro (848 × 478) était floue ; la carte des sites et les sources dans le texte alourdissaient.
- **Décision** :
  - **Routes** : `/explore/:destinationId` devient un **hangar** (une carte par machine : photo propre à la machine, années de vie, statut ; survol = surbrillance + inclinaison 3D vers le pointeur ; clic = la machine tourne sur elle-même puis sa photo vole vers sa page, View Transitions). **Nouvelle route** `/explore/:destinationId/:machineId` : une machine, dans l'ordre de sa vie (arrivée → sa vie prévue/réelle → ce qu'elle a fait en vol de photos → vidéos → 3D → héritage → dernier signal → machine suivante). `paths.machine` pointe désormais vers cette page (frise, récits).
  - **Retiré du parcours** : carte des sites (`SiteMap`), défilement des missions (`MissionGallery`, `MissionTimeline`, `MachineJourney`), listes de sources dans le récit et le glossaire (toutes les sources restent sur About). Les fichiers sont conservés, non utilisés, en attente de validation avant suppression (CLAUDE.md §6).
  - **Contenu** : champ `Machine.lifespan` (DATA_MODEL, règle V16), 11 machines renseignées en `draft` depuis des pages NASA/NSSDCA/JPL ouvertes et citées ; 5 nouvelles sources. La couverture d'une machine préfère une photo d'elle seule.
  - **Son** : `lib/ambientSound.ts`, Web Audio pur (drone + souffle synthétisés, aucun fichier) ; désactivé par défaut, interrupteur dans l'en-tête, choix mémorisé, démarre au premier geste (règle des navigateurs) ; « whoosh » entre les pages ; baissé pendant une narration ou une vidéo sonore.
  - **Narration** : `speechSynthesis` du navigateur (`lib/narration.ts`) sur la page machine et le récit en 6 étapes ; rien n'est envoyé ; bouton absent sans synthèse vocale. Remplaçable plus tard par des voix enregistrées.
  - **Vidéos** : `VideoReel` lit les fichiers vidéo NASA (mp4) muets et automatiquement à l'écran, avec ce qu'elles montrent écrit sur l'image, enchaîne la suivante, puis emmène à la section suivante ; YouTube non intégré (pas de tiers).
  - **Wolof** : locale `wo` (dictionnaire `messages/wo.ts`, **brouillon** à faire relire par un locuteur natif ; paragraphes longs en français) ; l'API reçoit `fr` (`contentLang`) ; dates en français.
  - **Intro** : `public/media/intro-nasa.mp4` (15,2 s, 1080p, 6,2 Mo, sans son) montée depuis la NASA Image and Video Library (domaine public) : « Ultimate Saturn V Launch », « Apollo 11 Restored Moonwalk », « Perseverance Rover’s Descent and Touchdown on Mars » ; **sans logo NASA** (fin du clip écartée) ; phrases traduites en surimpression HTML. Plus de badge « animation » : images réelles. `intro.mp4` / `space-bg.jpg` conservés, non utilisés.
- **Conséquences** : tests de la page Destination réécrits pour le hangar et la page machine ; 4 tests de la carte retirés avec la carte (demande de l'équipe). Aucune dépendance ajoutée.

## ADR-024 — Biographie propre à chaque machine et lecture suivie

- **Statut** : Acceptée le 2026-11-15 (réponse de l'équipe : « Oui, ses propres chapitres » ; US-5.13)
- **Problème** : la page d'une machine reprenait les étapes de sa mission ; des jumeaux partageaient donc des étapes (« Spirit quitte la Terre » sur la page d'Opportunity), et les textes, courts, donnaient des indices plutôt qu'un récit complet. Pendant la narration, la page ne suivait pas la voix.
- **Décision** :
  - **Contenu** : champ optionnel `Machine.biography` = `{ status, description: Sourced<LocalizedText>, chapters: MachineChapter[] }` (DATA_MODEL, règle **V17**). Chaque chapitre est daté et sourcé, en phrases complètes, et n'illustre qu'avec des images liées à **cette** machine. Toujours `draft` tant qu'un humain ne l'a pas relu. Les sources ne sont jamais écrites dans le texte : elles restent sur la page À propos.
  - **Page machine** : une section « Qui est-il » (présentation complète) puis le vol de photos des chapitres de la biographie ; sans biographie, repli sur les étapes de la mission (comportement d'ADR-023).
  - **Lecture suivie** : la narration lit les textes marqués `data-narrate` dans l'ordre de la page (`data-narrate-text` pour une phrase parlée différente) ; le texte lu est surligné, le mot prononcé aussi (API CSS Custom Highlight, sans modifier le DOM ; ignoré si absente) ; la page défile pour garder la lecture au milieu, sauf pendant 5 s après un défilement à la main ; une barre « Lecture en cours · Arrêter » reste visible.
  - **Demandes du 2026-11-15 (suite)** : l'intro se termine sur le titre « The Next Frontier » en gros plan, avec une bande-son synthétisée (Web Audio, aucun fichier ; bouton « Activer le son » si le navigateur bloque) ; accueil sans sur-titre ni boutons (la planète est le lien), planètes plus grandes et lumineuses, **rotation à la vitesse réelle relative** (périodes sidérales NSSDCA : Terre 23,9345 h, Mars 24,6229 h, Lune 655,72 h ; 1 s = 1 h), petite Terre de référence, grande invitation à défiler ; frise de la destination limitée aux étapes de ses missions ; carte « journal d'explorateur » retirée de l'affichage (l'enregistrement reste) ; sur la page machine, plus de bouton « récit en 6 étapes » : le récit est raconté en diapositives (texte et image arrivent de côtés opposés, en alternance) après « sa mission jour après jour » ; panneaux de lecture plus opaques (`reading-panel`) et halo de texte (`text-legible`).
  - **Demandes du 2026-11-15 (fin)** : présentation de la machine avec sa photo en pseudo-3D (`MachinePortrait` : inclinaison au pointeur, reflet, profondeur ; pièces touchables) ; pièces aussi touchables sur le modèle 3D (repères `model-viewer` + toucher le modèle ouvre la pièce la plus proche) ; champ `parts` (règle V18) et `biography.forEarth` ; section « Pour nous, sur Terre » ; chaque photo d'un chapitre devient une étape du vol, avec un compteur « Jour N de sa mission » ; plus de ligne « Comment on le sait » ; sélecteur de langue en menu déroulant ; transitions de page en fondu-zoom et fondu des sections au défilement (CSS `animation-timeline: view()`, amélioration progressive) ; sur téléphone, la photo devient le fond du texte (vol de photos, diapositives) sous un masque dégradé ; accueil épuré (ni Terre, ni libellés, ni durées ; indication discrète « Cliquez sur la Lune pour découvrir son histoire » dans les scènes suivantes).
- **Conséquences** : la liste des textes lus n'est plus dupliquée dans le code (elle vient de la page). La page `/stories/:id` reste accessible (frise, fin de récit). Aucune dépendance ajoutée.

## ADR-025 — Les actes d'une vie remplacent le récit en six étapes ; direction artistique « Transmission »

- **Statut** : Acceptée le 2026-11-15 (demande de l'équipe : « il ne faut pas se limiter à 6 étapes pour raconter l'histoire d'une machine ; chaque machine a sa propre histoire » ; US-5.14)
- **Problème** : le récit en six étapes fixes (Signal, Why, How, Discovery, Relay, Your turn ; PRD §2 et STORY-00x, règle V6) racontait onze vies différentes dans le même moule et doublonnait la biographie de la machine. L'identité visuelle, propre, restait générique (panneaux « verre », étiquettes mono).
- **Décision** :
  - **Actes** (`lib/acts.ts`) : la structure du récit d'une machine est **calculée depuis ses dates sourcées** — Départ (avant l'arrivée) → Mission prévue (jusqu'à la durée annoncée) → Prolongations (jusqu'au dernier signal, titrées par le ratio « ×57 ») → Silence (du dernier signal à la fin déclarée, dont la durée est le sujet) → Après (ce qui reste, visites, vues d'orbite) ; une machine encore en service a un acte « répond encore » ; sans durée prévue connue, un acte « Sa mission ». Les actes « plan », « prolongations » et « silence » existent même sans chapitre (carte-titre seule). Chaque acte : une carte-titre plein écran (numéro romain, titre, dates, le chiffre qui le définit, ton de couleur : indigo / monde / or / poussière / vert) puis le vol de photos de ses chapitres. Aucune valeur n'est créée : arithmétique sur `date`, `lifespan.planned`, `lastContact`, `missionEnd`, `stillWorking`.
  - **Ouverture à froid** : la page machine commence par la fin — « Dernier signal reçu le … » (ou « Toujours en service — depuis … ») se décode, puis le nom de la machine (`DecodeText`). Le texte réel reste disponible aux lecteurs d'écran ; rien sous `prefers-reduced-motion`.
  - **Pages `/stories/:id`** : plus liées depuis les pages machine (le bloc « À ton tour », voix *Imagine*, est repris en fin de page quand le récit est celui de la machine seule). Les routes, composants (`StorySlides`, `StepScene`…) et contenus (règle V6) sont **conservés** en attendant la décision de l'équipe de les retirer ou non (CLAUDE.md §6 : aucune suppression sans validation). Le PRD (§2 parcours, STORY-003/005) et `USER_FLOWS` sont à mettre à jour par le PM.
  - **Direction artistique « Transmission »** : grain de film et vignette fixes sur tout le site (`CinemaLayer`, sans mode de fusion : peu coûteux sur le ciel animé), anneau de curseur sur écrans à souris (`CursorRing`), ligne de télémétrie (`TelemetryBar` : voyant d'état **toujours accompagné du texte**, barres de signal, id NSSDCA, lieu, coordonnées sourcées), coins de cadre HUD (`HudCorners`), balayage de scan sur la photo d'arrivée, identifiant NASA sur la photo au premier plan du vol, en-tête « dossier » des cartes du hangar (n° / total, id, voyant, barres), chargement « Acquisition du signal », séquence du dernier signal (trace, ligne plate, date qui se tape, crépitement radio si le son est activé). Tout est `opacity`/`transform`, coupé sous `prefers-reduced-motion` ; aucune information n'est portée par la couleur seule.
- **Conséquences** : DESIGN_SYSTEM §4 complété (couche Transmission). Tests : `lib/acts.test.ts` (5) ; tests de la page machine réécrits sur les actes. Aucune dépendance ajoutée.

## ADR-026 — Hébergement : front et API dans un seul projet Vercel

- **Statut** : Acceptée le 2026-11-15 (décision de l'équipe : « Mettons tout sur Vercel ») ; clôt OPEN-05.
- **Problème** : depuis ADR-016, le site a deux parties : le build statique Vite (`frontend/dist`) et l'API Express qui sert le contenu validé (`backend/`). ADR-013 ne couvrait que le statique.
- **Options** : (a) Vercel pour le front + Render/Railway/Fly.io pour l'API ; (b) un seul service Node qui sert l'API et le build du front ; (c) tout sur Vercel : le front en fichiers statiques, l'API en **Vercel Function**.
- **Décision** : (c).
  - `vercel.json` à la racine : installation des deux paquets (`npm ci --prefix frontend && npm ci --prefix backend`), build de l'API (`tsc` → `backend/dist`) puis du front, sortie `frontend/dist`.
  - `api/index.mjs` exporte `createApp()` (compilé depuis `backend/src/app.ts`) : **une seule fonction** pour tout `/api/*` (réécriture `/api/(.*)` → `/api`, l'URL d'origine est conservée, donc les routes Express ne changent pas). `includeFiles: backend/content/**` embarque le contenu, lu et **validé à chaque démarrage à froid** : un contenu invalide fait échouer la fonction au lieu de servir un fait non sourcé.
  - Réécriture SPA `/((?!api/).*)` → `/index.html` (les fichiers statiques passent avant les réécritures) ; `/assets/*` (noms hachés par Vite) mis en cache un an.
  - Même origine pour le front et l'API : `VITE_API_BASE_URL` reste vide, pas de CORS à régler, **aucune variable d'environnement**.
  - `Cache-Control` de l'API : `s-maxage=3600` ajouté ; le CDN Vercel garde les réponses une heure et est **vidé à chaque déploiement** (le contenu ne change qu'avec un déploiement).
  - `package.json` racine minimal (`private`, `type: module`, `engines.node: 24.x`) : fixe la version de Node du projet Vercel, sans dépendance.
- **Analyse** : (a) deux hébergeurs, deux comptes, une URL d'API à configurer et du CORS ; les offres gratuites Render/Railway s'endorment (premier chargement lent). (b) un seul serveur à maintenir, mais pas de CDN ni de prévisualisation par PR sans travail en plus. (c) une seule URL, prévisualisation par PR, CDN, offre gratuite suffisante ; contrepartie : démarrage à froid de la fonction (lecture des JSON, ~1 s au pire), absorbé par le cache CDN.
- **Branches déployées** (2026-11-15) : seule `main` est déployée ; `front` et `back` (copies d'intégration, OPEN-11) ont `git.deploymentEnabled: false` dans `vercel.json` — l'offre Hobby limite le nombre de déploiements par jour et chaque push sur les trois branches en déclenchait six (deux projets Vercel).
- **Conséquences** : aucune dépendance ajoutée (pas de `@vercel/node`). Le serveur `npm start` (`backend/src/server.ts`) reste l'entrée locale. Vérifié localement (build des deux paquets, fonction servie par un serveur Node imitant les réécritures : `/api/health` 200, `/api/machines/opportunity` 200 en Brotli, lien profond `/explore/mars/opportunity` affiché avec ses photos) ; **non vérifié sur Vercel même** tant que le projet n'est pas lié (action humaine : compte Vercel, import du dépôt).

## ADR-027 — Photos compressées par l'optimisation d'images de Vercel

- **Statut** : Acceptée le 2026-11-15 (décision de l'équipe : « compression Vercel », plutôt qu'héberger des copies).
- **Problème** : les photos sont des liens vers la NASA (ADR-017) ; certaines pèsent 2 à 10 Mo, lentes et lourdes sur téléphone.
- **Options** : (a) optimisation d'images de Vercel, à la volée ; (b) télécharger, compresser et héberger les photos dans le dépôt (40 à 60 Mo, à refaire pour chaque nouvelle photo, contraire à ADR-017).
- **Décision** : (a). `vercel.json` → `images` : largeurs 256 / 640 / 1080 / 1600 / 2048, qualité 70, format WebP, cache 31 jours, 9 hôtes NASA autorisés (`remotePatterns`). `lib/mediaSrc.ts` construit `/_vercel/image?url=…&w=…&q=70` : cartes 640 px (depuis la grande photo), photos plein écran 1080 px sur téléphone et 1600 px au-delà, zoom 2048 px depuis l'original. GIF et SVG non transformés (Vercel les sert tels quels). En local (pas d'optimiseur), les fichiers NASA sont utilisés directement.
- **Filet de sécurité** : `installImageFallback()` (écoute globale des erreurs d'image) remplace une copie optimisée qui échoue par l'original NASA — quota mensuel dépassé (offre Hobby : 5 000 transformations / mois ; au-delà, les nouvelles images renvoient 402, celles déjà en cache continuent), ou NASA indisponible.
- **Conséquences** : le contenu ne change pas (toujours des URL NASA, crédits et pages sources affichés). Estimation : ~290 photos × 2 à 3 largeurs, une fois par mois grâce au cache de 31 jours, sous le quota. Tests : `lib/mediaSrc.test.ts`.

## ADR-028 — Réalité augmentée des modèles NASA et QR code

- **Statut** : Acceptée le 2026-11-19 (demande écrite de l'équipe : « faire que l'enfant, juste avec un scan, puisse voir l'outil comme s'il était avec lui dans son salon, y jouer » ; plan validé : « Oui, lance-le »).
- **Problème** : poser dans la pièce de l'enfant, par la caméra de son téléphone, les machines dont la NASA publie un modèle 3D, et y ouvrir un jeu ; depuis un ordinateur, passer au téléphone par un simple scan.
- **Options AR** : (a) l'AR intégrée à `@google/model-viewer` (déjà présent, ADR-020) ; (b) une bibliothèque WebXR dédiée (three.js + scène maison, AR.js…) : beaucoup plus de code, pas de Quick Look iOS.
- **Options QR** : (a) `qrcode-generator@2.0.4` (MIT, Kazuhiko Arase, aucune dépendance, ~52 Ko non minifié, chargé à la demande) ; (b) `qrcode` (plus lourd, dépendances) ; (c) encodeur maison (Reed-Solomon, masques : risque d'erreur élevé pour un gain nul).
- **Décision** : AR (a), QR (a).
  - `ar-modes="webxr quick-look"` : WebXR sur Android (Chrome + ARCore), Quick Look sur iPhone/iPad (fichier USDZ généré par model-viewer dans le navigateur, depuis le `.glb` NASA). **Scene Viewer est exclu** : il confie le modèle à une application Google (règle « aucune requête vers Google », ADR-020).
  - `ar-scale="auto"` : le modèle garde l'échelle publiée par la NASA, et l'enfant peut le pincer pour l'agrandir ou le réduire. **Aucune mention « taille réelle »** : mesuré le 2026-11-19 avec `getDimensions()`, Ingenuity fait 0,99 × 0,56 × 1,11 m (proche de l'engin réel), mais le module lunaire Apollo 6,43 × 5,01 × 6,43 m, plus petit que le vrai. Afficher une taille réelle demanderait des dimensions sourcées dans `backend/content/` (piste contenu).
  - Route `/ar/:destinationId/:machineId` (`ArPage`) : c'est l'adresse du QR code. Elle montre le modèle, son badge « Image de synthèse », son crédit NASA avec un lien vers sa page NASA 3D Resources, et la chasse aux pièces (pièces sourcées de `Machine.parts`, US-5.13). Une machine sans modèle NASA le dit, sans modèle de remplacement.
  - QR code dessiné par React en SVG à partir de la grille (`components/ar/qrPath.ts`), sans injection de HTML ; montré seulement sur un appareil à pointeur fin (ordinateur) qui ne peut pas ouvrir l'AR. L'adresse est aussi écrite en clair.
  - **Modèle de Spirit et Opportunity** : publié par la NASA uniquement dans son dépôt GitHub officiel `nasa/NASA-3D-Resources` (organisation vérifiée). Autorisé par l'équipe le 2026-11-20 « si c'est vérifié et qu'il n'y a pas de données confidentielles » : vérifié le jour même (compte NASA vérifié ; fichier de 37 Ko contenant seulement la géométrie compressée Draco, le nom du générateur Blender et des noms de matériaux génériques ; aucun nom, chemin, adresse ni métadonnée `extras`). `raw.githubusercontent.com` est ajouté à `NASA_MODEL_HOSTS` (CSP `connect-src` seulement). Le modèle n'est **pas en mètres** (8,7 × 7,3 × 12,7 unités pour un rover d'environ 1,5 m) : l'enfant le réduit en le pinçant, en attendant une échelle sourcée.
  - **Intégrité des modèles** (décision de l'équipe du 2026-11-27 : « sécurise-les ») :
    - le modèle MER est **figé sur le commit NASA** `45bd4face6557dc06f78f58875214f77f453205f` (dernier commit à modifier ce fichier), au lieu de la branche `master` qui peut changer ;
    - chaque `3d-model` porte son **empreinte SHA-256** (`Media.sha256`, règle V19) ;
    - le navigateur télécharge le fichier, recalcule l'empreinte avec Web Crypto et ne le donne à `<model-viewer>` (copie locale `blob:`) **que s'il correspond** ; sinon : message « ne correspond plus au fichier NASA vérifié », sans bouton Réessayer. Un modèle sans empreinte est refusé (échec fermé) ;
    - `npm run models:check` (backend) refait la vérification ; le workflow `.github/workflows/models.yml` la lance sur chaque PR qui modifie `media.json`, chaque lundi et à la demande, à part de la CI principale pour qu'une panne d'un serveur NASA ne bloque pas une fusion ;
    - revérification le 2026-11-27 : MER identique octet pour octet à `master` ; Ingenuity contient dans ses textures des métadonnées XMP d'édition d'image (historique Photoshop/GIMP 2019-2020, identifiants techniques), sans nom, adresse ni chemin ; module lunaire sans métadonnées.
  - `Permissions-Policy` : `xr-spatial-tracking=(self)` ajouté (`security/headers.ts` et `vercel.json`) ; `camera=()` reste : WebXR et Quick Look n'utilisent pas l'API caméra de la page.
- **Conséquences** : dépendance ajoutée dans `frontend/` : `qrcode-generator@^2.0.4`. L'AR ne s'ouvre qu'en HTTPS : à tester sur l'aperçu Vercel d'une PR, pas sur `localhost`. Dans Quick Look (iOS), les repères des pièces ne s'affichent pas : la chasse se joue alors sur la vue 3D de la page. Tests : `pages/ArPage.test.tsx`, `components/ar/qrPath.test.ts`.

