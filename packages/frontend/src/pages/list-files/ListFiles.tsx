// ListFiles.tsx
import { useEffect, useState } from 'react';
import { 
  FileText, 
  FileImage, 
  FileVideo, 
  FileArchive, 
  FileCode, 
  File, 
  Download, 
  Clock, 
  HardDrive,
  Music,
  Folder,
} from 'lucide-react';
import UploadFile from '../upload-file/UploadFile';

interface FileItem {
  id: string;
  name: string;
  size: number;
  date: string;
  type: string;
}

interface FileTypeInfo {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  type: string;
  color: string;
}

interface DirectoryItem {
  id: string;
  name: string;
  size: number;
  parent: string | null;
  createdAt: string;
  updatedAt: string;
}


const fileTypeMap: Record<string, FileTypeInfo> = {
  pdf: { icon: FileText, type: 'PDF', color: 'text-red-500' },
  docx: { icon: FileText, type: 'Word', color: 'text-blue-500' },
  doc: { icon: FileText, type: 'Word', color: 'text-blue-500' },
  txt: { icon: FileText, type: 'Texto', color: 'text-blue-500' },
  jpg: { icon: FileImage, type: 'Imagem', color: 'text-purple-500' },
  png: { icon: FileImage, type: 'Imagem', color: 'text-purple-500' },
  gif: { icon: FileImage, type: 'Imagem', color: 'text-purple-500' },
  mp4: { icon: FileVideo, type: 'Vídeo', color: 'text-orange-500' },
  mov: { icon: FileVideo, type: 'Vídeo', color: 'text-orange-500' },
  mp3: { icon: Music, type: 'Áudio', color: 'text-green-600' },
  wav: { icon: Music, type: 'Áudio', color: 'text-green-600' },
  flac: { icon: Music, type: 'Áudio', color: 'text-green-600' },
  aac: { icon: Music, type: 'Áudio', color: 'text-green-600' },
  ogg: { icon: Music, type: 'Áudio', color: 'text-green-600' },
  m4a: { icon: Music, type: 'Áudio', color: 'text-green-600' },
  zip: { icon: FileArchive, type: 'Arquivo', color: 'text-yellow-600' },
  rar: { icon: FileArchive, type: 'Arquivo', color: 'text-yellow-600' },
  '7z': { icon: FileArchive, type: 'Arquivo', color: 'text-yellow-600' },
  ts: { icon: FileCode, type: 'Código', color: 'text-green-500' },
  js: { icon: FileCode, type: 'Código', color: 'text-green-500' },
  json: { icon: FileCode, type: 'Código', color: 'text-green-500' },
  html: { icon: FileCode, type: 'Código', color: 'text-green-500' },
};

const getFileInfo = (fileName: string): FileTypeInfo => {
  const ext = fileName.split('.').at(-1)?.toLowerCase();
  return fileTypeMap[ext || ''] || { icon: File, type: 'Arquivo', color: 'text-gray-400' };
};

const getFileIcon = (fileName: string) => {
  const { icon: Icon, color } = getFileInfo(fileName);
  return <Icon size={24} className={`mr-3 ${color}`} />;
};

const getFileType = (fileName: string): string => {
  return getFileInfo(fileName).type;
};

const getDirectoryIcon = () => {
  return <Folder size={24} className={`mr-3 'text-gray-400'`} />;
};

const getDirectoryType = (): string => {
  return 'Pasta';
};

