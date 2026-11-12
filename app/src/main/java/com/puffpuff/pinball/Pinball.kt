package com.puffpuff.pinball

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin

/** Things that happened in a step: the screen turns them into sounds, lights and words. */
enum class Ev { LAUNCH, FLIP, BUMPER, SLING, TARGET, LETTERS_DONE, LANE, LANES_DONE, SKILL_SHOT, SAUCER_IN, SAUCER_OUT, MULTIBALL, MULTIBALL_END, SUPER_BUMPERS,
    SPIN, KICKBACK_LIT, KICKBACK, JACKPOT, RUSH, RUSH_END,
    CELL, CELLS_DONE, TIME_ADD, TIME_LOST, TIME_UP, DROP, DROPS_DONE,
    BALL_SAVED, DRAIN, BONUS, EXTRA_BALL, NUDGE, TILT_WARNING, TILT, NEW_BALL, GAME_OVER }
class Event(val type: Ev, val index: Int = 0, val value: Long = 0)

class Ball(var x: Float, var y: Float) {
    var vx = 0f; var vy = 0f
    /** Out of the shooter lane: from then on the gate at its top is shut for this ball. */
    var inField = false
    var held = 0f            // seconds left in a saucer
    var stillFor = 0f
}

class Flipper(val px: Float, val py: Float, private val left: Boolean) {
    /** 0 = at rest, 1 = fully up. */
    var lift = 0f; private set
    var pressed = false
    private var rate = 0f     // lift per second right now (0 when not moving)
    fun step(dt: Float) {
        val before = lift
        lift = if (pressed) min(1f, lift + dt * 26f) else max(0f, lift - dt * 12f)
        rate = (lift - before) / dt
    }
    /** Angle of the blade from the +x axis, radians. */
    val angle: Float get() { val a = Table.FLIP_REST + (Table.FLIP_UP - Table.FLIP_REST) * lift; return ((if (left) a else 180f - a) * PI / 180).toFloat() }
    /** Angular speed, radians per second (counter-clockwise positive). */
    val omega: Float get() = rate * ((Table.FLIP_UP - Table.FLIP_REST) * PI / 180).toFloat() * (if (left) 1f else -1f)
    val tipX get() = px + Table.FLIP_LEN * cos(angle); val tipY get() = py + Table.FLIP_LEN * sin(angle)
}

/**
 * The physics of the ball and the rules of one machine (TableDef says which), with no graphics in it, so whole games
 * are played in a unit test.
 *
 * What every machine has: hold the plunger and let go to launch; ten seconds of ball-save at the start of a ball; the
 * skill shot (the flashing top lane pays 2,500 if it is the first lane the ball rolls through); the three top lanes
 * (light all for +1 bonus multiplier, to ×6, and 1,000; the flipper buttons move the lit lanes sideways); pop bumpers
 * 100, super bumpers 300 after 20 hits in a ball; slingshots 10; the end-of-ball bonus (bumper hits × 20 + targets ×
 * 100 + lanes × 100) × multiplier; an extra ball once at 100,000; nudge, and TILT on three nudges in four seconds.
 * What each machine adds is described on TableDef.
 */
class Pinball(val def: TableDef = TableDef.PUFF, private val seed: Long = System.nanoTime()) {
    val balls = ArrayList<Ball>()
    val left = Flipper(Table.FLIP_L[0], Table.FLIP_L[1], true); val right = Flipper(Table.FLIP_RT[0], Table.FLIP_RT[1], false)
    val events = ArrayList<Event>()

