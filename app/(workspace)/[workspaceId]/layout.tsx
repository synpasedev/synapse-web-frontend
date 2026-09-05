import React from 'react';
import { AppSidebar } from '@/components/sidebar/AppSidebar';
import { CommandPalette } from '@/components/search/CommandPalette';
import { TemplateModal } from '@/components/templates/TemplateModal';
import { ThemeModal } from '@/components/theme/ThemeModal';

export default function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  return (
    <WorkspaceLayoutContent params={params}>{children}</WorkspaceLayoutContent>
  );
}

async function WorkspaceLayoutContent({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const resolvedParams = await params;
  const workspaceId = resolvedParams.workspaceId;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <AppSidebar workspaceId={workspaceId} />
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto relative">
        {children}
      </main>
      <CommandPalette workspaceId={workspaceId} />
      <TemplateModal workspaceId={workspaceId} />
      <ThemeModal />
    </div>
  );
}
