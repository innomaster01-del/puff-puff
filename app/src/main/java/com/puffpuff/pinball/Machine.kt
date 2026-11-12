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
        for (n in listOf("flipper", "bumper", "sling", "target", "lane", "launch", "drain", "saved", "saucer", "kick", "bonus", "multiball", "extra", "tilt", "nudge", "gameover", "start", "spin"))
            runCatching { context.assets.openFd("sounds/$n.wav").use { ids[n] = pool.load(it, 1) } }
    }
    fun play(name: String, volume: Float = 1f, rate: Float = 1f) { if (!muted) ids[name]?.let { pool.play(it, volume, volume, 1, 0, rate) } }
    override fun close() = pool.release()
}

/**
 * The game as the screen sees it: the engine, the numbers on the display and the words that flash up. It lives above
 * the AR and the 3D views, so switching between them keeps the game going.
 */
class Session(context: Context, val theme: Theme) {
    private val prefs = context.getSharedPreferences("puffpuff", Context.MODE_PRIVATE)
    val game = Pinball(theme.def)
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
    /** Whole seconds left on the clock (VIRUS), shown on the screen as well as on the machine. */
    var clock by mutableIntStateOf(0); private set
    var highScore by mutableLongStateOf(prefs.getLong(theme.highKey, 0L)); private set
    var newHigh by mutableStateOf(false); private set
    /** The words flashing over the table, and when they were put up. */
    var message by mutableStateOf("PRESS START"); private set
    var messageAt by mutableLongStateOf(0L); private set
    private var last = 0L
    /** A knock you can feel (the screen sets this to the phone's vibration). */
    var onBump: (() -> Unit)? = null
    private val nf = NumberFormat.getIntegerInstance(Locale.US)
    fun fmt(v: Long): String = nf.format(v)

    fun start() { game.start(); newHigh = false; sounds.play("start"); say(if (game.timed) "INFECT!" else "BALL 1"); last = 0L }
    private fun say(text: String) { message = text; messageAt = SystemClock.uptimeMillis() }

    /** Run the table up to now and turn what happened into sounds and words. Called once a frame by whichever view is showing. */
    fun tick() {
        val now = SystemClock.elapsedRealtimeNanos()
        val dt = if (last == 0L) 0f else ((now - last) / 1e9f).coerceIn(0f, 0.05f); last = now
        game.step(dt)
        for (e in game.events) when (e.type) {
            Ev.LAUNCH -> sounds.play("launch", 0.6f + 0.4f * e.value / 100f)
            Ev.FLIP -> sounds.play("flipper", 0.8f)
            Ev.BUMPER -> { sounds.play("bumper", 1f, 0.94f + 0.06f * e.index); onBump?.invoke() }
            Ev.SLING -> { sounds.play("sling"); onBump?.invoke() }
            Ev.SPIN -> sounds.play("spin", 0.8f, 0.9f + 0.2f * (game.spinnerSpeed / 12f).coerceIn(0f, 1f))
            Ev.KICKBACK_LIT -> { sounds.play("bonus"); say("KICKBACK IS LIT") }
            Ev.KICKBACK -> { sounds.play("kick"); onBump?.invoke(); say("KICKBACK!") }
            Ev.JACKPOT -> { sounds.play("multiball"); say("JACKPOT  ${fmt(e.value)}") }
            Ev.TARGET -> sounds.play("target", 1f, 0.9f + 0.07f * e.index)
            Ev.LETTERS_DONE -> say("P · U · F · F !   5,000")
            Ev.CELL -> { sounds.play("target", 1f, 1.1f); say("CELL INFECTED  +2s") }
            Ev.CELLS_DONE -> sounds.play("bonus")
            Ev.TIME_ADD -> if (e.index >= 4) say("OUTBREAK!  +${e.index} SECONDS")
            Ev.TIME_LOST -> say("−${e.index} SECONDS")
            Ev.TIME_UP -> { sounds.play("tilt"); say("TIME UP") }
            Ev.DROP -> sounds.play("target", 1f, 0.85f + 0.08f * e.index)
            Ev.DROPS_DONE -> { sounds.play("bonus"); say("LEVEL ${e.index}") }
            Ev.LANE -> sounds.play("lane")
            Ev.LANES_DONE -> { sounds.play("bonus"); say("BONUS ×${e.index}") }
            Ev.SKILL_SHOT -> { sounds.play("bonus"); say("SKILL SHOT  2,500") }
            Ev.SAUCER_IN -> { sounds.play("saucer"); say(theme.saucer + "  " + listOf("1,000", "BONUS × UP", "2,500", "EXTRA BALL", "5,000")[e.index]) }
            Ev.SAUCER_OUT -> sounds.play("kick")
            Ev.MULTIBALL -> { sounds.play("multiball"); say(theme.multiball) }
            Ev.MULTIBALL_END -> say("BACK TO ONE BALL")
            Ev.RUSH -> { sounds.play("multiball"); say("${theme.rushName}!  ×2") }
            Ev.RUSH_END -> say("${theme.rushName} OVER")
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
                if (e.value > highScore) { highScore = e.value; newHigh = true; prefs.edit().putLong(theme.highKey, highScore).apply(); say("NEW HIGH SCORE!") } else say("GAME OVER")
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
        val c = kotlin.math.ceil(game.clock).toInt(); if (clock != c) clock = c
    }
    fun close() { sounds.close() }
}

/**
 * The moving and lighting parts of the machine in one view (AR or 3D): balls, flippers, plunger and every lamp.
 * It only shows what the engine says; the lamps are small models already in their places, shown or hidden.
 */
class Machine(private val engine: com.google.android.filament.Engine, private val modelLoader: ModelLoader, private val session: Session) {
    private val game = session.game
    var frame: Node? = null; private set
    private val balls = ArrayList<ModelNode>(); private val shadows = ArrayList<ModelNode>()
    private val spin = Array(3) { Quaternion() }; private val lastXY = Array(3) { floatArrayOf(Float.NaN, 0f) }
    private val sinT = kotlin.math.sin(Math.toRadians(Table.TILT_DEG.toDouble())).toFloat(); private val cosT = kotlin.math.cos(Math.toRadians(Table.TILT_DEG.toDouble())).toFloat()
    private var flipL: ModelNode? = null; private var flipR: ModelNode? = null; private var plunger: ModelNode? = null; private var spinner: ModelNode? = null
    private val def = session.theme.def
    private val drops = ArrayList<ModelNode>(); private val dropH = FloatArray(def.drops.size)
    private val names = lightsFor(def)
    private val lights = HashMap<String, ModelNode>()
    private val tilt = Quaternion.fromAxisAngle(Float3(1f, 0f, 0f), Table.TILT_DEG)
    private fun model(name: String): ModelNode = ModelNode(modelLoader.createModelInstance("models/${session.theme.dir}/$name.glb"), autoAnimate = false).also { frame!!.addChildNode(it) }