    var score = 0L; private set
    var ballNo = 0; private set              // 1..def.balls while playing, 0 before the first game
    var extraBalls = 0; private set
    var multiplier = 1; private set
    val lanes = BooleanArray(3)
    val letters = BooleanArray(def.targets.size)
    var skillLane = 1; private set           // the flashing lane, or -1 once the ball has passed a lane
    var bumperHits = 0; private set; var targetHits = 0; private set; var laneHits = 0; private set
    var superBumpers = false; private set
    var multiball = false; private set
    var ballSave = 0f; private set           // seconds of ball-save left
    var tilted = false; private set
    var gameOver = true; private set
    var charge = 0f; private set             // 0..1 while the plunger is held
    var lastBonus = 0L; private set
    var time = 0f; private set
    /** Seconds since each bumper / slingshot / target was hit (for its flash). */
    val bumperFlash = FloatArray(def.bumpers.size) { 9f }; val slingFlash = FloatArray(2) { 9f }; val targetFlash = FloatArray(def.targets.size) { 9f }
    /** The spinner: its angle in turns, how fast it is turning (turns a second), turns made this ball. */
    var spinnerAngle = 0f; private set; var spinnerSpeed = 0f; private set; var spins = 0; private set
    var kickbackLit = false; private set
    /** Seconds of rush left (CANDY): everything scores double. */
    var rush = 0f; private set
    /** Seconds left of the light show after a big moment (every lamp flashes). */
    var show = 0f; private set; var kickFlash = 9f; private set
    // VIRUS
    /** Which cells (bumpers) are infected. */
    val cells = BooleanArray(def.bumpers.size)
    /** Seconds left on the clock (machines played against it). It runs while a ball is in the field. */
    var clock = def.timeLimit; private set
    var outbreaks = 0; private set
    /** Hits each cell has taken in this wave; after every outbreak the virus is stronger and a cell needs one hit more. */
    val cellHits = IntArray(def.bumpers.size)
    /** How fast the clock runs: the virus speeds up with every outbreak. */
    val clockRate get() = 1f + 0.25f * outbreaks
    // CANDY
    /** Which drop targets are down. */
    val dropsDown = BooleanArray(def.drops.size)
    var level = 1; private set
    private var dropsReset = 0f
    private var saucerStep = 0; private var extraFromSaucer = false; private var extraFromScore = false
    private var charging = false; private var pendingBalls = 0; private var feedIn = 0f
    private var saveGiven = false            // ball-save time is given once for each ball
    private val nudges = ArrayList<Float>()
    private var rnd = seed
    private fun rand(): Float { rnd = rnd * 6364136223846793005L + 1442695040888963407L; return ((rnd ushr 40) and 0xFFFFFF).toFloat() / 0x1000000 }

    val timed get() = def.timeLimit > 0f
    val waitingToLaunch get() = !gameOver && balls.any { onPlunger(it) }
    private fun onPlunger(b: Ball) = !b.inField && b.x > Table.FIELD_R && b.y < 0.09f && abs(b.vy) < 0.08f

    fun start() {
        score = 0; ballNo = 0; extraBalls = 0; gameOver = false; saucerStep = 0; extraFromSaucer = false; extraFromScore = false
        balls.clear(); events.clear(); lastBonus = 0; clock = def.timeLimit; outbreaks = 0; level = 1; cells.fill(false); cellHits.fill(0); dropsDown.fill(false); dropsReset = 0f
        newBall(true)
    }
    private fun newBall(next: Boolean) {
        if (next) { ballNo++; multiplier = 1; bumperHits = 0; targetHits = 0; laneHits = 0; superBumpers = false; lanes.fill(false); letters.fill(false); spins = 0; kickbackLit = false }
        multiball = false; tilted = false; ballSave = 0f; saveGiven = false; skillLane = 1; nudges.clear(); pendingBalls = 0; rush = 0f
        feed(); events.add(Event(Ev.NEW_BALL, ballNo, if (next) 0 else 1))      // value 1 = the same ball again (an extra ball)
    }
    private fun feed() { balls.add(Ball(Table.PLUNGER[0], Table.PLUNGER[1])) }

    // ---------------- the player's hands ----------------
    fun flip(leftSide: Boolean, down: Boolean) {
        val f = if (leftSide) left else right
        if (down && !f.pressed && !tilted && !gameOver) {
            events.add(Event(Ev.FLIP, if (leftSide) 0 else 1))
            // lane change: the lit lanes move one place toward the flipper pressed
            val a = lanes[0]; val b = lanes[1]; val c = lanes[2]
            if (leftSide) { lanes[0] = b; lanes[1] = c; lanes[2] = a } else { lanes[0] = c; lanes[1] = a; lanes[2] = b }
            if (skillLane >= 0) skillLane = (skillLane + (if (leftSide) 2 else 1)) % 3
        }
        f.pressed = down && !tilted && !gameOver
    }
    fun plunger(down: Boolean) {
        if (gameOver) return
        if (down) { if (waitingToLaunch) charging = true }
        else if (charging) {
            charging = false
            val power = 1.55f + 1.35f * charge
            for (b in balls) if (onPlunger(b)) { b.vy = power; b.vx = 0f }
            events.add(Event(Ev.LAUNCH, 0, (charge * 100).toLong())); charge = 0f
        }
    }
    fun nudge() {
        if (gameOver || tilted) return
        nudges.add(time); nudges.removeAll { time - it > 4f }
        for (b in balls) if (b.inField && b.held <= 0f) { b.vy += 0.28f; b.vx += (rand() - 0.5f) * 0.3f }
        if (nudges.size >= 3) { tilted = true; left.pressed = false; right.pressed = false; events.add(Event(Ev.TILT)) }
        else events.add(Event(if (nudges.size == 2) Ev.TILT_WARNING else Ev.NUDGE))
    }

