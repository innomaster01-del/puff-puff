package com.puffpuff.pinball

import org.junit.Assert.*
import org.junit.Test
import java.io.File

class LayoutTest {
    /** The 3D model is built from tools/3d/layout.json: it must be exactly what the physics uses, so the ball hits what you see. */
    @Test fun theModelIsBuiltFromThePhysicsNumbers() {
        val f = listOf("../tools/3d/layout.json", "tools/3d/layout.json").map { File(it) }.first { it.exists() }
        assertEquals("run the layout dump again (see README) after changing Table.kt", Cabinet.layoutJson().trim(), f.readText().trim())
    }
    @Test fun cabinetSpace() {
        val a = Cabinet.at(Table.W / 2, 0f, 0f); assertEquals(0f, a[0], 1e-6f); assertEquals(Cabinet.Y0, a[1], 1e-6f); assertEquals(Cabinet.Z0, a[2], 1e-6f)
        val b = Cabinet.at(Table.W / 2, Table.L, 0f); assertTrue("the far end is higher", b[1] > a[1] + 0.1f); assertTrue("and farther from the player", b[2] < a[2] - 1f)
        assertTrue("a ball sits above the wood", Cabinet.at(0.2f, 0.5f, Table.BALL_R)[1] > Cabinet.at(0.2f, 0.5f, 0f)[1])
    }
}