export default function ListFiles() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [directories, setDirectories] = useState<DirectoryItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const API_URL = 'http://127.0.0.1:1080/api';

  const fetchDirectories = async (parent?: string): Promise<void> => {
    const url = parent ? `${API_URL}/directories?parent=${parent}` : `${API_URL}/directories`;
    const res = await fetch(url);
    const data = await res.json();
    setDirectories(data);
  };

  const fetchFiles = async (): Promise<void> => {
    const res = await fetch(`${API_URL}/files`);
    const data = await res.json();
    setFiles(data);
  };

  useEffect(() => {
    setTimeout(() => {
      fetchDirectories();
      fetchFiles();
    }, 100);
  }, []);

  const formatSize = (bytes: number) => (bytes / (1024 * 1024)).toFixed(2) + ' MB';

  return (
    <section className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto mb-20">
        <div className="mb-6">
          <nav className="flex items-center space-x-2 text-sm">
            <a href="/" className="text-blue-400 hover:text-blue-300 transition-colors">
              Home
            </a>
            <span className="text-gray-500">/</span>
            <span className="text-gray-300">Repositório de Arquivos</span>
          </nav>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Repositório de Arquivos</h1>
            <p className="text-gray-400 text-sm">Gerencie arquivos grandes entre Windows e Linux</p>
          </div>
          
          <button 
            onClick={() => window.location.href = `${API_URL}/download?${new URLSearchParams(selected.map(s => ['files', s])).toString()}`}
            disabled={selected.length === 0}
            className={`flex items-center px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
              selected.length > 0 
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5' 
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Download size={18} className="mr-2" />
            Baixar Selecionados ({selected.length})
          </button>
        </div>

        <div className="bg-gray-800 rounded-lg shadow-2 overflow-hidden">
          <header className="text-gray-300 text-sm p-1 border-b border-gray-700 fade-edges py-2 px-5">
            <div className="flex items-center">
              <div className="flex-1 px-1 box-border overflow-hidden font-bold">Nome</div>
              <div className="w-20 px-1 box-border overflow-hidden font-bold text-center">Tipo</div>
              <div className="w-24 px-1 box-border overflow-hidden font-bold">Tamanho</div>
              <div className="w-52 px-1 box-border overflow-hidden font-bold">Data de criação</div>
              <div className="w-16 text-center px-1 box-border overflow-hidden font-bold">Ações</div>
            </div>
          </header>
          <section className="divide-y divide-gray-700 relative fade-edges px-5">
            {directories.map((directory) => (
              <article key={directory.name} className="p-1 hover:bg-gray-750 transition-all duration-200 group flex items-center rounded-lg py-2">
                <div className="flex-1 flex items-center px-1 box-border overflow-hidden">
                  <input 
                    id={`checkbox-${directory.name}`}
                    type="checkbox" 
                    checked={selected.includes(directory.name)}
                    onChange={() => setSelected(prev => prev.includes(directory.name) ? prev.filter(f => f !== directory.name) : [...prev, directory.name])}
                    className={`rounded-md border-gray-600 text-blue-600 bg-gray-800 focus:ring-blue-500 focus:ring-2 cursor-pointer transition-all ${
                      selected.length > 0 ? 'w-4 h-4 mr-3' : 'w-0 h-0 hidden'
                    }`}
                  />
                  {getDirectoryIcon()}
                  <label 
                    htmlFor={`checkbox-${directory.name}`}
                    className="text-white font-medium truncate max-w-xs cursor-pointer"
                  >
                    {directory.name}
                  </label>
                </div>
                <div className="w-20 px-1 box-border overflow-hidden text-center">
                  <span className="inline-flex py-0.5 px-3 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
                    {getDirectoryType()}
                  </span>
                </div>
                <div className="w-24 text-gray-300 text-sm flex items-center px-1 box-border overflow-hidden">
                  <HardDrive size={14} className="mr-2 opacity-60" />
                  {formatSize(directory.size)}
                </div>
                <div className="w-52 text-gray-300 text-sm flex items-center px-1 box-border overflow-hidden">
                  <Clock size={14} className="mr-2 opacity-60" />
                  {new Date(directory.createdAt).toLocaleString('pt-BR')}
                </div>
                <div className="w-16 text-center px-1 box-border overflow-hidden">
                </div>
              </article>
            ))}
          </section>
          <section className="divide-y divide-gray-700 relative fade-edges px-5">
            {files.map((file) => (
              <article key={file.name} className="p-1 hover:bg-gray-750 transition-all duration-200 group flex items-center rounded-lg py-2">
                <div className="flex-1 flex items-center px-1 box-border overflow-hidden">
                  <input 
                    id={`checkbox-${file.name}`}
                    type="checkbox" 
                    checked={selected.includes(file.name)}
                    onChange={() => setSelected(prev => prev.includes(file.name) ? prev.filter(f => f !== file.name) : [...prev, file.name])}
                    className={`rounded-md border-gray-600 text-blue-600 bg-gray-800 focus:ring-blue-500 focus:ring-2 cursor-pointer transition-all ${
                      selected.length > 0 ? 'w-4 h-4 mr-3' : 'w-0 h-0 hidden'
                    }`}
                  />
                  {getFileIcon(file.name)}
                  <label 
                    htmlFor={`checkbox-${file.name}`}
                    className="text-white font-medium truncate max-w-xs cursor-pointer"
                  >
                    {file.name}
                  </label>
                </div>
                <div className="w-20 px-1 box-border overflow-hidden text-center">
                  <span className="inline-flex py-0.5 px-3 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
                    {getFileType(file.name)}
                  </span>
                </div>
                <div className="w-24 text-gray-300 text-sm flex items-center px-1 box-border overflow-hidden">
                  <HardDrive size={14} className="mr-2 opacity-60" />
                  {formatSize(file.size)}
                </div>
                <div className="w-52 text-gray-300 text-sm flex items-center px-1 box-border overflow-hidden">
                  <Clock size={14} className="mr-2 opacity-60" />
                  {new Date(file.date).toLocaleString('pt-BR')}
                </div>
                <div className="w-16 text-center px-1 box-border overflow-hidden">
                  <a 
                    href={`${API_URL}/download?files=${encodeURIComponent(file.name)}`}
                    className="inline-flex items-center py-1 px-3  text-blue-400 hover:bg-gray-700 rounded-full transition-all duration-200 hover:scale-110"
                    title="Baixar individualmente"
                  >
                    <Download size={18} />
                  </a>
                </div>
              </article>
            ))}
          </section>
          
          {files.length === 0 && (
            <div className="p-16 text-center text-gray-500">
              <File size={48} className="mx-auto mb-4 opacity-50" />
              Nenhum arquivo encontrado no servidor.
            </div>
          )}
        </div>
      </div>

      <UploadFile onUploadSuccess={fetchFiles} parentId={undefined} />
    </section>
  );
};