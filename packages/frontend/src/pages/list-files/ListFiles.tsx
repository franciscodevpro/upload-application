// ListFiles.tsx
import { useCallback, useEffect, useState } from 'react';
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
  Info,
  Trash,
  Eye,
  EyeOff
} from 'lucide-react';
import PromptModal from '../../components/PromptModal';
import UploadFile from '../upload-file/UploadFile';
import ItemDetailsCard from '../../components/ItemDetailsCard';
import AuthPage from '../auth/AuthPage';
import UserMenu from '../../components/UserMenu';
import { useAuthContext } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router';

interface FileItem {
  id: string;
  name: string;
  size: number;
  date: string;
  type: string;
  newName: string;
  privacy: string;
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

interface DirectoryItemDetails extends DirectoryItem {
  address: {id: string; name: string;}[];
}


const fileTypeMap: Record<string, FileTypeInfo> = {
  pdf: { icon: FileText, type: 'PDF', color: 'text-danger-500' },
  docx: { icon: FileText, type: 'Word', color: 'text-primary-500' },
  doc: { icon: FileText, type: 'Word', color: 'text-primary-500' },
  txt: { icon: FileText, type: 'Texto', color: 'text-primary-500' },
  jpg: { icon: FileImage, type: 'Imagem', color: 'text-accent-500' },
  png: { icon: FileImage, type: 'Imagem', color: 'text-accent-500' },
  gif: { icon: FileImage, type: 'Imagem', color: 'text-accent-500' },
  mp4: { icon: FileVideo, type: 'Vídeo', color: 'text-warning-500' },
  mov: { icon: FileVideo, type: 'Vídeo', color: 'text-warning-500' },
  mp3: { icon: Music, type: 'Áudio', color: 'text-success-600' },
  wav: { icon: Music, type: 'Áudio', color: 'text-success-600' },
  flac: { icon: Music, type: 'Áudio', color: 'text-success-600' },
  aac: { icon: Music, type: 'Áudio', color: 'text-success-600' },
  ogg: { icon: Music, type: 'Áudio', color: 'text-success-600' },
  m4a: { icon: Music, type: 'Áudio', color: 'text-success-600' },
  zip: { icon: FileArchive, type: 'Arquivo', color: 'text-warning-600' },
  rar: { icon: FileArchive, type: 'Arquivo', color: 'text-warning-600' },
  '7z': { icon: FileArchive, type: 'Arquivo', color: 'text-warning-600' },
  ts: { icon: FileCode, type: 'Código', color: 'text-success-500' },
  js: { icon: FileCode, type: 'Código', color: 'text-success-500' },
  json: { icon: FileCode, type: 'Código', color: 'text-success-500' },
  html: { icon: FileCode, type: 'Código', color: 'text-success-500' },
};

const getFileInfo = (fileName: string): FileTypeInfo => {
  const ext = fileName.split('.').at(-1)?.toLowerCase();
  return fileTypeMap[ext || ''] || { icon: File, type: 'Arquivo', color: 'text-gray-400' };
};

const getFileIcon = (fileName: string) => {
  const { icon: Icon, color } = getFileInfo(fileName);
  return <Icon size={24} className={`mr-3 ${color} overflow-visible`} />;
};

const getFileType = (fileName: string): string => {
  return getFileInfo(fileName).type;
};

const getDirectoryIcon = () => {
  return <Folder size={24} className={`mr-3 text-warning-500 overflow-visible`} />;
};

const getDirectoryType = (): string => {
  return 'Pasta';
};

export default function ListFiles() {
  const directoryId = new URLSearchParams(window.location.search).get('directoryId') || undefined;
  const [files, setFiles] = useState<FileItem[]>([]);
  const [directoryDetails, setDirectoryDetails] = useState<DirectoryItemDetails | undefined>(undefined);
  const [directories, setDirectories] = useState<DirectoryItem[]>([]);
  const [uploadLimit, setUploadLimit] = useState<{limit: number, total: number}>();
  const [selected, setSelected] = useState<string[]>([]);
  const [detailsItem, setDetailsItem] = useState<{ item: FileItem | DirectoryItem; type: 'file' | 'directory'; } | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authorizationToken, setAuthorizationToken] = useState(window.localStorage.getItem('accessToken') || null);
  const { user } = useAuthContext();

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:1080/api';

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchDirectoryDetails = async (directoryId: string, accessToken?: string): Promise<void> => {
    const res = await fetch(`${API_URL}/directories/${directoryId}`, {
      headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      setDirectoryDetails(data);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchDirectories = async (parent?: string, accessToken?: string): Promise<void> => {
    const url = parent ? `${API_URL}/directories?parent=${parent}` : `${API_URL}/directories`;
    const res = await fetch(url, {
      headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      setDirectories(data);
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchUploadLimit = async (accessToken?: string): Promise<void> => {
    const url = `${API_URL}/files/limit`;
    const res = await fetch(url, {
      headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      setUploadLimit(data);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchFiles = async (directoryId?: string, accessToken?: string): Promise<void> => {
    const url = directoryId ? `${API_URL}/files?parent=${directoryId}` : `${API_URL}/files`;
    const res = await fetch(url, {
      headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      setFiles(data);
    }
  };

  const [isPromptOpen, setIsPromptOpen] = useState(false);

  const fetchData = useCallback(async (directoryId?: string, accessToken?: string) => {
      if (directoryId) {
        fetchDirectoryDetails(directoryId, accessToken);
      }
      fetchDirectories(directoryId, accessToken);
      fetchFiles(directoryId, accessToken);
      fetchUploadLimit(accessToken);
  }, [fetchDirectories, fetchDirectoryDetails, fetchFiles, fetchUploadLimit]);

  const createDirectory = (): void => {
    setIsPromptOpen(true);
  };

  const deleteItem = async ({ item, type }: { item: FileItem | DirectoryItem; type: 'file' | 'directory'; }): Promise<void> => {
    const endpoint = type === 'file' ? 'files' : 'directories';
    const res = await fetch(`${API_URL}/${endpoint}/${item.id}`, {
      method: 'DELETE',
      headers: authorizationToken ? { 'Authorization': `Bearer ${authorizationToken}` } : {},
    });

    if (res.ok) {
      window.location.reload();
    } else {
      const errorData = await res.json().catch(() => null);
      window.alert(errorData?.error || `Erro ao deletar ${type === 'file' ? 'arquivo' : 'diretório'}.`);
    }
  };

  const changePrivacyItem = async ({ item, privacy, type }: { item: FileItem | DirectoryItem; privacy: string; type: 'file' | 'directory' }): Promise<void> => {
    const endpoint = type === 'file' ? 'files' : 'directories';
    const res = await fetch(`${API_URL}/${endpoint}/${item.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authorizationToken}`
      },
      body: JSON.stringify({ privacy })
    });

    if (res.ok) {
      window.location.reload();
    } else {
      const errorData = await res.json().catch(() => null);
      window.alert(errorData?.error || `Erro ao tentar tornar o ${type === 'file' ? 'arquivo' : 'diretório'} ${privacy === 'private' ? 'privado' : 'público'}.`);
    }
  };

  const handleCreateDirectory = async (dirName: string): Promise<void> => {
    const parentPath = directoryDetails?.address?.map((dir) => dir.name).join('/') || '';
    const path = parentPath ? `${parentPath}/${dirName.trim()}` : dirName.trim();

    const res = await fetch(`${API_URL}/directories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(authorizationToken && { 'Authorization': `Bearer ${authorizationToken}` }) },
      body: JSON.stringify({
        name: dirName.trim(),
        path,
        parent: directoryId || null,
      }),
    });

    setIsPromptOpen(false);

    if (res.ok) {
      fetchData(directoryId, authorizationToken || undefined);
    } else {
      const errorData = await res.json().catch(() => null);
      window.alert(errorData?.error || 'Erro ao criar nova pasta.');
    }
  };

  useEffect(() => {
    setTimeout(() => {
      fetchData(directoryId, authorizationToken || undefined);
    }, 100);
  }, [directoryId, authorizationToken]);

  const formatSize = (bytes: number) => (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  const closeDetails = () => setDetailsItem(null);

  const goToPath = useNavigate();

  return (
    <section className="max-w-svw bg-background-primary text-text-primary p-6 font-sans">
      <div className="max-w-7xl mx-auto mb-20">
        <div className="mb-6">
          <nav className="flex flex-col md:flex-row-reverse items-center justify-between text-sm">
            <UserMenu goToAuth={() => { setIsAuthOpen(true); }} onLogoutSuccess={() => { goToPath(0); }} />
            <div className="flex flex-1 w-full overflow-x-hidden items-center gap-2">
              <Link to="/" className="text-primary-400 hover:text-primary-300 transition-colors font-medium">
                Home
              </Link>
              {directoryDetails && directoryDetails.address.length > 0 && (directoryDetails.address.length > 2 ? [{id: '...', name: '...'},directoryDetails.address[directoryDetails.address.length-2], directoryDetails.address[directoryDetails.address.length-1]] : directoryDetails.address).map((dir) => (
                (dir.id === '...')? <span key="ellipsis" className="flex items-center space-x-2"><span className="text-text-muted">/</span> <span className='text-[2rem] leading-6 mb-4'>...</span></span> : (
                <span key={dir.id} className="flex items-center space-x-2 max-w-[40%] truncate">
                  <span className="text-text-muted">/</span>
                  <Link 
                    to={`/?directoryId=${dir.id}`}
                    className="text-primary-400 hover:text-primary-300 transition-colors font-medium"
                  >
                    {dir.name}
                  </Link>
                </span>
                )
              ))}
            </div>
          </nav>
        </div>

        <div className="flex justify-between flex-col md:flex-row items-center mb-8 gap-2">
          <div className="text-center md:text-left">
            <h1 className="text-4xl font-display font-bold text-text-primary mb-2">Gerencie Arquivos</h1>
            {uploadLimit?.total? <p className="text-text-secondary text-base">
              <strong className="mr-2">{formatSize(uploadLimit?.total)}</strong>
               utilizado de 
              <strong className="ml-2">{formatSize(uploadLimit?.limit)}</strong>
              </p> : ""}
          </div>
          
          <div className="flex items-center gap-2">
            { user && user.access_rights.includes("write") &&
              <button
                onClick={createDirectory}
                className="flex items-center px-6 py-3 rounded-2xl font-medium bg-success-600 text-white hover:bg-success-700 shadow-lg hover:shadow-glow-green transition-all duration-200 hover:scale-105 font-sans"
              >
                + Nova Pasta
              </button>
            }
            <button 
              onClick={() => window.location.href = `${API_URL}/download?${new URLSearchParams(selected.map(s => ['files', s])).toString()}`}
              disabled={selected.length === 0}
              className={`flex items-center px-6 py-3 rounded-2xl font-medium transition-all duration-200 font-sans ${
                selected.length > 0 
                  ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg hover:shadow-glow transform hover:-translate-y-0.5' 
                  : 'bg-background-tertiary text-text-muted cursor-not-allowed border border-border-secondary'
              }`}
            >
              <Download size={18} className={`${selected.length > 0 && 'mr-2'}`} />
              {selected.length > 0 ? selected.length : ''}
            </button>
          </div>
        </div>

        <div className="bg-background-secondary rounded-lg shadow-2xl overflow-hidden border border-border-primary">
          <header className="text-text-secondary text-sm p-1 border-b border-border-secondary fade-edges py-4 px-6">
            <div className="flex items-center">
              <div className="w-80 px-1 box-border overflow-hidden font-bold font-sans">
                (  {
                  (files?.length | 0) +
                  (directories?.length | 0)
                }  ) Nome
              </div>
              <div className="w-28 px-1 box-border hidden md:block overflow-hidden font-bold text-center font-sans "></div>
              <div className="w-32 px-1 box-border hidden md:flex items-center overflow-hidden font-bold font-sans">
                <HardDrive size={14} className="mr-2 opacity-60" />
                {formatSize(
                  (files?.length? files.reduce((acum, cur) => acum += cur.size, 0) : 0) +
                  (directories?.length? directories.reduce((acum, cur) => acum += cur.size, 0) : 0)
                )}
              </div>
              <div className="w-52 px-1 box-border hidden md:block overflow-hidden font-bold font-sans"></div>
              <div className="w-16 text-center px-1 box-border overflow-hidden font-bold font-sans"></div>
            </div>
          </header>
          <section className="relative fade-edges px-6">
            {directories.map((directory) => (
              <article key={directory.name} className="p-1 hover:bg-background-accent transition-all duration-200 group flex items-center py-3 border-b border-border-secondary hover:shadow-inner-glow">
                <div className="w-80 flex items-center px-1 box-border overflow-hidden">
                  {getDirectoryIcon()}
                  <Link to={`/?directoryId=${directory.id}`} className="text-text-primary font-medium truncate cursor-pointer hover:text-primary-400 transition-colors font-sans" title={directory.name}>
                    <span>{directory.name}</span>
                  </Link>
                </div>
                <div className="w-28 px-1 box-border hidden md:flex overflow-hidden text-center">
                  <span className="inline-flex py-1 px-3 rounded-full text-xs font-medium bg-background-tertiary text-text-secondary font-sans">
                    {getDirectoryType()}
                  </span>
                </div>
                <div className="w-32 text-text-secondary text-sm items-center px-1 box-border hidden md:flex overflow-hidden">
                  <HardDrive size={14} className="mr-2 opacity-60" />
                  <span>{formatSize(directory.size)}</span>
                </div>
                <div className="w-52 text-text-secondary text-sm items-center px-1 box-border hidden md:flex overflow-hidden">
                  <Clock size={14} className="mr-2 opacity-60" />
                  {new Date(directory.createdAt).toLocaleString('pt-BR')}
                </div>
                <div className="w-24 text-center px-1 box-border overflow-hidden">
                  <div className="flex gap-0.5 justify-center">
                    <button
                        type="button"
                        onClick={() => deleteItem({ item: directory, type: 'directory' })}
                        className="inline-flex items-center justify-center bg-transparent rounded-none border-0 p-0 m-0 h-10 w-10 hover:bg-background-secondary hover:text-primary-300"
                        title="Ver detalhes"
                      >
                        <Trash size={18} />
                      </button>
                    <button
                      type="button"
                      onClick={() => setDetailsItem({ item: directory, type: 'directory' })}
                      className="inline-flex items-center justify-center bg-transparent rounded-none border-0 p-0 m-0 h-10 w-10 hover:bg-background-secondary hover:text-primary-300"
                      title="Ver detalhes"
                    >
                      <Info size={18} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
          <section className="divide-y divide-border-secondary relative fade-edges px-6">
            {files.map((file) => (
              <article key={file.name} className="p-1 hover:bg-background-accent transition-all duration-200 group flex items-center py-3 hover:shadow-inner-glow">
                <div className="w-80 flex items-center px-1 box-border overflow-hidden">
                  <input 
                    id={`checkbox-${file.newName}`}
                    type="checkbox" 
                    checked={selected.includes(file.newName)}
                    onChange={() => setSelected(prev => prev.includes(file.newName) ? prev.filter(f => f !== file.newName) : [...prev, file.newName])}
                    className={`rounded-md border-border-secondary text-primary-600 bg-background-secondary focus:ring-primary-500 focus:ring-2 cursor-pointer transition-all ${
                      selected.length > 0 ? 'w-4 h-4 mr-3' : 'w-0 h-0 hidden'
                    }`}
                  />
                  {getFileIcon(file.name)}
                  <label 
                    htmlFor={`checkbox-${file.newName}`}
                    className="text-text-primary font-medium truncate cursor-pointer hover:text-primary-400 transition-colors font-sans"
                    title={file.name}
                  >
                    {file.name}
                  </label>
                </div>
                <div className="w-28 px-1 box-border hidden md:flex overflow-hidden text-center">
                  <span className="inline-flex py-1 px-3 rounded-full text-xs font-medium bg-background-tertiary text-text-secondary font-sans">
                    {getFileType(file.name)}
                  </span>
                </div>
                <div className="w-32 text-text-secondary text-sm items-center px-1 box-border hidden md:flex overflow-hidden">
                  <HardDrive size={14} className="mr-2 opacity-60" />
                  {formatSize(file.size)}
                </div>
                <div className="w-52 text-text-secondary text-sm items-center px-1 box-border hidden md:flex overflow-hidden">
                  <Clock size={14} className="mr-2 opacity-60" />
                  {new Date(file.date).toLocaleString('pt-BR')}
                </div>
                <div className="w-24 text-center px-1 box-border overflow-hidden">
                  <div className="flex gap-0.5 justify-center">
                    <button
                      type="button"
                      onClick={() => deleteItem({ item: file, type: 'file' })}
                      className="inline-flex items-center justify-center bg-transparent rounded-none border-0 p-0 m-0 h-10 w-10 hover:bg-background-secondary hover:text-primary-300"
                      title="Ver detalhes"
                    >
                      <Trash size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailsItem({ item: file, type: 'file' })}
                      className="inline-flex items-center justify-center bg-transparent rounded-none border-0 p-0 m-0 h-10 w-10 hover:bg-background-secondary hover:text-primary-300"
                      title="Ver detalhes"
                    >
                      <Info size={18} />
                    </button>
                    { user && user.access_rights.includes("write-public") &&
                    <button
                      type="button"
                      onClick={() => changePrivacyItem({ item: file, privacy: file.privacy == 'private' ? "public" : "private", type: 'file' })}
                      className="inline-flex items-center justify-center bg-transparent rounded-none border-0 p-0 m-0 h-10 w-10 hover:bg-background-secondary hover:text-primary-300"
                      title={file.privacy == 'private' ? "Tornar público" : "Tornar privado"}
                    >
                      {file.privacy == 'private'? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>}
                    <a 
                      href={`${API_URL}/download?files=${encodeURIComponent(file.newName)}`}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-primary-400 transition hover:bg-background-secondary hover:text-primary-300"
                      title="Baixar individualmente"
                    >
                      <Download size={18} />
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </section>
          
          { directories.length === 0 && files.length === 0 && (
            <div className="p-18 text-center text-text-muted">
              <File size={48} className="mx-auto mb-4 opacity-50" />
              Nenhum arquivo encontrado no diretório atual.
            </div>
          )}
        </div>
      </div>

      {user && user.access_rights.includes("write") &&
        <UploadFile onUploadSuccess={() => fetchData(directoryId, authorizationToken || undefined)} parentId={directoryId} accessToken={authorizationToken || undefined} maxFileSize={uploadLimit?.limit? uploadLimit?.limit - uploadLimit?.total : 1} />
      }

      {isAuthOpen && (
        <AuthPage open={true} onClose={() => setIsAuthOpen(false)} onLoginSuccess={(tokens) => {setAuthorizationToken(tokens.accessToken); setIsAuthOpen(false); goToPath(0);}} />
      )}

      {detailsItem && !isAuthOpen && (
        <ItemDetailsCard
          open={Boolean(detailsItem)}
          type={detailsItem.type}
          item={detailsItem.item}
          onClose={closeDetails}
        />
      )}

      <PromptModal
        open={isPromptOpen}
        title="Nova Pasta"
        description="Informe o nome da nova pasta a ser criada neste diretório."
        placeholder="Nome da pasta"
        submitLabel="Criar"
        onSubmit={handleCreateDirectory}
        onClose={() => setIsPromptOpen(false)}
      />
    </section>
  );
};