    private fun add(points: Long) {
        if (tilted) return
        score += points * (if (multiball) 2 else 1) * (if (rush > 0f) 2 else 1)
        if (!extraFromScore && !timed && score >= 100_000) { extraFromScore = true; extraBalls++; events.add(Event(Ev.EXTRA_BALL)) }
    }

    // ---------------- time ----------------
    /** Advance the table by `seconds` (in 1 ms slices, so a fast ball cannot pass through a wall). */
    fun step(seconds: Float) {
        if (gameOver) return
        var left = min(seconds, 0.05f)
        while (left > 0f && !gameOver) { val dt = min(DT, left); slice(dt); left -= dt }
    }
    private fun slice(dt: Float) {
        time += dt
        if (charging) charge = min(1f, charge + dt / 1.1f)
        if (ballSave > 0f) ballSave = max(0f, ballSave - dt)
        for (i in bumperFlash.indices) bumperFlash[i] += dt; for (i in 0..1) slingFlash[i] += dt; for (i in targetFlash.indices) targetFlash[i] += dt
        if (show > 0f) show = max(0f, show - dt); kickFlash += dt
        if (rush > 0f) { rush = max(0f, rush - dt); if (rush == 0f) events.add(Event(Ev.RUSH_END)) }
        // the spinner turns on, slowing down; every whole turn scores
        if (spinnerSpeed > 0.05f) {
            val before = spinnerAngle.toInt(); spinnerAngle += spinnerSpeed * dt; spinnerSpeed *= 1f - 1.5f * dt
            repeat(spinnerAngle.toInt() - before) { spins++; add(100); events.add(Event(Ev.SPIN)); if (!def.cells && !kickbackLit && spins == 30) { kickbackLit = true; events.add(Event(Ev.KICKBACK_LIT)) } }
        } else if (spinnerSpeed != 0f) { spinnerSpeed = 0f; spinnerAngle = Math.round(spinnerAngle * 2f) / 2f }       // it comes to rest flat
        // the clock (VIRUS) runs while a ball is in the field
        if (timed && balls.any { it.inField }) { clock -= dt * clockRate; if (clock <= 0f) { clock = 0f; timeUp(); return } }
        // the row of drop targets (CANDY) stands up again a moment after the last one fell
        if (dropsReset > 0f) { dropsReset -= dt; if (dropsReset <= 0f) dropsDown.fill(false) }
        left.step(dt); right.step(dt)
        if (pendingBalls > 0) { feedIn -= dt; if (feedIn <= 0f && balls.none { !it.inField }) { val b = Ball(Table.PLUNGER[0], Table.PLUNGER[1]); b.vy = 2.55f; balls.add(b); pendingBalls--; feedIn = 0.8f } }
        var i = 0
        while (i < balls.size) {
            val b = balls[i]
            if (b.held > 0f) {
                b.held -= dt; if (b.held <= 0f) kickOut(b)
                i++; continue
            }
            move(b, dt)
            if (b.inField && b.y < Table.DRAIN_Y) { balls.removeAt(i); drained(); if (gameOver) return; continue }
            i++
        }
        // two balls on the table knock each other
        for (p in 0 until balls.size) for (q in p + 1 until balls.size) knock(balls[p], balls[q])
    }
    private fun kickOut(b: Ball) {
        val c = def.saucer ?: return
        // off to the side the field is on, and down the table
        val dir = if (c[0] < Table.CX - 0.01f) 1f else if (c[0] > Table.CX + 0.01f) -1f else if (rand() < 0.5f) 1f else -1f
        b.x = c[0] + dir * 0.022f; b.y = c[1] - 0.022f; b.vx = dir * (0.55f + rand() * 0.2f); b.vy = -0.45f; events.add(Event(Ev.SAUCER_OUT))
    }

