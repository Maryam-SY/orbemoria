# Périmètre — OrbeMoria

> Rôle BMAD : Product Manager · Version 1.0 (Phase 0) · Statut : **en attente de validation**
> Source : CDC §6 « Périmètre fonctionnel et priorités » et §11 « Décisions actées ».

## Règle de priorisation

- **Aucune** tâche P1 ne démarre tant que **tous** les P0 n'ont pas franchi leur gate de phase ([QUALITY_GATES.md](../quality/QUALITY_GATES.md)).
- **Aucune** tâche P2 ne démarre pendant le hackathon.
- Toute demande hors de ce document → décision humaine tracée (ADR ou mise à jour de ce fichier) **avant** développement.

## P0 — Indispensable (MVP du hackathon)

| Élément | Exigences PRD | Stories |
|---|---|---|
| Sélecteur de destination Moon / Mars | DEST-001 → 005 | US-2.1, US-2.2 |
| Accueil immersif « depth journey » (Lune et Mars au centre, caméra en profondeur au scroll, survol animé, morph vers la destination) — décision de l'équipe du 2026-11-14 | DEST-001 → 005, NFR-A11Y-006 | US-2.1 · [ADR-018](../architecture/TECHNICAL_DECISIONS.md) |
| Vidéo d'introduction de l'équipe qui se fond dans l'accueil ; ciel de la vidéo comme fond du site — décision de l'équipe du 2026-11-14 | DEST-001, NFR-A11Y-006 | US-2.4 · [ADR-021](../architecture/TECHNICAL_DECISIONS.md) |
| Destination et récit en scroll immersif continu (planète épinglée, scènes, HUD discret, EN/FR dans l'en-tête) — décision de l'équipe du 2026-11-14 | NAV-001, STORY-004 → 009, NFR-A11Y-006 | US-5.6 · [ADR-019](../architecture/TECHNICAL_DECISIONS.md) |
| Photos de couverture, récit pédagogique (3 voix expliquées, mots à connaître, carnet « À toi », relais dessiné, statuts expliqués) — décision de l'équipe du 2026-11-14 | EQUIP-002, EQUIP-005, STORY-007, MEDIA-001 | US-5.7 |
| Frise commune Lune + Mars et carnet d'explorateur local (badges) — décision de l'équipe du 2026-11-14 | DATA-004, NFR-LEGAL-001 | US-5.8 |
| Destination racontée au scroll : journal de chaque mission et machines toujours affichés, une image par moment raconté, rail précédent / suivant — décision de l'équipe du 2026-11-14 | TIMELINE-001, EQUIP-002, MEDIA-001 | US-5.9 |
| Espace Lune | EXPL-001, EQUIP-*, MAP-* | E3 |
| Espace Mars | EXPL-001, EQUIP-*, MAP-* | E3 |
| Carte interactive 2D (SVG, schématique) | MAP-001 → 006 | US-3.3, US-3.6 |
| Galerie hybride synchronisée avec la carte | SYNC-001 → 003 | US-3.4 |
| Regroupement par mission + accès rapide par mission | EQUIP-001, EQUIP-006 | US-3.1, US-3.5 |
| Fiches des équipements (résumé + détail) | EQUIP-002 → 005 | US-3.2 |
| Histoires en six étapes (moteur + ≥ 1 récit par destination) | STORY-001 → 010 | E4 |
| Sources scientifiques visibles et relations documentées | SOURCE-001 → 005 | US-1.5, US-4.4, US-5.4 |
| Page About & Sources | ABOUT-001, ABOUT-002 | US-5.1, US-5.2 |
| Navigation globale, fil d'Ariane, URLs adressables | NAV-001 → 005 | US-1.3, US-2.3 |
| Site public sans authentification (frontend + API, ADR-016) | DEPLOY-001, DEPLOY-002 | US-1.6, US-1.7, US-5.5 |
| Accessibilité et responsive mobile-first | NFR-A11Y-*, NFR-RESP-* | US-5.3 + chaque story |

## P1 — Améliorations si le MVP est stable

| Élément | Exigences / stories | Condition d'entrée |
|---|---|---|
| Filtres supplémentaires (statut, type) | EQUIP-007 / US-3.7 | Gates phase 3 verts |
| Recherche simple | — (à spécifier) | Gates phase 5 verts |
| Transitions visuelles plus élaborées | — | OPEN-10 tranché, gates phase 4 verts |
| Tracés de relations sur la carte | MAP-007 | OPEN-09 tranché |
| Histoire supplémentaire Ingenuity | US-4.8 | Récits P0 relus (QG-SCI) |
| Scénario « Be the engineer » | — (à spécifier) | Gates phase 5 verts |

## P2 — Évolutions futures (hors hackathon)

- Animations narratives avancées **dans les récits** au-delà d'ADR-019 (parallax poussé, scènes 3D). L'accueil (ADR-018) et le récit en scènes de scroll continu (ADR-019, US-5.6) font exception (P0).
- Audio / mode radio.
- PWA et consultation hors ligne.
- Mini-quiz.
- Réalité augmentée et chasse aux pièces (US-5.16, ADR-028) : **réalisées sur demande écrite de l'équipe le 2026-11-19**, limitées aux machines dont la NASA publie un modèle 3D. Priorité à acter par le PO.
- Version française complète de l'interface (si OPEN-06 confirme l'anglais pour le MVP).
- Nouvelles destinations et nouveaux corps célestes ; espace séparé « deep space » (dont **Pioneer 10**).

## Explicitement exclu

| Exclu | Raison |
|---|---|
| Objets de l'espace profond, orbite solaire, Vesta, Cérès, Éros dans les espaces Lune/Mars | CDC §6 : ne pas les intégrer artificiellement |
| Pioneer 10 dans le parcours principal | CDC §6, §11 (sauf décision explicite ultérieure) |
| Base de données, comptes | Pas de besoin identifié ; le backend est retenu (ADR-016) mais lit du contenu versionné (OPEN-18) |
| Docker | Pas nécessaire tant que l'hébergement n'impose pas de conteneur (ADR-005, à réexaminer avec OPEN-05/OPEN-18) |
| Carte 3D / globe / librairie cartographique | Complexité sans bénéfice P0 (ADR-007) |
| Collecte de données personnelles, analytics nominatives | CDC §10, NFR-LEGAL-001 |
| Logo NASA, formulation « officielle » | CDC §7 |
| Nom, image ou voix de personne mineure | CDC §7 |

## Décisions ouvertes impactant le périmètre

OPEN-06 (langue), OPEN-07 (catalogue et total), OPEN-08 (récits du MVP), OPEN-09 (relations sur la carte), OPEN-14 (filtre par mission) — voir [AUDIT_PHASE0.md §7](../project/AUDIT_PHASE0.md#7-décisions-ouvertes-à-valider-par-léquipe).
