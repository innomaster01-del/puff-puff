package com.puffpuff.pinball

import android.content.Context
import android.media.AudioAttributes
import android.media.SoundPool
import android.os.SystemClock
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import dev.romainguy.kotlin.math.Float3
import dev.romainguy.kotlin.math.Quaternion
import io.github.sceneview.loaders.ModelLoader
import io.github.sceneview.math.Position
import io.github.sceneview.math.Transform
import io.github.sceneview.node.ModelNode
import io.github.sceneview.node.Node
import java.text.NumberFormat
import java.util.Locale

/** The machine's sounds (synthesized WAVs in assets/sounds, made by tools/make_sounds.py). */
class Sounds(context: Context) : AutoCloseable {
    private val pool = SoundPool.Builder().setMaxStreams(10)
        .setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_GAME).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build()).build()
    private val ids = HashMap<String, Int>()
    var muted = false
    init {
        for (n in listOf("flipper", "bumper", "sling", "target", "lane", "launch", "drain", "saved", "saucer", "kick", "bonus", "multiball", "extra", "tilt", "nudge", "gameover", "start"))
            runCatching { context.assets.openFd("sounds/$n.wav").use { ids[n] = pool.load(it, 1) } }
    }
    fun play(name: String, volume: Float = 1f, rate: Float = 1f) { if (!muted) ids[name]?.let { pool.play(it, volume, volume, 1, 0, rate) } }
    override fun close() = pool.release()
}

/**
 * The game as the screen sees it: the engine, the numbers on the display and the words that flash up. It lives above
 * the AR and the 3D views, so switching between them keeps the game going.
 */
class Session(context: Context) {
    private val prefs = context.getSharedPreferences("puffpuff", Context.MODE_PRIVATE)
    val game = Pinball()
    val sounds = Sounds(context)
    var score by mutableLongStateOf(0L); private set
    var ballNo by mutableIntStateOf(0); private set
    var multiplier by mutableIntStateOf(1); private set
    var extraBalls by mutableIntStateOf(0); private set
    var gameOver by mutableStateOf(true); private set
    var waiting by mutableStateOf(false); private set
    var charge by mutableFloatStateOf(0f); private set
    var saving by mutableStateOf(false); private set
    var multiball by mutableStateOf(false); private set
    var tilted by mutableStateOf(false); private set
    var highScore by mutableLongStateOf(prefs.getLong("high", 0L)); private set
    var newHigh by mutableStateOf(false); private set
    /** The words flashing over the table, and when they were put up. */
    var message by mutableStateOf("PRESS START"); private set
    var messageAt by mutableLongStateOf(0L); private set
    private var last = 0L
    private val nf = NumberFormat.getIntegerInstance(Locale.US)
    fun fmt(v: Long): String = nf.format(v)

    fun start() { game.start(); newHigh = false; sounds.play("start"); say("BALL 1"); last = 0L }
    private fun say(text: String) { message = text; messageAt = SystemClock.uptimeMillis() }

    /** Run the table up to now and turn what happened into sounds and words. Called once a frame by whichever view is showing. */
    fun tick() {
        val now = SystemClock.elapsedRealtimeNanos()
        val dt = if (last == 0L) 0f else ((now - last) / 1e9f).coerceIn(0f, 0.05f); last = now
        game.step(dt)
        for (e in game.events) when (e.type) {
            Ev.LAUNCH -> sounds.play("launch", 0.6f + 0.4f * e.value / 100f)
            Ev.FLIP -> sounds.play("flipper", 0.8f)
            Ev.BUMPER -> sounds.play("bumper", 1f, 0.94f + 0.06f * e.index)
            Ev.SLING -> sounds.play("sling")
            Ev.TARGET -> sounds.play("target", 1f, 0.9f + 0.07f * e.index)
            Ev.LETTERS_DONE -> say("P · U · F · F !   5,000")
            Ev.LANE -> sounds.play("lane")
            Ev.LANES_DONE -> { sounds.play("bonus"); say("BONUS ×${e.index}") }
            Ev.SKILL_SHOT -> { sounds.play("bonus"); say("SKILL SHOT  2,500") }
            Ev.SAUCER_IN -> { sounds.play("saucer"); say(listOf("MYSTERY  1,000", "MYSTERY  BONUS × UP", "MYSTERY  2,500", "MYSTERY  EXTRA BALL", "MYSTERY  5,000")[e.index]) }
            Ev.SAUCER_OUT -> sounds.play("kick")
            Ev.MULTIBALL -> { sounds.play("multiball"); say("PUFF PUFF MULTIBALL!") }
            Ev.MULTIBALL_END -> say("MULTIBALL OVER")
            Ev.SUPER_BUMPERS -> { sounds.play("bonus"); say("SUPER BUMPERS  300") }
            Ev.BALL_SAVED -> { sounds.play("saved"); say("BALL SAVED") }
            Ev.DRAIN -> sounds.play("drain")
            Ev.BONUS -> if (e.value > 0) say("BONUS ×${e.index}  =  ${fmt(e.value)}")
            Ev.EXTRA_BALL -> { sounds.play("extra"); say("EXTRA BALL!") }
            Ev.NUDGE -> sounds.play("nudge")
            Ev.TILT_WARNING -> { sounds.play("nudge"); say("DANGER") }
            Ev.TILT -> { sounds.play("tilt"); say("TILT") }
            Ev.NEW_BALL -> say(if (e.value == 1L) "SHOOT AGAIN" else "BALL ${e.index}")
            Ev.GAME_OVER -> {
                sounds.play("gameover")
                if (e.value > highScore) { highScore = e.value; newHigh = true; prefs.edit().putLong("high", highScore).apply(); say("NEW HIGH SCORE!") } else say("GAME OVER")
            }
        }
        game.events.clear()
        if (score != game.score) score = game.score
        if (ballNo != game.ballNo) ballNo = game.ballNo
        if (multiplier != game.multiplier) multiplier = game.multiplier
        if (extraBalls != game.extraBalls) extraBalls = game.extraBalls
        if (gameOver != game.gameOver) gameOver = game.gameOver
        if (waiting != game.waitingToLaunch) waiting = game.waitingToLaunch
        if (charge != game.charge) charge = game.charge
        if (saving != (game.ballSave > 0f)) saving = game.ballSave > 0f
        if (multiball != game.multiball) multiball = game.multiball
        if (tilted != game.tilted) tilted = game.tilted
    }
    fun close() { sounds.close() }
}

