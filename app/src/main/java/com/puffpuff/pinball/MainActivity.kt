package com.puffpuff.pinball

import android.os.Bundle
import android.os.SystemClock
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.TextStyle
import kotlinx.coroutines.launch
import kotlin.math.absoluteValue
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.ar.core.Anchor
import com.google.ar.core.Config
import com.google.ar.core.Plane
import com.google.ar.core.Pose
import com.google.ar.core.TrackingState
import io.github.sceneview.FrameRatePolicy
import io.github.sceneview.SceneView
import io.github.sceneview.ar.ARSceneView
import io.github.sceneview.ar.scene.SceneUnderstanding
import io.github.sceneview.createARView
import io.github.sceneview.math.Position
import io.github.sceneview.math.Scale
import io.github.sceneview.rememberARView
import io.github.sceneview.rememberCameraManipulator
import io.github.sceneview.rememberCameraNode
import io.github.sceneview.rememberEngine
import io.github.sceneview.rememberMaterialLoader
import io.github.sceneview.rememberModelInstance
import io.github.sceneview.rememberModelLoader
import io.github.sceneview.rememberView
import kotlinx.coroutines.delay
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin

private val INK = Color(0xFF07040F); private val CYAN = Color(0xFF22E0FF); private val PINK = Color(0xFFFF3FA0); private val YELLOW = Color(0xFFFFE14A); private val MINT = Color(0xFF5DFFB0); private val NIGHT = Color(0xE6120630)
private class Ref<T>(var v: T)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        setContent {
            MaterialTheme(colorScheme = darkColorScheme()) {
                val context = LocalContext.current
                var theme by remember { mutableStateOf<Theme?>(null) }
                var ar by remember { mutableStateOf(true) }
                // the machine has a left and a right: on a phone set to a right-to-left language the screen must not be mirrored,
                // or the LEFT button lands on the right and works the far flipper
                androidx.compose.runtime.CompositionLocalProvider(androidx.compose.ui.platform.LocalLayoutDirection provides androidx.compose.ui.unit.LayoutDirection.Ltr) {
                    val th = theme
                    if (th == null) Menu(context) { theme = it }
                    else androidx.compose.runtime.key(th) {
                        // one game per machine picked; it is thrown away when you go back to the machines
                        val session = remember { Session(context, th) }
                        DisposableEffect(Unit) { onDispose { session.close() } }
                        if (ar) PuffAr(session, onThreeD = { ar = false }, onMachines = { theme = null }) else Puff3D(session, onAr = { ar = true }, onMachines = { theme = null })
                    }
                }
            }
        }
    }
}

/**
 * The first screen: the machines in a carousel, each standing in a dark showroom, with its story, how long a game is,
 * its rules and the best score. Swipe to choose, PLAY to go.
 */
