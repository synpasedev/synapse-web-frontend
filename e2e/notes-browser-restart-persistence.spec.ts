import { test, expect, chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Note CRUD & Cross-Session Browser Persistence', () => {
  const profileDir = path.resolve(process.cwd(), 'test-results', 'browser-persistent-profile');
  const timestamp = Date.now();
  const noteTitle = `Persistent Note Test ${timestamp}`;
  const updatedNoteTitle = `Persistent Note Test ${timestamp} [UPDATED]`;
  const initialContent = `Session 1 content: testing local-first Dexie persistence before closing browser. Timestamp: ${timestamp}`;
  const updatedContent = `Session 2 content: appended after full browser shutdown and reopen. Persistence verified!`;

  test('Creates note, closes browser, reopens browser, verifies persistence, updates note, re-verifies', async () => {
    test.setTimeout(90000);

    // Clean up existing profile dir if present
    if (fs.existsSync(profileDir)) {
      fs.rmSync(profileDir, { recursive: true, force: true });
    }
    fs.mkdirSync(profileDir, { recursive: true });

    let createdNoteUrl = '';

    // ==========================================
    // PHASE 1: Launch Browser, Create & Edit Note
    // ==========================================
    console.log('[Phase 1] Launching browser session 1...');
    let context = await chromium.launchPersistentContext(profileDir, {
      headless: true,
      viewport: { width: 1280, height: 800 },
    });
    let page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    console.log('[Phase 1] Navigating to Synapse notes...');
    await page.goto('http://localhost:3000/ws-default-synapse/notes');
    await expect(page.locator('text=Notes Library').or(page.locator('text=Welcome to'))).toBeVisible({ timeout: 15000 });

    // Click "Create Note" button
    const createBtn = page.getByRole('button', { name: 'Create Note' }).first();
    await expect(createBtn).toBeVisible({ timeout: 15000 });
    await expect(createBtn).toBeEnabled({ timeout: 10000 });
    await page.waitForTimeout(500); // allow hydration listeners to bind
    await createBtn.click();

    // Wait for note page navigation
    await page.waitForURL(/\/notes\/[a-zA-Z0-9_-]+/, { timeout: 30000 });
    createdNoteUrl = page.url();
    console.log(`[Phase 1] Note created at URL: ${createdNoteUrl}`);

    // Update note title
    const titleInput = page.locator('input[placeholder="Untitled Note"]');
    await expect(titleInput).toBeVisible({ timeout: 15000 });
    await titleInput.click();
    await titleInput.fill(noteTitle);
    await titleInput.blur();
    await page.waitForTimeout(500);

    // Update note content in TipTap editor
    const editor = page.locator('.ProseMirror');
    await expect(editor).toBeVisible({ timeout: 10000 });
    await editor.click();
    await editor.fill(initialContent);

    // Wait for auto-save debounce to flush to IndexedDB
    await page.waitForTimeout(1200);

    // Take Phase 1 screenshot
    await page.screenshot({ path: path.join('test-results', 'phase1-created-note.png') });
    console.log('[Phase 1] Note created and auto-saved. Closing browser session 1...');

    // Close browser completely
    await context.close();
    console.log('[Phase 1] Browser context closed successfully.');

    // Wait a brief moment to ensure all OS file locks / IndexedDB leveldb files are released
    await new Promise((r) => setTimeout(r, 1500));

    // ==========================================
    // PHASE 2: Reopen Browser, Verify Persistence
    // ==========================================
    console.log('[Phase 2] Reopening browser with the SAME profile...');
    context = await chromium.launchPersistentContext(profileDir, {
      headless: true,
      viewport: { width: 1280, height: 800 },
    });
    page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    console.log(`[Phase 2] Navigating back to created note: ${createdNoteUrl}`);
    await page.goto(createdNoteUrl);

    // Verify persisted title
    const reopenedTitleInput = page.locator('input[placeholder="Untitled Note"]');
    await expect(reopenedTitleInput).toBeVisible({ timeout: 20000 });
    await expect(reopenedTitleInput).toHaveValue(noteTitle);
    console.log(`[Phase 2] Title persistence verified: "${noteTitle}"`);

    // Verify persisted body content
    const reopenedEditor = page.locator('.ProseMirror');
    await expect(reopenedEditor).toBeVisible({ timeout: 10000 });
    await expect(reopenedEditor).toContainText(initialContent);
    console.log('[Phase 2] Body content persistence verified!');

    // Take Phase 2 screenshot
    await page.screenshot({ path: path.join('test-results', 'phase2-reopened-verified.png') });

    // ==========================================
    // PHASE 3: Update Note in Session 2
    // ==========================================
    console.log('[Phase 3] Updating note in session 2...');
    await reopenedTitleInput.click();
    await reopenedTitleInput.fill(updatedNoteTitle);
    await reopenedTitleInput.blur();
    await page.waitForTimeout(500);

    await reopenedEditor.click();
    await reopenedEditor.press('End');
    await reopenedEditor.type(`\n\n${updatedContent}`);
    await page.waitForTimeout(1200);

    await page.screenshot({ path: path.join('test-results', 'phase3-updated-note.png') });
    console.log('[Phase 3] Note updated. Closing browser session 2...');

    // Close browser completely again
    await context.close();
    console.log('[Phase 3] Browser session 2 closed.');

    await new Promise((r) => setTimeout(r, 1500));

    // ==========================================
    // PHASE 4: Reopen Browser 3rd time, Verify Updates
    // ==========================================
    console.log('[Phase 4] Reopening browser session 3 to verify updated data persistence...');
    context = await chromium.launchPersistentContext(profileDir, {
      headless: true,
      viewport: { width: 1280, height: 800 },
    });
    page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    await page.goto(createdNoteUrl);

    const finalTitleInput = page.locator('input[placeholder="Untitled Note"]');
    await expect(finalTitleInput).toBeVisible({ timeout: 20000 });
    await expect(finalTitleInput).toHaveValue(updatedNoteTitle);

    const finalEditor = page.locator('.ProseMirror');
    await expect(finalEditor).toBeVisible({ timeout: 10000 });
    await expect(finalEditor).toContainText(initialContent);
    await expect(finalEditor).toContainText(updatedContent);

    // Also verify note appears in the sidebar
    const sidebarLink = page.locator(`aside a:has-text("${updatedNoteTitle}")`).first();
    await expect(sidebarLink).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: path.join('test-results', 'phase4-final-persistence-verified.png') });
    console.log('[Phase 4] ALL PERSISTENCE VERIFICATIONS PASSED ACROSS BROWSER RESTARTS!');

    await context.close();
  });
});
