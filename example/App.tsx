import { StatusBar } from 'expo-status-bar';
import { AppState, PermissionsAndroid, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { createBle } from './src/bluetooth';
import { useLayoutEffect, useRef, useState } from 'react';
import type { BLEDevice, AsyncSubscription } from 'react-native-ble-nitro';
import { SafeAreaView } from 'react-native-safe-area-context';

const HEART_RATE_SERVICE_UUID = '0000180d-0000-1000-8000-00805f9b34fb'.toLowerCase();
const HEART_RATE_MEASUREMENT_UUID = '00002A37-0000-1000-8000-00805f9b34fb'.toLowerCase();
const BODY_SENSOR_LOCATION_UUID = '00002A38-0000-1000-8000-00805f9b34fb'.toLowerCase();

const BATTERY_SERVICE_UUID = '0000180f-0000-1000-8000-00805f9b34fb'.toLowerCase();
const BATTERY_CHARACTERISTIC_LEVEL_UUID = '00002a19-0000-1000-8000-00805f9b34fb'.toLowerCase();

const CUSTOM_SERVICE_UUID = 'AAE28F00-71B5-42A1-8C3C-F9CF6AC969D0'.toLowerCase();
const RX_CHAR_UUID = 'AAE28F01-71B5-42A1-8C3C-F9CF6AC969D0'.toLowerCase();
const TX_CHAR_UUID = 'AAE28F02-71B5-42A1-8C3C-F9CF6AC969D0'.toLowerCase();

let unsubscribeRx: AsyncSubscription['remove'] | null = null;
let unsubscribeHr: AsyncSubscription['remove'] | null = null;

export default function App() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanServiceUUIDs, setScanServiceUUIDs] = useState<string>(`${HEART_RATE_SERVICE_UUID}`);
  const [scanResults, setScanResults] = useState<BLEDevice[]>([]);
  const [connectedDeviceId, setConnectedDeviceId] = useState<string | null>(null);
  const [deviceIsConnected, setDeviceIsConnected] = useState(false);
  const [connectedDeviceServiceUUIDs, setConnectedDeviceServiceUUIDs] = useState<string[]>([]);
  const [connectedDeviceCharacteristics, setConnectedDeviceCharacteristics] = useState<Record<string, string[]>>({});
  const [bleNotificationSubscription, setBleNotificationSubscription] = useState<boolean>(false);
  const [hrNotificationSubscription, setHrNotificationSubscription] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);
  const bleModule = useRef(createBle({
    onEnabledChange: (enabled) => setIsEnabled(enabled),
  }));
  const ble = bleModule.current;

  useLayoutEffect(() => {
    requestPermissionsAndroid().then(async () => {
      await requestBluetoothEnable();
      ble.mount();
    });
    const unsub = AppState.addEventListener('change', async (state) => {
      if (state === 'active' && isEnabled === false) {
        const isEnabled = await ble.instance.isBluetoothEnabled();
        setIsEnabled(isEnabled);
      }
    });
    return () => {
      unsub.remove();
      disconnectDevice();
      resetScannedDevices();
      stopScan();
      clearLogs();
    };
  }, []);

  const requestBluetoothEnable = async () => {
    if (Platform.OS !== 'android') {
      return true;
    }
    const success = await ble.instance.requestBluetoothEnable().catch((e) => {
      console.error(e);
      if (e instanceof Error && e.message === 'Not supported') {
        logMessage('requestBluetoothEnable only works on Android');
      }
      return false;
    });
    logMessage('requestBluetoothEnable', String(success));
    return success;
  };

  const requestPermissionsAndroid = async () => {
    if (Platform.OS !== 'android') {
      return true
    }
    if (Platform.OS === 'android' && PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION) {
      const apiLevel = parseInt(Platform.Version.toString(), 10);
      logMessage(`API level: ${apiLevel}`);
      if (apiLevel < 31) {
        const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        return (
          result === PermissionsAndroid.RESULTS.GRANTED
        );
      }
      if (PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN && PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT) {
        const result = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        ])

        return (
          result['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
          result['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
          result['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
        )
      }

      logMessage('Request permissions failed');
      throw new Error('Request permissions failed');
    }
  };

  const startScan = async () => {
    ble.instance.startScan({
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
    }, (error) => {
      console.error(error);
      logMessage(`Scan error: ${error}`);
    });
    logMessage('Scan started');
    setIsScanning(true);
  };

  const stopScan = () => {
    ble.instance.stopScan();
    logMessage('Scan stopped');
    setIsScanning(false);
  };

  const resetScannedDevices = () => {
    setScanResults([]);
  };

  const getConnectedDevices = () => {
    const devices = ble.instance.getConnectedDevices([HEART_RATE_SERVICE_UUID, BATTERY_SERVICE_UUID]);
    setScanResults(devices);
  };

  const onDisconnected =  async (deviceId: string, interrupted: boolean) => {
    if (interrupted) {
      logMessage('Disconnected because connection was interrupted');
    } else {
      logMessage('Disconnected intentionally');
    }
    await unlistenToBleNotifications();
    await unlistenToHrNotifications();
    checkConnection(deviceId);
    setConnectedDeviceServiceUUIDs([]);
    setConnectedDeviceCharacteristics({});
  }

  const connectDevice = async (deviceId: string) => {
    try {
      clearLogs();
      setConnectedDeviceId(null);
      setConnectedDeviceServiceUUIDs([]);
      stopScan();
      logMessage(`1 Connecting to ${deviceId}`);
      const connectedId = await ble.instance.connect(deviceId, onDisconnected);
      setConnectedDeviceId(connectedId);
      checkConnection(connectedId);
      logMessage(`2 Connected to ${connectedId}`);
      await ble.instance.discoverServices(connectedId);
      logMessage(`3 Discovered services for ${connectedId}`);
      const servicesWithCharacteristics = await ble.instance.getServicesWithCharacteristics(connectedId);
      logMessage(`4 Got ${servicesWithCharacteristics.length} services for ${connectedId}`);
      setConnectedDeviceServiceUUIDs(servicesWithCharacteristics.map((s) => s.uuid));
      resetScannedDevices();
      servicesWithCharacteristics.map(async (s) => {
        setConnectedDeviceCharacteristics((prev) => {
          prev[s.uuid] = s.characteristics;
          return prev;
        });
      });
      logMessage('Device is connected');
    } catch (e) {
      console.error(e);
    }
  };

  const findAndConnect = async () => {
    try {
      logMessage('Finding device');
      const connectedId = await ble.instance.findAndConnect(Platform.select({
        ios: '7F89D88A-1915-DBC3-B712-0AF59D16840C',
        android: 'ca:91:21:0e:0d:5a'.toUpperCase(),
        default: '7F89D88A-1915-DBC3-B712-0AF59D16840C',
      }), {
        onDisconnect: onDisconnected,
      });
      logMessage('Found and connected', connectedId);
      setConnectedDeviceId(connectedId);
      checkConnection(connectedId);
      const servicesWithCharacteristics = await ble.instance.getServicesWithCharacteristics(connectedId);
      setConnectedDeviceServiceUUIDs(servicesWithCharacteristics.map((s) => s.uuid));
      resetScannedDevices();
      servicesWithCharacteristics.map(async (s) => {
        setConnectedDeviceCharacteristics((prev) => {
          prev[s.uuid] = s.characteristics;
          return prev;
        });
      });
      logMessage('Device is connected');
    } catch (e) {
      console.error(e);
    }
  };

  const disconnectDevice = async () => {
    if (!connectedDeviceId) {
      return;
    }
    await ble.instance.disconnect(connectedDeviceId);
    onDisconnected(connectedDeviceId, false);
  }

  const readRSSI = async () => {
    if (!connectedDeviceId) {
      throw new Error('No device connected');
    }
    const rssi = await ble.instance.readRSSI(connectedDeviceId);
    logMessage('RSSI', rssi);
  }

  const readBatteryLevel = async () => {
    if (!connectedDeviceId) {
      throw new Error('No device connected');
    }
    const batteryLevel = await ble.instance.readCharacteristic(
      connectedDeviceId,
      BATTERY_SERVICE_UUID,
      BATTERY_CHARACTERISTIC_LEVEL_UUID,
    );
    console.log(batteryLevel);
    logMessage('Battery Level', batteryLevel[0]);
  };

  const readBodySensorLocation = async () => {
    if (!connectedDeviceId) {
      throw new Error('No device connected');
    }
    const [bodySensorLocation] = await ble.instance.readCharacteristic(
      connectedDeviceId,
      HEART_RATE_SERVICE_UUID,
      BODY_SENSOR_LOCATION_UUID,
    );
    const map = ['Other', 'Chest', 'Wrist', 'Finger', 'Hand', 'Earlobe', 'Foot'];
    const key = bodySensorLocation && map[bodySensorLocation] ? map[bodySensorLocation] : 'Unknown';
    logMessage('Body Sensor Location', key);
  }

  const requestMtu = () => {
    if (!connectedDeviceId) {
      throw new Error('No device connected');
    }
    const mtu = ble.instance.requestMTU(connectedDeviceId, 517);
    logMessage('MTU', mtu);
  };

  const logMessage = (...message: (string | number)[]) => {
    const date = new Date().toLocaleTimeString('de-DE');
    setLogs((prev) => [...prev, `${date} - ${message.join(' ')}`]);
  }

  const clearLogs = () => {
    setLogs([]);
  }

  const sendCommand = async (command: 'enable-led' | 'disable-led') => {
    if (!connectedDeviceId) {
      throw new Error('No device connected');
    }
    
    console.log('Will send command', command);

    switch (command) {
      case 'enable-led':
        let enableLedCommand = [0x00, 0x1f, 0x01];
        console.log('Will enable led with command:', 0x0e, enableLedCommand);
        enableLedCommand = ble.buildCommand(0x0e, ...enableLedCommand);
        console.log('Will enable led with command:', 0x0e, enableLedCommand);
        const result = await ble.instance.writeCharacteristic(connectedDeviceId, CUSTOM_SERVICE_UUID, TX_CHAR_UUID, enableLedCommand);
        logMessage('Led enabled', JSON.stringify(result));
        break;
      case 'disable-led':
        let disableLedCommand = [0x00, 0x1f, 0x00];
        disableLedCommand = ble.buildCommand(0x0e, ...disableLedCommand);
        console.log('Will disable led with command:', 0x0e, disableLedCommand);
        const disResult = await ble.instance.writeCharacteristic(connectedDeviceId, CUSTOM_SERVICE_UUID, TX_CHAR_UUID, disableLedCommand);
        logMessage('Led disabled', JSON.stringify(disResult));
        break;
      default:
        break;
    }
  };

  const listenToBleNotifications = async () => {
    if (!connectedDeviceId) {
      throw new Error('No device connected');
    }
    if (bleNotificationSubscription) {
      await unsubscribeRx?.();
      setBleNotificationSubscription(false);
    }
    const sub = await ble.instance.subscribeToCharacteristic(connectedDeviceId, CUSTOM_SERVICE_UUID, RX_CHAR_UUID, (_, data) => {
      logMessage('Received data', JSON.stringify(data));
    });
    logMessage('Subscribed to notifications');
    unsubscribeRx = sub.remove;
    setBleNotificationSubscription(true);
  };

  const unlistenToBleNotifications = async () => {
    if (bleNotificationSubscription) {
      setBleNotificationSubscription(false);
      await unsubscribeRx?.();
      logMessage('Unsubscribed from notifications');
    }
  }

  const listenToHrNotifications = async () => {
    if (!connectedDeviceId) {
      throw new Error('No device connected');
    }
    if (hrNotificationSubscription) {
      logMessage('Already listening to heart rate');
      await unsubscribeHr?.();
      setHrNotificationSubscription(false);
    }
    const sub = await ble.instance.subscribeToCharacteristic(connectedDeviceId, HEART_RATE_SERVICE_UUID, HEART_RATE_MEASUREMENT_UUID, (_, data) => {
      const [type, hr] = data;
      logMessage('Heart Rate', hr);
      if (type === 0) return;
      if (type === 0x10) {
        const bytes = data;

        const flags = bytes[0];
        const rrPresent = (flags & 0b00010000) !== 0; // Bit4 = RR-Intervalle vorhanden

        let offset = 1;
        if ((flags & 0b00000001) !== 0) {
          // Heart Rate 16-bit
          offset += 2;
        } else {
          // Heart Rate 8-bit
          offset += 1;
        }

        // Energy Expended überspringen, falls vorhanden
        if ((flags & 0b00001000) !== 0) {
          offset += 2;
        }

        const rrMs: number[] = [];
        if (rrPresent) {
          for (let i = offset; i + 1 < bytes.length; i += 2) {
            const rr = bytes[i] | (bytes[i + 1] << 8); // little endian
            rrMs.push(Number(((rr * 1000) / 1024).toFixed(0)));
          }
        }

        logMessage('RR-Intervals', ...rrMs);
      }
    });
    logMessage('Subscribed to heart rate');
    unsubscribeHr = sub.remove;
    setHrNotificationSubscription(true);
  };

  const unlistenToHrNotifications = async () => {
    if (hrNotificationSubscription) {
      await unsubscribeHr?.();
      setHrNotificationSubscription(false);
      logMessage('Unsubscribed from heart rate');
    }
  };

  const checkConnection = (deviceId = connectedDeviceId) => {
    if (!deviceId) {
      logMessage('No connected device');
      return false;
    }
    const isConnected = ble.instance.isConnected(deviceId);
    setDeviceIsConnected(isConnected);
    logMessage(`Device ${deviceId} is ${isConnected ? 'connected' : 'disconnected'}`);
    return isConnected;
  };

  return (
    <>
    <StatusBar style="auto" />
      <ScrollView
        style={[styles.container, { padding: 16 }]}
        nestedScrollEnabled
      >
        <SafeAreaView>
            <Text>Ble Enabled: {isEnabled.toString()}</Text>
            {!isEnabled && (
              <>
                <TouchableOpacity style={styles.button} onPress={requestBluetoothEnable}>
                  <Text>Enable Bluetooth</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={() => ble.instance.openSettings().catch((e) => { console.error(e) })}>
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
                  <TouchableOpacity style={styles.button} onPress={findAndConnect}>
                    <Text>Find And Connect Device</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.button} onPress={getConnectedDevices}>
                    <Text>Get connected devices</Text>
                  </TouchableOpacity>
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
                      <Text selectable>ID: {connectedDeviceId}</Text>
                      <Text>Is connected: {deviceIsConnected.toString()}</Text>
                      <Text style={{ borderTopWidth: 1 }}>Services:</Text>
                      {connectedDeviceServiceUUIDs.map((s, i) => (
                        <View key={s} style={{ borderBottomWidth: i === connectedDeviceServiceUUIDs.length - 1 ? 0 : 1 }}>
                          <Text>Service: {s}</Text>
                          <Text>Characteristics:</Text>
                          {connectedDeviceCharacteristics[s]?.map((c) => (
                            <Text key={c}>{c}</Text>
                          ))}
                          {s === BATTERY_SERVICE_UUID && connectedDeviceCharacteristics[s]?.includes(BATTERY_CHARACTERISTIC_LEVEL_UUID) && (
                            <TouchableOpacity style={styles.button} onPress={readBatteryLevel}>
                              <Text>Read Battery Level</Text>
                            </TouchableOpacity>
                          )}
                          {s === CUSTOM_SERVICE_UUID && connectedDeviceCharacteristics[s]?.includes(TX_CHAR_UUID) && (
                            <>
                              <TouchableOpacity style={styles.button} onPress={() => sendCommand('enable-led')}>
                                <Text>Enable LED</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.button} onPress={() => sendCommand('disable-led')}>
                                <Text>Disable LED</Text>
                              </TouchableOpacity>
                            </>
                          )}
                          {s === CUSTOM_SERVICE_UUID && connectedDeviceCharacteristics[s]?.includes(RX_CHAR_UUID) && (
                            <>
                              {!bleNotificationSubscription && (
                                <TouchableOpacity style={styles.button} onPress={listenToBleNotifications}>
                                  <Text>Listen to BLE Notifications</Text>
                                </TouchableOpacity>
                              )}
                              {bleNotificationSubscription && (
                                <TouchableOpacity style={styles.button} onPress={unlistenToBleNotifications}>
                                  <Text>Stop Listening to BLE Notifications</Text>
                                </TouchableOpacity>
                              )}
                              {!bleNotificationSubscription && !hrNotificationSubscription && (
                                <TouchableOpacity style={styles.button} onPress={async () => {
                                  await listenToBleNotifications();
                                  await listenToHrNotifications();
                                }}>
                                  <Text>Listen to HR and Custom Notifications</Text>
                                </TouchableOpacity>
                              )}
                            </>
                          )}
                          {s === HEART_RATE_SERVICE_UUID && connectedDeviceCharacteristics[s]?.includes(HEART_RATE_MEASUREMENT_UUID) && (
                            <>
                              {!hrNotificationSubscription && (
                                <TouchableOpacity style={styles.button} onPress={listenToHrNotifications}>
                                  <Text>Listen to HR Notifications</Text>
                                </TouchableOpacity>
                              )}
                              {hrNotificationSubscription && (
                                <>
                                  <TouchableOpacity style={styles.button} onPress={listenToHrNotifications}>
                                    <Text>Try override listen to HR Notifications</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity style={styles.button} onPress={unlistenToHrNotifications}>
                                    <Text>Stop Listening to HR Notifications</Text>
                                  </TouchableOpacity>
                                </>
                              )}
                              <TouchableOpacity style={styles.button} onPress={readBodySensorLocation}>
                                <Text>Read Body Sensor Location</Text>
                              </TouchableOpacity>
                            </>
                          )}
                        </View>
                      ))}
                      <TouchableOpacity style={styles.button} onPress={requestMtu}>
                        <Text>Request MTU</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.button} onPress={readRSSI}>
                        <Text>Read RSSI</Text>
                      </TouchableOpacity>
                      {deviceIsConnected && (
                        <TouchableOpacity style={styles.button} onPress={disconnectDevice}>
                          <Text>Disconnect</Text>
                        </TouchableOpacity>
                      )}
                      {!deviceIsConnected && (
                        <TouchableOpacity style={styles.button} onPress={() => {
                          connectDevice(connectedDeviceId);
                        }}>
                          <Text>Connect</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </>
                )}
              </>
            )}
            <TouchableOpacity style={styles.button} onPress={() => checkConnection()}>
              <Text>Check Connection</Text>
            </TouchableOpacity>
            {(logs.length > 0) && (
              <View>
                <Text style={{ marginTop: 16 }}>Logs:</Text>
                <ScrollView style={{ marginTop: 8, backgroundColor: '#f4f4f4ff', borderRadius: 4, padding: 8, maxHeight: 200 }} nestedScrollEnabled>
                  {logs.sort((a, b) => {
                    return b.toLocaleLowerCase().localeCompare(a.toLocaleLowerCase());
                  }).map((log, i) => (
                    <Text key={i} style={{ fontSize: 11, fontFamily: 'monospace', color: '#444', borderBottomWidth: i === logs.length - 1 ? 0 : 1, padding: 6 }}>{log}</Text>
                  ))}
                </ScrollView>
                <TouchableOpacity style={styles.button} onPress={clearLogs}>
                  <Text>Clear Logs</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={{ height: 32 }} />
        </SafeAreaView>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    // paddingHorizontal: 0,
  },
  button: {
    padding: 8,
    backgroundColor: '#999',
    borderRadius: 4,
    alignItems: 'center',
    marginVertical: 8,
  },
});
