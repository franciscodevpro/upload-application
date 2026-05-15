import { useState } from 'react';
import { LogOut, User, ChevronDown, LogIn } from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';

interface UserMenuProps {
  goToAuth?: () => void;
  onLogoutSuccess?: () => void;
}

export default function UserMenu({ goToAuth, onLogoutSuccess }: UserMenuProps) {
  const { user, logout, isLoading } = useAuthContext();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) {
    return (<div className="relative">
      <button
        onClick={() => {
          goToAuth?.();
        }}
        className="flex items-center gap-2 px-2 py-1 outline-primary-700 outline-1 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
        disabled={isLoading}
      >
        <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
          <LogIn size={16} className="text-white" />
        </div>
        <span className="text-sm font-medium">Entrar</span>
      </button>
    </div>);
  }

  const handleLogout = async () => {
    try {
      await logout();
      setIsOpen(false);
      onLogoutSuccess?.();
    } catch (err) {
      console.error('Erro ao fazer logout:', err);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
        disabled={isLoading}
      >
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
          <User size={16} className="text-white" />
        </div>
        <span className="text-sm font-medium">{user.email}</span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-background-primary rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-3 border-b border-gray-200">
            <p className="text-sm text-gray-600">Conectado como</p>
            <p className="font-medium text-gray-700 truncate">{user.email}</p>
          </div>

          <button
            onClick={handleLogout}
            disabled={isLoading}
            className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogOut size={16} />
            <span className="text-sm">Sair</span>
          </button>
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
