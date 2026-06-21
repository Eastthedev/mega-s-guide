import { NextRequest } from 'next/server';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import fs from 'fs';

// Resolve path to the worker using import.meta.url so Next.js static tracing packages it
const absoluteWorkerPath = fileURLToPath(
  new URL(
    '../../../../node_modules/pdf-parse/dist/pdf-parse/esm/pdf.worker.mjs',
    import.meta.url
  )
);

let workerSrc: string;
try {
  // Read the worker code and encode it as a data URL so ESM loader resolves it in serverless/lambdas
  const workerCode = fs.readFileSync(absoluteWorkerPath, 'utf8');
  workerSrc = `data:text/javascript;base64,${Buffer.from(workerCode).toString('base64')}`;
} catch (err) {
  console.warn("Local worker read failed, falling back to file:// path:", err);
  workerSrc = pathToFileURL(absoluteWorkerPath).toString();
}

PDFParse.setWorker(workerSrc);

// Helper to parse PPTX using JSZip
async function parsePptx(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles: { name: string; file: any }[] = [];
  
  zip.forEach((relativePath, file) => {
    if (relativePath.startsWith('ppt/slides/slide') && relativePath.endsWith('.xml')) {
      slideFiles.push({ name: relativePath, file });
    }
  });
  
  // Sort slides numerically (slide1.xml, slide2.xml, slide10.xml...)
  slideFiles.sort((a, b) => {
    const numA = parseInt(a.name.match(/\d+/)?.[0] || '0', 10);
    const numB = parseInt(b.name.match(/\d+/)?.[0] || '0', 10);
    return numA - numB;
  });
  
  let fullText = '';
  for (const slide of slideFiles) {
    const content = await slide.file.async('text');
    
    // Extract text from <a:t> XML tags (PowerPoint text run elements)
    const textMatches = content.match(/<a:t>(.*?)<\/a:t>/g);
    if (textMatches) {
      const slideText = textMatches
        .map((m: string) => {
          // Remove XML tags
          const textOnly = m.replace(/<a:t>|<\/a:t>/g, '');
          // Decode basic XML entities
          return textOnly
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'");
        })
        .join(' ');
      
      const slideNum = slide.name.match(/\d+/)?.[0] || '0';
      fullText += `[Slide ${slideNum}]\n${slideText}\n\n`;
    }
  }
  
  return fullText.trim();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { base64Data, filename, mimeType } = body;

    if (!base64Data) {
      return Response.json({ error: 'Missing file data' }, { status: 400 });
    }

    const buffer = Buffer.from(base64Data, 'base64');
    let parsedText = '';
    const fileMime = mimeType || '';
    const fileExtension = filename ? filename.split('.').pop()?.toLowerCase() : '';

    if (fileMime === 'application/pdf' || fileExtension === 'pdf') {
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const result = await parser.getText();
      parsedText = result.text;
    } else if (
      fileMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      fileExtension === 'docx'
    ) {
      const result = await mammoth.extractRawText({ buffer });
      parsedText = result.value;
    } else if (
      fileMime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || 
      fileExtension === 'pptx'
    ) {
      parsedText = await parsePptx(buffer);
    } else if (
      fileMime.startsWith('text/') || 
      fileExtension === 'txt' || 
      fileExtension === 'md'
    ) {
      parsedText = buffer.toString('utf-8');
    } else {
      // Fallback: try parsing docx/pptx/pdf by extension anyway, or throw error
      return Response.json({ 
        error: `Unsupported file type: ${filename || mimeType}. Please upload a PDF, Word (.docx), PowerPoint (.pptx), or text file.` 
      }, { status: 400 });
    }

    if (!parsedText || parsedText.trim() === '') {
      return Response.json({ 
        error: 'The document was read successfully, but no readable text content could be extracted.' 
      }, { status: 422 });
    }

    return Response.json({ text: parsedText });
  } catch (err: any) {
    console.error('Document parsing error:', err);
    return Response.json({ 
      error: `Failed to parse document: ${err.message || 'Unknown parsing error'}` 
    }, { status: 500 });
  }
}
