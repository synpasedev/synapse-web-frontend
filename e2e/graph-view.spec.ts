import { test, expect } from '@playwright/test';

interface RenderedNode {
  title: string;
  x: number;
  y: number;
  screenX: number;
  screenY: number;
  time: number;
}

test.describe('Knowledge Graph View - Comprehensive E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Collect browser console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`[Browser Console Error] ${msg.text()}`);
      }
    });

    // Inject coordinate tracer into CanvasRenderingContext2D for exact coordinate testing
    await page.addInitScript(() => {
      (window as any).__renderedNodes = new Map();
      const origFillText = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (text, x, y, ...args) {
        if (text && typeof text === 'string' && !text.includes('notes') && !text.includes('links')) {
          const transform = this.getTransform();
          const screenX = transform.a * x + transform.c * y + transform.e;
          const screenY = transform.b * x + transform.d * y + transform.f;
          (window as any).__renderedNodes.set(text, { x, y, screenX, screenY, time: Date.now() });
        }
        return origFillText.apply(this, [text, x, y, ...args]);
      };
    });

    // Navigate to the knowledge graph
    await page.goto('/ws-default-synapse/graph');
    await expect(page.locator('h1')).toContainText('Interactive Knowledge Graph');
  });

  test('Case 1: Initial Page and Canvas Rendering', async ({ page }) => {
    // 1. Verify Header and Subtitle
    await expect(page.locator('h1')).toHaveText('Interactive Knowledge Graph');
    await expect(page.locator('text=Visualizing connections and bidirectional links')).toBeVisible();

    // 2. Verify Canvas Element
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(300);
    expect(box!.height).toBeGreaterThan(300);

    // 3. Verify Graph Controls Toolbar
    await expect(page.locator('input[placeholder="Filter notes..."]')).toBeVisible();
    await expect(page.locator('text=/\\d+ notes/')).toBeVisible();
    await expect(page.locator('button[title="Zoom In"]')).toBeVisible();
    await expect(page.locator('button[title="Zoom Out"]')).toBeVisible();
    await expect(page.locator('button[title="Reset View"]')).toBeVisible();
  });

  test('Case 2: Search Filter & Node/Link Count Updates', async ({ page }) => {
    const filterInput = page.locator('input[placeholder="Filter notes..."]');

    // Filter for a specific note
    await filterInput.fill('Welcome');
    await page.waitForTimeout(500);

    const filteredStats = await page.locator('text=/\\d+ notes/').textContent();
    expect(filteredStats).toContain('1 notes');

    // Clear filter and verify restored count
    await filterInput.fill('');
    await page.waitForTimeout(500);

    const restoredStats = await page.locator('text=/\\d+ notes/').textContent();
    expect(restoredStats).not.toContain('1 notes');
  });

  test('Case 3: Zoom In, Zoom Out, and Reset Controls', async ({ page }) => {
    const canvas = page.locator('canvas');
    const zoomInBtn = page.locator('button[title="Zoom In"]');
    const zoomOutBtn = page.locator('button[title="Zoom Out"]');
    const resetBtn = page.locator('button[title="Reset View"]');

    // Execute zoom actions
    await zoomInBtn.click();
    await page.waitForTimeout(200);
    await zoomInBtn.click();
    await page.waitForTimeout(200);
    await zoomOutBtn.click();
    await page.waitForTimeout(200);
    await resetBtn.click();
    await page.waitForTimeout(200);

    // Canvas should remain intact and interactive
    await expect(canvas).toBeVisible();
  });

  test('Case 4: Node Hover Detection, Tooltip, and Pointer Cursor', async ({ page }) => {
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    // Allow simulation to settle
    await page.waitForTimeout(1500);

    // Get rendered node positions
    const nodes: RenderedNode[] = await page.evaluate(() => {
      const map = (window as any).__renderedNodes as Map<string, any>;
      if (!map) return [];
      return Array.from(map.entries()).map(([title, pos]) => ({ title, ...pos }));
    });
    expect(nodes.length).toBeGreaterThan(0);

    const targetNode = nodes[0];
    const dpr = await page.evaluate(() => window.devicePixelRatio || 1);
    const canvasCssX = targetNode.screenX / dpr;
    const canvasCssY = targetNode.screenY / dpr;

    // Hover directly over the node
    await page.mouse.move(box!.x + canvasCssX, box!.y + canvasCssY - 15);
    await page.waitForTimeout(500);

    // 1. Tooltip card should appear
    const tooltip = page.locator('text=Click to open');
    await expect(tooltip).toBeVisible();

    const tooltipCard = page.locator('.glass-dropdown');
    await expect(tooltipCard).toContainText(targetNode.title);
    await expect(tooltipCard).toContainText('links');

    // 2. Cursor should change to pointer
    const cursor = await canvas.evaluate((el) => el.style.cursor);
    expect(cursor).toBe('pointer');

    // 3. Move mouse away to empty canvas space
    await page.mouse.move(box!.x + 15, box!.y + 15);
    await page.waitForTimeout(400);

    // Tooltip should disappear and cursor should return to grab
    await expect(page.locator('text=Click to open')).not.toBeVisible();
    const cursorReset = await canvas.evaluate((el) => el.style.cursor);
    expect(cursorReset).toBe('grab');
  });

  test('Case 5: Simulation Stability on Hover (No Position Jumping)', async ({ page }) => {
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    await page.waitForTimeout(1500);

    const nodes: RenderedNode[] = await page.evaluate(() => {
      const map = (window as any).__renderedNodes as Map<string, any>;
      if (!map) return [];
      return Array.from(map.entries()).map(([title, pos]) => ({ title, ...pos }));
    });
    expect(nodes.length).toBeGreaterThan(0);

    const targetNode = nodes[0];
    const initialPos = { x: targetNode.x, y: targetNode.y };

    // Hover over node
    const dpr = await page.evaluate(() => window.devicePixelRatio || 1);
    await page.mouse.move(box!.x + targetNode.screenX / dpr, box!.y + targetNode.screenY / dpr - 15);
    await page.waitForTimeout(500);

    // Get position after hover
    const settledNode = await page.evaluate((title: string) => {
      return (window as any).__renderedNodes.get(title) as { x: number; y: number } | undefined;
    }, targetNode.title);

    expect(settledNode).toBeDefined();
    // Node must not jump or reset positions
    const drift = Math.hypot(settledNode!.x - initialPos.x, settledNode!.y - initialPos.y);
    expect(drift).toBeLessThan(5); // Stable position
  });

  test('Case 6: Node Click Event and Navigation to Note', async ({ page }) => {
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    await page.waitForTimeout(1500);

    const nodes: RenderedNode[] = await page.evaluate(() => {
      const map = (window as any).__renderedNodes as Map<string, any>;
      if (!map) return [];
      return Array.from(map.entries()).map(([title, pos]) => ({ title, ...pos }));
    });
    expect(nodes.length).toBeGreaterThan(0);

    const targetNode = nodes[0];
    const dpr = await page.evaluate(() => window.devicePixelRatio || 1);

    // Click on target node
    await page.mouse.click(box!.x + targetNode.screenX / dpr, box!.y + targetNode.screenY / dpr - 15);
    await page.waitForTimeout(1000);

    // Should navigate to note page
    expect(page.url()).toContain('/notes/');
  });
});
