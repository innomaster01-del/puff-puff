package com.puffpuff.pinball

import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

/**
 * What every machine shares, in metres, as the physics sees it: x across (0 = left wall), y up the table (0 = the
 * player's end, where the ball drains). The outer walls, the arch, the shooter lane, the flippers, the slingshots and
 * the three top lanes are the same on all three machines, as they are on most real ones; what stands in the middle and
 * upper field is each machine's own (TableDef).
 */
object Table {
    const val W = 0.51f            // inside width, shooter lane included
    const val L = 1.07f            // inside length
    const val FIELD_R = 0.465f     // the wall between the field and the shooter lane
    const val BALL_R = 0.0135f     // a 27 mm pinball
    const val TILT_DEG = 6.5f      // how steeply the playfield rises away from the player
    const val CX = FIELD_R / 2     // the field's centre line

    // flippers: pivot, length, angles in degrees from the +x axis (left one; the right one is its mirror image)
    const val FLIP_LEN = 0.078f; const val FLIP_R = 0.008f
    const val FLIP_REST = -30f; const val FLIP_UP = 26f
    val FLIP_L = floatArrayOf(0.14f, 0.12f); val FLIP_RT = floatArrayOf(FIELD_R - 0.14f, 0.12f)

    const val POST_R = 0.008f
    /** Top lanes: the three gaps between four short guides; a ball rolling through one lights it. */
    val LANE_GUIDES = floatArrayOf(CX - 0.081f, CX - 0.027f, CX + 0.027f, CX + 0.081f); const val LANE_Y0 = 0.85f; const val LANE_Y1 = 0.905f
    val LANES = floatArrayOf(CX - 0.054f, CX, CX + 0.054f)
    const val TARGET_H = 0.022f; const val SAUCER_R = 0.014f
    val PLUNGER = floatArrayOf((FIELD_R + W) / 2, 0.04f + BALL_R)
    /** The kickback sits at the bottom of the left outlane. */
    val KICKBACK = floatArrayOf(0.0225f, 0.10f)
    const val DRAIN_Y = 0.03f
    const val DROP_W = 0.021f      // half the width of a drop target

    /** kind: 0 wall · 1 slingshot face (kicks) · 2 standup target · 3 the one-way gate at the top of the shooter lane · 4 drop target */
    class Seg(val ax: Float, val ay: Float, val bx: Float, val by: Float, val bounce: Float, val kind: Int = 0, val index: Int = 0)

    /** The walls every machine has. */
    val BASE: List<Seg> = ArrayList<Seg>().apply {
        fun wall(ax: Float, ay: Float, bx: Float, by: Float, e: Float = 0.45f) = add(Seg(ax, ay, bx, by, e))
        wall(0f, 0f, 0f, L - W / 2); wall(W, 0f, W, L - W / 2)
        val n = 28; for (i in 0 until n) { val a0 = PI * i / n; val a1 = PI * (i + 1) / n
            add(Seg(W / 2 + W / 2 * cos(a0).toFloat(), L - W / 2 + W / 2 * sin(a0).toFloat(), W / 2 + W / 2 * cos(a1).toFloat(), L - W / 2 + W / 2 * sin(a1).toFloat(), 0.25f)) }
        // shooter lane: its inner wall, the plunger the ball rests on, and the gate that lets a ball out but not back in
        wall(FIELD_R, 0f, FIELD_R, 0.80f); wall(FIELD_R, 0.04f, W, 0.04f, 0.1f)
        add(Seg(W, 0.865f, FIELD_R, 0.80f, 0.3f, 3))
        // both sides of the lower field: outlane wall, the guide down to the flipper, the slingshot triangle
        for (side in 0..1) {
            fun x(v: Float) = if (side == 0) v else FIELD_R - v
            wall(x(0.045f), 0.335f, x(0.045f), 0.19f); wall(x(0.045f), 0.19f, x(0.135f), 0.128f, 0.2f)
            add(Seg(x(0.082f), 0.33f, x(0.142f), 0.205f, 0.5f, 1, side))            // the kicking face
            wall(x(0.082f), 0.33f, x(0.082f), 0.222f); wall(x(0.082f), 0.222f, x(0.142f), 0.205f)
        }
        for (gx in LANE_GUIDES) wall(gx, LANE_Y0, gx, LANE_Y1, 0.4f)
    }
}

