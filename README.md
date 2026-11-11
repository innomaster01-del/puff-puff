# PUFF PUFF

A pinball machine for your room: real size in AR (ARCore), or in 3D on the screen. Android.

Install: take `PUFF-PUFF.apk` from the latest release.

## Play

- **START**, then hold the plunger and let go to shoot. Two flipper buttons, left and right; both can be held.
- Three balls. The first ten seconds of each ball are ball-save time.
- **Skill shot**: the flashing top lane pays 2,500 if it is the first lane the ball rolls through.
- **Top lanes**: light all three for +1 bonus multiplier (to ×6). The flipper buttons move the lit lanes sideways.
- **Pop bumpers** 100; after 20 hits in one ball they are super bumpers, 300. Slingshots 10.
- **P · U · F · F** targets 250 each; all four: 5,000 and **PUFF PUFF MULTIBALL** (two balls, everything scores double).
- **The cloud** holds the ball and gives a mystery award: points, a multiplier step, or an extra ball (once a game).
  In multiball it is the **JACKPOT**: 10,000, doubled.
- **The spinner** in the left lane scores 100 a turn; thirty turns in one ball light the **KICKBACK** in the left outlane.
- End of ball: bonus = (bumper hits × 20 + targets × 100 + lanes × 100) × multiplier. Extra ball at 100,000.
- **NUDGE** shoves the table; three inside four seconds is a **TILT** (dead flippers, no bonus).

## Code

- `app/src/main/java/com/puffpuff/pinball/Table.kt` — the playfield in metres. `Pinball.kt` — physics and rules, no graphics;
  `PinballTest.kt` plays forty whole games with a simple robot player.
- `Machine.kt` — sounds, the display, the moving parts and lamps. `MainActivity.kt` — the AR and 3D views and the buttons.
- `tools/3d/table.js` builds every model from `tools/3d/layout.json` (three.js, exported to GLB in a headless browser with
  `export.html`); `layout.json` is the text of `Cabinet.layoutJson()` and a unit test keeps them the same.
- `tools/make_sounds.py OUT_DIR` synthesizes the sounds. No third-party art or samples.
