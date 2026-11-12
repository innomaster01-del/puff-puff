package com.puffpuff.pinball

import org.junit.Assert.*
import org.junit.Test
import kotlin.math.hypot

class PinballTest {
    private val P = TableDef.PUFF; private val V = TableDef.VIRUS; private val C = TableDef.CANDY
    private fun step(g: Pinball, frames: Int) = repeat(frames) { g.step(1f / 120) }

    /** A simple player: launches, and flips when a ball comes down onto a flipper. */
    private fun play(def: TableDef, seed: Long, maxSeconds: Int = 900, report: StringBuilder? = null): Pinball {
        val g = Pinball(def, seed); g.start()
        var t = 0; val dt = 1f / 120; var hold = 0; var lastFlipL = 0; var lastFlipR = 0
        val seen = HashMap<Ev, Int>()
        while (!g.gameOver && t < maxSeconds * 120) {
            if (g.waitingToLaunch) { if (hold == 0) g.plunger(true); hold++; if (hold > 5 + (seed * 37 % 140).toInt()) { g.plunger(false); hold = 0 } }
            var l = false; var r = false
            for (b in g.balls) if (b.inField && b.y < 0.19f && b.y > 0.07f && b.vy < 0.3f) { if (b.x < Table.CX + 0.01f && b.x > 0.13f) l = true; if (b.x > Table.CX - 0.01f && b.x < Table.FIELD_R - 0.13f) r = true }
            if (l && t - lastFlipL > 30) { g.flip(true, true); lastFlipL = t } else if (t - lastFlipL == 14) g.flip(true, false)
            if (r && t - lastFlipR > 30) { g.flip(false, true); lastFlipR = t } else if (t - lastFlipR == 14) g.flip(false, false)
            g.step(dt); t++
            for (e in g.events) seen[e.type] = (seen[e.type] ?: 0) + 1
            g.events.clear()
            for (b in g.balls) {
                assertFalse("ball went NaN at ${t / 120f}s", b.x.isNaN() || b.y.isNaN())
                assertTrue("${def.name}: ball left the table at ${t / 120f}s: ${b.x}, ${b.y}", b.x > -0.001f && b.x < Table.W + 0.001f && b.y > -0.05f && b.y < Table.L + 0.001f)
                assertTrue(hypot(b.vx, b.vy) <= Pinball.MAX_SPEED + 2.5f)
            }
        }
        report?.append("${def.name} seed $seed: ${t / 120}s score ${g.score} over=${g.gameOver} " + seen.entries.sortedBy { it.key.ordinal }.joinToString(" ") { "${it.key}=${it.value}" } + "\n")
        return g
    }

