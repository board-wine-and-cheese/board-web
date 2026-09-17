import { jsx, jsxs } from "react/jsx-runtime";
import { useRef, useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
const pdfWorker = "/assets/pdf.worker.min-qwK7q_zL.mjs";
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;
function MenuPdfViewer({ file }) {
  const viewerRef = useRef(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageWidth, setPageWidth] = useState(0);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return void 0;
    const updateWidth = () => {
      const horizontalPadding = window.innerWidth < 640 ? 16 : 32;
      setPageWidth(Math.max(0, viewer.clientWidth - horizontalPadding));
    };
    updateWidth();
    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(viewer);
    return () => resizeObserver.disconnect();
  }, []);
  return /* @__PURE__ */ jsx("div", { ref: viewerRef, className: "min-h-0 flex-1 overflow-y-auto bg-stone-200", children: /* @__PURE__ */ jsx(
    Document,
    {
      file,
      onLoadSuccess: ({ numPages }) => {
        setPageCount(numPages);
        setLoadError("");
      },
      onLoadError: (error) => {
        console.error("Unable to load menu PDF:", error);
        setLoadError((error == null ? void 0 : error.message) || String(error));
      },
      loading: /* @__PURE__ */ jsx("div", { className: "flex min-h-full items-center justify-center p-8 text-stone-600", children: "Loading menu…" }),
      error: /* @__PURE__ */ jsxs("div", { className: "flex min-h-full flex-col items-center justify-center gap-4 p-8 text-center text-stone-700", children: [
        /* @__PURE__ */ jsx("p", { children: "We could not display the menu in this window." }),
        loadError && /* @__PURE__ */ jsx("p", { className: "max-w-2xl break-words text-xs text-stone-500", children: loadError }),
        /* @__PURE__ */ jsx("a", { href: file, target: "_blank", rel: "noopener noreferrer", className: "rounded-full bg-stone-900 px-5 py-2.5 text-sm text-white hover:bg-stone-700", children: "Open PDF" })
      ] }),
      className: "flex flex-col items-center gap-4 p-2 sm:p-4",
      children: pageWidth > 0 && Array.from({ length: pageCount }, (_, index) => /* @__PURE__ */ jsx(
        Page,
        {
          pageNumber: index + 1,
          width: pageWidth,
          renderTextLayer: false,
          renderAnnotationLayer: false,
          className: "overflow-hidden bg-white shadow-md",
          loading: /* @__PURE__ */ jsxs("div", { className: "flex min-h-64 items-center justify-center bg-white text-sm text-stone-500", children: [
            "Loading page ",
            index + 1,
            "…"
          ] })
        },
        `menu-page-${index + 1}`
      ))
    }
  ) });
}
export {
  MenuPdfViewer as default
};
