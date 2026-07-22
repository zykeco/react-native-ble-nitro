import { useEffect, useRef, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { BleNitroManager } from 'react-native-ble-nitro';
import {
  createGattServerOptions,
  gattBytesToText,
  GATT_SERVER_LOCAL_NAME,
  GATT_SERVER_UUIDS,
  textToGattBytes,
  type GattServerModeOverrides,
  type GattServerSignalMode,
  type GattServerWriteMode,
} from './gatt-server-config';

type LogMessage = (...message: (string | number)[]) => void;

interface GattServerExampleProps {
  ble: BleNitroManager;
  logMessage: LogMessage;
}

export function GattServerExample({
  ble,
  logMessage,
}: GattServerExampleProps) {
  const [running, setRunning] = useState(false);
  const [advertising, setAdvertising] = useState(false);
  const [characteristicText, setCharacteristicText] = useState('hello');
  const [signalMode, setSignalMode] =
    useState<GattServerSignalMode>('notify');
  const [writeMode, setWriteMode] =
    useState<GattServerWriteMode>('write');
  const [connectedDevices, setConnectedDevices] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const writeSequence = useRef(0);

  useEffect(() => {
    return () => {
      void ble.stopGattServer().catch(console.error);
    };
  }, [ble]);

  const refreshState = () => {
    const nextRunning = ble.isGattServerRunning();
    const nextAdvertising = ble.isGattServerAdvertising();
    setRunning(nextRunning);
    setAdvertising(nextAdvertising);
    setConnectedDevices(ble.getGattServerConnectedDevices());
    logMessage(
      'GATT server state',
      `running=${nextRunning}`,
      `advertising=${nextAdvertising}`,
    );
  };

  const startServer = async (overrides: GattServerModeOverrides = {}) => {
    const nextSignalMode = overrides.signalMode ?? signalMode;
    const nextWriteMode = overrides.writeMode ?? writeMode;

    setConnectedDevices([]);
    await ble.startGattServer(
      createGattServerOptions({
        signalMode: nextSignalMode,
        writeMode: nextWriteMode,
        initialValue: textToGattBytes(characteristicText),
        handlers: {
          onRead: ({ deviceId, mtu }) => {
            logMessage(
              'GATT server read',
              deviceId,
              GATT_SERVER_UUIDS.signal,
              `mtu=${mtu ?? 'unknown'}`,
            );
          },
          onSubscribe: ({ deviceId, mtu }) => {
            logMessage(
              'GATT server subscribed',
              deviceId,
              GATT_SERVER_UUIDS.signal,
              `mtu=${mtu ?? 'unknown'}`,
            );
          },
          onUnsubscribe: ({ deviceId, mtu }) => {
            logMessage(
              'GATT server unsubscribed',
              deviceId,
              GATT_SERVER_UUIDS.signal,
              `mtu=${mtu ?? 'unknown'}`,
            );
          },
          onWrite: ({ deviceId, data, mtu }) => {
            const text = gattBytesToText(data);
            writeSequence.current += 1;
            logMessage(
              'GATT server write',
              `#${writeSequence.current}`,
              nextWriteMode === 'writeWithoutResponse'
                ? 'without response'
                : 'with response',
              deviceId,
              `mtu=${mtu ?? 'unknown'}`,
              `text=${JSON.stringify(text)}`,
              `bytes=${JSON.stringify(data)}`,
            );
            setCharacteristicText(text);
            void ble
              .setGattServerCharacteristicValue(
                GATT_SERVER_UUIDS.service,
                GATT_SERVER_UUIDS.signal,
                data,
              )
              .catch((error: unknown) => {
                const message = error instanceof Error ? error.message : String(error);
                logMessage('Failed to mirror write into read value', message);
              });
          },
          onAdvertisingStarted: () => {
            setAdvertising(true);
            setRunning(true);
            logMessage('GATT server advertising started');
          },
          onAdvertisingStopped: () => {
            setAdvertising(false);
            setRunning(false);
            setConnectedDevices([]);
            logMessage('GATT server advertising stopped');
          },
          onDeviceConnected: ({ deviceId, mtu }) => {
            setConnectedDevices(ble.getGattServerConnectedDevices());
            logMessage(
              'GATT server central connected',
              deviceId,
              `mtu=${mtu ?? 'unknown'}`,
            );
          },
          onDeviceDisconnected: ({ deviceId, mtu }) => {
            setConnectedDevices(ble.getGattServerConnectedDevices());
            logMessage(
              'GATT server central disconnected',
              deviceId,
              `mtu=${mtu ?? 'unknown'}`,
            );
          },
          onMtuChanged: ({ deviceId, mtu }) => {
            logMessage('GATT server central MTU changed', deviceId, mtu);
          },
          onError: ({ message }) => {
            logMessage('GATT server error', message);
          },
        },
      }),
    );

    setRunning(ble.isGattServerRunning());
    setAdvertising(ble.isGattServerAdvertising());
    logMessage('GATT server started', nextSignalMode, nextWriteMode);
  };

  const stopServer = async () => {
    await ble.stopGattServer();
    setRunning(false);
    setAdvertising(false);
    setConnectedDevices([]);
    logMessage('GATT server stopped');
  };

  const restartServer = async (overrides: GattServerModeOverrides) => {
    if (!running) {
      return;
    }
    await stopServer();
    await startServer(overrides);
  };

  const selectSignalMode = async (nextMode: GattServerSignalMode) => {
    setSignalMode(nextMode);
    await restartServer({ signalMode: nextMode });
  };

  const selectWriteMode = async (nextMode: GattServerWriteMode) => {
    setWriteMode(nextMode);
    await restartServer({ writeMode: nextMode });
  };

  const setCharacteristicValue = async () => {
    const value = textToGattBytes(characteristicText);
    await ble.setGattServerCharacteristicValue(
      GATT_SERVER_UUIDS.service,
      GATT_SERVER_UUIDS.signal,
      value,
    );
    logMessage(
      'GATT server characteristic value set',
      JSON.stringify(value),
    );
  };

  const sendSignal = async () => {
    const value = textToGattBytes(characteristicText);
    const { queuedDeviceIds } =
      await ble.notifyGattServerCharacteristicChanged(
        GATT_SERVER_UUIDS.service,
        GATT_SERVER_UUIDS.signal,
        value,
      );

    if (queuedDeviceIds.length === 0) {
      logMessage('No subscribed GATT server centrals');
      return;
    }

    logMessage(
      signalMode === 'indicate'
        ? 'GATT server characteristic indicated'
        : 'GATT server characteristic notified',
      JSON.stringify(value),
      queuedDeviceIds.join(', '),
    );
  };

  const run = (operation: () => Promise<void>) => {
    if (busy) {
      return;
    }
    setBusy(true);
    void operation()
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        logMessage('GATT server operation failed', message);
      })
      .finally(() => setBusy(false));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Peripheral GATT server</Text>
          <Text style={styles.subtitle}>
            Run this tab on one phone and connect from the Central tab on another.
          </Text>
        </View>
        <View style={styles.statusRow}>
          <StatusBadge label="Server" active={running} />
          <StatusBadge label="Advertising" active={advertising} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Server</Text>
        <Text style={styles.help}>
          Changing a characteristic property while running restarts the server.
        </Text>
        <Text style={styles.fieldLabel}>Advertised name</Text>
        <Text>{GATT_SERVER_LOCAL_NAME}</Text>
        <Text style={styles.fieldLabel}>Service UUID</Text>
        <Text style={styles.uuid} selectable>
          {GATT_SERVER_UUIDS.service}
        </Text>
        <ActionButton
          label={running ? 'Stop GATT Server' : 'Start GATT Server'}
          disabled={busy}
          onPress={() => run(running ? stopServer : () => startServer())}
        />
        <ActionButton
          label="Refresh Server State"
          secondary
          disabled={busy}
          onPress={refreshState}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Read & signal characteristic</Text>
        <Text style={styles.help}>
          Centrals can read this value or subscribe for notifications or indications.
        </Text>
        <Text style={styles.fieldLabel}>Characteristic UUID</Text>
        <Text style={styles.uuid} selectable>
          {GATT_SERVER_UUIDS.signal}
        </Text>

        <Text style={styles.fieldLabel}>Characteristic text</Text>
        <TextInput
          style={styles.input}
          value={characteristicText}
          onChangeText={setCharacteristicText}
          placeholder="Value exposed to the central"
        />

        <Text style={styles.fieldLabel}>Signal property</Text>
        <RadioOption
          label="Notify"
          description="Fast updates without acknowledgement"
          selected={signalMode === 'notify'}
          disabled={busy}
          onPress={() => run(() => selectSignalMode('notify'))}
        />
        <RadioOption
          label="Indicate"
          description="Updates acknowledged by the central"
          selected={signalMode === 'indicate'}
          disabled={busy}
          onPress={() => run(() => selectSignalMode('indicate'))}
        />

        <ActionButton
          label="Set Read Value"
          secondary
          disabled={!running || busy}
          onPress={() => run(setCharacteristicValue)}
        />
        <ActionButton
          label={signalMode === 'indicate' ? 'Send Indication' : 'Send Notification'}
          disabled={!running || busy}
          onPress={() => run(sendSignal)}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Write characteristic</Text>
        <Text style={styles.help}>
          Incoming writes are mirrored into the read characteristic so the result is
          easy to verify from either phone.
        </Text>
        <Text style={styles.fieldLabel}>Characteristic UUID</Text>
        <Text style={styles.uuid} selectable>
          {GATT_SERVER_UUIDS.write}
        </Text>

        <Text style={styles.fieldLabel}>Write property</Text>
        <RadioOption
          label="Write with response"
          description="The peripheral acknowledges each write"
          selected={writeMode === 'write'}
          disabled={busy}
          onPress={() => run(() => selectWriteMode('write'))}
        />
        <RadioOption
          label="Write without response"
          description="Lower overhead; the central does not wait for acknowledgement"
          selected={writeMode === 'writeWithoutResponse'}
          disabled={busy}
          onPress={() => run(() => selectWriteMode('writeWithoutResponse'))}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Observed centrals</Text>
        {connectedDevices.length === 0 ? (
          <Text style={styles.help}>No centrals observed yet.</Text>
        ) : (
          connectedDevices.map((deviceId) => (
            <View key={deviceId} style={styles.centralRow}>
              <Text style={styles.centralId} selectable>
                {deviceId}
              </Text>
              <Text style={styles.mtu}>
                Payload / MTU: {ble.getGattServerDeviceMTU(deviceId)}
              </Text>
              {Platform.OS === 'android' && (
                <ActionButton
                  label="Disconnect"
                  secondary
                  disabled={busy}
                  onPress={() =>
                    run(() => ble.disconnectGattServerDevice(deviceId))
                  }
                />
              )}
            </View>
          ))
        )}
      </View>
    </View>
  );
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

