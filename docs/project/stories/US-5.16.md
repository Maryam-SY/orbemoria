# US-5.16 — La machine chez moi (réalité augmentée) et la chasse aux pièces

- **Statut** : review
- **Epic** : E3 — Explorer les équipements
- **Priorité** : P2, réalisée sur **demande écrite de l'équipe** (2026-11-19 : « faire que l'enfant, juste avec un scan, puisse voir l'outil comme s'il était avec lui dans son salon, y jouer » ; plan validé : « Oui, lance-le »). À acter par le PO.
- **Exigences PRD** : MEDIA-001, EQUIP-002, NFR-A11Y-001/006
- **Décisions liées** : **ADR-028** (AR + nouvelle dépendance `qrcode-generator`), ADR-020 (model-viewer), ADR-017 (médias par URL)
- **Branche** : `feat/US-5.16-ar-salon`, depuis `main` (`6c32c81`) : touche `frontend/`, `vercel.json` et `docs/`, donc PR vers `main` (OPEN-11)
- **Rôles** : Analyst (modèles NASA, échelle), Architect (ADR-028), Dev, QA

## Story

En tant que visiteur de 10-15 ans, je souhaite, juste en scannant un code, voir la machine posée dans mon salon par la caméra de mon téléphone, tourner autour et y chercher ses pièces, afin de sentir sa taille et de jouer avec elle.

## Critères d'acceptation

- [x] 1. « Voir chez moi » sur appareil compatible (WebXR Android, Quick Look iOS), jamais Scene Viewer — *preuve : `ArPage.test.tsx` (`ar`, `ar-modes="webxr quick-look"`, bouton dans le slot `ar-button`) ; **non vérifié sur un vrai téléphone** (voir ci-dessous).*
- [x] 2. QR code sur ordinateur vers `/ar/:destinationId/:machineId`, adresse écrite en clair — *preuve : test « shows a QR code on a computer… » ; navigateur intégré, `/ar/mars/ingenuity` : QR affiché avec `http://localhost:5173/ar/mars/ingenuity`.*
- [x] 3. Modèles NASA seulement, badge, crédit NASA avec lien, message pour une machine sans modèle, pas de « taille réelle » — *preuve : tests « opens the NASA model… » et « says so when NASA has published no 3D model » ; navigateur : « 3D model: NASA/Brian E. Kumanchik, NASA 3D Resources » → page NASA.*
- [x] 4. Chasse aux pièces : compteur annoncé (`aria-live`), coche **et** texte « (trouvée) », passage au quiz — *preuve : test « turns the parts into a hunt… » ; navigateur : Ingenuity, 2 pièces touchées → « Parts found: 2 / 6 », coches visibles.*
- [x] 5. Cibles ≥ 44 px (`min-h-11`), textes en anglais et en français — *preuve : typecheck (fr doit fournir les mêmes clés) ; 375 px sans débordement horizontal (`scrollWidth` = 375).*

## Ce qui a été fait

- `components/journey/ModelViewer3D.tsx` : attributs AR, bouton « Voir chez moi » (slot `ar-button`, affiché par model-viewer seulement si l'AR est possible), suivi `ar-status`, fiche de la pièce touchée **dans** la vue AR (WebXR ne dessine que l'élément model-viewer), coche des pièces trouvées, crédit NASA cliquable, emplacement `arFallback` montré quand l'AR n'est pas possible.
- `pages/ArPage.tsx` (route `/ar/:destinationId/:machineId`) : modèle, consignes, chasse aux pièces, bravo + lien vers `#quiz` de la page machine.
- `components/ar/ArFallback.tsx`, `components/ar/qrPath.ts` : QR code (ordinateur) ou note « pas d'AR sur cet appareil » (écran tactile).
- `pages/MachinePage.tsx` : QR code sous le modèle sur ordinateur, lien « Jouer : trouve ses pièces chez toi », défilement vers l'ancre `#quiz`.
- `lib/parts.ts` (`placedParts`), `paths.ar`, `types/model-viewer.d.ts`, clés `ar.*` en/fr (le wolof reprend le français).
- `security/headers.ts` + `vercel.json` : `xr-spatial-tracking=(self)`.

