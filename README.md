# NovaLya RP — site vitrine 3D

Site statique (HTML / CSS / JS) avec scènes 3D Three.js. **Aucun serveur n'est nécessaire** :
double-clique sur `index.html` pour l'ouvrir, ou envoie tout le dossier chez ton hébergeur
(OVH, Netlify, Vercel, GitHub Pages, hébergement Discord/FiveM, etc.).

## À personnaliser

| Quoi | Où |
|---|---|
| Lien Discord | `index.html` : cherche `https://discord.gg/TON-LIEN` (2 endroits) |
| Textes | `index.html` (tout est en français, modifie librement) |
| Couleurs | `css/style.css`, bloc `:root` en haut |
| Logo | remplace `assets/logo.jpg` (carré, 800×800) puis `npm run build` |

## Modifier les scènes 3D

Le code source est dans `src/`. Après une modification :

```bash
npm install      # une seule fois
npm run build    # régénère js/main.js
```

- `src/scenes/hero.js`  : texte 3D « NovaLya RP », anneau, rochers, nuages, étoiles
- `src/scenes/car.js`   : voiture sur plateau (section « Le serveur »)
- `src/scenes/minis.js` : gyrophare, croix, engrenages, maison (cartes « Les univers »)
- `src/scenes/coin.js`  : pièce avec le logo (section « Rejoindre »)

Changer le texte 3D du hero : dans `src/scenes/hero.js`, fonction `buildLogoText`
(les lignes `addLine(...)`). Les caractères disponibles sont les lettres, chiffres et
accents courants (police Montserrat ExtraBold Italic convertie par `tools/make_typeface.py`).

## Accessibilité et compatibilité

- Respecte « réduire les animations » du système.
- Si WebGL est indisponible, le logo s'affiche en image à la place des scènes 3D.
- Polices (Anton, Montserrat) incluses dans `fonts/` : rien ne se charge depuis Internet.
