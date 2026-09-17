import { test, expect } from '@playwright/test';

test.describe('Notes Adding, Updating, and Persistence Tests', () => {
  const testTitle = `Test Note ${Date.now()}`;
  const updatedTitle = `${testTitle} - Updated`;
  const noteBodyText = 'Local-first persistent note test content with Playwright.';
  const additionalBodyText = ' Added additional paragraphs to verify persistence.';

  test('Create a note, edit title and content, and verify persistence after reload', async ({ page }) => {
    // 1. Navigate to notes list page
    await page.goto('/ws-default-synapse/notes');
    await expect(page.locator('text=Notes Library').or(page.locator('text=Welcome to'))).toBeVisible({ timeout: 10000 });

    // 2. Click "Create Note" button
    const createBtn = page.getByRole('button', { name: 'Create Note' }).first();
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click();

    // 3. Wait for navigation to note detail page and note detail page to load
    await page.waitForURL(/\/notes\/[a-zA-Z0-9_-]+/, { timeout: 30000 });
    const titleInput = page.locator('input[placeholder="Untitled Note"]');
    await expect(titleInput).toBeVisible({ timeout: 20000 });

    // 4. Update the note title
    await titleInput.click();
    await titleInput.fill(testTitle);
    await titleInput.blur(); // triggers handleTitleBlur immediately
    await page.waitForTimeout(500); // allow indexedDB flush

    // 5. Add content in the TipTap editor
    const editor = page.locator('.ProseMirror');
    await expect(editor).toBeVisible();
    await editor.click();
    await editor.fill(noteBodyText);
    await page.waitForTimeout(600); // wait for 150ms debounce and IndexedDB commit

    // 6. Verify note appears in sidebar
    const sidebarLink = page.locator(`aside a:has-text("${testTitle}")`).first();
    await expect(sidebarLink).toBeVisible();

    // 7. Reload page (simulate closing and reopening page / checking persistence)
    await page.reload();

    // 8. Verify data persisted after reload
    await expect(titleInput).toBeVisible({ timeout: 10000 });
    await expect(titleInput).toHaveValue(testTitle);
    await expect(editor).toContainText(noteBodyText);

    // 9. Update title and append additional content
    await titleInput.click();
    await titleInput.fill(updatedTitle);
    await titleInput.blur();

    await editor.click();
    await editor.press('End');
    await editor.type(additionalBodyText);
    await page.waitForTimeout(600);

    // 10. Reload again to verify persistence of updates
    await page.reload();
    await expect(titleInput).toBeVisible({ timeout: 10000 });
    await expect(titleInput).toHaveValue(updatedTitle);
    await expect(editor).toContainText(noteBodyText);
    await expect(editor).toContainText(additionalBodyText);
  });
});
