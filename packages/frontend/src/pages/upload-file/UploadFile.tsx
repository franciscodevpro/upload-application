// UploadFile.tsx
import React from 'react';
import Uppy from '@uppy/core';
import Dashboard from '@uppy/react/dashboard';
import Tus from '@uppy/tus'; // Example uploader plugin

// Estilos
import '@uppy/core/css/style.min.css';
import '@uppy/dashboard/css/style.min.css';

export default function UploadFile({ onUploadSuccess, parentId }: { onUploadSuccess: () => void, parentId?: string | null }) {
  const meta = {} as Record<string, string>;
  if (parentId) {
    meta["parentId"] = parentId; // Adiciona o parentId aos metadados se for fornecido
  }
  const uppy = new Uppy({
    debug: true,
    autoProceed: false,
    meta,
    restrictions: {
      maxFileSize: null, // Sem limite para arquivos grandes
    }
  })
  .use(Tus, {
    endpoint: 'http://127.0.0.1:1080/upload/upload', // Endpoint do backend
    chunkSize: 5 * 1024 * 1024, // 5MB por chunk
    retryDelays: [0, 1000, 3000, 5000],
    onSuccess: () => {
      onUploadSuccess();
    }
  });

  return (
    <section>
      <Dashboard 
        uppy={uppy} 
        theme='dark'
        width={'100%'}
        height={450}
      />
    </section>
  );
};