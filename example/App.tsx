import { StatusBar } from 'expo-status-bar';
import { AppState, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { createBle } from './src/bluetooth';
import { useLayoutEffect, useRef, useState } from 'react';
import { BLEDevice } from 'react-native-ble-nitro';

const HEART_RATE_SERVICE_UUID = '0000180d-0000-1000-8000-00805f9b34fb';

export default function App() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanServiceUUIDs, setScanServiceUUIDs] = useState<string>(`${HEART_RATE_SERVICE_UUID}`);
  const [scanResults, setScanResults] = useState<BLEDevice[]>([]);
  const [connectedDeviceId, setConnectedDeviceId] = useState<string | null>(null);
  const [connectedDeviceServiceUUIDs, setConnectedDeviceServiceUUIDs] = useState<string[]>([]);
  const [connectedDeviceCharacteristics, setConnectedDeviceCharacteristics] = useState<Record<string, string[]>>({});
  const bleModule = useRef(createBle({
    onEnabledChange: (enabled) => setIsEnabled(enabled),
  }));
  const ble = bleModule.current;

  useLayoutEffect(() => {
    ble.mount().then(() => {
      console.log('mounted');
    });
    const unsub = AppState.addEventListener('change', async (state) => {
      if (state === 'active' && isEnabled === false) {
        const isEnabled = await ble.instance.isBluetoothEnabled();
        setIsEnabled(isEnabled);
      }
    });
    return () => {
      unsub.remove();
    };
  }, []);

  const requestBluetoothEnable = async () => {
    const enabled = await ble.instance.requestBluetoothEnable();
    setIsEnabled(enabled);
  };

  const startScan = async () => {
    const scanning = await ble.instance.startScan({
      serviceUUIDs: scanServiceUUIDs.replaceAll(' ', '').split(',') ?? [],
      rssiThreshold: -100,
      allowDuplicates: false,
    }, (device) => {
      setScanResults((prev) => {
        const index = prev.findIndex((d) => d.id === device.id);
        if (index === -1) {
          return [...prev, device];
        }
        prev[index] = device;
        return prev;
      });
    });
    setIsScanning(scanning);
  };

  const stopScan = async () => {
    const stopped = await ble.instance.stopScan();
    setIsScanning(!stopped);
  };

  const resetScannedDevices = () => {
    setScanResults([]);
  };

  const connectDevice = async (deviceId: string) => {
    setConnectedDeviceId(null);
    setConnectedDeviceServiceUUIDs([]);
    await stopScan().catch(() => {});
    const connectedId = await ble.instance.connect(deviceId);
    setConnectedDeviceId(connectedId);
    await ble.instance.discoverServices(connectedId);
    const services = await ble.instance.getServices(connectedId);
    setConnectedDeviceServiceUUIDs(services);
    services.map(async (s) => {
      const characteristics = await ble.instance.getCharacteristics(connectedId, s);
      setConnectedDeviceCharacteristics((prev) => {
        prev[s] = characteristics;
        return prev;
      });
    });
  };

  const disconnectDevice = async () => {
    if (!connectedDeviceId) {
      return;
    }
    await ble.instance.disconnect(connectedDeviceId);
    setConnectedDeviceId(null);
    setConnectedDeviceServiceUUIDs([]);
    setConnectedDeviceCharacteristics({});
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <ScrollView style={{ padding: 16 }}>
        <Text>Ble Enabled: {isEnabled.toString()}</Text>
        {!isEnabled && (
          <>
            <TouchableOpacity style={styles.button} onPress={requestBluetoothEnable}>
              <Text>Enable Bluetooth</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={() => ble.instance.openSettings()}>
              <Text>Open Bluetooth Settings</Text>
            </TouchableOpacity>
          </>
        )}
        {isEnabled && (
          <>
            {!connectedDeviceId && (
              <>
              <Text>Scan Service UUIDs:</Text>
              <TextInput style={{ borderWidth: 1, padding: 3 }} value={scanServiceUUIDs} onChangeText={setScanServiceUUIDs}></TextInput>
              {isScanning ? (
                <TouchableOpacity style={styles.button} onPress={stopScan}>
                  <Text>Stop Scan</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.button} onPress={startScan}>
                  <Text>Start Scan</Text>
                </TouchableOpacity>
              )}
              {scanResults.length > 0 && (
                <View style={{ borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 16 }}>
                  <Text>Scanned Devices:</Text>
                  <TouchableOpacity style={styles.button} onPress={resetScannedDevices}>
                    <Text>Reset Scanned Devices</Text>
                  </TouchableOpacity>
                  {scanResults.map((device) => (
                    <TouchableOpacity key={device.id} style={{ padding: 8, backgroundColor: '#f4f4f4ff', borderRadius: 4 }} onPress={() => connectDevice(device.id)}>
                      <Text>ID: {device.id}</Text>
                      <Text>Name: {device.name}</Text>
                      <Text>RSSI: {device.rssi}</Text>
                      <Text>Manufacturer Data: {JSON.stringify(device.manufacturerData)}</Text>
                      <Text>Service UUIDs: {JSON.stringify(device.serviceUUIDs)}</Text>
                      <Text>Is Connectable: {device.isConnectable.toString()}</Text>
                      <Text>Tap to connect</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              </>
            )}
            {connectedDeviceId && (
              <>
                <Text style={{ marginTop: 16 }}>Connected Device:</Text>
                <View style={{ padding: 8, marginTop: 8, backgroundColor: '#f4f4f4ff', borderRadius: 4, }}>
                  <Text>ID: {connectedDeviceId}</Text>
                  <Text style={{ borderTopWidth: 1 }}>Services:</Text>
                  {connectedDeviceServiceUUIDs.map((s, i) => (
                    <View key={s} style={{ borderBottomWidth: i === connectedDeviceServiceUUIDs.length - 1 ? 0 : 1 }}>
                      <Text>Service: {s}</Text>
                      <Text>Characteristics:</Text>
                      {connectedDeviceCharacteristics[s]?.map((c) => (
                        <Text key={c}>{c}</Text>
                      ))}
                    </View>
                  ))}
                  <TouchableOpacity style={styles.button} onPress={disconnectDevice}>
                    <Text>Disconnect</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
  },
  button: {
    padding: 8,
    backgroundColor: '#999',
    borderRadius: 4,
    alignItems: 'center',
    marginVertical: 8,
  },
});
