import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { DSLRenderer } from '../../src/features/renderer/DSLRenderer';
import { ChatInput } from '../../src/components/ChatInput';
import { ChatMessage } from '../../src/components/ChatMessage';
import { useConfig } from '../../src/lib/config-context';
import {
  loadProjectContext,
  sendChatMessage,
  submitUIAction,
} from '../../src/features/projects/project-manager';
import { listSnapshots, restoreSnapshot } from '../../src/features/rollback/snapshot-manager';
import type { ProjectContext } from '../../src/features/projects/project-manager';
import type { UIScreenNode } from '../../src/types/ui-schema';
import type { ProjectMessage, ProjectSnapshot } from '../../src/types/project';

type ViewMode = 'app' | 'chat' | 'history';

export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { config } = useConfig();

  const [context, setContext] = useState<ProjectContext | null>(null);
  const [currentUI, setCurrentUI] = useState<UIScreenNode | null>(null);
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [snapshots, setSnapshots] = useState<ProjectSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('app');
  const chatScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (id) loadProject();
  }, [id]);

  async function loadProject() {
    try {
      const ctx = await loadProjectContext(id!);
      if (!ctx) {
        if (Platform.OS === 'web') {
          window.alert('Project not found');
        } else {
          Alert.alert('Error', 'Project not found');
        }
        router.back();
        return;
      }
      setContext(ctx);
      setCurrentUI(ctx.ui);
      setMessages(ctx.messages);

      const snaps = await listSnapshots(id!);
      setSnapshots(snaps);
    } catch (e) {
      console.error('Failed to load project:', e);
    } finally {
      setLoading(false);
    }
  }

  const handleAction = useCallback(
    async (action: string, formData?: Record<string, unknown>) => {
      if (!id || processing) return;
      setProcessing(true);
      try {
        const response = await submitUIAction(
          id,
          action,
          formData || {},
          config.llm
        );
        setCurrentUI(response.ui);
        setMessages((prev) => [
          ...prev,
          { id: '', project_id: id, role: 'assistant', message_type: 'chat', content: response.assistant_message, created_at: new Date().toISOString() },
        ]);
        // Reload full context to get updated version
        const ctx = await loadProjectContext(id);
        if (ctx) setContext(ctx);
        const snaps = await listSnapshots(id);
        setSnapshots(snaps);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        if (Platform.OS === 'web') {
          window.alert(`Action failed: ${msg}`);
        } else {
          Alert.alert('Error', `Action failed: ${msg}`);
        }
      } finally {
        setProcessing(false);
      }
    },
    [id, processing, config.llm]
  );

  const handleFieldChange = useCallback(
    async (fieldId: string, value: unknown, allFormData: Record<string, unknown>) => {
      if (!id || processing) return;
      // Auto-submit field change to LLM (e.g. checkbox toggle, select change)
      handleAction('field_change', { [fieldId]: value, ...allFormData });
    },
    [id, processing, handleAction]
  );

  const handleSendMessage = useCallback(
    async (message: string) => {
      if (!id || processing) return;
      setProcessing(true);
      setMessages((prev) => [
        ...prev,
        { id: '', project_id: id, role: 'user', message_type: 'chat', content: message, created_at: new Date().toISOString() },
      ]);

      try {
        const response = await sendChatMessage(id, message, config.llm);
        setCurrentUI(response.ui);
        setMessages((prev) => [
          ...prev,
          { id: '', project_id: id, role: 'assistant', message_type: 'chat', content: response.assistant_message, created_at: new Date().toISOString() },
        ]);
        const ctx = await loadProjectContext(id);
        if (ctx) setContext(ctx);
        const snaps = await listSnapshots(id);
        setSnapshots(snaps);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        if (Platform.OS === 'web') {
          window.alert(`Chat failed: ${msg}`);
        } else {
          Alert.alert('Error', `Chat failed: ${msg}`);
        }
      } finally {
        setProcessing(false);
      }
    },
    [id, processing, config.llm]
  );

  const handleRestore = useCallback(
    async (version: number) => {
      if (!id || processing) return;
      setProcessing(true);
      try {
        const restored = await restoreSnapshot(id, version);
        setCurrentUI(restored.ui);
        const ctx = await loadProjectContext(id);
        if (ctx) {
          setContext(ctx);
          setMessages(ctx.messages);
        }
        const snaps = await listSnapshots(id);
        setSnapshots(snaps);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        if (Platform.OS === 'web') {
          window.alert(`Restore failed: ${msg}`);
        } else {
          Alert.alert('Error', `Restore failed: ${msg}`);
        }
      } finally {
        setProcessing(false);
      }
    },
    [id, processing]
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!context) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Project not found</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: context.project.name || 'Project',
          headerRight: () => (
            <View style={styles.headerButtons}>
              <Pressable
                style={[styles.modeButton, viewMode === 'app' && styles.modeButtonActive]}
                onPress={() => setViewMode('app')}
                testID="mode-app"
              >
                <Text style={[styles.modeButtonText, viewMode === 'app' && styles.modeButtonTextActive]}>App</Text>
              </Pressable>
              <Pressable
                style={[styles.modeButton, viewMode === 'chat' && styles.modeButtonActive]}
                onPress={() => setViewMode('chat')}
                testID="mode-chat"
              >
                <Text style={[styles.modeButtonText, viewMode === 'chat' && styles.modeButtonTextActive]}>Chat</Text>
              </Pressable>
              <Pressable
                style={[styles.modeButton, viewMode === 'history' && styles.modeButtonActive]}
                onPress={() => setViewMode('history')}
                testID="mode-history"
              >
                <Text style={[styles.modeButtonText, viewMode === 'history' && styles.modeButtonTextActive]}>History</Text>
              </Pressable>
            </View>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {processing && (
          <View style={styles.processingBar}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.processingText}>Processing...</Text>
          </View>
        )}

        {viewMode === 'app' && currentUI && (
          <View style={styles.flex}>
            <DSLRenderer schema={currentUI} onAction={handleAction} onFieldChange={handleFieldChange} />
          </View>
        )}

        {viewMode === 'chat' && (
          <View style={styles.flex}>
            <ScrollView
              style={styles.chatScroll}
              contentContainerStyle={styles.chatContent}
              ref={chatScrollRef}
              onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
              testID="chat-messages"
            >
              {messages.map((msg, i) => (
                <ChatMessage key={msg.id || `msg-${i}`} role={msg.role as 'user' | 'assistant'} content={msg.content} />
              ))}
            </ScrollView>
            <ChatInput onSend={handleSendMessage} disabled={processing} />
          </View>
        )}

        {viewMode === 'history' && (
          <ScrollView style={styles.historyScroll} contentContainerStyle={styles.historyContent} testID="history-list">
            <Text style={styles.historyTitle}>
              Version History (current: v{context.project.current_version})
            </Text>
            {snapshots.length === 0 ? (
              <Text style={styles.emptyText}>No snapshots yet</Text>
            ) : (
              snapshots.map((snap) => (
                <View key={snap.id} style={styles.snapshotCard}>
                  <View style={styles.snapshotHeader}>
                    <Text style={styles.snapshotVersion}>v{snap.version}</Text>
                    <Text style={styles.snapshotDate}>
                      {new Date(snap.created_at).toLocaleString()}
                    </Text>
                  </View>
                  {snap.summary ? (
                    <Text style={styles.snapshotSummary}>{snap.summary}</Text>
                  ) : null}
                  {snap.version !== context.project.current_version && (
                    <Pressable
                      style={styles.restoreButton}
                      onPress={() => handleRestore(snap.version)}
                      disabled={processing}
                      testID={`restore-v${snap.version}`}
                    >
                      <Text style={styles.restoreButtonText}>Restore this version</Text>
                    </Pressable>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#888',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  modeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  modeButtonActive: {
    backgroundColor: '#007AFF',
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  processingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    gap: 8,
  },
  processingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  chatScroll: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    paddingBottom: 8,
  },
  historyScroll: {
    flex: 1,
  },
  historyContent: {
    padding: 20,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  emptyText: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
  },
  snapshotCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  snapshotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  snapshotVersion: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  snapshotDate: {
    fontSize: 12,
    color: '#999',
  },
  snapshotSummary: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
  restoreButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  restoreButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#007AFF',
  },
});
