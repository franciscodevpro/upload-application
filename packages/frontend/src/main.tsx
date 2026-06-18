import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter, Route, Routes } from 'react-router'
import ListFiles from './pages/list-files/ListFiles.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta?.env?.BASE_URL as string | "/"}>
      <Routes>
        <Route element={<App />}>
          <Route path="/" element={<ListFiles />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
