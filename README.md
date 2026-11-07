# STAR-CRUSH // MEGALOTTO

**The most rigged lottery in the universe. You won. Now survive the drive home.**

A mobile arcade death-race from **Matthews Operations Lab // Interactive Division**. Win the Megalotto, build your pilot, rig a junk ship, and race a roller-coaster track from Olympus Mons to a flooded Miami. Then spend your winnings in the Spaceport and do it again for bigger money.

▶ **Play:** https://starfirelockanddoorbackup-byte.github.io/megalotto/
On a phone: open the link, tap **Share → Add to Home Screen** for full-screen play.

## The loop
1. **The Ticket:** you won. Read the fine print.
2. **Identity Forge:** body (male / female / android), skin, hair, jacket, optics, face cover, headgear, scars, cyberware, neon colour, last words.
3. **The Gunsmith:** hull, thruster, plating, cowling, guns and sponsor. Every part changes speed, hull, agility, boost, payout and heat.
4. **The Race:** seven legs: Olympus Mons Ascent → Phobos Gate → The Belt → Wormhole → Blockade Crossfire → Atmospheric Entry → Miami Drowned.
5. **Outcome:** die and owe more, or win and get paid (minus fees).
6. **The Spaceport:** walk the street. Clinic (implants, new look), Chop Shop (parts), Syndicate (harder races), Bar (tips, gossip, Data Terminal).

## Controls
- **Drag anywhere** to steer. Guns fire themselves.
- **BOOST:** hold. Amber gates refill it. Green chevrons and black-hole edges give free boost.
- **ROCKET:** homing missile, locks onto whatever's in your sights.
- Desktop: arrows/WASD steer, Space boost, R rocket, P pause.

## Tech
Single file (`index.html`), zero dependencies, zero build. Canvas 2D with a pseudo-3D coaster track, a projected 3D cel-shaded ship, bloom + chromatic aberration post-processing, a procedural WebAudio synthwave score, and haptics (Android vibrate + iOS 18 tap fallback). Saves to the browser's local storage.

## Add your own content
Spaceport → Bar → **Back room: Data Terminal** (or Settings → Data Terminal):
- `tables`: weighted `["text", weight]` lists for sponsors, hazards, rivals, ads, rumors, news, death causes and last words.
- `sprites`: map `"slot.id"` (for example `"hull.needle"`) to a PNG URL or data URI to swap in hand-drawn ship layers.

## Roadmap
- `3d` branch: full WebGL rebuild of the race (real 3D track, ships, capital fleets and Miami), shader post-processing, layered music.
- Native app wrapper (Capacitor) for app stores and proper iPhone haptics.

© Matthews Operations Lab