    private fun move(b: Ball, dt: Float) {
        b.vy -= G * dt
        val damp = 1f - 0.035f * dt; b.vx *= damp; b.vy *= damp
        val sp = hypot(b.vx, b.vy); if (sp > MAX_SPEED) { b.vx *= MAX_SPEED / sp; b.vy *= MAX_SPEED / sp }
        b.x += b.vx * dt; b.y += b.vy * dt
        if (!b.inField && (b.x < Table.FIELD_R - 0.004f || b.y > 0.88f)) { b.inField = true; if (!saveGiven && !multiball && !timed) { saveGiven = true; ballSave = 10f } }
        val r = Table.BALL_R
        for (s in def.segs) {
            if (s.kind == 3 && !b.inField) continue
            if (s.kind == 4 && dropsDown[s.index]) continue
            val hit = hitSegment(b, s.ax, s.ay, s.bx, s.by, r, s.bounce, 0f, 0f, 0f) ?: continue
            when (s.kind) {
                1 -> if (hit > 0.18f) {
                    // the slingshot fires: straight off its face
                    val (nx, ny) = normalToward(s, b); b.vx += nx * 1.25f; b.vy += ny * 1.25f
                    slingFlash[s.index] = 0f; add(10); events.add(Event(Ev.SLING, s.index))
                }
                2 -> if (hit > 0.12f) target(s.index)
                4 -> if (hit > 0.15f) drop(s.index)
            }
        }
        for (f in arrayOf(left, right)) hitSegment(b, f.px, f.py, f.tipX, f.tipY, r + Table.FLIP_R, 0.4f, f.px, f.py, f.omega)
        def.bumpers.forEachIndexed { k, c ->
            val dx = b.x - c[0]; val dy = b.y - c[1]; val d = hypot(dx, dy); val rr = r + def.bumperR
            if (d < rr && d > 1e-6f) {
                val nx = dx / d; val ny = dy / d; b.x = c[0] + nx * rr; b.y = c[1] + ny * rr
                val vn = b.vx * nx + b.vy * ny
                // a pop bumper throws the ball off at a set speed, however softly it was touched
                b.vx += (1.55f - vn) * nx; b.vy += (1.55f - vn) * ny
                bumperFlash[k] = 0f; bumperHits++; add(if (superBumpers) 300 else 100); events.add(Event(Ev.BUMPER, k))
                if (!superBumpers && bumperHits >= 20) { superBumpers = true; events.add(Event(Ev.SUPER_BUMPERS)) }
                if (def.cells) infect(k)
            }
        }
        for (c in def.posts) {
            val dx = b.x - c[0]; val dy = b.y - c[1]; val d = hypot(dx, dy); val rr = r + Table.POST_R
            if (d < rr && d > 1e-6f) { val nx = dx / d; val ny = dy / d; b.x = c[0] + nx * rr; b.y = c[1] + ny * rr; val vn = b.vx * nx + b.vy * ny; if (vn < 0) { b.vx -= 1.7f * vn * nx; b.vy -= 1.7f * vn * ny } }
        }
        // top lanes: rolling down through the middle of one
        val mid = (Table.LANE_Y0 + Table.LANE_Y1) / 2
        if (b.inField && b.y < mid && b.y - b.vy * dt >= mid) for (k in 0..2) if (abs(b.x - Table.LANES[k]) < 0.027f) lane(k)
        // through the spinner: the faster the ball, the longer it turns
        def.spinner?.let { s -> if (b.inField && b.x > s[0] && b.x < s[1] && (b.y - s[2]) * (b.y - b.vy * dt - s[2]) < 0f) spinnerSpeed = max(spinnerSpeed, abs(b.vy) * 7f) }
        // the kickback, when it is lit, throws a ball in the left outlane back up the table
        if (kickbackLit && b.inField && b.x < 0.045f && b.y < Table.KICKBACK[1] && b.vy < 0f) { kickbackLit = false; kickFlash = 0f; b.vy = 2.9f; b.vx = 0.12f; events.add(Event(Ev.KICKBACK)) }
        // the saucer catches a ball that is not going too fast
        def.saucer?.let { c -> if (b.inField && hypot(b.x - c[0], b.y - c[1]) < Table.SAUCER_R && hypot(b.vx, b.vy) < 1.3f) saucer(b, c) }
        // a ball that has stopped somewhere it should not: free it, as a real table's ball search does
        if (b.inField && hypot(b.vx, b.vy) < 0.02f && !restsOnFlipper(b)) { b.stillFor += dt; if (b.stillFor > 3f) { b.vy += 0.5f; b.vx += (rand() - 0.5f) * 0.4f; b.stillFor = 0f } } else b.stillFor = 0f
    }
    private fun restsOnFlipper(b: Ball) = b.y < 0.2f && b.x > 0.1f && b.x < Table.FIELD_R - 0.1f

