#include <jni.h>
#include "BleNitroOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return margelo::nitro::co::zyke::ble::initialize(vm);
}
