import { test, expect } from '@playwright/test';

test.describe('Google Docs Sync UI', () => {
  test('Sync badge renders on note and opens Google Doc Sync modal', async ({ page }) => {
    await page.goto('/ws-default-synapse/notes/note-welcome');

    // Wait for the note editor header to load
    await expect(page.locator('input[placeholder="Untitled Note"]')).toBeVisible();

    // The Sync Google Doc button should be visible in note header
    const syncBtn = page.locator('button[title="Link to Google Docs"]');
    await expect(syncBtn).toBeVisible();

    // Click to open the modal
    await syncBtn.click();

    // Modal should appear
    const modalHeader = page.locator('text=Google Docs Sync');
    await expect(modalHeader).toBeVisible();

    // Close modal
    const closeBtn = page.locator('button:has(svg.lucide-x)');
    await closeBtn.click();

    await expect(modalHeader).not.toBeVisible();
  });
});
