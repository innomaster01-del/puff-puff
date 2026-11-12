package com.puffpuff.pinball

/**
 * The three machines. Each has its own field and rules (TableDef), its own cabinet and models (assets/models/<dir>, built
 * by tools/3d/table.js), its own words and its own length of game.
 */
enum class Theme(
    val dir: String, val title: String, val tagline: String, val length: String, val rules: List<String>,
    val multiball: String, val saucer: String, val rushName: String,
    val def: TableDef, val colorA: Long, val colorB: Long, val highKey: String,
) {
    PUFF("puff", "PUFF PUFF", "Clouds and a steel ball. The classic.", "3 BALLS",
        listOf("Spell P·U·F·F for multiball", "Mystery saucer · jackpot 20,000", "Spinner lights the kickback"),
        "PUFF PUFF MULTIBALL", "MYSTERY", "", TableDef.PUFF, 0xFF22E0FF, 0xFFFF3FA0, "high"),
    VIRUS("virus", "VIRUS", "You are the virus. Infect every cell before the clock runs out.", "100 SECONDS",
        listOf("Each cell infected: +2 seconds", "All five: OUTBREAK, 3 balls", "It mutates: cells get harder, time runs faster"),
        "OUTBREAK!  3 BALLS", "", "", TableDef.VIRUS, 0xFF7DFF3A, 0xFFFF3A6E, "high_virus3"),
    CANDY("candy", "CANDY B", "A peppermint ball in a sweet shop. Knock down the sweets.", "3 BALLS · LEVELS",
        listOf("Knock down all 5 sweets: next level", "Every level: SUGAR RUSH, all ×2", "The jar: a mystery award"),
        "CANDY STORM", "JAR", "SUGAR RUSH", TableDef.CANDY, 0xFF7DFFF0, 0xFFFFD23A, "high_candy3");
}
