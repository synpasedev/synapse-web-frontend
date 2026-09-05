import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { localDb } from '@/lib/dexie/db';
import { ensureSeedData } from '@/lib/dexie/seed';
import { Database, DatabaseRow } from '@/types/domain';

export function useDatabases(workspaceId: string) {
  return useQuery({
    queryKey: ['databases', workspaceId],
    queryFn: async (): Promise<Database[]> => {
      await ensureSeedData();
      return await localDb.databases.where('workspace_id').equals(workspaceId).toArray();
    },
  });
}

export function useDatabase(databaseId: string) {
  return useQuery({
    queryKey: ['database', databaseId],
    queryFn: async (): Promise<Database | null> => {
      await ensureSeedData();
      const db = await localDb.databases.get(databaseId);
      return db || null;
    },
    enabled: Boolean(databaseId),
  });
}

export function useAddDatabaseRow(databaseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (properties: Record<string, any>) => {
      const db = await localDb.databases.get(databaseId);
      if (!db) throw new Error('Database not found');

      const newRow: DatabaseRow = {
        id: crypto.randomUUID(),
        database_id: databaseId,
        properties,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const updatedDb: Database = {
        ...db,
        rows: [...db.rows, newRow],
        updated_at: new Date().toISOString(),
      };

      await localDb.databases.put(updatedDb);
      return updatedDb;
    },
    onSuccess: (updatedDb) => {
      queryClient.invalidateQueries({ queryKey: ['database', databaseId] });
      queryClient.invalidateQueries({ queryKey: ['databases', updatedDb.workspace_id] });
    },
  });
}

export function useUpdateDatabaseRow(databaseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ rowId, properties }: { rowId: string; properties: Record<string, any> }) => {
      const db = await localDb.databases.get(databaseId);
      if (!db) throw new Error('Database not found');

      const updatedDb: Database = {
        ...db,
        rows: db.rows.map((r) =>
          r.id === rowId
            ? { ...r, properties: { ...r.properties, ...properties }, updated_at: new Date().toISOString() }
            : r
        ),
        updated_at: new Date().toISOString(),
      };

      await localDb.databases.put(updatedDb);
      return updatedDb;
    },
    onSuccess: (updatedDb) => {
      queryClient.invalidateQueries({ queryKey: ['database', databaseId] });
      queryClient.invalidateQueries({ queryKey: ['databases', updatedDb.workspace_id] });
    },
  });
}