    fun attach(frame: Node) {
        if (this.frame === frame) return
        this.frame = frame
        repeat(3) { balls.add(model("pp_ball").also { it.isVisible = false }); shadows.add(model("pp_ball_shadow").also { it.isVisible = false }) }
        flipL = model("pp_flipper"); flipR = model("pp_flipper"); plunger = model("pp_plunger"); if (def.spinner != null) spinner = model("pp_spinner")
        repeat(def.drops.size) { drops.add(model("pp_drop")) }
        for (n in names) lights[n] = model("pp_light_$n").also { it.isVisible = false }
    }

    fun update() {
        frame ?: return
        val t = SystemClock.uptimeMillis() / 1000.0
        fun blink(hz: Double) = (t * hz) % 1.0 < 0.5
        balls.forEachIndexed { i, n ->
            val b = game.balls.getOrNull(i); val sh = shadows[i]
            if (b == null) { n.isVisible = false; sh.isVisible = false; lastXY[i][0] = Float.NaN } else {
                // the ball turns as far as it has travelled: about the axis lying across its path
                val dx = if (lastXY[i][0].isNaN()) 0f else b.x - lastXY[i][0]; val dy = if (lastXY[i][0].isNaN()) 0f else b.y - lastXY[i][1]
                lastXY[i][0] = b.x; lastXY[i][1] = b.y
                val d = kotlin.math.hypot(dx, dy)
                if (d > 1e-5f && d < 0.1f) spin[i] = dev.romainguy.kotlin.math.normalize(Quaternion.fromAxisAngle(Float3(-dy / d, sinT * dx / d, -cosT * dx / d), Math.toDegrees((d / Table.BALL_R).toDouble()).toFloat()) * spin[i])
                val p = Cabinet.at(b.x, b.y, if (b.held > 0f) Table.BALL_R * 0.55f else Table.BALL_R)
                n.transform = Transform(position = Position(p[0], p[1], p[2]), quaternion = spin[i]); n.isVisible = true
                val s = Cabinet.at(b.x + 0.004f, b.y - 0.005f, 0.0012f)
                sh.transform = Transform(position = Position(s[0], s[1], s[2]), quaternion = tilt); sh.isVisible = b.held <= 0f
            }
        }
        fun flip(n: ModelNode?, f: Flipper) {
            val p = Cabinet.at(f.px, f.py, 0f)
            n?.transform = Transform(position = Position(p[0], p[1], p[2]), quaternion = tilt * Quaternion.fromAxisAngle(Float3(0f, 1f, 0f), Math.toDegrees(f.angle.toDouble()).toFloat()))
        }
        flip(flipL, game.left); flip(flipR, game.right)
        Cabinet.at(Table.PLUNGER[0], 0.04f - 0.05f * game.charge, Table.BALL_R).let { p -> plunger?.transform = Transform(position = Position(p[0], p[1], p[2]), quaternion = tilt) }
        def.spinner?.let { sp -> Cabinet.at((sp[0] + sp[1]) / 2, sp[2], 0.032f).let { p ->
            spinner?.transform = Transform(position = Position(p[0], p[1], p[2]), quaternion = tilt * Quaternion.fromAxisAngle(Float3(1f, 0f, 0f), game.spinnerAngle * 360f % 360f)) } }
        // the sweets drop into the playfield fast, and stand up again slower
        drops.forEachIndexed { i, n ->
            val want = if (game.dropsDown[i]) -0.031f else 0f
            dropH[i] = if (want < dropH[i]) maxOf(want, dropH[i] - 0.012f) else minOf(want, dropH[i] + 0.004f)
            val d = def.drops[i]; val p = Cabinet.at(d[0], d[1], dropH[i])
            n.transform = Transform(position = Position(p[0], p[1], p[2]), quaternion = tilt); n.isVisible = dropH[i] > -0.03f
        }
        paintDisplay()
        // the lamps
        fun set(name: String, on: Boolean) { lights[name]?.let { if (it.isVisible != on) it.isVisible = on } }
        if (game.show > 0f) {
            // a big moment: every lamp on the table flashes, half of them at a time
            val k = (t * 12).toInt()
            names.forEachIndexed { i, n -> set(n, (i + k) % 2 == 0) }
            return
        }
        if (game.gameOver) {
            // attract mode: the lights chase round the table
            val k = (t * 6).toInt()
            names.forEachIndexed { i, n -> set(n, (i + k) % 5 == 0) }
            return
        }
        for (i in 0..2) set("lane$i", game.lanes[i] || (game.skillLane == i && blink(4.0)))
        for (i in def.targets.indices) set("letter$i", game.letters[i] || game.targetFlash[i] < 0.18f)
        for (i in def.bumpers.indices) set("bumper$i", game.bumperFlash[i] < 0.12f || (game.superBumpers && blink(2.0)))
        if (def.cells) for (i in def.bumpers.indices) set("cell$i", game.cells[i] || (game.cellHits[i] > 0 && blink(3.0)))
        for (i in def.drops.indices) set("drop$i", !game.dropsDown[i] && blink(1.5))
        if (def.rushSeconds > 0f) set("rush", game.rush > 0f && (game.rush > 4f || blink(5.0)))
        for (i in 0..1) set("sling$i", game.slingFlash[i] < 0.12f)
        set("saucer", game.balls.any { it.held > 0f } || blink(1.0))
        set("save", if (game.timed) game.clock < 10f && blink(4.0) else game.ballSave > 0f && (game.ballSave > 3f || blink(5.0)))
        set("multiball", game.multiball && blink(3.0))
        set("kick", game.kickbackLit || game.kickFlash < 0.35f)
        for (k in 2..6) set("mult$k", game.multiplier >= k)
    }

