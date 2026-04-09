import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import type { Project } from '../types/project';

interface ProjectCardProps {
  project: Project;
  onPress: () => void;
}

export function ProjectCard({ project, onPress }: ProjectCardProps) {
  return (
    <Pressable style={styles.card} onPress={onPress} testID={`project-card-${project.id}`}>
      <Text style={styles.title}>{project.name || 'Untitled Project'}</Text>
      {project.summary ? (
        <Text style={styles.summary} numberOfLines={2}>
          {project.summary}
        </Text>
      ) : null}
      <Text style={styles.meta}>
        v{project.current_version} &middot; {new Date(project.updated_at).toLocaleDateString()}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111',
    marginBottom: 4,
  },
  summary: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  meta: {
    fontSize: 12,
    color: '#999',
  },
});
