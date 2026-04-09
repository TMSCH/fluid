import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Switch,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import type {
  UINode,
  UIScreenNode,
  UISectionNode,
  UITextNode,
  UIInputNode,
  UITextareaNode,
  UINumberInputNode,
  UICheckboxNode,
  UIToggleNode,
  UIButtonNode,
  UIFormNode,
  UIListNode,
  UIListItemNode,
  UICardNode,
  UISelectNode,
  UIDatePickerNode,
} from '../../types/ui-schema';

interface RendererProps {
  schema: UIScreenNode;
  /** Called when a button is pressed or a form is submitted */
  onAction: (action: string, formData?: Record<string, unknown>) => void;
  /** Called when a field with autoSubmit changes (toggle, checkbox, select) */
  onFieldChange?: (fieldId: string, value: unknown, allFormData: Record<string, unknown>) => void;
}

interface FormState {
  [formId: string]: Record<string, unknown>;
}

interface FormMeta {
  [formId: string]: string;
}

export function DSLRenderer({ schema, onAction, onFieldChange }: RendererProps) {
  const [formState, setFormState] = useState<FormState>({});
  const formMetaRef = React.useRef<FormMeta>({});

  const updateFormField = useCallback((formId: string, fieldId: string, value: unknown) => {
    setFormState((prev) => ({
      ...prev,
      [formId]: {
        ...(prev[formId] || {}),
        [fieldId]: value,
      },
    }));
  }, []);

  const getFormValue = useCallback(
    (formId: string, fieldId: string, defaultValue: unknown) => {
      return formState[formId]?.[fieldId] ?? defaultValue;
    },
    [formState]
  );

  const handleSubmitForm = useCallback(
    (formId: string, submitAction: string) => {
      const data = formState[formId] || {};
      onAction(submitAction, data);
    },
    [formState, onAction]
  );

  /** Handle auto-submit fields: update local state, then trigger onFieldChange */
  const handleAutoSubmitField = useCallback(
    (formId: string, fieldId: string, value: unknown) => {
      setFormState((prev) => {
        const updated = {
          ...prev,
          [formId]: {
            ...(prev[formId] || {}),
            [fieldId]: value,
          },
        };
        // Fire onFieldChange after state update
        if (onFieldChange) {
          setTimeout(() => onFieldChange(fieldId, value, updated[formId] || {}), 0);
        }
        return updated;
      });
    },
    [onFieldChange]
  );

  function renderNode(node: UINode, currentFormId?: string): React.ReactNode {
    switch (node.type) {
      case 'screen':
        return renderScreen(node as UIScreenNode);
      case 'section':
        return renderSection(node as UISectionNode, currentFormId);
      case 'text':
        return renderText(node as UITextNode);
      case 'input':
        return renderInput(node as UIInputNode, currentFormId);
      case 'textarea':
        return renderTextarea(node as UITextareaNode, currentFormId);
      case 'number_input':
        return renderNumberInput(node as UINumberInputNode, currentFormId);
      case 'checkbox':
        return renderCheckbox(node as UICheckboxNode, currentFormId);
      case 'toggle':
        return renderToggle(node as UIToggleNode, currentFormId);
      case 'button':
        return renderButton(node as UIButtonNode, currentFormId);
      case 'form':
        return renderForm(node as UIFormNode);
      case 'list':
        return renderList(node as UIListNode, currentFormId);
      case 'list_item':
        return renderListItem(node as UIListItemNode, currentFormId);
      case 'card':
        return renderCard(node as UICardNode, currentFormId);
      case 'select':
        return renderSelect(node as UISelectNode, currentFormId);
      case 'date_picker':
        return renderDatePicker(node as UIDatePickerNode, currentFormId);
      default:
        return null;
    }
  }

  function renderChildren(children: UINode[] | undefined, currentFormId?: string): React.ReactNode {
    if (!children) return null;
    return children.map((child, i) => (
      <React.Fragment key={child.id || `node-${i}`}>
        {renderNode(child, currentFormId)}
      </React.Fragment>
    ));
  }

  function renderScreen(node: UIScreenNode): React.ReactNode {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} testID="dsl-screen">
        {node.title && <Text style={styles.screenTitle}>{node.title}</Text>}
        {renderChildren(node.children)}
      </ScrollView>
    );
  }

  function renderSection(node: UISectionNode, currentFormId?: string): React.ReactNode {
    return (
      <View style={styles.section} testID={node.id ? `section-${node.id}` : undefined}>
        {node.title && <Text style={styles.sectionTitle}>{node.title}</Text>}
        {renderChildren(node.children, currentFormId)}
      </View>
    );
  }

  function renderText(node: UITextNode): React.ReactNode {
    const textStyle = node.variant === 'heading' ? styles.heading
      : node.variant === 'subheading' ? styles.subheading
      : node.variant === 'caption' ? styles.caption
      : styles.bodyText;
    return (
      <Text style={textStyle} testID={node.id ? `text-${node.id}` : undefined}>
        {node.content}
      </Text>
    );
  }

  function renderInput(node: UIInputNode, currentFormId?: string): React.ReactNode {
    const formId = currentFormId || '__global';
    const value = getFormValue(formId, node.id, node.value ?? '') as string;
    return (
      <View style={styles.fieldContainer}>
        {node.label && <Text style={styles.label}>{node.label}</Text>}
        <TextInput
          style={styles.input}
          value={value}
          placeholder={node.placeholder}
          placeholderTextColor="#999"
          onChangeText={(text) => updateFormField(formId, node.id, text)}
          testID={`input-${node.id}`}
        />
      </View>
    );
  }

  function renderTextarea(node: UITextareaNode, currentFormId?: string): React.ReactNode {
    const formId = currentFormId || '__global';
    const value = getFormValue(formId, node.id, node.value ?? '') as string;
    return (
      <View style={styles.fieldContainer}>
        {node.label && <Text style={styles.label}>{node.label}</Text>}
        <TextInput
          style={[styles.input, styles.textarea]}
          value={value}
          placeholder={node.placeholder}
          placeholderTextColor="#999"
          onChangeText={(text) => updateFormField(formId, node.id, text)}
          multiline
          numberOfLines={node.rows || 4}
          testID={`textarea-${node.id}`}
        />
      </View>
    );
  }

  function renderNumberInput(node: UINumberInputNode, currentFormId?: string): React.ReactNode {
    const formId = currentFormId || '__global';
    const value = getFormValue(formId, node.id, node.value ?? '') as string | number;
    return (
      <View style={styles.fieldContainer}>
        {node.label && <Text style={styles.label}>{node.label}</Text>}
        <TextInput
          style={styles.input}
          value={String(value === 0 ? '0' : value || '')}
          keyboardType="numeric"
          placeholderTextColor="#999"
          onChangeText={(text) => {
            const num = parseFloat(text);
            updateFormField(formId, node.id, isNaN(num) ? text : num);
          }}
          testID={`number-input-${node.id}`}
        />
      </View>
    );
  }

  function renderCheckbox(node: UICheckboxNode, currentFormId?: string): React.ReactNode {
    const formId = currentFormId || '__global';
    const value = getFormValue(formId, node.id, node.value ?? false) as boolean;
    const handler = node.autoSubmit ? handleAutoSubmitField : updateFormField;
    return (
      <Pressable
        style={styles.checkboxRow}
        onPress={() => handler(formId, node.id, !value)}
        testID={`checkbox-${node.id}`}
      >
        <View style={[styles.checkboxBox, value && styles.checkboxBoxChecked]}>
          {value && <Text style={styles.checkboxCheck}>✓</Text>}
        </View>
        {node.label && <Text style={styles.checkboxLabel}>{node.label}</Text>}
      </Pressable>
    );
  }

  function renderToggle(node: UIToggleNode, currentFormId?: string): React.ReactNode {
    const formId = currentFormId || '__global';
    const value = getFormValue(formId, node.id, node.value ?? false) as boolean;
    const handler = node.autoSubmit ? handleAutoSubmitField : updateFormField;
    return (
      <View style={[styles.fieldContainer, styles.toggleRow]}>
        {node.label && <Text style={styles.label}>{node.label}</Text>}
        <Switch
          value={value}
          onValueChange={(val) => handler(formId, node.id, val)}
          testID={`toggle-${node.id}`}
        />
      </View>
    );
  }

  function renderButton(node: UIButtonNode, currentFormId?: string): React.ReactNode {
    const isPrimary = node.variant !== 'secondary' && node.variant !== 'danger';
    const isDanger = node.variant === 'danger';
    return (
      <Pressable
        style={[
          styles.button,
          isPrimary && styles.buttonPrimary,
          isDanger && styles.buttonDanger,
          !isPrimary && !isDanger && styles.buttonSecondary,
        ]}
        onPress={() => {
          if (currentFormId) {
            const action = node.action === 'submit_form'
              ? (formMetaRef.current[currentFormId] || currentFormId)
              : node.action;
            handleSubmitForm(currentFormId, action);
          } else {
            onAction(node.action);
          }
        }}
        testID={`button-${node.action}`}
      >
        <Text
          style={[
            styles.buttonText,
            (!isPrimary && !isDanger) && styles.buttonTextSecondary,
          ]}
        >
          {node.label}
        </Text>
      </Pressable>
    );
  }

  function renderForm(node: UIFormNode): React.ReactNode {
    formMetaRef.current[node.id] = node.submitAction;
    return (
      <View style={styles.form} testID={`form-${node.id}`}>
        {renderChildren(node.children, node.id)}
      </View>
    );
  }

  function renderList(node: UIListNode, currentFormId?: string): React.ReactNode {
    return (
      <View style={styles.list} testID={node.id ? `list-${node.id}` : undefined}>
        {renderChildren(node.children, currentFormId)}
      </View>
    );
  }

  function renderListItem(node: UIListItemNode, currentFormId?: string): React.ReactNode {
    return (
      <View style={styles.listItem} testID={node.id ? `list-item-${node.id}` : undefined}>
        {renderChildren(node.children, currentFormId)}
      </View>
    );
  }

  function renderCard(node: UICardNode, currentFormId?: string): React.ReactNode {
    return (
      <View style={styles.card} testID={node.id ? `card-${node.id}` : undefined}>
        {node.title && <Text style={styles.cardTitle}>{node.title}</Text>}
        {renderChildren(node.children, currentFormId)}
      </View>
    );
  }

  function renderSelect(node: UISelectNode, currentFormId?: string): React.ReactNode {
    const formId = currentFormId || '__global';
    const value = getFormValue(formId, node.id, node.value ?? '') as string;
    const handler = node.autoSubmit ? handleAutoSubmitField : updateFormField;
    return (
      <View style={styles.fieldContainer} testID={`select-${node.id}`}>
        {node.label && <Text style={styles.label}>{node.label}</Text>}
        <View style={styles.selectContainer}>
          {node.options.map((opt) => (
            <Pressable
              key={opt.value}
              style={[
                styles.selectOption,
                value === opt.value && styles.selectOptionActive,
              ]}
              onPress={() => handler(formId, node.id, opt.value)}
              testID={`select-${node.id}-${opt.value}`}
            >
              <Text
                style={[
                  styles.selectOptionText,
                  value === opt.value && styles.selectOptionTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  function renderDatePicker(node: UIDatePickerNode, currentFormId?: string): React.ReactNode {
    const formId = currentFormId || '__global';
    const value = getFormValue(formId, node.id, node.value ?? '') as string;
    return (
      <View style={styles.fieldContainer}>
        {node.label && <Text style={styles.label}>{node.label}</Text>}
        <TextInput
          style={styles.input}
          value={value}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#999"
          onChangeText={(text) => updateFormField(formId, node.id, text)}
          testID={`date-picker-${node.id}`}
          {...(Platform.OS === 'web' ? { type: 'date' } as Record<string, unknown> : {})}
        />
      </View>
    );
  }

  return <>{renderNode(schema)}</>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  screenContent: {
    padding: 16,
    paddingBottom: 32,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    color: '#111',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    color: '#111',
  },
  subheading: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    color: '#444',
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
    marginBottom: 4,
  },
  caption: {
    fontSize: 13,
    color: '#888',
    marginBottom: 4,
  },
  fieldContainer: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#fafafa',
    color: '#111',
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 4,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxBoxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkboxCheck: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 6,
  },
  buttonPrimary: {
    backgroundColor: '#007AFF',
  },
  buttonSecondary: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonDanger: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonTextSecondary: {
    color: '#333',
  },
  form: {
    marginBottom: 8,
  },
  list: {
    marginBottom: 8,
  },
  listItem: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      },
    }) as Record<string, unknown>,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#222',
  },
  selectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectOption: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f8f8f8',
  },
  selectOptionActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  selectOptionText: {
    fontSize: 14,
    color: '#555',
  },
  selectOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});