    // ---------------- the score display in the backbox ----------------
    private var dispMat: com.google.android.filament.MaterialInstance? = null
    private var dispTex: com.google.android.filament.Texture? = null
    private var dispKey = ""; private var dispAt = 0L
    private val dispSampler = com.google.android.filament.TextureSampler(com.google.android.filament.TextureSampler.MinFilter.LINEAR, com.google.android.filament.TextureSampler.MagFilter.LINEAR, com.google.android.filament.TextureSampler.WrapMode.CLAMP_TO_EDGE)
    private val bmp = android.graphics.Bitmap.createBitmap(512, 128, android.graphics.Bitmap.Config.ARGB_8888)
    private val flipRows = android.graphics.Matrix().apply { setScale(1f, -1f); postTranslate(0f, 128f) }
    private val paint = android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG).apply { typeface = android.graphics.Typeface.create(android.graphics.Typeface.MONOSPACE, android.graphics.Typeface.BOLD); textAlign = android.graphics.Paint.Align.CENTER }

    /** The cabinet model is loaded: take hold of the display in its backbox (the mesh named "Display"). */
    fun bindDisplay(cabinet: com.google.android.filament.gltfio.FilamentInstance) {
        if (dispMat != null) return
        runCatching {
            val rm = engine.renderableManager; val e = cabinet.asset.getFirstEntityByName("Display")
            if (e != 0 && rm.hasComponent(e)) {
                dispTex = com.google.android.filament.Texture.Builder().width(512).height(128).levels(1).sampler(com.google.android.filament.Texture.Sampler.SAMPLER_2D).format(com.google.android.filament.Texture.InternalFormat.SRGB8_A8).build(engine)
                dispMat = rm.getMaterialInstanceAt(rm.getInstance(e), 0); dispKey = ""
            }
        }.onFailure { android.util.Log.w("PuffPuff", "no display", it) }
    }
    /** Paint the score (or the words flashing up) in orange dots, like the display of a real machine. Only when it changes. */
    private fun paintDisplay() {
        val mat = dispMat ?: return; val tex = dispTex ?: return
        val now = SystemClock.uptimeMillis()
        val flashing = now - session.messageAt < 2400 && session.message.isNotEmpty()
        val big = if (flashing && (now - session.messageAt) / 300 % 4 != 3L) session.message else if (game.gameOver && now / 1500 % 2 == 0L) "PRESS START" else session.fmt(game.score)
        val small = when {
            game.gameOver -> "HIGH SCORE  ${session.fmt(session.highScore)}"
            game.timed -> "TIME ${kotlin.math.ceil(game.clock).toInt()}    OUTBREAKS ${game.outbreaks}" + (if (game.multiball) "    x2" else "")
            def.drops.isNotEmpty() -> "BALL ${game.ballNo}    LEVEL ${game.level}" + (if (game.rush > 0f) "    RUSH ${game.rush.toInt() + 1}" else "") + (if (game.multiball) "    x2" else "")
            else -> "BALL ${game.ballNo}    BONUS x${game.multiplier}" + (if (game.multiball) "    x2" else "")
        }
        val key = "$big|$small"
        if (key == dispKey || now - dispAt < 90) return
        dispKey = key; dispAt = now
        runCatching {
            val c = android.graphics.Canvas(bmp); c.drawColor(android.graphics.Color.rgb(18, 5, 0))
            paint.color = android.graphics.Color.rgb(255, 122, 26)
            paint.textSize = 66f; while (paint.measureText(big) > 490f && paint.textSize > 20f) paint.textSize -= 3f
            c.drawText(big, 256f, 70f, paint)
            paint.textSize = 26f; paint.color = android.graphics.Color.rgb(255, 170, 90); c.drawText(small, 256f, 112f, paint)
            // the gaps between the dots
            paint.color = android.graphics.Color.argb(120, 18, 5, 0); paint.strokeWidth = 1f
            var i = 0f; while (i < 512f) { c.drawLine(i, 0f, i, 128f, paint); i += 4f }; i = 0f; while (i < 128f) { c.drawLine(0f, i, 512f, i, paint); i += 4f }
            // the model's picture coordinates run bottom-up: upload the rows flipped
            val up = android.graphics.Bitmap.createBitmap(bmp, 0, 0, 512, 128, flipRows, false)
            com.google.android.filament.android.TextureHelper.setBitmap(engine, tex, 0, up)
            runCatching { mat.setParameter("baseColorMap", tex, dispSampler) }; runCatching { mat.setParameter("emissiveMap", tex, dispSampler) }
        }.onFailure { android.util.Log.w("PuffPuff", "display paint failed", it); dispMat = null }
    }

    companion object {
        /** The lamps of one machine: tools/3d/table.js makes a model pp_light_<name> for each of these. */
        fun lightsFor(d: TableDef): List<String> = buildList {
            repeat(3) { add("lane$it") }; d.targets.indices.forEach { add("letter$it") }; d.bumpers.indices.forEach { add("bumper$it") }
            if (d.cells) d.bumpers.indices.forEach { add("cell$it") }
            add("sling0"); add("sling1"); if (d.saucer != null) add("saucer"); addAll(listOf("save", "multiball", "kick"))
            d.drops.indices.forEach { add("drop$it") }; if (d.drops.isNotEmpty()) add("rush")
            for (k in 2..6) add("mult$k")
        }
    }
}
