# Project specific ProGuard rules

# Capacitor ProGuard Rules
-keepattributes *Annotation*
-keepattributes JavascriptInterface
-keepattributes SourceFile,LineNumberTable

-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

-keep class com.getcapacitor.** { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keep class * extends com.getcapacitor.BridgeActivity { *; }

-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod public *;
}

# Plugins
-keep class ee.forgr.** { *; }
-dontwarn ee.forgr.**

-dontwarn com.getcapacitor.**
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
