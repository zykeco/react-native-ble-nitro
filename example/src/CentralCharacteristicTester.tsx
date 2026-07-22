import { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { AsyncSubscription, BleNitroManager } from 'react-native-ble-nitro';
import {
  gattBytesToText,
  GATT_SERVER_UUIDS,
  textToGattBytes,
} from './gatt-server-config';
import { UuidComboBox, type UuidOption } from './UuidComboBox';

type LogMessage = (...message: (string | number)[]) => void;

interface CentralCharacteristicTesterProps {
  ble: BleNitroManager;
  deviceId: string;
  defaultServiceUuid: string;
  defaultReadUuid: string;
  defaultWriteUuid: string;
  heartRateServiceUuid: string;
  heartRateMeasurementUuid: string;
  heartRateBodySensorLocationUuid: string;
  heartRateControlPointUuid: string;
  discoveredCharacteristics: Record<string, string[]>;
  logMessage: LogMessage;
}

function getServiceCharacteristics(
  discoveredCharacteristics: Record<string, string[]>,
  serviceUuid: string,
): string[] | undefined {
  const entry = Object.entries(discoveredCharacteristics).find(
    ([uuid]) => uuid.toLowerCase() === serviceUuid.toLowerCase(),
  );
  return entry?.[1];
}

function includesUuid(uuids: string[], uuid: string): boolean {
  return uuids.some((candidate) => candidate.toLowerCase() === uuid.toLowerCase());
}

export function CentralCharacteristicTester({
  ble,
  deviceId,
  defaultServiceUuid,
  defaultReadUuid,
  defaultWriteUuid,
  heartRateServiceUuid,
  heartRateMeasurementUuid,
  heartRateBodySensorLocationUuid,
  heartRateControlPointUuid,
  discoveredCharacteristics,
  logMessage,
}: CentralCharacteristicTesterProps) {
  const [serviceUuid, setServiceUuid] = useState(defaultServiceUuid);
  const [readUuid, setReadUuid] = useState(defaultReadUuid);
  const [notifyUuid, setNotifyUuid] = useState(defaultReadUuid);
  const [writeUuid, setWriteUuid] = useState(defaultWriteUuid);
  const [writeText, setWriteText] = useState('hello');
  const [writeWithResponse, setWriteWithResponse] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const subscription = useRef<AsyncSubscription['remove'] | null>(null);
  const subscribedTarget = useRef<{
    serviceUuid: string;
    characteristicUuid: string;
  } | null>(null);
  const autoSelectedDevice = useRef<string | null>(null);

  useEffect(() => {
    setSubscribed(false);
    return () => {
      const remove = subscription.current;
      subscription.current = null;
      subscribedTarget.current = null;
      if (remove) {
        void remove().catch(() => {});
      }
    };
  }, [deviceId]);

  useEffect(() => {
    if (autoSelectedDevice.current === deviceId) {
      return;
    }

    const testCharacteristics = getServiceCharacteristics(
      discoveredCharacteristics,
      GATT_SERVER_UUIDS.service,
    );
    if (testCharacteristics) {
      setServiceUuid(GATT_SERVER_UUIDS.service);
      setReadUuid(GATT_SERVER_UUIDS.signal);
      setNotifyUuid(GATT_SERVER_UUIDS.signal);
      setWriteUuid(GATT_SERVER_UUIDS.write);
      autoSelectedDevice.current = deviceId;
      return;
    }

    const heartRateCharacteristics = getServiceCharacteristics(
      discoveredCharacteristics,
      heartRateServiceUuid,
    );
    if (heartRateCharacteristics) {
      setServiceUuid(heartRateServiceUuid);
      setReadUuid(
        includesUuid(heartRateCharacteristics, heartRateBodySensorLocationUuid)
          ? heartRateBodySensorLocationUuid
          : '',
      );
      setNotifyUuid(
        includesUuid(heartRateCharacteristics, heartRateMeasurementUuid)
          ? heartRateMeasurementUuid
          : '',
      );
      setWriteUuid(
        includesUuid(heartRateCharacteristics, heartRateControlPointUuid)
          ? heartRateControlPointUuid
          : '',
      );
      autoSelectedDevice.current = deviceId;
      return;
    }

    if (
      getServiceCharacteristics(discoveredCharacteristics, defaultServiceUuid)
    ) {
      setServiceUuid(defaultServiceUuid);
      setReadUuid(defaultReadUuid);
      setNotifyUuid(defaultReadUuid);
      setWriteUuid(defaultWriteUuid);
      autoSelectedDevice.current = deviceId;
    }
  }, [
    defaultReadUuid,
    defaultServiceUuid,
    defaultWriteUuid,
    deviceId,
    discoveredCharacteristics,
    heartRateBodySensorLocationUuid,
    heartRateControlPointUuid,
    heartRateMeasurementUuid,
    heartRateServiceUuid,
  ]);

  const discoveredServiceOptions: UuidOption[] = Object.keys(
    discoveredCharacteristics,
  ).map((uuid) => ({
    label: 'Connected device service',
    value: uuid,
  }));
  const discoveredCharacteristicOptions: UuidOption[] = Object.entries(
    discoveredCharacteristics,
  ).flatMap(([parentServiceUuid, characteristicUuids]) =>
    characteristicUuids.map((uuid) => ({
      label: 'Connected device characteristic',
      value: uuid,
      description: `Service ${parentServiceUuid}`,
    })),
  );

  const serviceOptions: UuidOption[] = [
    {
      label: 'Demo service',
      value: defaultServiceUuid,
      description: 'The custom service previously used by this example.',
    },
    {
      label: 'BLE Nitro Peripheral service',
      value: GATT_SERVER_UUIDS.service,
      description: 'Select this when the other phone runs the Peripheral tab.',
    },
    {
      label: 'Heart Rate service',
      value: heartRateServiceUuid,
    },
    ...discoveredServiceOptions,
  ];
  const readOptions: UuidOption[] = [
    {
      label: 'Demo read / notify characteristic',
      value: defaultReadUuid,
    },
    {
      label: 'BLE Nitro Peripheral read / signal characteristic',
      value: GATT_SERVER_UUIDS.signal,
    },
    {
      label: 'Heart Rate Body Sensor Location',
      value: heartRateBodySensorLocationUuid,
    },
    ...discoveredCharacteristicOptions,
  ];
  const notifyOptions: UuidOption[] = [
    {
      label: 'Demo notify characteristic',
      value: defaultReadUuid,
    },
    {
      label: 'BLE Nitro Peripheral signal characteristic',
      value: GATT_SERVER_UUIDS.signal,
    },
    {
      label: 'Heart Rate Measurement',
      value: heartRateMeasurementUuid,
    },
    ...discoveredCharacteristicOptions,
  ];
  const writeOptions: UuidOption[] = [
    {
      label: 'Demo write characteristic',
      value: defaultWriteUuid,
    },
    {
      label: 'BLE Nitro Peripheral write characteristic',
      value: GATT_SERVER_UUIDS.write,
    },
    {
      label: 'Heart Rate Control Point',
      value: heartRateControlPointUuid,
    },
    ...discoveredCharacteristicOptions,
  ];

  const useDemo = () => {
    setServiceUuid(defaultServiceUuid);
    setReadUuid(defaultReadUuid);
    setNotifyUuid(defaultReadUuid);
    setWriteUuid(defaultWriteUuid);
  };

  const useBleNitroPeripheral = () => {
    setServiceUuid(GATT_SERVER_UUIDS.service);
    setReadUuid(GATT_SERVER_UUIDS.signal);
    setNotifyUuid(GATT_SERVER_UUIDS.signal);
    setWriteUuid(GATT_SERVER_UUIDS.write);
  };

  const readCharacteristic = async () => {
    const data = await ble.readCharacteristic(deviceId, serviceUuid, readUuid);
    logMessage(
      'Manual characteristic read',
      `text=${JSON.stringify(gattBytesToText(data))}`,
      `bytes=${JSON.stringify(data)}`,
    );
  };

  const writeCharacteristic = async () => {
    const data = textToGattBytes(writeText);
    const response = await ble.writeCharacteristic(
      deviceId,
      serviceUuid,
      writeUuid,
      data,
      writeWithResponse,
    );
    logMessage(
      'Manual characteristic write',
      writeWithResponse ? 'with response' : 'without response',
      `bytes=${JSON.stringify(data)}`,
      `response=${JSON.stringify(response)}`,
    );
  };

  const subscribe = async () => {
    if (subscription.current) {
      await subscription.current();
      subscription.current = null;
      subscribedTarget.current = null;
      setSubscribed(false);
    }
    const target = {
      serviceUuid,
      characteristicUuid: notifyUuid,
    };
    const nextSubscription = await ble.subscribeToCharacteristic(
      deviceId,
      target.serviceUuid,
      target.characteristicUuid,
      (_, data) => {
        logMessage(
          'Manual characteristic update',
          `text=${JSON.stringify(gattBytesToText(data))}`,
          `bytes=${JSON.stringify(data)}`,
        );
      },
    );
    subscription.current = nextSubscription.remove;
    subscribedTarget.current = target;
    setSubscribed(true);
    logMessage(
      'Manual characteristic subscribed',
      target.serviceUuid,
      target.characteristicUuid,
    );
  };

  const unsubscribe = async () => {
    const remove = subscription.current;
    const target = subscribedTarget.current;
    subscription.current = null;
    subscribedTarget.current = null;
    if (remove) {
      await remove();
    }
    setSubscribed(false);
    logMessage(
      'Manual characteristic unsubscribed',
      target?.serviceUuid ?? '',
      target?.characteristicUuid ?? '',
    );
  };

  const run = (operation: () => Promise<void>) => {
    void operation().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      logMessage('Manual characteristic operation failed', message);
    });
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Manual characteristic test</Text>
      <Text style={styles.help}>
        Matching UUIDs are selected after service discovery. You can still type
        any UUID or choose another discovered value.
      </Text>

      <View style={styles.presetRow}>
        <PresetButton label="Demo" onPress={useDemo} />
        <PresetButton
          label="BLE Nitro Peripheral"
          onPress={useBleNitroPeripheral}
        />
      </View>

      <UuidComboBox
        label="Service UUID"
        value={serviceUuid}
        options={serviceOptions}
        onChange={setServiceUuid}
      />
      <UuidComboBox
        label="Read characteristic UUID"
        value={readUuid}
        options={readOptions}
        onChange={setReadUuid}
      />
      <View style={styles.actionRow}>
        <ActionButton
          label="Read"
          disabled={!readUuid}
          onPress={() => run(readCharacteristic)}
        />
      </View>

      <UuidComboBox
        label="Notify characteristic UUID"
        value={notifyUuid}
        options={notifyOptions}
        onChange={setNotifyUuid}
      />
      <View style={styles.actionRow}>
        <ActionButton
          label={subscribed ? 'Unsubscribe' : 'Subscribe'}
          disabled={!subscribed && !notifyUuid}
          onPress={() => run(subscribed ? unsubscribe : subscribe)}
        />
      </View>

      <UuidComboBox
        label="Write characteristic UUID"
        value={writeUuid}
        options={writeOptions}
        onChange={setWriteUuid}
      />
      <Text style={styles.fieldLabel}>Write text</Text>
      <TextInput
        style={styles.input}
        value={writeText}
        onChangeText={setWriteText}
        placeholder="Text to write"
      />
      <Text style={styles.fieldLabel}>Write behavior</Text>
      <RadioOption
        label="Write with response"
        selected={writeWithResponse}
        onPress={() => setWriteWithResponse(true)}
      />
      <RadioOption
        label="Write without response"
        selected={!writeWithResponse}
        onPress={() => setWriteWithResponse(false)}
      />
      <ActionButton
        label="Write"
        disabled={!writeUuid}
        onPress={() => run(writeCharacteristic)}
      />
    </View>
  );
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

function PresetButton({ label, onPress }: ButtonProps) {
  return (
    <TouchableOpacity style={styles.presetButton} onPress={onPress}>
      <Text style={styles.presetButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

function ActionButton({ label, onPress, disabled = false }: ButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.actionButton, disabled && styles.disabledButton]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      <Text style={styles.actionButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

function RadioOption({
  label,
  selected,
  onPress,
}: ButtonProps & { selected: boolean }) {
  return (
    <TouchableOpacity
      style={styles.radioOption}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
    >
      <View style={[styles.radio, selected && styles.selectedRadio]}>
        {selected && <View style={styles.radioDot} />}
      </View>
      <Text>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d6dce2',
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  help: {
    color: '#59636e',
    lineHeight: 19,
    marginTop: 5,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  presetButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2457c5',
    borderRadius: 8,
    padding: 9,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  presetButtonText: {
    color: '#2457c5',
    fontWeight: '600',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#c7ccd1',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: '#2457c5',
    padding: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.45,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 7,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#68727d',
    alignItems: 'center',
    justifyContent: 'center',
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
});
