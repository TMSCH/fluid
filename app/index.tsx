import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProjectCard } from '../src/components/ProjectCard';
import { useConfig } from '../src/lib/config-context';
import { listProjects } from '../src/features/storage/repositories';
import { createProject } from '../src/features/projects/project-manager';
import type { Project } from '../src/types/project';

export default function HomeScreen() {
  const router = useRouter();
  const { config, updateConfig, isConfigured } = useConfig();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newProjectText, setNewProjectText] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadProjects();
    }, [])
  );

  async function loadProjects() {
    try {
      const list = await listProjects();
      setProjects(list);
    } catch (e) {
      console.error('Failed to load projects:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProject() {
    const text = newProjectText.trim();
    if (!text || creating) return;

    setCreating(true);
    try {
      const { project } = await createProject(text, config.llm);
      setNewProjectText('');
      router.push(`/project/${project.id}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      if (Platform.OS === 'web') {
        window.alert(`Failed to create project: ${msg}`);
      } else {
        Alert.alert('Error', `Failed to create project: ${msg}`);
      }
    } finally {
      setCreating(false);
    }
  }

  function handleSaveApiKey() {
    const key = apiKeyInput.trim();
    if (!key) return;
    updateConfig({ llm: { ...config.llm, apiKey: key } });
    setApiKeyInput('');
  }

  if (!isConfigured) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.setupContainer}>
          <Text style={styles.title}>Fluid</Text>
          <Text style={styles.subtitle}>Create personal tools by chatting</Text>
          <View style={styles.setupCard}>
            <Text style={styles.setupLabel}>Enter your OpenAI API Key to get started</Text>
            <TextInput
              style={styles.apiKeyInput}
              value={apiKeyInput}
              onChangeText={setApiKeyInput}
              placeholder="sk-..."
              placeholderTextColor="#999"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              testID="api-key-input"
            />
            <Pressable style={styles.primaryButton} onPress={handleSaveApiKey} testID="save-api-key">
              <Text style={styles.primaryButtonText}>Continue</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Fluid</Text>
        <Text style={styles.subtitle}>Your personal mini-apps</Text>
      </View>

      <View style={styles.createSection}>
        <TextInput
          style={styles.createInput}
          value={newProjectText}
          onChangeText={setNewProjectText}
          placeholder="Describe a tool you want to create..."
          placeholderTextColor="#999"
          multiline
          editable={!creating}
          testID="create-project-input"
        />
        <Pressable
          style={[styles.primaryButton, creating && styles.buttonDisabled]}
          onPress={handleCreateProject}
          disabled={creating}
          testID="create-project-button"
        >
          {creating ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.primaryButtonText}>Create</Text>
          )}
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#007AFF" />
      ) : projects.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No projects yet</Text>
          <Text style={styles.emptySubtext}>
            Describe a personal tool above to create your first mini-app
          </Text>
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProjectCard
              project={item}
              onPress={() => router.push(`/project/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.listContent}
          testID="projects-list"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111',
  },
  subtitle: {
    fontSize: 15,
    color: '#888',
    marginTop: 4,
  },
  createSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  createInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: '#fff',
    color: '#111',
    minHeight: 48,
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loader: {
    marginTop: 40,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  setupContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  setupCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  setupLabel: {
    fontSize: 15,
    color: '#555',
    marginBottom: 12,
  },
  apiKeyInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#fafafa',
    color: '#111',
    marginBottom: 14,
  },
});