    /**
     * Ball against a line with thickness. Returns how hard it hit (speed into the line), or null if they do not touch.
     * (px, py, omega): if the line is turning about that point, the ball is struck by the moving surface.
     */
    private fun hitSegment(b: Ball, ax: Float, ay: Float, bx: Float, by: Float, r: Float, bounce: Float, px: Float, py: Float, omega: Float): Float? {
        val ex = bx - ax; val ey = by - ay; val len2 = ex * ex + ey * ey
        val t = (((b.x - ax) * ex + (b.y - ay) * ey) / len2).coerceIn(0f, 1f)
        val cx = ax + ex * t; val cy = ay + ey * t
        val dx = b.x - cx; val dy = b.y - cy; val d = hypot(dx, dy)
        if (d >= r || d < 1e-7f) return null
        val nx = dx / d; val ny = dy / d
        b.x = cx + nx * r; b.y = cy + ny * r
        // how fast the surface itself is moving where the ball touches it
        val sx = -omega * (cy - py); val sy = omega * (cx - px)
        val vn = (b.vx - sx) * nx + (b.vy - sy) * ny
        if (vn >= 0f) return 0f
        b.vx -= (1f + bounce) * vn * nx; b.vy -= (1f + bounce) * vn * ny
        return -vn
    }
    private fun normalToward(s: Table.Seg, b: Ball): Pair<Float, Float> {
        val ex = s.bx - s.ax; val ey = s.by - s.ay; val l = hypot(ex, ey); var nx = -ey / l; var ny = ex / l
        if ((b.x - s.ax) * nx + (b.y - s.ay) * ny < 0) { nx = -nx; ny = -ny }
        return nx to ny
    }
    private fun knock(a: Ball, c: Ball) {
        if (a.held > 0f || c.held > 0f) return
        val dx = c.x - a.x; val dy = c.y - a.y; val d = hypot(dx, dy); val rr = 2 * Table.BALL_R
        if (d >= rr || d < 1e-6f) return
        val nx = dx / d; val ny = dy / d; val push = (rr - d) / 2
        a.x -= nx * push; a.y -= ny * push; c.x += nx * push; c.y += ny * push
        val rel = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny
        if (rel < 0) { a.vx += rel * nx; a.vy += rel * ny; c.vx -= rel * nx; c.vy -= rel * ny }
    }
    private fun startMultiball() {
        if (multiball || tilted) return
        multiball = true; pendingBalls = def.multiballExtra; feedIn = 1.2f; show = 2.2f; events.add(Event(Ev.MULTIBALL))
    }

    // ---------------- the rules every machine has ----------------
    private fun lane(k: Int) {
        laneHits++
        if (skillLane >= 0) { if (k == skillLane) { add(2500); events.add(Event(Ev.SKILL_SHOT, k, 2500)) }; skillLane = -1 }
        if (lanes[k]) { add(50); events.add(Event(Ev.LANE, k)); return }
        lanes[k] = true; add(200); events.add(Event(Ev.LANE, k))
        if (lanes.all { it }) { lanes.fill(false); if (multiplier < 6) multiplier++; add(1000); events.add(Event(Ev.LANES_DONE, multiplier)) }
    }
    private fun drained() {
        if (timed) {
            // against the clock a drain costs time, and the ball comes straight back
            if (multiball) { if (balls.size + pendingBalls <= 1) { multiball = false; events.add(Event(Ev.MULTIBALL_END)) }; events.add(Event(Ev.DRAIN, 1)); if (balls.isNotEmpty() || pendingBalls > 0) return }
            if (balls.isNotEmpty()) return
            clock = max(0f, clock - 5f); events.add(Event(Ev.DRAIN, 0)); events.add(Event(Ev.TIME_LOST, 5))
            if (clock <= 0f) { timeUp(); return }
            tilted = false; nudges.clear(); pendingBalls = 1; feedIn = 0.6f
            return
        }
        if (balls.size + pendingBalls >= 1 && multiball) {
            // multiball goes on while two balls are in play; when one is left it is over
            if (balls.size + pendingBalls == 1) { multiball = false; events.add(Event(Ev.MULTIBALL_END)) }
            events.add(Event(Ev.DRAIN, 1)); return
        }
        if (balls.isNotEmpty()) return
        if (ballSave > 0f && !tilted) { ballSave = 0f; feed(); events.add(Event(Ev.BALL_SAVED)); return }
        events.add(Event(Ev.DRAIN, 0))
        bonus()
        left.pressed = false; right.pressed = false; charging = false; charge = 0f
        when {
            extraBalls > 0 -> { extraBalls--; newBall(false) }
            ballNo < def.balls -> newBall(true)
            else -> { gameOver = true; events.add(Event(Ev.GAME_OVER, 0, score)) }
        }
    }
    private fun bonus() {
        lastBonus = if (tilted) 0 else (bumperHits * 20L + targetHits * 100L + laneHits * 100L) * multiplier
        score += lastBonus; events.add(Event(Ev.BONUS, multiplier, lastBonus))
    }
    private fun timeUp() {
        events.add(Event(Ev.TIME_UP)); bonus()
        balls.clear(); pendingBalls = 0; left.pressed = false; right.pressed = false; charging = false; charge = 0f; multiball = false
        gameOver = true; events.add(Event(Ev.GAME_OVER, 0, score))
    }

