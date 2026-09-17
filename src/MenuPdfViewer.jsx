import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function MenuPdfViewer({ file }) {
  const viewerRef = useRef(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageWidth, setPageWidth] = useState(0);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return undefined;

    const updateWidth = () => {
      const horizontalPadding = window.innerWidth < 640 ? 16 : 32;
      setPageWidth(Math.max(0, viewer.clientWidth - horizontalPadding));
    };

    updateWidth();
    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(viewer);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div ref={viewerRef} className="min-h-0 flex-1 overflow-y-auto bg-stone-200">
      <Document
        file={file}
        onLoadSuccess={({ numPages }) => {
          setPageCount(numPages);
          setLoadError('');
        }}
        onLoadError={(error) => {
          console.error('Unable to load menu PDF:', error);
          setLoadError(error?.message || String(error));
        }}
        loading={<div className="flex min-h-full items-center justify-center p-8 text-stone-600">Loading menu…</div>}
        error={(
          <div className="flex min-h-full flex-col items-center justify-center gap-4 p-8 text-center text-stone-700">
            <p>We could not display the menu in this window.</p>
            {loadError && <p className="max-w-2xl break-words text-xs text-stone-500">{loadError}</p>}
            <a href={file} target="_blank" rel="noopener noreferrer" className="rounded-full bg-stone-900 px-5 py-2.5 text-sm text-white hover:bg-stone-700">Open PDF</a>
          </div>
        )}
        className="flex flex-col items-center gap-4 p-2 sm:p-4"
      >
        {pageWidth > 0 && Array.from({ length: pageCount }, (_, index) => (
          <Page
            key={`menu-page-${index + 1}`}
            pageNumber={index + 1}
            width={pageWidth}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="overflow-hidden bg-white shadow-md"
            loading={<div className="flex min-h-64 items-center justify-center bg-white text-sm text-stone-500">Loading page {index + 1}…</div>}
          />
        ))}
      </Document>
    </div>
  );
}
