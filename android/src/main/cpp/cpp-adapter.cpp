#include <jni.h>
#include <fbjni/fbjni.h>
#include "BleNitroOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return facebook::jni::initialize(vm, [] {
    margelo::nitro::co::zyke::ble::registerAllNatives();
  });
}
