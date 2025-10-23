import { GlobalWorkerOptions } from 'pdfjs-dist';

// Configure pdfjs worker for Vite bundling
try {
  GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).toString();
} catch {}

export {};