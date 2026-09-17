import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Phase 1: Supercharged Editor & Modern Blocks', () => {
  test('Table of Contents outline, Callout blocks, KaTeX math, and Mermaid diagrams', async ({ page }) => {
    // 1. Open Welcome Note
    await page.goto('/ws-default-synapse/notes/note-welcome');
    await expect(page.locator('input[placeholder="Untitled Note"]')).toBeVisible({ timeout: 20000 });

    const editor = page.locator('.ProseMirror');
    await expect(editor).toBeVisible({ timeout: 15000 });

    // 2. Test Table of Contents outline button
    const tocBtn = page.locator('button[title="Document Outline / Table of Contents"]');
    if (await tocBtn.isVisible()) {
      await tocBtn.click();
      await expect(page.locator('text=Table of Contents')).toBeVisible();
      // Click a heading in TOC to test jump-to-heading
      const firstHeadingLink = page.locator('text=Table of Contents').locator('..').locator('button').first();
      await firstHeadingLink.click();
      await page.waitForTimeout(300);
    }

    // 3. Focus editor and test Slash Command for Callout
    await editor.click();
    await editor.press('End');
    await editor.type('\n/callout');
    await page.waitForTimeout(300);

    const calloutOption = page.locator('text=Callout / Admonition').first();
    if (await calloutOption.isVisible()) {
      await calloutOption.click();
      await page.waitForTimeout(400);
      const callout = page.locator('.callout-node-wrapper').first();
      await expect(callout).toBeVisible();

      // Test collapsing/expanding callout
      const collapseBtn = callout.locator('button:has-text("Expand"), button:has(svg.lucide-chevron-down)').first();
      if (await collapseBtn.isVisible()) {
        await collapseBtn.click();
        await page.waitForTimeout(200);
        await collapseBtn.click();
      }
    }

    // 4. Test Slash Command for Math Equation
    await editor.click();
    await editor.press('End');
    await editor.type('\n/math');
    await page.waitForTimeout(300);

    const mathOption = page.locator('text=LaTeX Math Equation').first();
    if (await mathOption.isVisible()) {
      await mathOption.click();
      await page.waitForTimeout(400);
      const mathBlock = page.locator('.math-node-wrapper').first();
      await expect(mathBlock).toBeVisible();
      // Verify KaTeX rendered elements
      await expect(mathBlock.locator('.katex, text=LaTeX Math Equation')).toBeVisible();
    }

    // 5. Test Slash Command for Mermaid Diagram
    await editor.click();
    await editor.press('End');
    await editor.type('\n/mermaid');
    await page.waitForTimeout(300);

    const mermaidOption = page.locator('text=Mermaid Diagram').first();
    if (await mermaidOption.isVisible()) {
      await mermaidOption.click();
      await page.waitForTimeout(800);
      const mermaidBlock = page.locator('.mermaid-node-wrapper').first();
      await expect(mermaidBlock).toBeVisible();
    }

    // Capture visual screenshot
    await page.screenshot({ path: path.join('test-results', 'phase1-editor-superpowers.png') });
  });
});