/**
 * One machine's own field and rules.
 *
 *  PUFF      three balls. Spell P·U·F·F on four standup targets for a two-ball multiball; the cloud saucer gives a
 *            mystery award (the jackpot in multiball); the spinner lights the kickback.
 *  VIRUS     against the clock: no ball count, 100 seconds. The five bumpers are cells; each one hit is infected and
 *            adds 2 seconds. All five infected: OUTBREAK, three balls, up to 10 seconds more, and the cells heal — but
 *            the virus mutates: each outbreak a cell needs one hit more, and the clock runs a quarter faster. A drain
 *            costs 5 seconds and the ball comes straight back. The two side targets light the kickback.
 *  CANDY     three balls. A row of five drop targets across the middle: knock all five down for the next level
 *            (each level they are worth more) and a 20 second SUGAR RUSH, everything double. Behind the row is the jar.
 */
class TableDef(
    val name: String, val balls: Int,
    val bumpers: Array<FloatArray>, val bumperR: Float, val posts: Array<FloatArray>,
    /** Standup targets: x, y, and which way they face (+1 = into the field from the left wall). */
    val targets: Array<FloatArray>,
    val saucer: FloatArray? = null, val spinner: FloatArray? = null,
    /** Drop targets: x, y of the middle of each face (they face the player). */
    val drops: Array<FloatArray> = emptyArray(),
    val letters: Boolean = false, val cells: Boolean = false,
    val timeLimit: Float = 0f, val multiballExtra: Int = 1, val rushSeconds: Float = 0f,
) {
    val segs: List<Table.Seg> = ArrayList(Table.BASE).apply {
        targets.forEachIndexed { i, t -> add(Table.Seg(t[0], t[1] - Table.TARGET_H, t[0], t[1] + Table.TARGET_H, 0.55f, 2, i)) }
        drops.forEachIndexed { i, d -> add(Table.Seg(d[0] - Table.DROP_W, d[1], d[0] + Table.DROP_W, d[1], 0.45f, 4, i)) }
    }

    companion object {
        private const val R = Table.FIELD_R; private const val CX = Table.CX
        val PUFF = TableDef("puff", 3,
            bumpers = arrayOf(floatArrayOf(0.16f, 0.71f), floatArrayOf(R - 0.16f, 0.71f), floatArrayOf(CX, 0.60f)), bumperR = 0.03f,
            posts = arrayOf(floatArrayOf(0.105f, 0.43f), floatArrayOf(R - 0.105f, 0.43f), floatArrayOf(CX, 0.40f)),
            targets = arrayOf(floatArrayOf(0.012f, 0.56f, 1f), floatArrayOf(0.012f, 0.49f, 1f), floatArrayOf(R - 0.012f, 0.49f, -1f), floatArrayOf(R - 0.012f, 0.56f, -1f)),
            saucer = floatArrayOf(0.075f, 0.775f), spinner = floatArrayOf(0.006f, 0.058f, 0.665f), letters = true)
        val VIRUS = TableDef("virus", 1,
            bumpers = arrayOf(floatArrayOf(0.105f, 0.745f), floatArrayOf(CX, 0.775f), floatArrayOf(R - 0.105f, 0.745f), floatArrayOf(0.165f, 0.625f), floatArrayOf(R - 0.165f, 0.625f)), bumperR = 0.026f,
            posts = arrayOf(floatArrayOf(CX, 0.50f), floatArrayOf(0.09f, 0.40f), floatArrayOf(R - 0.09f, 0.40f)),
            targets = arrayOf(floatArrayOf(0.012f, 0.52f, 1f), floatArrayOf(R - 0.012f, 0.52f, -1f)),
            spinner = floatArrayOf(R - 0.058f, R - 0.006f, 0.665f), cells = true, timeLimit = 100f, multiballExtra = 2)
        val CANDY = TableDef("candy", 3,
            bumpers = arrayOf(floatArrayOf(0.125f, 0.745f), floatArrayOf(R - 0.125f, 0.745f)), bumperR = 0.03f,
            posts = arrayOf(floatArrayOf(0.075f, 0.565f), floatArrayOf(R - 0.075f, 0.565f), floatArrayOf(CX, 0.40f)),
            targets = arrayOf(floatArrayOf(0.012f, 0.50f, 1f), floatArrayOf(R - 0.012f, 0.50f, -1f)),
            saucer = floatArrayOf(CX, 0.70f), spinner = floatArrayOf(0.006f, 0.058f, 0.665f),
            drops = Array(5) { floatArrayOf(CX + (it - 2) * 0.052f, 0.565f) }, rushSeconds = 20f)
        val ALL = listOf(PUFF, VIRUS, CANDY)
    }
}

