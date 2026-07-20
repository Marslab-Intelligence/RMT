import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generatePDF() {
  console.log('🚀 Starting PDF generation...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    const htmlPath = path.join(__dirname, 'rmt-walkthrough.html');
    const fileUrl = `file://${htmlPath}`;

    console.log(`Loading page: ${fileUrl}`);
    await page.goto(fileUrl, { waitUntil: 'networkidle0' });

    // Wait for Mermaid diagrams to render. Mermaid renders SVG elements inside the .mermaid containers.
    console.log('Waiting for Mermaid diagrams to render...');
    await page.waitForFunction(() => {
      const el = document.querySelector('.mermaid svg');
      return el !== null;
    }, { timeout: 10000 });

    // Add a tiny extra delay to make sure everything settles down
    await new Promise(resolve => setTimeout(resolve, 2000));

    const pdfPath = path.join(__dirname, 'rmt-walkthrough.pdf');
    console.log(`Generating PDF at: ${pdfPath}`);

    await page.pdf({
      path: pdfPath,
      format: 'A4',
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div style="font-size: 8px; color: #94a3b8; width: 100%; text-align: right; padding-right: 20px; font-family: sans-serif;">RMT Walkthrough & Architecture Documentation</div>',
      footerTemplate: '<div style="font-size: 8px; color: #94a3b8; width: 100%; display: flex; justify-content: space-between; padding: 0 20px; font-family: sans-serif;"><span>MarsLab Internal Use Only</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>'
    });

    console.log('✅ PDF successfully generated!');
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
  } finally {
    await browser.close();
  }
}

generatePDF();
