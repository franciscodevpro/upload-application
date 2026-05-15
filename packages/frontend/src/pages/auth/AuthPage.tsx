import { useState } from 'react';
import { X, User, LogIn } from 'lucide-react';
import LoginForm from '../../components/LoginForm';
import SignUpForm from '../../components/SignUpForm';

type AuthMode = 'login' | 'signup';

interface ItemDetailsCardProps {
  open: boolean;
  onClose: () => void;
  onLoginSuccess?: (tokens: { accessToken: string; refreshToken: string }) => void;
}

export default function AuthPage({ open, onClose, onLoginSuccess }: ItemDetailsCardProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  
  if (!open) {
    return null;
  }

  const handleLoginSuccess = (tokens: { accessToken: string; refreshToken: string }) => {
    window.localStorage.setItem('accessToken', tokens.accessToken);
    window.localStorage.setItem('refreshToken', tokens.refreshToken);
    console.log('Login realizado com sucesso!');
    onLoginSuccess?.(tokens);
    // Aqui você pode redirecionar para a página principal ou executar outras ações
    // Por exemplo: window.location.href = '/';
  };

  const handleSignUpSuccess = (user: { id: string; email: string }) => {
    console.log('Conta criada:', user);
    setMode('login');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background-primary/60 px-4 py-6 backdrop-blur-sm">
    <div className="bottom-6 right-6 z-50 w-full max-w-200 rounded-3xl border border-border-secondary bg-background-secondary/95 p-5 shadow-2xl backdrop-blur-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-500 text-white shadow-lg">
            {mode === 'login' ? <LogIn size={20} /> : <User size={20} />}
          </div>
          <div>
            <h2 className="text-xl font-display font-semibold text-text-primary">Realizar {mode === 'login' ? 'Login' : 'Cadastro'}</h2>
            <p className="text-text-secondary text-sm">Preencha os campos abaixo para {mode === 'login' ? 'acessar' : 'criar'} sua conta.</p>
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

        {/* Formulários */}
        <div className="flex justify-center">
          {mode === 'login' ? (
            <LoginForm
              onLoginSuccess={handleLoginSuccess}
              onSwitchToSignup={() => setMode('signup')}
            />
          ) : (
            <SignUpForm
              onSignUpSuccess={handleSignUpSuccess}
              onSwitchToLogin={() => setMode('login')}
            />
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-600 text-sm">
          <p>© 2026 Upload Application. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
}
