package com.puffpuff.pinball

import org.junit.Assert.*
import org.junit.Test
import kotlin.math.hypot

class PinballTest {
    /** A simple player: launches, and flips when a ball comes down onto a flipper. */
    private fun play(seed: Long, maxSeconds: Int = 900, report: StringBuilder? = null): Pinball {
        val g = Pinball(seed); g.start()
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
                assertTrue("ball left the table at ${t / 120f}s: ${b.x}, ${b.y}", b.x > -0.001f && b.x < Table.W + 0.001f && b.y > -0.05f && b.y < Table.L + 0.001f)
                assertTrue(hypot(b.vx, b.vy) <= Pinball.MAX_SPEED + 2.5f)
            }
        }
        report?.append("seed $seed: ${t / 120}s score ${g.score} over=${g.gameOver} saved=${seen[Ev.BALL_SAVED] ?: 0} bumpers=${seen[Ev.BUMPER] ?: 0} targets=${seen[Ev.TARGET] ?: 0} lanes=${seen[Ev.LANE] ?: 0} saucer=${seen[Ev.SAUCER_IN] ?: 0} multiball=${seen[Ev.MULTIBALL] ?: 0} extra=${seen[Ev.EXTRA_BALL] ?: 0} skill=${seen[Ev.SKILL_SHOT] ?: 0} lanesDone=${seen[Ev.LANES_DONE] ?: 0}\n")
        return g
    }

    @Test fun wholeGamesPlayThrough() {
        val rep = StringBuilder(); val all = HashMap<Ev, Int>(); var finished = 0; var total = 0L
        for (seed in 1L..40L) { val g = play(seed, report = rep); if (g.gameOver) finished++; total += g.score }
        java.io.File(System.getProperty("java.io.tmpdir"), "puffpuff_games.txt").writeText(rep.toString())
        assertEquals("every game must end", 40, finished)
        assertTrue("games should score", total / 40 > 1500)
    }
    @Test fun launchReachesTheField() {
        for (hold in listOf(0, 30, 70, 140)) {
            val g = Pinball(3); g.start(); g.plunger(true); repeat(hold) { g.step(1f / 120) }; g.plunger(false)
            var entered = false; repeat(120 * 6) { g.step(1f / 120); if (g.balls.any { it.inField }) entered = true }
            assertTrue("a launch held $hold frames must leave the shooter lane", entered)
        }
    }
    @Test fun aBallInTheFieldCannotGoBackDownTheShooterLane() {
        val g = Pinball(5); g.start(); val b = g.balls[0]; b.inField = true; b.x = Table.W - 0.03f; b.y = 0.89f; b.vx = 0.3f; b.vy = -1f
        repeat(600) { g.step(1f / 120); for (q in g.balls) if (q.inField) assertFalse("in the lane at ${q.x}, ${q.y}", q.x > Table.FIELD_R + 0.005f && q.y < 0.78f) }
    }
    @Test fun flipperSendsTheBallUp() {
        val g = Pinball(7); g.start(); val b = g.balls[0]; b.inField = true; b.x = 0.19f; b.y = 0.16f; b.vy = -0.3f
        var top = 0f; var flipped = false
        repeat(120 * 3) { if (!flipped && b.y < 0.115f) { g.flip(true, true); flipped = true }; g.step(1f / 120); if (g.balls.isNotEmpty()) top = maxOf(top, g.balls[0].y) }
        assertTrue("flipped ball only reached $top", top > 0.5f)
    }
    @Test fun rulesOfScoring() {
        val g = Pinball(9); g.start(); val b = g.balls[0]; b.inField = true
        // drop it on a bumper
        b.x = Table.BUMPERS[2][0]; b.y = Table.BUMPERS[2][1] + 0.06f; b.vy = -0.5f
        repeat(60) { g.step(1f / 120) }
        assertTrue(g.bumperHits >= 1); assertTrue(g.score >= 100)
        assertTrue(g.events.any { it.type == Ev.BUMPER })
    }
    @Test fun lanesLightAndRaiseTheMultiplier() {
        val g = Pinball(11); g.start()
        for (k in 0..2) { val b = g.balls[0]; b.inField = true; b.x = Table.LANES[k]; b.y = Table.LANE_Y1 + 0.02f; b.vx = 0f; b.vy = -0.4f; repeat(40) { g.step(1f / 120) } }
        assertEquals(2, g.multiplier); assertEquals(3, g.laneHits); assertFalse(g.lanes.any { it })
        assertTrue(g.events.any { it.type == Ev.SKILL_SHOT } || g.skillLane == -1)
    }
    @Test fun laneChangeMovesTheLights() {
        val g = Pinball(12); g.start(); g.lanes[0] = true
        g.flip(false, true); g.flip(false, false); assertTrue(g.lanes[1]); assertFalse(g.lanes[0])
        g.flip(true, true); g.flip(true, false); assertTrue(g.lanes[0])
    }
    @Test fun lettersStartMultiball() {
        val g = Pinball(13); g.start()
        for (k in 0..3) { val t = Table.TARGETS[k]; val b = g.balls.first { it.inField || true }; b.inField = true; b.x = t[0] + t[2] * 0.05f; b.y = t[1]; b.vx = -t[2] * 1.2f; b.vy = 0f; repeat(20) { g.step(1f / 120) } }
        assertTrue(g.multiball); assertTrue(g.events.any { it.type == Ev.MULTIBALL }); assertTrue(g.score >= 5000 + 4 * 250)
        repeat(120 * 4) { g.step(1f / 120) }
        assertTrue("the second ball must arrive", g.balls.size >= 2 || g.events.any { it.type == Ev.MULTIBALL_END })
    }
    @Test fun ballSaveAndThreeBalls() {
        val g = Pinball(15); g.start()
        fun drain() { val b = g.balls[0]; b.inField = true; b.x = Table.CX; b.y = 0.05f; b.vx = 0f; b.vy = -0.5f; repeat(30) { g.step(1f / 120) } }
        // inside ball-save time the ball comes back
        val b = g.balls[0]; b.x = 0.2f; b.y = 0.5f; g.step(0.01f); assertTrue(g.ballSave > 0f)
        drain(); assertEquals(1, g.ballNo); assertTrue(g.events.any { it.type == Ev.BALL_SAVED }); assertTrue(g.waitingToLaunch)
        // after it, each drain is the next ball; the third ends the game
        drain(); assertEquals(2, g.ballNo); drain(); assertEquals(3, g.ballNo); drain(); assertTrue(g.gameOver)
        assertTrue(g.events.any { it.type == Ev.GAME_OVER })
    }
    @Test fun threeNudgesTilt() {
        val g = Pinball(17); g.start(); g.balls[0].inField = true; g.balls[0].y = 0.5f; g.balls[0].x = 0.2f
        g.nudge(); assertFalse(g.tilted); g.nudge(); assertTrue(g.events.any { it.type == Ev.TILT_WARNING }); g.nudge(); assertTrue(g.tilted)
        g.flip(true, true); assertFalse(g.left.pressed)                         // dead flippers
    }
    @Test fun bonusIsCountedAtTheDrain() {
        val g = Pinball(19); g.start(); val b = g.balls[0]; b.inField = true
        b.x = Table.BUMPERS[2][0]; b.y = Table.BUMPERS[2][1] + 0.06f; b.vy = -0.5f; repeat(40) { g.step(1f / 120) }
        val hits = g.bumperHits; repeat(120 * 11) { g.step(1f / 120); if (g.balls.isEmpty()) return@repeat }
        // force the drain after ball-save time
        if (g.ballNo == 1 && g.balls.isNotEmpty()) { val q = g.balls[0]; q.inField = true; q.x = Table.CX; q.y = 0.05f; q.vx = 0f; q.vy = -0.5f; repeat(30) { g.step(1f / 120) } }
        assertTrue(g.events.any { it.type == Ev.BONUS && it.value >= hits * 20L })
    }
}
