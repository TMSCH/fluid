import * as repo from '../storage/repositories';
import type { ProjectSnapshot } from '../../types/project';
import type { AppDefinition } from '../../types/app-definition';
import type { AppState } from '../../types/app-state';
import type { UIScreenNode } from '../../types/ui-schema';

export interface SnapshotData {
  definition: AppDefinition;
  state: AppState;
  ui: UIScreenNode;
}

/** Create a snapshot of the current project state before or after a mutation */
export async function takeSnapshot(
  projectId: string,
  version: number,
  data: SnapshotData,
  summary: string
): Promise<ProjectSnapshot> {
  return repo.createSnapshot(
    projectId,
    version,
    JSON.stringify(data.definition),
    JSON.stringify(data.state),
    JSON.stringify(data.ui),
    summary
  );
}

/** List all snapshots for a project, newest first */
export async function listSnapshots(projectId: string): Promise<ProjectSnapshot[]> {
  return repo.getSnapshots(projectId);
}

/** Restore a project to a specific snapshot version */
export async function restoreSnapshot(
  projectId: string,
  targetVersion: number
): Promise<SnapshotData> {
  const snapshot = await repo.getSnapshot(projectId, targetVersion);
  if (!snapshot) {
    throw new Error(`Snapshot version ${targetVersion} not found for project ${projectId}`);
  }

  const definition: AppDefinition = JSON.parse(snapshot.definition_json);
  const state: AppState = JSON.parse(snapshot.state_json);
  const ui: UIScreenNode = JSON.parse(snapshot.ui_json);

  // Save as new versions in the definition and state tables
  const project = await repo.getProject(projectId);
  if (!project) throw new Error(`Project ${projectId} not found`);

  const newVersion = project.current_version + 1;

  await repo.saveDefinition(projectId, newVersion, snapshot.definition_json);
  await repo.saveState(projectId, newVersion, snapshot.state_json);
  await repo.updateProject(projectId, { current_version: newVersion });

  // Log the rollback event
  await repo.addEvent(projectId, 'rollback_applied', {
    from_version: project.current_version,
    to_snapshot_version: targetVersion,
    new_version: newVersion,
  });

  // Snapshot the restored state too
  await takeSnapshot(projectId, newVersion, { definition, state, ui }, `Restored from version ${targetVersion}`);

  return { definition, state, ui };
}
