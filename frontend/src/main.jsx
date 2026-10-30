import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/routes/App'
import { setupFetchInterceptor } from '@/lib/auth'
import './index.css'

setupFetchInterceptor()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)