    @Test fun wholeGamesPlayThroughOnEveryMachine() {
        val rep = StringBuilder()
        for (def in TableDef.ALL) {
            var finished = 0; var total = 0L; var longest = 0f
            for (seed in 1L..25L) { val g = play(def, seed, report = rep); if (g.gameOver) finished++; total += g.score; longest = maxOf(longest, g.time) }
            java.io.File(System.getProperty("java.io.tmpdir"), "puffpuff_games.txt").writeText(rep.toString())
            assertEquals("${def.name}: every game must end", 25, finished)
            assertTrue("${def.name}: games should score", total / 25 > 1500)
            if (def.timeLimit > 0f) assertTrue("${def.name}: a clock game can't run on and on ($longest s)", longest < 400f)
        }
    }
    @Test fun eachMachineHasItsOwnField() {
        assertEquals(3, TableDef.ALL.size); assertEquals(3, TableDef.ALL.map { it.name }.toSet().size)
        assertEquals(3, P.bumpers.size); assertEquals(5, V.bumpers.size); assertEquals(5, C.drops.size)
        assertNull(V.saucer); assertTrue(V.timeLimit > 0f); assertEquals(0f, P.timeLimit, 0f)
    }
    @Test fun launchReachesTheField() {
        for (def in TableDef.ALL) for (hold in listOf(0, 30, 70, 140)) {
            val g = Pinball(def, 3); g.start(); g.plunger(true); step(g, hold); g.plunger(false)
            var entered = false; repeat(120 * 6) { g.step(1f / 120); if (g.balls.any { it.inField }) entered = true }
            assertTrue("${def.name}: a launch held $hold frames must leave the shooter lane", entered)
        }
    }
    @Test fun aBallInTheFieldCannotGoBackDownTheShooterLane() {
        val g = Pinball(P, 5); g.start(); val b = g.balls[0]; b.inField = true; b.x = Table.W - 0.03f; b.y = 0.89f; b.vx = 0.3f; b.vy = -1f
        repeat(600) { g.step(1f / 120); for (q in g.balls) if (q.inField) assertFalse("in the lane at ${q.x}, ${q.y}", q.x > Table.FIELD_R + 0.005f && q.y < 0.78f) }
    }
    @Test fun flipperSendsTheBallUp() {
        val g = Pinball(P, 7); g.start(); val b = g.balls[0]; b.inField = true; b.x = 0.19f; b.y = 0.16f; b.vy = -0.3f
        var top = 0f; var flipped = false
        repeat(120 * 3) { if (!flipped && b.y < 0.115f) { g.flip(true, true); flipped = true }; g.step(1f / 120); if (g.balls.isNotEmpty()) top = maxOf(top, g.balls[0].y) }
        assertTrue("flipped ball only reached $top", top > 0.5f)
    }
    @Test fun bumpersScore() {
        val g = Pinball(P, 9); g.start(); val b = g.balls[0]; b.inField = true
        b.x = P.bumpers[2][0]; b.y = P.bumpers[2][1] + 0.06f; b.vy = -0.5f; step(g, 60)
        assertTrue(g.bumperHits >= 1); assertTrue(g.score >= 100); assertTrue(g.events.any { it.type == Ev.BUMPER })
    }
    @Test fun lanesLightAndRaiseTheMultiplier() {
        val g = Pinball(P, 11); g.start()
        for (k in 0..2) { val b = g.balls[0]; b.inField = true; b.x = Table.LANES[k]; b.y = Table.LANE_Y1 + 0.02f; b.vx = 0f; b.vy = -0.4f; step(g, 40) }
        assertEquals(2, g.multiplier); assertEquals(3, g.laneHits); assertFalse(g.lanes.any { it })
    }
    @Test fun laneChangeMovesTheLights() {
        val g = Pinball(P, 12); g.start(); g.lanes[0] = true
        g.flip(false, true); g.flip(false, false); assertTrue(g.lanes[1]); assertFalse(g.lanes[0])
        g.flip(true, true); g.flip(true, false); assertTrue(g.lanes[0])
    }
    private fun hitTargets(g: Pinball, def: TableDef) {
        for (t in def.targets) { val b = g.balls[0]; b.inField = true; b.x = t[0] + t[2] * 0.05f; b.y = t[1]; b.vx = -t[2] * 1.2f; b.vy = 0f; step(g, 20) }
    }
    @Test fun puffLettersStartMultiballAndTheSaucerIsTheJackpot() {
        val g = Pinball(P, 13); g.start(); hitTargets(g, P)
        assertTrue(g.multiball); assertTrue(g.events.any { it.type == Ev.LETTERS_DONE }); assertTrue(g.score >= 5000 + 4 * 250)
        val before = g.score; val s = P.saucer!!
        val b = g.balls[0]; b.x = s[0]; b.y = s[1] + 0.005f; b.vx = 0f; b.vy = -0.1f; step(g, 10)
        assertTrue(g.events.any { it.type == Ev.JACKPOT }); assertEquals(before + 20_000, g.score)
        step(g, 120 * 4); assertTrue("the second ball must arrive", g.balls.size >= 2 || g.events.any { it.type == Ev.MULTIBALL_END })
    }
    @Test fun ballSaveAndThreeBalls() {
        val g = Pinball(P, 15); g.start()
        fun drain() { val b = g.balls[0]; b.inField = true; b.x = Table.CX; b.y = 0.05f; b.vx = 0f; b.vy = -0.5f; step(g, 30) }
        val b = g.balls[0]; b.x = 0.2f; b.y = 0.5f; g.step(0.01f); assertTrue(g.ballSave > 0f)
        drain(); assertEquals(1, g.ballNo); assertTrue(g.events.any { it.type == Ev.BALL_SAVED }); assertTrue(g.waitingToLaunch)
        drain(); assertEquals(2, g.ballNo); drain(); assertEquals(3, g.ballNo); drain(); assertTrue(g.gameOver)
    }
    @Test fun spinnerScoresAndLightsTheKickback() {
        val g = Pinball(P, 21); g.start(); val b = g.balls[0]; b.inField = true; val sp = P.spinner!!
        var passes = 0
        while (!g.kickbackLit && passes < 12) {
            passes++; b.x = (sp[0] + sp[1]) / 2; b.y = sp[2] + 0.03f; b.vx = 0f; b.vy = -2.2f
            var t = 0
            while (!g.kickbackLit && t++ < 120 * 4) { g.step(1f / 120); g.events.clear(); if (b.y < 0.5f) { b.y = 0.5f; b.x = 0.2f; b.vx = 0f; b.vy = 0f } }
        }
        assertTrue("spins counted: ${g.spins}", g.spins >= 30); assertTrue(g.kickbackLit)
        val q = g.balls[0]; q.x = 0.022f; q.y = 0.2f; q.vx = 0f; q.vy = -0.8f
        var kicked = false; repeat(120) { g.step(1f / 120); if (g.events.any { it.type == Ev.KICKBACK }) kicked = true }
        assertTrue(kicked); assertFalse(g.kickbackLit)
    }