/**
 * The moving and lighting parts of the machine in one view (AR or 3D): balls, flippers, plunger and every lamp.
 * It only shows what the engine says; the lamps are small models already in their places, shown or hidden.
 */
class Machine(private val modelLoader: ModelLoader, private val game: Pinball) {
    var frame: Node? = null; private set
    private val balls = ArrayList<ModelNode>()
    private var flipL: ModelNode? = null; private var flipR: ModelNode? = null; private var plunger: ModelNode? = null
    private val lights = HashMap<String, ModelNode>()
    private val tilt = Quaternion.fromAxisAngle(Float3(1f, 0f, 0f), Table.TILT_DEG)
    private fun model(name: String): ModelNode = ModelNode(modelLoader.createModelInstance("models/$name.glb"), autoAnimate = false).also { frame!!.addChildNode(it) }

    fun attach(frame: Node) {
        if (this.frame === frame) return
        this.frame = frame
        repeat(3) { balls.add(model("pp_ball").also { it.isVisible = false }) }
        flipL = model("pp_flipper"); flipR = model("pp_flipper"); plunger = model("pp_plunger")
        for (n in LIGHTS) lights[n] = model("pp_light_$n").also { it.isVisible = false }
    }

    fun update() {
        frame ?: return
        val t = SystemClock.uptimeMillis() / 1000.0
        fun blink(hz: Double) = (t * hz) % 1.0 < 0.5
        balls.forEachIndexed { i, n ->
            val b = game.balls.getOrNull(i)
            if (b == null) n.isVisible = false else {
                val p = Cabinet.at(b.x, b.y, if (b.held > 0f) Table.BALL_R * 0.55f else Table.BALL_R)
                n.position = Position(p[0], p[1], p[2]); n.isVisible = true
            }
        }
        fun flip(n: ModelNode?, f: Flipper) {
            val p = Cabinet.at(f.px, f.py, 0f)
            n?.transform = Transform(position = Position(p[0], p[1], p[2]), quaternion = tilt * Quaternion.fromAxisAngle(Float3(0f, 1f, 0f), Math.toDegrees(f.angle.toDouble()).toFloat()))
        }
        flip(flipL, game.left); flip(flipR, game.right)
        Cabinet.at(Table.PLUNGER[0], 0.04f - 0.05f * game.charge, Table.BALL_R).let { p -> plunger?.transform = Transform(position = Position(p[0], p[1], p[2]), quaternion = tilt) }
        // the lamps
        fun set(name: String, on: Boolean) { lights[name]?.let { if (it.isVisible != on) it.isVisible = on } }
        if (game.gameOver) {
            // attract mode: the lights chase round the table
            val k = (t * 6).toInt()
            LIGHTS.forEachIndexed { i, n -> set(n, (i + k) % 5 == 0) }
            return
        }
        for (i in 0..2) set("lane$i", game.lanes[i] || (game.skillLane == i && blink(4.0)))
        for (i in 0..3) set("letter$i", game.letters[i] || game.targetFlash[i] < 0.18f)
        for (i in 0..2) set("bumper$i", game.bumperFlash[i] < 0.12f || (game.superBumpers && blink(2.0)))
        for (i in 0..1) set("sling$i", game.slingFlash[i] < 0.12f)
        set("saucer", game.balls.any { it.held > 0f } || blink(1.0))
        set("save", game.ballSave > 0f && (game.ballSave > 3f || blink(5.0)))
        set("multiball", game.multiball && blink(3.0))
        for (k in 2..6) set("mult$k", game.multiplier >= k)
    }

    companion object {
        val LIGHTS = listOf("lane0", "lane1", "lane2", "letter0", "letter1", "letter2", "letter3", "bumper0", "bumper1", "bumper2", "sling0", "sling1", "saucer", "save", "multiball", "mult2", "mult3", "mult4", "mult5", "mult6")
    }
}
