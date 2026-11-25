import React, { useState, useEffect, useRef } from 'react'
import Icon from '@/components/icons/Icon'

const PDFViewer = ({ src, loading, error: externalError, onDownload, filename = 'document.pdf' }) => {
  const [internalError, setInternalError] = useState(false)
  const [blobUrl, setBlobUrl] = useState(null)
  const [fetching, setFetching] = useState(false)
  const prevBlobUrl = useRef(null)

  // When `src` changes, fetch the PDF with the Authorization header and create a Blob URL.
  // This is required because <iframe src> cannot send custom headers, so a protected
  // endpoint would return 401 if we used the raw URL directly.
  useEffect(() => {
    // Reset state when src changes
    setBlobUrl(null)
    setInternalError(false)

    if (!src) return

    // Revoke the previous blob URL to avoid memory leaks
    if (prevBlobUrl.current) {
      URL.revokeObjectURL(prevBlobUrl.current)
      prevBlobUrl.current = null
    }

    setFetching(true)
    const token = localStorage.getItem('token')

    fetch(src, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.blob()
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        prevBlobUrl.current = url
        setBlobUrl(url)
      })
      .catch((err) => {
        console.error('PDFViewer fetch error:', err)
        setInternalError(true)
      })
      .finally(() => {
        setFetching(false)
      })
  }, [src])

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (prevBlobUrl.current) {
        URL.revokeObjectURL(prevBlobUrl.current)
      }
    }
  }, [])

  const isLoading = loading || fetching
  const isError = externalError || internalError

  return (
    <div className="relative group rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
      {isLoading ? (
        <div className="h-72 bg-slate-50 flex flex-col items-center justify-center text-slate-500 gap-2">
          <div className="w-8 h-8 border-3 border-dillaGreen border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold">Loading official document...</span>
        </div>
      ) : isError ? (
        <div className="h-72 bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
          <Icon name="alert-circle" className="w-10 h-10 text-amber-600 mb-2" />
          <p className="text-sm font-bold text-slate-800">Preview not supported in this browser</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            You can still download or open the official PDF file directly.
          </p>
          <div className="mt-4 flex items-center gap-2">
            {src && (
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-dillaGreen hover:bg-dillaDarkGreen rounded-lg transition-colors shadow-2xs"
              >
                <Icon name="external-link" className="w-3.5 h-3.5" />
                Open PDF
              </a>
            )}
            {onDownload && (
              <button
                onClick={onDownload}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
              >
                <Icon name="download" className="w-3.5 h-3.5" />
                Download
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="relative flex flex-col">
          <div className="p-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span className="font-semibold text-dillaDarkGreen flex items-center gap-1.5">
              <Icon name="file-text" className="w-4 h-4 text-dillaGreen" />
              Document Preview
            </span>
            <div className="flex items-center gap-2">
              {src && (
                <a
                  href={blobUrl || src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-dillaGreen hover:text-dillaDarkGreen font-semibold hover:underline inline-flex items-center gap-1 text-[11px]"
                >
                  <Icon name="external-link" className="w-3 h-3" />
                  New Tab
                </a>
              )}
            </div>
          </div>
          <iframe
            src={blobUrl || src}
            title={filename}
            className="w-full h-80 sm:h-96 border-none bg-white"
            onError={() => setInternalError(true)}
          />
        </div>
      )}
    </div>
  )
}

PDFViewer.displayName = 'PDFViewer'

export { PDFViewer }
export default PDFViewer
