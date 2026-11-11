plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.puffpuff.pinball"
    compileSdk = 37
    defaultConfig {
        applicationId = "com.puffpuff.pinball"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"
        resValue("string", "app_name", "PUFF PUFF")
    }
    // fixed sideload key, so a new APK installs over the old one (not a Play Store key)
    signingConfigs { create("puff") { storeFile = file("puff-sideload.jks"); storePassword = "puffpuff"; keyAlias = "puff"; keyPassword = "puffpuff" } }
    buildTypes {
        release {
            ndk { abiFilters += listOf("arm64-v8a", "armeabi-v7a") }
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("puff")
        }
    }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_21; targetCompatibility = JavaVersion.VERSION_21 }
    buildFeatures { compose = true; resValues = true }
    androidResources { noCompress += listOf("glb", "wav") }
    testOptions { unitTests.isReturnDefaultValues = true }
    packaging { resources { excludes += "/META-INF/{AL2.0,LGPL2.1}" } }
}

kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_21) } }

dependencies {
    implementation("io.github.sceneview:arsceneview:4.60.0")
    implementation(platform("androidx.compose:compose-bom:2026.09.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.activity:activity-compose:1.13.0")
    testImplementation("junit:junit:4.13.2")
}