@Composable
private fun Menu(context: android.content.Context, onPick: (Theme) -> Unit) {
    val prefs = remember { context.getSharedPreferences("puffpuff", android.content.Context.MODE_PRIVATE) }
    val nf = remember { java.text.NumberFormat.getIntegerInstance(java.util.Locale.US) }
    val themes = Theme.entries
    val pictures = remember { themes.associateWith { t -> runCatching { context.assets.open("menu/${t.dir}.jpg").use { android.graphics.BitmapFactory.decodeStream(it) }.asImageBitmap() }.getOrNull() } }
    val pager = rememberPagerState(pageCount = { themes.size })
    val scope = rememberCoroutineScope()
    val cur = themes[pager.currentPage]
    val a by animateColorAsState(Color(cur.colorA), tween(600), label = "a")
    val b by animateColorAsState(Color(cur.colorB), tween(600), label = "b")
    val pulse by rememberInfiniteTransition(label = "glow").animateFloat(0.7f, 1f, infiniteRepeatable(tween(2800), RepeatMode.Reverse), label = "pulse")
    val gold = Brush.linearGradient(listOf(Color(0xFFFFF1C9), Color(0xFFE8B95A), Color(0xFFB8862E)))
    Box(Modifier.fillMaxSize().background(INK).drawBehind {
        // the showroom: two soft coloured lights in the dark, in the colours of the machine in front of you
        drawCircle(Brush.radialGradient(listOf(b.copy(alpha = 0.34f * pulse), Color.Transparent), center = Offset(size.width * 0.05f, size.height * 0.12f), radius = size.width * 1.0f), radius = size.width * 1.0f, center = Offset(size.width * 0.05f, size.height * 0.12f))
        drawCircle(Brush.radialGradient(listOf(a.copy(alpha = 0.22f * pulse), Color.Transparent), center = Offset(size.width * 0.95f, size.height * 0.92f), radius = size.width * 1.1f), radius = size.width * 1.1f, center = Offset(size.width * 0.95f, size.height * 0.92f))
    }) {
        Column(Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding(), horizontalAlignment = Alignment.CenterHorizontally) {
            // the name
            Row(Modifier.padding(top = 18.dp), verticalAlignment = Alignment.CenterVertically) {
                Text("PINBALL", color = Color.White, fontSize = 30.sp, fontWeight = FontWeight.Black, letterSpacing = 7.sp)
                Box(Modifier.padding(start = 10.dp).clip(RoundedCornerShape(10.dp)).background(gold).padding(horizontal = 9.dp, vertical = 1.dp)) {
                    Text("AR", color = INK, fontSize = 26.sp, fontWeight = FontWeight.Black, letterSpacing = 2.sp)
                }
            }
            Text("THE MACHINE COLLECTION", Modifier.padding(top = 4.dp), style = TextStyle(brush = gold), fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 5.sp)
            Box(Modifier.padding(top = 10.dp).width(56.dp).height(1.dp).background(gold))
            // the machines
            HorizontalPager(state = pager, modifier = Modifier.weight(1f).fillMaxWidth().padding(top = 14.dp), contentPadding = PaddingValues(horizontal = 30.dp), pageSpacing = 14.dp) { page ->
                val t = themes[page]; val ta = Color(t.colorA); val tb = Color(t.colorB); val high = prefs.getLong(t.highKey, 0L)
                val off = ((pager.currentPage - page) + pager.currentPageOffsetFraction).absoluteValue.coerceIn(0f, 1f)
                Box(Modifier.fillMaxSize().graphicsLayer { scaleX = 1f - 0.07f * off; scaleY = 1f - 0.07f * off; alpha = 1f - 0.45f * off }
                    .clip(RoundedCornerShape(30.dp)).background(Color(0xFF0D0818))
                    .border(1.2.dp, Brush.linearGradient(listOf(tb.copy(alpha = 0.9f), Color.White.copy(alpha = 0.12f), ta.copy(alpha = 0.9f))), RoundedCornerShape(30.dp))
                    .pointerInput(t) { detectTapGestures(onTap = { if (pager.currentPage == page) onPick(t) else scope.launch { pager.animateScrollToPage(page) } }) }) {
                    pictures[t]?.let { Image(it, contentDescription = t.title, modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop, alignment = Alignment.TopCenter) }
                    Box(Modifier.fillMaxSize().background(Brush.verticalGradient(0f to Color.Transparent, 0.42f to Color.Transparent, 0.72f to INK.copy(alpha = 0.86f), 1f to INK)))
                    // how long a game is, top left; the best score, top right
                    Row(Modifier.fillMaxWidth().padding(14.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                        Chip(t.length, ta)
                        Chip(if (high > 0) "BEST ${nf.format(high)}" else "NEW", Color(0xFFE8B95A))
                    }
                    Column(Modifier.align(Alignment.BottomStart).padding(horizontal = 20.dp, vertical = 18.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(t.title, color = Color.White, fontSize = 40.sp, fontWeight = FontWeight.Black, letterSpacing = 1.sp,
                            style = TextStyle(shadow = androidx.compose.ui.graphics.Shadow(color = tb, blurRadius = 34f)))
                        Text(t.tagline, color = Color.White.copy(alpha = 0.86f), fontSize = 14.sp, lineHeight = 19.sp)
                        Box(Modifier.padding(vertical = 4.dp).fillMaxWidth().height(1.dp).background(Brush.horizontalGradient(listOf(tb.copy(alpha = 0.8f), Color.Transparent))))
                        for (r in t.rules) Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(Modifier.size(6.dp).clip(CircleShape).background(ta))
                            Text(r, Modifier.padding(start = 10.dp), color = Color.White.copy(alpha = 0.78f), fontSize = 13.sp)
                        }
                    }
                }
            }
            // which one of three
            Row(Modifier.padding(top = 14.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                themes.forEachIndexed { i, t -> val on = i == pager.currentPage
                    Box(Modifier.height(6.dp).width(if (on) 26.dp else 6.dp).clip(CircleShape).background(if (on) Color(t.colorB) else Color.White.copy(alpha = 0.25f))) }
            }
            // play
            Box(Modifier.padding(start = 30.dp, end = 30.dp, top = 16.dp).fillMaxWidth().widthIn(max = 480.dp).height(60.dp).clip(RoundedCornerShape(30.dp))
                .background(Brush.horizontalGradient(listOf(b, a))).pointerInput(cur) { detectTapGestures(onTap = { onPick(cur) }) }, contentAlignment = Alignment.Center) {
                Text("PLAY  ${cur.title}", color = INK, fontSize = 19.sp, fontWeight = FontWeight.Black, letterSpacing = 3.sp)
            }
            Text("Stands in your room in AR  ·  or play it in 3D", Modifier.padding(top = 10.dp, bottom = 14.dp), color = Color.White.copy(alpha = 0.45f), fontSize = 12.sp, letterSpacing = 0.5.sp)
        }
    }
}

@Composable
private fun Chip(text: String, color: Color) {
    Text(text, Modifier.clip(RoundedCornerShape(12.dp)).background(INK.copy(alpha = 0.72f)).border(1.dp, color.copy(alpha = 0.75f), RoundedCornerShape(12.dp)).padding(horizontal = 10.dp, vertical = 5.dp),
        color = color, fontSize = 11.sp, fontWeight = FontWeight.Black, letterSpacing = 1.5.sp)
}

/** The machine in your room: real size on the floor (or a small one on a table). */
@Composable
private fun PuffAr(session: Session, onThreeD: () -> Unit, onMachines: () -> Unit) {
    val engine = rememberEngine()
    val modelLoader = rememberModelLoader(engine)
    val materialLoader = rememberMaterialLoader(engine)
    val view = rememberARView(engine) {
        createARView(engine).apply {
            multiSampleAntiAliasingOptions = multiSampleAntiAliasingOptions.apply { enabled = true; sampleCount = 4 }
            bloomOptions = bloomOptions.apply { enabled = true; strength = 0.2f; threshold = true }
            ambientOcclusionOptions = ambientOcclusionOptions.apply { enabled = true }
        }
    }
    val machine = remember { Machine(engine, modelLoader, session) }
    val cabinet = rememberModelInstance(modelLoader, "models/${session.theme.dir}/pp_cabinet.glb")
    val reticleModel = rememberModelInstance(modelLoader, "models/reticle.glb")
    var anchor by remember { mutableStateOf<Anchor?>(null) }
    var canPlace by remember { mutableStateOf(false) }
    var tracking by remember { mutableStateOf(false) }
    var viewW by remember { mutableIntStateOf(0) }
    var viewH by remember { mutableIntStateOf(0) }
    var mini by remember { mutableStateOf(false) }
    val candidate = remember { Ref<Pair<Pose, com.google.ar.core.Trackable>?>(null) }
    val placedRoot = remember { Ref<io.github.sceneview.node.Node?>(null) }
    val frameRef = remember { Ref<io.github.sceneview.node.Node?>(null) }
    val reticleRef = remember { Ref<io.github.sceneview.node.Node?>(null) }
    val s = if (mini) 0.3f else 1f

    Box(Modifier.fillMaxSize().onSizeChanged { viewW = it.width; viewH = it.height }) {
        ARSceneView(
            modifier = Modifier.fillMaxSize(),
            engine = engine, modelLoader = modelLoader, materialLoader = materialLoader, view = view,
            planeFindingMode = Config.PlaneFindingMode.HORIZONTAL,
            depthMode = Config.DepthMode.AUTOMATIC,
            instantPlacementMode = Config.InstantPlacementMode.LOCAL_Y_UP,
            sceneUnderstanding = SceneUnderstanding(occlusion = false, lighting = true, physics = false, planeVisualization = anchor == null),
            onSessionUpdated = { _, frame ->
                tracking = frame.camera.trackingState == TrackingState.TRACKING
                if (anchor == null) {
                    val hits = if (viewW > 0) frame.hitTest(viewW / 2f, viewH * 0.6f) else emptyList()
                    val hit = hits.firstOrNull { h -> val p = h.trackable as? Plane; p != null && p.type == Plane.Type.HORIZONTAL_UPWARD_FACING && p.trackingState == TrackingState.TRACKING && h.distance < 6f && p.subsumedBy == null }
                    if (hit != null) {
                        val raw = hit.hitPose; val cam = frame.camera.pose
                        // the machine turns its front to you
                        val yaw = atan2((cam.tx() - raw.tx()).toDouble(), (cam.tz() - raw.tz()).toDouble())
                        val q = floatArrayOf(0f, sin(yaw / 2).toFloat(), 0f, cos(yaw / 2).toFloat())
                        candidate.v = Pose(floatArrayOf(raw.tx(), raw.ty(), raw.tz()), q) to hit.trackable
                        reticleRef.v?.let { r -> r.worldPosition = Position(raw.tx(), raw.ty(), raw.tz()); r.worldQuaternion = dev.romainguy.kotlin.math.Quaternion(q[0], q[1], q[2], q[3]) }
                        canPlace = true
                    } else { candidate.v = null; canPlace = false }
                } else {
                    anchor?.takeIf { it.trackingState == TrackingState.TRACKING }?.pose?.let { p ->
                        placedRoot.v?.let { r -> r.worldPosition = Position(p.tx(), p.ty(), p.tz()); r.worldQuaternion = dev.romainguy.kotlin.math.Quaternion(p.qx(), p.qy(), p.qz(), p.qw()) }
                    }
                    frameRef.v?.let { machine.attach(it) }
                    cabinet?.let { machine.bindDisplay(it) }
                    session.tick(); machine.update()
                }
            },
        ) {
            reticleModel?.let { ModelNode(modelInstance = it, autoAnimate = false, isVisible = anchor == null && canPlace, scale = Scale(0.8f), apply = { reticleRef.v = this }) }
            Node(apply = { placedRoot.v = this }) {
                Node(scale = Scale(s), apply = { frameRef.v = this }) {
                    cabinet?.let { ModelNode(modelInstance = it, autoAnimate = false, isVisible = anchor != null) }
                }
            }
        }
        if (anchor == null) {
            Column(Modifier.align(Alignment.TopCenter).statusBarsPadding().padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(session.theme.title, color = Color(session.theme.colorB), fontSize = 34.sp, fontWeight = FontWeight.Black)
                Pill(if (!tracking) "Move the phone slowly so it can see the floor" else if (!canPlace) "Aim at the floor where the machine should stand" else "The machine will stand on the ring, facing you")
            }
            Column(Modifier.align(Alignment.BottomCenter).navigationBarsPadding().padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Small(if (canPlace) "PLACE THE MACHINE" else "Looking for the floor…", primary = true, enabled = canPlace) {
                    candidate.v?.let { c -> anchor = runCatching { c.second.createAnchor(c.first) }.getOrNull() }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Small(if (mini) "Size: tabletop" else "Size: real") { mini = !mini }
                    Small("Play in 3D instead") { onThreeD() }
                    Small("Machines") { onMachines() }
                }
            }
        } else Hud(session, extras = {
            Small("Move") { anchor?.detach(); anchor = null }
            Small(if (mini) "Size: tabletop" else "Size: real") { mini = !mini }
            Small("3D view") { onThreeD() }
            Small("Machines") { onMachines() }
        })
    }
}

/** The same machine without the camera: turn it, come close, look straight down. */
@Composable
private fun Puff3D(session: Session, onAr: () -> Unit, onMachines: () -> Unit) {
    val engine = rememberEngine()
    val modelLoader = rememberModelLoader(engine)
    val view = rememberView(engine)
    val machine = remember { Machine(engine, modelLoader, session) }
    val cabinet = rememberModelInstance(modelLoader, "models/${session.theme.dir}/pp_cabinet.glb")
    val frameRef = remember { Ref<io.github.sceneview.node.Node?>(null) }
    // places to stand, then drag and pinch from there. "Full" takes in the whole table, the shooter lane and the score display
    val views = listOf(Triple("Full", Position(0f, 2.25f, 1.75f), Position(0f, 1.0f, 0f)), Triple("Player", Position(0f, 1.58f, 1.22f), Position(0f, 0.92f, -0.05f)), Triple("Close", Position(0f, 1.3f, 0.86f), Position(0f, 0.9f, 0.2f)),
        Triple("Top", Position(0f, 2.35f, 0.08f), Position(0f, 0.9f, 0f)), Triple("Whole", Position(1.5f, 1.7f, 2.1f), Position(0f, 1.0f, -0.2f)))
    var which by remember { mutableIntStateOf(0) }
    val cameraNode = rememberCameraNode(engine) { position = views[0].second; lookAt(views[0].third) }
    LaunchedEffect(which) { cameraNode.position = views[which].second; cameraNode.lookAt(views[which].third) }
    LaunchedEffect(Unit) { view.bloomOptions = view.bloomOptions.apply { enabled = true; strength = 0.2f; threshold = true } }

    Box(Modifier.fillMaxSize().background(Color(0xFF0A0418))) {
        SceneView(
            modifier = Modifier.fillMaxSize(), engine = engine, modelLoader = modelLoader, view = view,
            frameRatePolicy = FrameRatePolicy.Continuous(), autoCenterContent = false, cameraNode = cameraNode,
            cameraManipulator = rememberCameraManipulator(orbitHomePosition = views[0].second, targetPosition = views[0].third),
            onFrame = { _ ->
                frameRef.v?.let { machine.attach(it) }
                cabinet?.let { machine.bindDisplay(it) }
                session.tick(); machine.update()
            },
        ) {
            Node(apply = { frameRef.v = this }) {
                cabinet?.let { ModelNode(modelInstance = it, autoAnimate = false) }
            }
        }
        Hud(session, extras = {
            Small("View: ${views[which].first}") { which = (which + 1) % views.size }
            Small("AR") { onAr() }
            Small("Machines") { onMachines() }
        })
    }
}

/** Score display, flashing words, the two flipper buttons, the plunger and the small buttons. */
@Composable
private fun Hud(session: Session, extras: @Composable () -> Unit) {
    var now by remember { mutableLongStateOf(SystemClock.uptimeMillis()) }
    LaunchedEffect(Unit) { while (true) { delay(120); now = SystemClock.uptimeMillis() } }
    // a bumper, a slingshot or the kickback is felt in the hand
    val haptic = androidx.compose.ui.platform.LocalHapticFeedback.current
    DisposableEffect(session) { session.onBump = { haptic.performHapticFeedback(androidx.compose.ui.hapticfeedback.HapticFeedbackType.LongPress) }; onDispose { session.onBump = null } }
    Box(Modifier.fillMaxSize()) {
        // the score is on the machine's own display; up here there is only a small menu button, and the menu opens under it
        var menu by remember { mutableStateOf(false) }
        Column(Modifier.align(Alignment.TopEnd).statusBarsPadding().padding(8.dp), horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Box(Modifier.size(44.dp).clip(CircleShape).background(NIGHT).border(1.5.dp, Color.White.copy(alpha = 0.5f), CircleShape).pointerInput(Unit) { detectTapGestures(onTap = { menu = !menu }) }, contentAlignment = Alignment.Center) {
                Text(if (menu) "✕" else "☰", color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            }
            if (menu) {
                extras()
                Small(if (session.sounds.muted) "Sound: off" else "Sound: on") { session.sounds.muted = !session.sounds.muted; now = SystemClock.uptimeMillis() }
            }
        }
        // VIRUS is played against the clock: it is shown big, top left, and turns red in the last ten seconds
        if (session.theme.def.timeLimit > 0f && !session.gameOver) {
            val low = session.clock <= 10
            Text("${session.clock}s", Modifier.align(Alignment.TopStart).statusBarsPadding().padding(10.dp).clip(RoundedCornerShape(16.dp)).background(NIGHT)
                .border(1.5.dp, if (low) Color(0xFFFF3A3A) else Color(session.theme.colorA), RoundedCornerShape(16.dp)).padding(horizontal = 14.dp, vertical = 6.dp),
                color = if (low && now / 250 % 2 == 0L) Color(0xFFFF3A3A) else Color.White, fontSize = 26.sp, fontWeight = FontWeight.Black)
        }
        // the words that flash up in the middle
        val showing = session.gameOver || now - session.messageAt < 2400
        if (showing && session.message.isNotEmpty()) {
            val on = session.gameOver || (now - session.messageAt) / 240 % 5 != 4L
            Text(if (session.gameOver && now - session.messageAt > 3000) "PRESS START" else session.message, Modifier.align(Alignment.Center).padding(bottom = 140.dp).widthIn(max = 340.dp),
                color = if (on) Color.White else Color.White.copy(alpha = 0.35f), fontSize = 30.sp, fontWeight = FontWeight.Black, textAlign = TextAlign.Center,
                style = androidx.compose.ui.text.TextStyle(shadow = androidx.compose.ui.graphics.Shadow(color = PINK, blurRadius = 30f)))
        }
        // the controls
        Column(Modifier.align(Alignment.BottomCenter).navigationBarsPadding().fillMaxWidth().padding(horizontal = 10.dp, vertical = 10.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
            if (session.gameOver) Small("START", primary = true) { session.start() }
            else if (session.waiting) {
                // the plunger: hold to pull it back, let go to shoot
                Box(Modifier.width(210.dp).height(64.dp).clip(RoundedCornerShape(20.dp)).background(NIGHT).border(2.dp, YELLOW, RoundedCornerShape(20.dp))
                    .pointerInput(Unit) { detectTapGestures(onPress = { session.game.plunger(true); tryAwaitRelease(); session.game.plunger(false) }) }, contentAlignment = Alignment.CenterStart) {
                    Box(Modifier.fillMaxWidth(session.charge.coerceIn(0.02f, 1f)).height(64.dp).background(YELLOW.copy(alpha = 0.45f)))
                    Text("HOLD · LET GO TO SHOOT", Modifier.fillMaxWidth(), color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Black, textAlign = TextAlign.Center)
                }
            } else Small("NUDGE") { session.game.nudge() }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                FlipperButton("◀ LEFT", CYAN) { session.game.flip(true, it) }
                FlipperButton("RIGHT ▶", PINK) { session.game.flip(false, it) }
            }
        }
    }
}

/** A flipper button: the flipper is up for as long as the finger is down. Both can be held at once. */
@Composable
private fun FlipperButton(label: String, color: Color, onChange: (Boolean) -> Unit) {
    var down by remember { mutableStateOf(false) }
    Box(Modifier.size(width = 150.dp, height = 96.dp).clip(RoundedCornerShape(26.dp)).background(color.copy(alpha = if (down) 0.75f else 0.28f)).border(3.dp, color, RoundedCornerShape(26.dp))
        .pointerInput(Unit) { detectTapGestures(onPress = { down = true; onChange(true); tryAwaitRelease(); down = false; onChange(false) }) }, contentAlignment = Alignment.Center) {
        Text(label, color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Black)
    }
}

@Composable
private fun Pill(text: String) {
    Text(text, Modifier.widthIn(max = 360.dp).background(NIGHT, RoundedCornerShape(14.dp)).padding(horizontal = 14.dp, vertical = 8.dp), color = Color.White, fontSize = 14.sp, textAlign = TextAlign.Center)
}

@Composable
private fun Small(label: String, primary: Boolean = false, enabled: Boolean = true, onClick: () -> Unit) {
    Button(onClick = onClick, enabled = enabled, modifier = Modifier.height(if (primary) 56.dp else 40.dp), shape = RoundedCornerShape(22.dp),
        colors = ButtonDefaults.buttonColors(containerColor = if (primary) MINT else NIGHT, contentColor = if (primary) Color(0xFF062412) else Color.White)) {
        Text(label, fontSize = if (primary) 18.sp else 13.sp, fontWeight = if (primary) FontWeight.Black else FontWeight.SemiBold)
    }
}