    // ---- VIRUS ----
    private fun hitBumper(g: Pinball, def: TableDef, k: Int) {
        val b = g.balls[0]; b.inField = true; b.x = def.bumpers[k][0]; b.y = def.bumpers[k][1] + 0.05f; b.vx = 0f; b.vy = -0.5f; step(g, 12)
        b.x = 0.2f; b.y = 0.5f; b.vx = 0f; b.vy = 0f
    }
    @Test fun virusCellsAddTimeAndOutbreakIsThreeBalls() {
        val g = Pinball(V, 25); g.start(); g.balls[0].inField = true
        val clock0 = g.clock
        hitBumper(g, V, 0); assertTrue(g.cells[0]); assertTrue("an infected cell adds 2 s", g.clock > clock0 + 1.5f)
        hitBumper(g, V, 0); assertTrue(g.events.count { it.type == Ev.CELL } == 1)            // the same cell twice is one infection
        for (k in 1..4) hitBumper(g, V, k)
        assertTrue(g.events.any { it.type == Ev.CELLS_DONE }); assertTrue(g.multiball); assertEquals(1, g.outbreaks); assertFalse(g.cells.any { it })
        assertEquals(1.25f, g.clockRate, 1e-6f)
        hitBumper(g, V, 0); assertFalse("after a mutation one hit is not enough", g.cells[0]); hitBumper(g, V, 0); assertTrue(g.cells[0])
        var most = 0
        repeat(120 * 6) { g.balls.firstOrNull()?.let { b -> if (b.inField && b.y < 0.3f) { b.y = 0.6f; b.x = 0.2f; b.vx = 0f; b.vy = 0.2f } }; g.step(1f / 120); most = maxOf(most, g.balls.size) }
        assertEquals("three balls in play at once", 3, most)
    }
    @Test fun virusDrainCostsTimeAndTheClockEndsTheGame() {
        val g = Pinball(V, 26); g.start(); val b = g.balls[0]; b.inField = true; b.x = 0.2f; b.y = 0.5f; g.step(0.01f)
        assertEquals("no ball save on the clock", 0f, g.ballSave, 0f)
        val c = g.clock; b.x = Table.CX; b.y = 0.05f; b.vx = 0f; b.vy = -0.5f; step(g, 20)
        assertTrue(g.events.any { it.type == Ev.TIME_LOST }); assertTrue(g.clock < c - 4.9f); assertFalse(g.gameOver)
        step(g, 120 * 2); assertTrue("the ball comes back by itself", g.balls.isNotEmpty())
        // then let the clock run out with a ball in play
        var t = 0; while (!g.gameOver && t++ < 120 * 200) { g.balls.firstOrNull()?.let { q -> q.inField = true; if (q.y < 0.4f) { q.x = 0.2f; q.y = 0.6f; q.vx = 0f; q.vy = 0f } }; g.step(1f / 120) }
        assertTrue(g.gameOver); assertTrue(g.events.any { it.type == Ev.TIME_UP }); assertEquals(0f, g.clock, 0f)
    }

