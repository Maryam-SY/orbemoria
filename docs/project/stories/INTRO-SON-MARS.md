# Nouvelle intro NASA et son adapté aux oreilles (avec les vrais sons de Mars)

- **Statut** : review
- **Epic** : E2 — Accueil et destinations (US-2.4, US-5.13)
- **Demande** : équipe, 2026-11-27 — « le son, tu peux trouver mieux et plus adapté aux oreilles des users de l'appli ; la vidéo de démarrage, essaie de trouver d'autres plus impressionnantes dans les données fournies, change celle-ci ». Plan présenté puis validé : « Oui, avec Mars ».
- **Décisions liées** : ADR-023 (complétée, « Demandes du 2026-11-27 ») ; remplace la décision du 2026-11-15 « aucun bruit, seulement des tons ».
- **Branche** : `feat/intro-son-mars`, depuis `front` (= `main`, `6c32c81`) : ne touche que `frontend/` et `docs/` → PR vers `front` (CLAUDE.md §10). Les docs suivent la PR.
- **Rôles** : UX (montage, son), Dev, QA

## Vidéo : sources et montage (toutes NASA Image and Video Library, domaine public)

| Plan (dans la nouvelle vidéo) | Source (`nasa_id`) | Extrait |
|---|---|---|
| 0–3,6 s : moteurs F-1 qui s'allument | `Ultimate Saturn V Launch w Enhanced Sound` | 69,5 → 73,1 s |
| 3,25–6,15 s : décollage | idem | 100,5 → 103,4 s |
| 5,8–9,4 s : la Lune par le hublot du module lunaire | `KSC-1969-MH-NAS01-0001-Apollo_12_Pinpoint_for_Science-B_425` | 518 → 521,6 s, recadré 16:9 (film 4:3) |
| 9,05–11,85 s : astronaute d'Apollo 12 sur la Lune | idem | 930,5 → 933,3 s, recadré 16:9 |
| 11,5–14,5 s : le sol de Mars qui arrive | `JPL-20210222-M2020f-0001-Perseverance Rover’s Descent and Touchdown on Mars` | 160,5 → 163,5 s, panneau central seul (la mise en page change à 164,6 s) |
| 14,15–17,97 s : l'ombre d'Ingenuity au-dessus des dunes | `JPL-20220527-M2020f-0001-NASAs_Ingenuity_Mars_Helicopter_Captures_Video_of_Record_Flight2` | 5,3 → 9,1 s (après le titre) |

Fondus de 0,35 s entre les plans, fondu d'ouverture de 0,4 s. H.264 High, 30 i/s, sans piste son ; bureau 1280×720 (CRF 27, ≤ 1 Mb/s) 2 388 609 octets ; mobile 960×540 1 133 087 octets ; affiche JPEG 960×540. Aucun logo NASA à l'image (titres et générique écartés). Le plan de l'astronaute n'est pas légendé avec le nom d'un instrument : son identification n'a pas été vérifiée.

Phrases en surimpression : « Un jour, nous sommes partis. » 0,4–5,4 · « Nous avons marché sur la Lune. » 6,2–11,2 · « Nous nous sommes posés sur Mars. » 11,8–14,0 · **« Nous y avons même volé. »** 14,5–16,3 (nouvelle, en/fr ; le wolof reprend le français) · « Nos machines y sont encore. » 16,6–fin.

## Son

**Vrais sons de Mars** (intro seulement, `public/media`) :

| Fichier | Source | Extrait et traitement |
|---|---|---|
| `mars-wind.m4a` (10,5 s, 86 671 octets) | `JPL-20210222-M2020f-0003b-M2020_Audio_B_002` (« second set », filtré par la NASA pour entendre le vent) | 4,5 → 15 s ; passe-haut 30 Hz, passe-bas 2,5 kHz, fondus, −27 LUFS, crête −7,6 dBFS |
| `ingenuity-hum.m4a` (7 s, 56 928 octets) | `JPL-20210506-Listen to NASA’s Ingenuity Helicopter as it Flies on Mars-1080` (bourdonnement des pales à 84 Hz isolé par la NASA) | 45 → 52 s ; passe-haut 50 Hz, passe-bas 1,5 kHz, fondus, −28 LUFS, crête −20 dBFS |

La version « A » de l'enregistrement du vent a été écartée : d'après la NASA, ce sont surtout les bruits du rover.

**Adapté aux oreilles** (constats sur l'ancien son → correctifs) :
- intro environ 4 fois plus forte que le reste (gain 0,9 contre 0,22) → même niveau (0,55 en entrée d'un limiteur, ambiance 0,2) ;
- sous-graves à 36,7 et 55 Hz forts (inaudibles sur téléphone, pesants au casque) et filtre résonant (Q 4) → poids déplacé vers 110–220 Hz, Q 0,8, coupe sous 40 Hz ;
- scintillements à 1,3–2,6 kHz (zone la plus sensible de l'oreille) → tout reste sous 1 kHz, accords consonants ;
- « ping » de fin de signal attaqué en 10 ms → 60 ms, notes plus basses ;
- écho plus sombre (passe-bas 2,4 kHz au lieu de 3,2) ; limiteur commun `createSafeOutput` (seuil −20 dB, ratio 12).

## Vérification

| Contrôle | Résultat réel |
|---|---|
| Typecheck / lint frontend | voir la PR (exécutés avant commit) |
| Tests | `lib/introSound.test.ts` (ordre et continuité des moments) + suite complète |
| Navigateur intégré | intro lue jusqu'au titre final, nouvelles phrases, crédits About |
| Écoute | **non vérifiable par l'agent** (pas de haut-parleurs) : à écouter par l'équipe, au casque et sur téléphone |
