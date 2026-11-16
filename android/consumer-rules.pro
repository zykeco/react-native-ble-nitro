# Nitro's generated BleNitroOnLoad.cpp finds these classes by name and invokes
# their no-argument constructors through JNI. R8 cannot see those references.
-keep class com.margelo.nitro.co.zyke.ble.BleNitroBleManager {
    public <init>();
}
-keep class com.margelo.nitro.co.zyke.ble.BleNitroBleManagerFactory {
    public <init>();
}
