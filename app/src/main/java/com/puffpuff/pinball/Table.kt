package com.puffpuff.pinball

import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

/**
 * The PUFF PUFF playfield, in metres, as the physics sees it: x across (0 = left wall), y up the table (0 = the player's
 * end, where the ball drains). The same numbers build the 3D model (tools/3d/table.js reads layout.json written from here),
 * so what you see is what the ball hits.
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

    val BUMPERS = arrayOf(floatArrayOf(0.16f, 0.71f), floatArrayOf(FIELD_R - 0.16f, 0.71f), floatArrayOf(CX, 0.60f)); const val BUMPER_R = 0.03f
    val POSTS = arrayOf(floatArrayOf(0.105f, 0.43f), floatArrayOf(FIELD_R - 0.105f, 0.43f), floatArrayOf(CX, 0.40f)); const val POST_R = 0.008f
    /** Top lanes: the three gaps between four short guides; a ball rolling through one lights it. */
    val LANE_GUIDES = floatArrayOf(CX - 0.081f, CX - 0.027f, CX + 0.027f, CX + 0.081f); const val LANE_Y0 = 0.85f; const val LANE_Y1 = 0.905f
    val LANES = floatArrayOf(CX - 0.054f, CX, CX + 0.054f)
    /** The four standup targets P · U · F · F on the side walls: centre x, y and which way they face (+1 = into the field from the left wall). */
    val TARGETS = arrayOf(floatArrayOf(0.012f, 0.56f, 1f), floatArrayOf(0.012f, 0.49f, 1f), floatArrayOf(FIELD_R - 0.012f, 0.49f, -1f), floatArrayOf(FIELD_R - 0.012f, 0.56f, -1f)); const val TARGET_H = 0.022f
    val SAUCER = floatArrayOf(0.075f, 0.775f); const val SAUCER_R = 0.014f
    val PLUNGER = floatArrayOf((FIELD_R + W) / 2, 0.04f + BALL_R)
    const val DRAIN_Y = 0.03f

    /** kind: 0 wall · 1 slingshot face (kicks) · 2 standup target · 3 the one-way gate at the top of the shooter lane */
    class Seg(val ax: Float, val ay: Float, val bx: Float, val by: Float, val bounce: Float, val kind: Int = 0, val index: Int = 0)

    val SEGS: List<Seg> = ArrayList<Seg>().apply {
        fun wall(ax: Float, ay: Float, bx: Float, by: Float, e: Float = 0.45f) = add(Seg(ax, ay, bx, by, e))
        // outer walls and the arch over the top
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
        // top lane guides
        for (gx in LANE_GUIDES) wall(gx, LANE_Y0, gx, LANE_Y1, 0.4f)
        // standup targets: a short face a little off the wall
        TARGETS.forEachIndexed { i, t -> add(Seg(t[0], t[1] - TARGET_H, t[0], t[1] + TARGET_H, 0.55f, 2, i)) }
    }
}

/** Where the playfield sits in the cabinet (metres, cabinet space: origin on the floor under its middle, +z toward the player, +y up). */
object Cabinet {
    const val Y0 = 0.86f         // height of the playfield surface at the player's end
    const val Z0 = 0.53f         // where that end is, toward the player
    private val sinT = sin(Table.TILT_DEG * PI / 180).toFloat(); private val cosT = cos(Table.TILT_DEG * PI / 180).toFloat()
    /** A point of the table (x across, y up the table, h above the playfield) in cabinet space. */
    fun at(x: Float, y: Float, h: Float) = floatArrayOf(x - Table.W / 2, Y0 + y * sinT + h * cosT, Z0 - y * cosT + h * sinT)

    /** Everything the 3D model needs, as JSON (tools/3d/layout.json is this text; a unit test keeps the two the same). */
    fun layoutJson(): String {
        fun arr(a: FloatArray) = a.joinToString(", ", "[", "]") { "%.4f".format(java.util.Locale.US, it) }
        fun arr2(a: Array<FloatArray>) = a.joinToString(", ", "[", "]") { arr(it) }
        val segs = Table.SEGS.joinToString(",\n    ", "[\n    ", "\n  ]") { "[${"%.4f".format(java.util.Locale.US, it.ax)}, ${"%.4f".format(java.util.Locale.US, it.ay)}, ${"%.4f".format(java.util.Locale.US, it.bx)}, ${"%.4f".format(java.util.Locale.US, it.by)}, ${it.kind}, ${it.index}]" }
        return """{
  "W": ${Table.W}, "L": ${Table.L}, "fieldR": ${Table.FIELD_R}, "ballR": ${Table.BALL_R}, "tilt": ${Table.TILT_DEG}, "cx": ${Table.CX},
  "y0": $Y0, "z0": $Z0,
  "flipLen": ${Table.FLIP_LEN}, "flipR": ${Table.FLIP_R}, "flipL": ${arr(Table.FLIP_L)}, "flipRt": ${arr(Table.FLIP_RT)},
  "bumpers": ${arr2(Table.BUMPERS)}, "bumperR": ${Table.BUMPER_R}, "posts": ${arr2(Table.POSTS)}, "postR": ${Table.POST_R},
  "laneGuides": ${arr(Table.LANE_GUIDES)}, "lanes": ${arr(Table.LANES)}, "laneY0": ${Table.LANE_Y0}, "laneY1": ${Table.LANE_Y1},
  "targets": ${arr2(Table.TARGETS)}, "targetH": ${Table.TARGET_H}, "saucer": ${arr(Table.SAUCER)}, "saucerR": ${Table.SAUCER_R}, "plunger": ${arr(Table.PLUNGER)},
  "segs": $segs
}
"""
    }
}
