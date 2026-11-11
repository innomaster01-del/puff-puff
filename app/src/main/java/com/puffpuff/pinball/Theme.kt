package com.puffpuff.pinball

/**
 * The three machines. They share one playfield and one physics; each has its own look (models in assets/models/<dir>,
 * built by tools/3d/table.js with the same names), its own words, and one rule of its own.
 */
enum class Theme(
    val dir: String, val title: String, val tagline: String, val letters: String, val multiball: String, val saucer: String, val rushName: String,
    val rules: Rules, val colorA: Long, val colorB: Long, val highKey: String,
) {
    PUFF("puff", "PUFF PUFF", "Clouds and a steel ball. The classic.", "PUFF", "PUFF PUFF MULTIBALL", "MYSTERY", "", Rules(), 0xFF22E0FF, 0xFFFF3FA0, "high"),
    VIRUS("virus", "ACHOO ACHOO", "You are the virus. Spell GERM and it becomes three.", "GERM", "OUTBREAK!  3 BALLS", "LAB", "", Rules(multiballExtra = 2), 0xFF7DFF3A, 0xFFFF3A6E, "high_virus"),
    CANDY("candy", "YUM YUM", "A peppermint ball. Light the top lanes for a 20 second SUGAR RUSH.", "POPS", "CANDY STORM", "JAR", "SUGAR RUSH", Rules(rushSeconds = 20f), 0xFF7DFFF0, 0xFFFFD23A, "high_candy");

    /** The letters as they are called out: G · E · R · M */
    val spelled get() = letters.toList().joinToString(" · ")
}
