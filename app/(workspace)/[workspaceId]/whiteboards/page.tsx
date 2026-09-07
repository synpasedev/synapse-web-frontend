'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function WhiteboardsRedirectPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/${workspaceId}/canvas`);
  }, [workspaceId, router]);

  return (
    <div className="flex items-center justify-center w-full h-full min-h-[70vh]">
      <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
    </div>
  );
}
