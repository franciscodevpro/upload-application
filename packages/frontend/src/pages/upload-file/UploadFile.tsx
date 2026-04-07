// UploadFile.tsx
import React from 'react';
import Uppy from '@uppy/core';
import Dashboard from '@uppy/react/dashboard';
import Tus from '@uppy/tus'; // Example uploader plugin

// Estilos
import '@uppy/core/css/style.min.css';
import '@uppy/dashboard/css/style.min.css';

const uppy = new Uppy({
  debug: true,
  autoProceed: false,
  meta: {
    parentId: "teste para upload", // Exemplo de metadado para associar ao diretório
  },
  restrictions: {
    maxFileSize: null, // Sem limite para arquivos grandes
  }
})
.use(Tus, {
  endpoint: 'http://127.0.0.1:1080/upload/upload', // Endpoint do backend
  chunkSize: 5 * 1024 * 1024, // 5MB por chunk
  retryDelays: [0, 1000, 3000, 5000],
});

export default function UploadFile() {

  return (
    <section>
      <h1>Upload de Arquivos e Pastas</h1>
      <Dashboard 
        uppy={uppy} 
        width={'100%'}
        height={450}
      />
    </section>
  );
};