# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# Keep all Nitro modules classes
-keep class com.margelo.nitro.** { *; }
-keep class com.facebook.jni.** { *; }

# Keep BLE Nitro classes
-keep class com.margelo.nitro.co.zyke.ble.** { *; }

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep hybrid object classes
-keep class * extends com.margelo.nitro.core.HybridObject { *; }

# Keep data classes used in Nitro
-keep @androidx.annotation.Keep class * { *; }
-keep @com.facebook.proguard.annotations.DoNotStrip class * { *; }