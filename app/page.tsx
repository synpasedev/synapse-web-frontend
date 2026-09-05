import { redirect } from 'next/navigation';
import { DEFAULT_WORKSPACE_ID } from '@/lib/dexie/seed';

export default function RootPage() {
  redirect(`/${DEFAULT_WORKSPACE_ID}/notes`);
}
