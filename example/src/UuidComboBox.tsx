import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export interface UuidOption {
  label: string;
  value: string;
  description?: string;
}

interface UuidComboBoxProps {
  label: string;
  value: string;
  options: UuidOption[];
  onChange: (value: string) => void;
}

export function UuidComboBox({
  label,
  value,
  options,
  onChange,
}: UuidComboBoxProps) {
  const [expanded, setExpanded] = useState(false);
  const uniqueOptions = options.filter(
    (option, index) =>
      options.findIndex(
        (candidate) => candidate.value.toLowerCase() === option.value.toLowerCase(),
      ) === index,
  );

  const selectOption = (option: UuidOption) => {
    onChange(option.value);
    setExpanded(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Enter a service or characteristic UUID"
        accessibilityLabel={label}
      />
      <TouchableOpacity
        style={styles.toggle}
        onPress={() => setExpanded((current) => !current)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <Text style={styles.toggleText}>
          {expanded ? 'Hide UUID choices' : 'Choose a known UUID'}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.options}>
          {uniqueOptions.map((option) => {
            const selected = option.value.toLowerCase() === value.toLowerCase();
            return (
              <TouchableOpacity
                key={`${option.label}:${option.value}`}
                style={[styles.option, selected && styles.selectedOption]}
                onPress={() => selectOption(option)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <View style={[styles.radio, selected && styles.selectedRadio]}>
                  {selected && <View style={styles.radioDot} />}
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  {option.description && (
                    <Text style={styles.description}>{option.description}</Text>
                  )}
                  <Text style={styles.uuid} selectable>
                    {option.value}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#c7ccd1',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontFamily: 'monospace',
    fontSize: 12,
  },
  toggle: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  toggleText: {
    color: '#2457c5',
    fontSize: 13,
    fontWeight: '600',
  },
  options: {
    borderWidth: 1,
    borderColor: '#d7dce1',
    borderRadius: 8,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#d7dce1',
    backgroundColor: '#fff',
  },
  selectedOption: {
    backgroundColor: '#eef4ff',
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
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
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2457c5',
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontWeight: '600',
  },
  description: {
    color: '#59636e',
    fontSize: 12,
    marginTop: 2,
  },
  uuid: {
    color: '#37414b',
    fontFamily: 'monospace',
    fontSize: 11,
    marginTop: 4,
  },
});
