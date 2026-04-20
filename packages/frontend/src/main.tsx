import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter, Route, Routes } from 'react-router'
import UploadFile from './pages/upload-file/UploadFile.tsx'
import ListFiles from './pages/list-files/ListFiles.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route path="/" element={<ListFiles />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
