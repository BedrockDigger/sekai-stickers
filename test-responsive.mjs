import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { join } from 'path';

const SCREENSHOTS_DIR = join(process.cwd(), 'screenshots');
mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const VIEWPORTS = [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 812 },
];

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const browser = await chromium.launch({ headless: true });

  for (const vp of VIEWPORTS) {
    console.log(`\n========== Testing ${vp.name} (${vp.width}x${vp.height}) ==========`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 15000 });
    } catch (e) {
      console.log(`Failed to load page: ${e.message}`);
      await context.close();
      continue;
    }

    await delay(2000);

    // 1. Initial page screenshot
    await page.screenshot({
      path: join(SCREENSHOTS_DIR, `${vp.name}-01-initial.png`),
      fullPage: true,
    });
    console.log(`  [1] Initial page screenshot saved`);

    // 2. Log page title and any console errors
    const title = await page.title();
    console.log(`  Page title: "${title}"`);

    // 3. Check for overflow issues
    const overflowInfo = await page.evaluate(() => {
      const body = document.body;
      const html = document.documentElement;
      return {
        bodyScrollWidth: body.scrollWidth,
        bodyClientWidth: body.clientWidth,
        htmlScrollWidth: html.scrollWidth,
        htmlClientWidth: html.clientWidth,
        hasHorizontalOverflow: body.scrollWidth > body.clientWidth || html.scrollWidth > html.clientWidth,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      };
    });
    console.log(`  Overflow check:`, JSON.stringify(overflowInfo));

    // 4. Check all interactive elements
    const elements = await page.evaluate(() => {
      const results = [];
      // Check buttons
      const buttons = document.querySelectorAll('button');
      buttons.forEach((btn, i) => {
        const rect = btn.getBoundingClientRect();
        results.push({
          type: 'button',
          index: i,
          text: btn.textContent?.trim().substring(0, 50),
          visible: rect.width > 0 && rect.height > 0,
          x: rect.x, y: rect.y, w: rect.width, h: rect.height,
          offscreen: rect.right > window.innerWidth || rect.x < 0 || rect.bottom > document.documentElement.scrollHeight,
          tooSmall: rect.width < 44 || rect.height < 44, // Minimum touch target
        });
      });
      // Check inputs
      const inputs = document.querySelectorAll('input, textarea, select');
      inputs.forEach((inp, i) => {
        const rect = inp.getBoundingClientRect();
        results.push({
          type: inp.tagName.toLowerCase(),
          index: i,
          placeholder: inp.placeholder || '',
          visible: rect.width > 0 && rect.height > 0,
          x: rect.x, y: rect.y, w: rect.width, h: rect.height,
          offscreen: rect.right > window.innerWidth || rect.x < 0,
        });
      });
      // Check sliders
      const sliders = document.querySelectorAll('input[type="range"], .MuiSlider-root');
      sliders.forEach((slider, i) => {
        const rect = slider.getBoundingClientRect();
        results.push({
          type: 'slider',
          index: i,
          visible: rect.width > 0 && rect.height > 0,
          x: rect.x, y: rect.y, w: rect.width, h: rect.height,
          tooNarrow: rect.width < 100,
        });
      });
      return results;
    });
    console.log(`  Found ${elements.length} interactive elements:`);
    elements.forEach(el => {
      const issues = [];
      if (el.offscreen) issues.push('OFFSCREEN');
      if (el.tooSmall) issues.push('TOO_SMALL');
      if (el.tooNarrow) issues.push('TOO_NARROW');
      if (!el.visible) issues.push('INVISIBLE');
      const issueStr = issues.length > 0 ? ` ⚠️ ${issues.join(', ')}` : '';
      console.log(`    ${el.type}[${el.index}]: ${el.text || el.placeholder || ''} (${Math.round(el.x)},${Math.round(el.y)} ${Math.round(el.w)}x${Math.round(el.h)})${issueStr}`);
    });

    // 5. Check text truncation/overlap
    const textIssues = await page.evaluate(() => {
      const issues = [];
      const allText = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, label, a');
      allText.forEach(el => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        if (rect.width > 0 && el.scrollWidth > rect.width + 2 && style.overflow !== 'hidden' && style.textOverflow !== 'ellipsis') {
          issues.push({
            tag: el.tagName,
            text: el.textContent?.trim().substring(0, 40),
            scrollWidth: el.scrollWidth,
            clientWidth: Math.round(rect.width),
          });
        }
      });
      return issues;
    });
    if (textIssues.length > 0) {
      console.log(`  Text overflow issues:`);
      textIssues.forEach(i => console.log(`    ${i.tag}: "${i.text}" (scroll:${i.scrollWidth} > client:${i.clientWidth})`));
    }

    // 6. Try to find and click the character picker button
    console.log(`\n  --- Interaction Tests ---`);
    
    // Look for FAB / character picker button (usually bottom-right)
    const fabButton = await page.$('.MuiFab-root, button[aria-label*="character"], button[aria-label*="sticker"]');
    if (fabButton) {
      console.log('  Found FAB/character picker button');
      await fabButton.click();
      await delay(1500);
      await page.screenshot({
        path: join(SCREENSHOTS_DIR, `${vp.name}-02-character-picker.png`),
        fullPage: true,
      });
      console.log('  [2] Character picker screenshot saved');

      // Check if dialog/drawer opened
      const dialogInfo = await page.evaluate(() => {
        const dialog = document.querySelector('.MuiDialog-root, .MuiDrawer-root, .MuiModal-root, .MuiPopover-root');
        if (dialog) {
          const rect = dialog.getBoundingClientRect();
          return { found: true, x: rect.x, y: rect.y, w: rect.width, h: rect.height };
        }
        return { found: false };
      });
      console.log(`  Dialog/modal info:`, JSON.stringify(dialogInfo));

      // If dialog opened, check its content
      if (dialogInfo.found) {
        const dialogContent = await page.evaluate(() => {
          const dialog = document.querySelector('.MuiDialog-root, .MuiDrawer-root, .MuiModal-root');
          if (!dialog) return {};
          const imgs = dialog.querySelectorAll('img');
          const buttons = dialog.querySelectorAll('button');
          const rect = dialog.getBoundingClientRect();
          return {
            imgCount: imgs.length,
            buttonCount: buttons.length,
            overflowsViewport: rect.width > window.innerWidth || rect.height > window.innerHeight,
            width: rect.width,
            height: rect.height,
          };
        });
        console.log(`  Dialog content:`, JSON.stringify(dialogContent));

        // Try to select a sticker if images exist
        const firstImg = await page.$('.MuiDialog-root img, .MuiDrawer-root img, .MuiModal-root img, .MuiPopover-root img');
        if (firstImg) {
          await firstImg.click();
          await delay(1000);
          console.log('  Clicked first sticker image');
        }

        // Close dialog - press Escape
        await page.keyboard.press('Escape');
        await delay(500);
      }
    } else {
      console.log('  ⚠️ No FAB/character picker button found');
      // Try other button selectors
      const allButtons = await page.$$('button');
      console.log(`  Total buttons on page: ${allButtons.length}`);
      for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
        const text = await allButtons[i].textContent();
        const ariaLabel = await allButtons[i].getAttribute('aria-label');
        console.log(`    Button ${i}: text="${text?.trim()}", aria-label="${ariaLabel}"`);
      }
      
      // Try clicking the last button (often the FAB is at the end of DOM)
      if (allButtons.length > 0) {
        const lastBtn = allButtons[allButtons.length - 1];
        await lastBtn.click();
        await delay(1500);
        await page.screenshot({
          path: join(SCREENSHOTS_DIR, `${vp.name}-02-button-click.png`),
          fullPage: true,
        });
        console.log('  [2] Button click result screenshot saved');
      }
    }

    // 7. Try to find and interact with text input
    const textInput = await page.$('input[type="text"], textarea');
    if (textInput) {
      await textInput.click();
      await textInput.fill('');
      await textInput.type('Test sticker text 🎉');
      await delay(500);
      await page.screenshot({
        path: join(SCREENSHOTS_DIR, `${vp.name}-03-text-input.png`),
        fullPage: true,
      });
      console.log('  [3] Text input screenshot saved');
    } else {
      console.log('  ⚠️ No text input found');
    }

    // 8. Try to find and interact with sliders
    const sliders = await page.$$('.MuiSlider-root');
    if (sliders.length > 0) {
      console.log(`  Found ${sliders.length} sliders`);
      for (let i = 0; i < sliders.length; i++) {
        const sliderBox = await sliders[i].boundingBox();
        if (sliderBox) {
          // Click at 75% of slider
          await page.mouse.click(
            sliderBox.x + sliderBox.width * 0.75,
            sliderBox.y + sliderBox.height / 2
          );
          await delay(300);
        }
      }
      await page.screenshot({
        path: join(SCREENSHOTS_DIR, `${vp.name}-04-sliders-adjusted.png`),
        fullPage: true,
      });
      console.log('  [4] Sliders adjusted screenshot saved');
    } else {
      console.log('  ⚠️ No MUI sliders found');
    }

    // 9. Check for canvas element
    const canvas = await page.$('canvas');
    if (canvas) {
      const canvasBox = await canvas.boundingBox();
      console.log(`  Canvas found: ${JSON.stringify(canvasBox)}`);
      if (canvasBox) {
        const canvasIssues = [];
        if (canvasBox.width > vp.width) canvasIssues.push('Canvas wider than viewport');
        if (canvasBox.x < 0) canvasIssues.push('Canvas starts offscreen left');
        if (canvasBox.x + canvasBox.width > vp.width) canvasIssues.push('Canvas extends beyond right edge');
        if (canvasIssues.length > 0) {
          console.log(`  ⚠️ Canvas issues: ${canvasIssues.join(', ')}`);
        }
      }
    } else {
      console.log('  ⚠️ No canvas element found');
    }

    // 10. Check z-index and overlapping elements
    const overlapIssues = await page.evaluate(() => {
      const issues = [];
      const interactiveEls = document.querySelectorAll('button, input, select, textarea, a, [role="button"]');
      const rects = [];
      interactiveEls.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          rects.push({
            tag: el.tagName,
            text: el.textContent?.trim().substring(0, 20),
            x: rect.x, y: rect.y, w: rect.width, h: rect.height,
            right: rect.right, bottom: rect.bottom,
          });
        }
      });
      // Check for overlaps
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i], b = rects[j];
          if (a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y) {
            issues.push(`${a.tag}("${a.text}") overlaps ${b.tag}("${b.text}")`);
          }
        }
      }
      return issues.slice(0, 10); // Limit to first 10
    });
    if (overlapIssues.length > 0) {
      console.log(`  ⚠️ Overlapping interactive elements:`);
      overlapIssues.forEach(i => console.log(`    ${i}`));
    }

    // 11. Scroll down and take a full page screenshot
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await delay(500);
    await page.screenshot({
      path: join(SCREENSHOTS_DIR, `${vp.name}-05-scrolled-bottom.png`),
      fullPage: false,
    });
    console.log('  [5] Scrolled bottom screenshot saved');

    // 12. Check spacing and padding
    const spacingIssues = await page.evaluate(() => {
      const issues = [];
      // Check if main content has proper padding on small screens
      const containers = document.querySelectorAll('.MuiContainer-root, .MuiBox-root, .MuiPaper-root, main, [class*="container"]');
      containers.forEach(el => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        if (rect.width > 0) {
          // Check if element touches viewport edges (no padding)
          if (rect.x === 0 && parseFloat(style.paddingLeft) === 0 && rect.width >= window.innerWidth * 0.9) {
            issues.push(`${el.tagName}.${el.className.split(' ')[0]} has no left padding and spans viewport`);
          }
          // Check if element overflows viewport
          if (rect.right > window.innerWidth + 5) {
            issues.push(`${el.tagName}.${el.className.split(' ')[0]} overflows viewport (right: ${Math.round(rect.right)}, viewport: ${window.innerWidth})`);
          }
        }
      });
      return issues.slice(0, 10);
    });
    if (spacingIssues.length > 0) {
      console.log(`  ⚠️ Spacing issues:`);
      spacingIssues.forEach(i => console.log(`    ${i}`));
    }

    // 13. Check color contrast (basic)
    const contrastIssues = await page.evaluate(() => {
      const issues = [];
      const textEls = document.querySelectorAll('p, span, label, h1, h2, h3, h4, h5, h6, button, a');
      textEls.forEach(el => {
        const style = window.getComputedStyle(el);
        const fontSize = parseFloat(style.fontSize);
        if (fontSize < 12 && el.textContent?.trim().length > 0) {
          issues.push(`${el.tagName}: "${el.textContent.trim().substring(0, 30)}" has small font size: ${fontSize}px`);
        }
      });
      return issues.slice(0, 10);
    });
    if (contrastIssues.length > 0) {
      console.log(`  ⚠️ Typography issues:`);
      contrastIssues.forEach(i => console.log(`    ${i}`));
    }

    await context.close();
  }

  // Additional test: very narrow viewport (320px)
  console.log(`\n========== Testing extreme-narrow (320x568) ==========`);
  const narrowCtx = await browser.newContext({
    viewport: { width: 320, height: 568 },
  });
  const narrowPage = await narrowCtx.newPage();
  try {
    await narrowPage.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 15000 });
    await delay(2000);
    await narrowPage.screenshot({
      path: join(SCREENSHOTS_DIR, 'extreme-narrow-01-initial.png'),
      fullPage: true,
    });
    console.log('  [1] Extreme narrow screenshot saved');
    
    const narrowOverflow = await narrowPage.evaluate(() => ({
      hasHorizontalOverflow: document.body.scrollWidth > document.body.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      bodyClientWidth: document.body.clientWidth,
    }));
    console.log(`  Overflow:`, JSON.stringify(narrowOverflow));
  } catch (e) {
    console.log(`  Error: ${e.message}`);
  }
  await narrowCtx.close();

  await browser.close();
  console.log('\n========== All tests complete ==========');
  console.log(`Screenshots saved to: ${SCREENSHOTS_DIR}`);
}

run().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
