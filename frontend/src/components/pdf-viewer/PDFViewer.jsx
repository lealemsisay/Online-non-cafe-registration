import React from 'react'

const PDFViewer = ({ src, loading, error, onDownload }) => {
  return (
    <div className="relative group">
      {loading ? (
        <div className="h-64 bg-dillaGray rounded-lg animate-pulse flex items-center justify-center text-gray-400">
          Loading PDF...
        </div>
      ) : error ? (
        <div className="h-64 bg-dillaGray rounded-lg flex items-center justify-center text-red-500">
          <p className="text-center">Failed to load PDF</p>
          <button
            onClick={onDownload}
            className="mt-2 bg-dillaGold text-dillaNavy px-4 py-2 rounded"
          >
            Retry Download
          </button>
        </div>
      ) : (
        <iframe
          src={src}
          className="w-full h-64 rounded-lg border border-gray-200"
          onError={onError => setError(true)}
        />
      )}
    </div>
  )
}

PDFViewer.displayName = 'PDFViewer'

export { PDFViewer }
export default PDFViewer