    // ---------------- PUFF: letters and the mystery saucer (the jar on CANDY) ----------------
    private fun target(k: Int) {
        targetFlash[k] = 0f; targetHits++
        if (def.cells) {
            // VIRUS: the two side targets together light the kickback (a mutation)
            add(250); events.add(Event(Ev.TARGET, k))
            if (!letters[k]) { letters[k] = true; if (letters.all { it }) { letters.fill(false); if (!kickbackLit) { kickbackLit = true; events.add(Event(Ev.KICKBACK_LIT)) } } }
            return
        }
        if (letters[k]) { add(100); events.add(Event(Ev.TARGET, k)); return }
        letters[k] = true; add(250); events.add(Event(Ev.TARGET, k))
        if (def.letters && letters.all { it }) { letters.fill(false); add(5000); events.add(Event(Ev.LETTERS_DONE)); startMultiball() }
    }
    private fun saucer(b: Ball, c: FloatArray) {
        b.held = 1.3f; b.vx = 0f; b.vy = 0f; b.x = c[0]; b.y = c[1]
        if (multiball) { add(10_000); show = 1.6f; events.add(Event(Ev.JACKPOT, 0, 20_000)); return }
        var award = saucerStep % 5; saucerStep++
        if (award == 3 && extraFromSaucer) { award = saucerStep % 5; saucerStep++ }
        when (award) {
            0 -> add(1000); 2 -> add(2500); 4 -> add(5000)
            1 -> if (multiplier < 6) multiplier++ else add(1000)
            3 -> { extraFromSaucer = true; extraBalls++; show = 1.6f; events.add(Event(Ev.EXTRA_BALL)) }
        }
        events.add(Event(Ev.SAUCER_IN, award))
    }

    // ---------------- VIRUS: infect the cells ----------------
    private fun infect(k: Int) {
        if (cells[k]) return
        cellHits[k]++
        if (cellHits[k] < outbreaks + 1) { add(100); return }                       // not infected yet: the virus is stronger now
        cells[k] = true; add(500L * (outbreaks + 1)); clock += 2f; events.add(Event(Ev.CELL, k)); events.add(Event(Ev.TIME_ADD, 2))
        if (cells.all { it }) {
            cells.fill(false); cellHits.fill(0); outbreaks++; add(5000L * outbreaks); val bonus = max(4, 12 - 2 * outbreaks); clock += bonus
            events.add(Event(Ev.CELLS_DONE, outbreaks)); events.add(Event(Ev.TIME_ADD, bonus)); startMultiball()
        }
    }

    // ---------------- CANDY: the row of drop targets ----------------
    private fun drop(k: Int) {
        if (dropsDown[k]) return
        dropsDown[k] = true; targetHits++; add(500L * level); events.add(Event(Ev.DROP, k, 500L * level))
        if (dropsDown.all { it }) {
            add(3000L * level); level++; dropsReset = 1.0f; show = 1.2f
            events.add(Event(Ev.DROPS_DONE, level))
            if (def.rushSeconds > 0f && !tilted) { rush = def.rushSeconds; events.add(Event(Ev.RUSH)) }
        }
    }

    companion object {
        const val DT = 0.001f
        /** What gravity does along a table that rises 6.5°: 9.81 × sin 6.5°. */
        val G = (9.81 * sin(Table.TILT_DEG * PI / 180)).toFloat()
        const val MAX_SPEED = 4.2f
    }
}
