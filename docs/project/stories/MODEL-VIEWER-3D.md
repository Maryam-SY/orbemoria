# Modèles 3D NASA avec model-viewer (page destination)

- **Statut** : review
- **Suite** : la réalité augmentée et la chasse aux pièces sont ajoutées par `US-5.16.md` (ADR-028).
- **Epic** : E3 — Explorer les équipements
- **Priorité** : P2, comme le parcours scrollé qu'il complète. Réalisé sur **demande écrite de l'équipe** (2026-11-14 : « ajoute les modèles 3D avec model-viewer »), à acter dans SCOPE.md par le PO.
- **Exigences PRD** : EQUIP-002, MEDIA-001, ABOUT-001, NFR-A11Y-001/006
- **Décisions liées** : **ADR-020** (nouvelle dépendance, validée par la demande de l'équipe), ADR-017 (médias par URL)
- **Branche** : `feat/model-viewer-3d`, depuis `main` (`dd2ac0f`) : touche `frontend/`, `backend/content/` et `docs/`, donc PR vers `main` (OPEN-11)
- **Rôles** : Analyst (recherche des modèles), Architect (ADR-020), Dev, QA

## Recherche des modèles (2026-11-14)

Catalogue « NASA 3D Resources » (`science.nasa.gov/3d-resources/`) :

| Machine du site | Modèle `.glb` | Crédit (page NASA) | Taille |
|---|---|---|---|
| `ingenuity` | `Ingenuity Mars Helicopter.glb` | NASA/Brian E. Kumanchik | 1,93 Mo |
| `apollo-11-lm-eagle-descent-stage`, `apollo-12-lm-intrepid-descent-stage` | `Apollo Lunar Module.glb` (module **complet**) | NASA/Michael D. Carbajal | 0,70 Mo |
| `spirit`, `opportunity` | aucun trouvé : `3d-resources/mars-exploration-rover/` redirige vers une photo du Photojournal | — | — |
| Surveyor 3, Sojourner, Pathfinder, ALSEP, EASEP, réflecteur | aucun modèle publié trouvé | — | — |

Les deux fichiers sont servis par `assets.science.nasa.gov` avec `Access-Control-Allow-Origin: *`. Ils sont compressés en Draco (`KHR_draco_mesh_compression`), avec des textures WebP.

## Contenu modifié (`backend/content/`)

- **`media.json` · `ingenuity-3d-model`** : le lien mort `mars.nasa.gov/gltf_embed/25043` (404 NASA affichant le logo NASA) est remplacé par le `.glb`. Mises à jour associées :
  - `pageUrl` devient la page du modèle ;
  - le crédit devient « NASA/Brian E. Kumanchik » (il était absent) ;
  - `sourceId` devient `nasa-3d-ingenuity` ;
  - l'ancienne `caption` est retirée, car elle citait une autre page.
- **`media.json` · nouveau `apollo-lunar-module-3d-model`** : rattaché aux deux étages de descente et aux missions `apollo-11` et `apollo-12`, avec `depiction: simulation`.
  - Son `description` (EN/FR) précise que le modèle montre le module **entier**, et que seule la moitié du bas, l'étage de descente, est restée sur la Lune.
  - Cette précision reprend ce que disent déjà les notes de statut sourcées des deux machines (NSSDCA).
- **`sources.json`** : deux sources ajoutées, `nasa-3d-apollo-lunar-module` et `nasa-3d-ingenuity`, consultées le 2026-11-14.
- **`mer-3d-model` laissé tel quel** : son lien pointe vers `solarsystem.nasa.gov`, domaine retiré, et il n'existe pas de modèle de remplacement. Il n'est pas affiché dans la visionneuse, qui ne lit que les `.glb` ; la fiche le propose seulement comme lien. **Sa suppression revient à la piste contenu.**
- `npm run content:check` : 0 erreur, 40 avertissements (41 avant : le crédit d'Ingenuity est maintenant renseigné).

## Interface (`frontend/`)

- **`components/journey/ModelViewer3D.tsx`** : `<model-viewer>` chargé **au clic** (import dynamique, fichier séparé).
  - États : chargement, prêt, erreur avec « Try again ».
  - Badge « Computer image — not a photo », explication, aide, crédit et lien vers la page NASA.
  - Pas de rotation automatique sous mouvement réduit.
  - `disable-zoom` pour que la molette continue de faire défiler la page.
- **Décodeur Draco** servi par le site (`public/draco/`) : aucune requête vers le CDN de Google (ADR-020).
- **Bouton « Turn it in 3D » / « Back to the photos »** (`aria-pressed`) sur la fiche, seulement quand la machine a un `.glb` (`lib/journey.ts → modelOf`).
  - Grand écran : le modèle remplace la photo dans la scène collante.
  - Téléphone : il s'affiche sous la fiche, et la scène collante s'efface tant qu'il est ouvert, pour ne pas le recouvrir.
- **`MediaFigure`** : le lien d'un média `3d-model` mène à sa page NASA, plus au fichier `.glb`.
- **`hooks/useMediaQuery.ts`** : un seul modèle est monté selon la largeur d'écran, jamais deux.

## Vérification (Verify) — sorties réelles du 2026-11-14

| Contrôle | Commande / méthode | Résultat réel |
|---|---|---|
| G1 lint | `npm run lint` | 0 erreur, 2 avertissements déjà présents sur `main` |
| G2 typecheck | `npm run typecheck` | OK (front, back) |
| G3 test | `npm test` | front : 5 fichiers, **47 tests passés** (dont `modelOf` et le chargement au clic) · back : 44 tests passés |
| G4 build | `npm run build` | OK. Bundle principal 463 kB (+5 kB), fichier séparé `model-viewer` 1 025 kB / 291 kB gzip (avertissement de taille de Vite attendu) |
| Contenu | `npm run content:check` | 0 erreur |
| Rendu 3D réel | Playwright, Chromium (WebGL logiciel), vrai backend, `/explore/moon` (Apollo 12 LM) et `/explore/mars` (Ingenuity), 1440 et 360 px | Les deux modèles se chargent (`load`), badge, explication et crédit visibles, aucun débordement horizontal, aucune requête vers `gstatic.com` ; aucun logo NASA visible sur les vues capturées |
| Molette au-dessus du modèle | Playwright, journal des événements `wheel` | Chaque événement reçu fait défiler la page (`defaultPrevented: false`). Un essai sur cinq n'a produit aucun événement côté page : particularité de l'automatisation, **à revérifier dans un vrai navigateur** |
| Safari, Firefox, téléphone réel, lecteur d'écran | — | **Non exécutés** |

## Points ouverts

- Le PO doit acter cette fonctionnalité P2 dans SCOPE.md.
- ~~La piste contenu doit supprimer ou remplacer `mer-3d-model`~~ — **fait le 2026-11-14 à la demande de l'équipe** : média supprimé (lien mort, aucun modèle NASA pour les rovers MER). Spirit et Opportunity sont représentés par leurs photos. La photo `nasa-lib-pia05044` (Spirit vu d'en haut sur son atterrisseur) passe avant celle du site d'atterrissage, pour que le parcours montre le rover lui-même.
- Des textures non visibles sur les captures pourraient porter un logo : à revoir en faisant tourner les modèles.
- Vérifier sur un vrai téléphone la fluidité du rendu WebGL dans la page déjà animée.