## Mesures des modèles NASA (2026-11-19, `getDimensions()` dans le navigateur intégré)

| Modèle | Largeur × hauteur × profondeur | Constat |
|---|---|---|
| `Ingenuity Mars Helicopter.glb` | 0,99 × 0,56 × 1,11 m | Proche de l'engin réel |
| `Apollo Lunar Module.glb` | 6,43 × 5,01 × 6,43 m | Plus petit que le vrai module |

Conséquence : `ar-scale="auto"` (échelle NASA, l'enfant pince pour ajuster) et **aucune mention « taille réelle »**. Pour l'afficher, il faudrait des dimensions sourcées dans `backend/content/` (piste contenu).

## Couverture : quelles machines peuvent venir chez l'enfant ?

| Machine | Modèle 3D NASA | État |
|---|---|---|
| Ingenuity | science.nasa.gov 3D Resources | AR + chasse (6 pièces) |
| Étages de descente Apollo 11 et 12 | science.nasa.gov 3D Resources (module complet) | AR + chasse (8 pièces) |
| Spirit, Opportunity | **dépôt GitHub NASA** `nasa/NASA-3D-Resources` : `Mars Exploration Rover - Opportunity (MER-B).glb` (37 Ko, Draco, modèle simplifié) | AR + chasse (6 pièces). Hôte autorisé par l'équipe le 2026-11-20 après vérification (ADR-028). Média `mer-3d-model`, source `nasa-3d-mer-github`, `parts.modelMediaId` des deux rovers ; positions des pièces mesurées sur la géométrie (voir ci-dessous), statut `draft` |
| Surveyor 3, Mars Pathfinder, Sojourner, LRRR, EASEP, ALSEP | aucun dans science.nasa.gov/3d-resources ni dans `nasa/NASA-3D-Resources` (227 modèles) | La page AR le dit ; photos sur la page de la machine |

## Modèle MER : vérification et placement des pièces (2026-11-20)

- **Vérification** (demandée par l'équipe) : organisation GitHub `nasa` vérifiée (`is_verified: true`) ; dossier mis à jour par la NASA le 2024-12-30 (`45bd4fac`) ; JSON du GLB : `asset.generator` « Khronos glTF Blender I/O v4.2.57 », un nœud `polySurface17`, 9 matériaux génériques (Copper, Gray, SolarArrays, White, LightGrayMetal, lambert1, Gold2, Black, Gold), aucune image, aucun `extras` ; partie binaire : géométrie Draco, aucun texte lisible (ni adresse, ni chemin, ni nom).
- **Taille** : 8,69 × 7,31 × 12,71 unités (bras déployé) : pas en mètres. NSSDCA (`nssdca-2003-027a`, déjà dans le contenu) place les caméras du mât à environ 1,4 m au-dessus du bas des roues ; sur le modèle, 6,86 unités → environ 0,2 m par unité. Non appliqué : demande une évolution du modèle de données (échelle par média), à valider.
- **Placement des 6 pièces** (coordonnées du modèle, mesurées dans le navigateur avec three.js) : mât = centre des sommets au-dessus de y 3,6 (0 ; 4,45 ; 0,71) ; antenne grand gain = matériau « Copper » de la parabole (1,68 ; 1,34 ; −2,57) ; panneaux solaires = aile droite du matériau « SolarArrays » (3,82 ; 0,68 ; −2,19) ; bras = sommets au-delà de z 4,75 (0,08 ; 0 ; 6,17) ; Hazcams = petit boîtier à l'avant du corps (0,31 ; −0,76 ; 1,81) ; roues = roue avant droite (3,06 ; −1,99 ; 2,27). Le modèle étant simplifié, ces repères restent `draft` : à confirmer par l'équipe.

## Sécurisation des modèles 3D (2026-11-27)

Demande de l'équipe : « Oui, sécurise-les ». Détail dans ADR-028.

| Modèle | SHA-256 | Adresse |
|---|---|---|
| `ingenuity-3d-model` | `9e5a5398ab335eae7d46335085301ce46fb7de052300b645debe8bac6d39f2b5` | assets.science.nasa.gov |
| `apollo-lunar-module-3d-model` | `379101dfcee399267addf771709107c35e826b0b9e5233272f123e4c8a585c4e` | assets.science.nasa.gov |
| `mer-3d-model` | `95c852efb385b55bea3104a0fca2730cd2ef25353af4d38273d3f0bda5c68c31` | GitHub NASA, figé sur `45bd4face6557dc06f78f58875214f77f453205f` |

- Fichiers : `backend/content/media.json` + `sources.json` (adresse figée), `content/types.ts` + `validate.ts` (V19), `scripts/check-models.ts` + `npm run models:check`, `.github/workflows/models.yml`, `frontend/src/lib/modelIntegrity.ts`, `ModelViewer3D.tsx` (vérification avant affichage, états séparés bibliothèque / fichier / visionneuse), clés `journey.modelTampered` en/fr.
- **Bug trouvé par les tests et corrigé** : si la vérification du fichier échouait avant le chargement de la bibliothèque 3D, l'état « prêt » de la bibliothèque écrasait le refus et le site restait en chargement. Les trois états sont maintenant indépendants ; un refus ne peut plus être masqué.

## Vérification (Verify)

| Contrôle | Commande / méthode | Résultat réel |
|---|---|---|
| G1 lint | `npm run lint` (frontend) | 0 erreur ; 2 avertissements **déjà présents** sur `main` (`media-has-caption` dans `VideoReel` et `MediaFigure`) |
| G2 typecheck | `npm run typecheck` | OK |
| G3 test | `npm test` (frontend) · `npm run check` (backend) | Frontend : 18 fichiers, 106 tests verts (2026-11-20, dernière exécution). Backend : 4 fichiers, 60 tests verts. `content:check` : 0 erreur, 123 avertissements (inchangés). Note : sous forte charge (navigateur actif en parallèle), `narration.test.tsx` et le test du QR ont dépassé leur délai ; ils passent seuls et dans l'exécution complète au calme (délai du test QR porté à 15 s) |
| Spirit en 3D | navigateur intégré, `/ar/mars/spirit` | Modèle MER chargé depuis le dépôt NASA, 6 repères bien placés (mât, antenne, panneaux, bras, Hazcams, roue), crédit « NASA » + lien ; toucher le bras → « Parts found: 1 / 6 » et fiche. Écart de contenu signalé : la description du bras dit « replié sous le rover ici » (vrai sur la photo, pas sur ce modèle déplié) |
| G4 build | `npm run build` | OK ; `ArPage` 4,2 Ko, `qrcode` 20,6 Ko (7,3 Ko gzip) chargé à la demande ; avertissement de taille de Vite attendu pour `three`/`model-viewer` (ADR-020) |
| Navigateur intégré | `/ar/mars/ingenuity` (bureau et 375 px) | Modèle chargé, 6 repères, compteur 2 / 6 après deux touches, QR sur bureau, note « pas d'AR » en 375 px tactile, aucun débordement |
| **AR réelle** | téléphone Android (Chrome + ARCore) et iPhone (Safari) | **Non exécuté** : l'AR exige HTTPS ; à faire sur l'aperçu Vercel de la PR |

## Journal de l'agent

- Modèle / session : Claude Code (Claude Opus 5.5), 2026-11-19/20.
- Décisions : plan validé par l'équipe (« Oui, lance-le ») ; Scene Viewer exclu (Google) ; pas de « taille réelle » sans dimension sourcée.
- Problèmes non résolus : AR non testée sur appareil réel ; Spirit/Opportunity en attente de décision ; 6 machines sans modèle NASA.

## Revue humaine

- Relu par : · Date : · Verdict :