function ActionButton({
  label,
  onPress,
  disabled = false,
  secondary = false,
}: ButtonProps & { secondary?: boolean }) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        secondary && styles.secondaryButton,
        disabled && styles.disabledButton,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      <Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function RadioOption({
  label,
  description,
  selected,
  disabled = false,
  onPress,
}: ButtonProps & {
  description: string;
  selected: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.radioOption, disabled && styles.disabledOption]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
    >
      <View style={[styles.radio, selected && styles.selectedRadio]}>
        {selected && <View style={styles.radioDot} />}
      </View>
      <View style={styles.radioText}>
        <Text style={styles.radioLabel}>{label}</Text>
        <Text style={styles.radioDescription}>{description}</Text>
      </View>
    </TouchableOpacity>
  );
}

function StatusBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <View style={[styles.badge, active && styles.activeBadge]}>
      <View style={[styles.badgeDot, active && styles.activeBadgeDot]} />
      <Text style={[styles.badgeText, active && styles.activeBadgeText]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  header: {
    marginBottom: 4,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: '#59636e',
    lineHeight: 19,
    marginTop: 4,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    backgroundColor: '#eceff2',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  activeBadge: {
    backgroundColor: '#e5f6eb',
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#89939e',
  },
  activeBadgeDot: {
    backgroundColor: '#18864b',
  },
  badgeText: {
    color: '#59636e',
    fontSize: 12,
    fontWeight: '700',
  },
  activeBadgeText: {
    color: '#126b3b',
  },
  card: {
    marginTop: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#d6dce2',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  help: {
    color: '#59636e',
    lineHeight: 19,
    marginTop: 5,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  uuid: {
    color: '#37414b',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#c7ccd1',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
  },
  disabledOption: {
    opacity: 0.5,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#68727d',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  selectedRadio: {
    borderColor: '#2457c5',
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#2457c5',
  },
  radioText: {
    flex: 1,
  },
  radioLabel: {
    fontWeight: '600',
  },
  radioDescription: {
    color: '#59636e',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  button: {
    padding: 11,
    backgroundColor: '#2457c5',
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#2457c5',
    backgroundColor: '#fff',
  },
  disabledButton: {
    opacity: 0.45,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: '#2457c5',
  },
  centralRow: {
    paddingTop: 10,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#d6dce2',
  },
  centralId: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  mtu: {
    color: '#59636e',
    fontSize: 12,
    marginTop: 4,
  },
});