/** Where the playfield sits in the cabinet (metres, cabinet space: origin on the floor under its middle, +z toward the player, +y up). */
object Cabinet {
    const val Y0 = 0.86f         // height of the playfield surface at the player's end
    const val Z0 = 0.53f         // where that end is, toward the player
    private val sinT = sin(Table.TILT_DEG * PI / 180).toFloat(); private val cosT = cos(Table.TILT_DEG * PI / 180).toFloat()
    /** A point of the table (x across, y up the table, h above the playfield) in cabinet space. */
    fun at(x: Float, y: Float, h: Float) = floatArrayOf(x - Table.W / 2, Y0 + y * sinT + h * cosT, Z0 - y * cosT + h * sinT)

    /** Everything the 3D model of one machine needs, as JSON (tools/3d/layout_<name>.json is this text; a unit test keeps them the same). */
    fun layoutJson(d: TableDef): String {
        fun f(v: Float) = "%.4f".format(java.util.Locale.US, v)
        fun arr(a: FloatArray?) = a?.joinToString(", ", "[", "]") { f(it) } ?: "null"
        fun arr2(a: Array<FloatArray>) = a.joinToString(", ", "[", "]") { arr(it) }
        val segs = d.segs.joinToString(",\n    ", "[\n    ", "\n  ]") { "[${f(it.ax)}, ${f(it.ay)}, ${f(it.bx)}, ${f(it.by)}, ${it.kind}, ${it.index}]" }
        return """{
  "name": "${d.name}",
  "W": ${Table.W}, "L": ${Table.L}, "fieldR": ${Table.FIELD_R}, "ballR": ${Table.BALL_R}, "tilt": ${Table.TILT_DEG}, "cx": ${Table.CX},
  "y0": $Y0, "z0": $Z0,
  "flipLen": ${Table.FLIP_LEN}, "flipR": ${Table.FLIP_R}, "flipL": ${arr(Table.FLIP_L)}, "flipRt": ${arr(Table.FLIP_RT)},
  "bumpers": ${arr2(d.bumpers)}, "bumperR": ${d.bumperR}, "posts": ${arr2(d.posts)}, "postR": ${Table.POST_R},
  "laneGuides": ${arr(Table.LANE_GUIDES)}, "lanes": ${arr(Table.LANES)}, "laneY0": ${Table.LANE_Y0}, "laneY1": ${Table.LANE_Y1},
  "targets": ${arr2(d.targets)}, "targetH": ${Table.TARGET_H}, "saucer": ${arr(d.saucer)}, "saucerR": ${Table.SAUCER_R}, "plunger": ${arr(Table.PLUNGER)},
  "spinner": ${arr(d.spinner)}, "kickback": ${arr(Table.KICKBACK)},
  "drops": ${arr2(d.drops)}, "dropW": ${Table.DROP_W},
  "letters": ${d.letters}, "cells": ${d.cells},
  "segs": $segs
}
"""
    }
}
