import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === 'user';
  return (
    <View
      style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}
      testID={`chat-message-${role}`}
    >
      <Text style={[styles.text, isUser ? styles.userText : styles.assistantText]}>
        {content}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: '80%' as unknown as number,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    marginVertical: 4,
  },
  userContainer: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  assistantContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 21,
  },
  userText: {
    color: '#fff',
  },
  assistantText: {
    color: '#222',
  },
});