    // ---- CANDY B ----
    private fun hitDrop(g: Pinball, k: Int) {
        val d = C.drops[k]; val b = g.balls[0]; b.inField = true; b.x = d[0]; b.y = d[1] - 0.04f; b.vx = 0f; b.vy = 1.0f; step(g, 10)
        b.x = 0.2f; b.y = 0.3f; b.vx = 0f; b.vy = 0f
    }
    @Test fun candyDropTargetsGoDownAndRaiseTheLevel() {
        val g = Pinball(C, 27); g.start()
        hitDrop(g, 0); assertTrue(g.dropsDown[0]); assertEquals(500L, g.events.first { it.type == Ev.DROP }.value)
        for (k in 1..4) hitDrop(g, k)
        assertEquals(2, g.level); assertTrue(g.events.any { it.type == Ev.DROPS_DONE }); assertTrue(g.events.any { it.type == Ev.RUSH }); assertTrue(g.rush > 15f)
        step(g, 150); assertFalse("the row stands up again", g.dropsDown.any { it })
        g.events.clear(); hitDrop(g, 2); assertEquals("level 2 drops are worth more", 1000L, g.events.first { it.type == Ev.DROP }.value)
    }
    @Test fun aDownDropTargetLetsTheBallThrough() {
        val g = Pinball(C, 28); g.start(); hitDrop(g, 2)
        val d = C.drops[2]; val b = g.balls[0]; b.x = d[0]; b.y = d[1] - 0.04f; b.vx = 0f; b.vy = 1.0f; step(g, 12)
        assertTrue("the ball passes where the target was", b.y > d[1] + 0.01f)
    }
    @Test fun sugarRushDoublesTheScore() {
        val g = Pinball(C, 29); g.start(); for (k in 0..4) hitDrop(g, k)
        assertTrue(g.rush > 0f); val before = g.score; val hits = g.bumperHits
        val b = g.balls[0]; b.x = C.bumpers[0][0]; b.y = C.bumpers[0][1] + 0.05f; b.vx = 0f; b.vy = -0.5f; step(g, 12)
        assertEquals(hits + 1, g.bumperHits); assertEquals(before + 200, g.score)
        b.y = 0.5f; b.x = 0.2f; b.vx = 0f; b.vy = 0f; var t = 0; while (g.rush > 0f && t++ < 120 * 25) { g.step(1f / 120); if (b.y < 0.4f) { b.y = 0.5f; b.vy = 0f } }
        assertTrue(g.events.any { it.type == Ev.RUSH_END })
    }
    @Test fun threeNudgesTilt() {
        val g = Pinball(P, 17); g.start(); g.balls[0].inField = true; g.balls[0].y = 0.5f; g.balls[0].x = 0.2f
        g.nudge(); assertFalse(g.tilted); g.nudge(); assertTrue(g.events.any { it.type == Ev.TILT_WARNING }); g.nudge(); assertTrue(g.tilted)
        g.flip(true, true); assertFalse(g.left.pressed)
    }
}
