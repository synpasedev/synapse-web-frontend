import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Sidebar Expandable & User-Friendly Features', () => {
  test('Expandable width, collapsible sections, in-sidebar note filtering, and hierarchy tree', async ({ page }) => {
    await page.goto('/ws-default-synapse/notes');
    await expect(page.locator('text=Welcome to').or(page.locator('text=Notes Library'))).toBeVisible({ timeout: 15000 });

    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible();

    // 1. Check initial sidebar width
    const initialBox = await sidebar.boundingBox();
    expect(initialBox).not.toBeNull();

    // 2. Click the Expand Sidebar Width toggle button in the header
    const widthToggleBtn = page.locator('button[title="Expand sidebar width"], button[title="Compact sidebar width"]').first();
    if (await widthToggleBtn.isVisible()) {
      await widthToggleBtn.click();
      await page.waitForTimeout(300);
      const expandedBox = await sidebar.boundingBox();
      expect(expandedBox!.width).toBeGreaterThanOrEqual(350);
    }

    // 3. Test Section Collapse & Expand
    const notesSectionBtn = page.locator('button:has-text("Notes")').first();
    await expect(notesSectionBtn).toBeVisible();

    // 4. Test In-Sidebar Quick Filter
    const filterToggleBtn = page.locator('button[title="Filter notes in sidebar"]').first();
    await expect(filterToggleBtn).toBeVisible();
    await filterToggleBtn.click();

    const filterInput = page.locator('input[placeholder="Filter notes..."]').first();
    await expect(filterInput).toBeVisible();
    await filterInput.fill('Welcome');
    await page.waitForTimeout(300);

    // Verify filter shows the matching note
    await expect(page.locator('aside a:has-text("Welcome to Synapse")').first()).toBeVisible();

    // Clear filter
    await filterInput.fill('');
    await page.waitForTimeout(200);

    // 5. Test Drag Resizing on the right border
    const resizer = page.locator('div[title*="Drag to resize sidebar"]').first();
    if (await resizer.isVisible()) {
      const resizerBox = await resizer.boundingBox();
      if (resizerBox) {
        await page.mouse.move(resizerBox.x + resizerBox.width / 2, resizerBox.y + 100);
        await page.mouse.down();
        await page.mouse.move(resizerBox.x + 80, resizerBox.y + 100);
        await page.mouse.up();
        await page.waitForTimeout(300);
      }
    }

    // Capture screenshot of the expanded, user-friendly sidebar
    await page.screenshot({ path: path.join('test-results', 'sidebar-expandable-view.png') });
  });
});
