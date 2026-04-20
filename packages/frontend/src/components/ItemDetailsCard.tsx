import { Info, X } from 'lucide-react';

type FileItem = {
  id: string;
  name: string;
  size: number;
  date: string;
  type: string;
  newName: string;
};

type DirectoryItem = {
  id: string;
  name: string;
  size: number;
  parent: string | null;
  createdAt: string;
  updatedAt: string;
};

interface ItemDetailsCardProps {
  open: boolean;
  type: 'file' | 'directory';
  item: FileItem | DirectoryItem;
  onClose: () => void;
}

const formatSize = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
const formatDate = (value: string) => new Date(value).toLocaleString('pt-BR');

export default function ItemDetailsCard({ open, type, item, onClose }: ItemDetailsCardProps) {
  if (!open) {
    return null;
  }

  const isFile = type === 'file';
  const fileItem = item as FileItem;
  const directoryItem = item as DirectoryItem;

  const details = [
    { label: 'ID', value: item.id },
    { label: 'Nome', value: item.name },
    ...(isFile
      ? [
          { label: 'Nome interno', value: fileItem.newName },
          { label: 'Tipo', value: fileItem.type },
          { label: 'Tamanho', value: formatSize(fileItem.size) },
          { label: 'Data', value: formatDate(fileItem.date) },
        ]
      : [
          { label: 'Tipo', value: 'Pasta' },
          { label: 'Tamanho', value: formatSize(directoryItem.size) },
          { label: 'Pai', value: directoryItem.parent ?? 'Raiz' },
          { label: 'Criado em', value: formatDate(directoryItem.createdAt) },
          { label: 'Atualizado em', value: formatDate(directoryItem.updatedAt) },
        ]),
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm rounded-3xl border border-border-secondary bg-background-secondary/95 p-5 shadow-2xl backdrop-blur-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-500 text-white shadow-lg">
            <Info size={20} />
          </div>
          <div>
            <h2 className="text-xl font-display font-semibold text-text-primary">Detalhes do {isFile ? 'Arquivo' : 'Diretório'}</h2>
            <p className="text-text-secondary text-sm">Visualize as informações completas do item selecionado.</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-full border border-border-secondary p-2 text-text-muted transition hover:border-primary-400 hover:text-text-primary"
          aria-label="Fechar painel de detalhes"
        >
          <X size={18} />
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {details.map((detail) => (
          <div key={detail.label} className="rounded-2xl bg-background-tertiary/80 p-4 text-sm text-text-secondary">
            <div className="mb-1 text-xs uppercase tracking-wide text-primary-200">{detail.label}</div>
            <div className="text-text-primary break-words">{detail.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
