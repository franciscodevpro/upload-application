import { useState } from 'react';
import { AlertCircle, Loader, CheckCircle } from 'lucide-react';

interface SignUpFormProps {
  onSignUpSuccess?: (user: { id: string; email: string }) => void;
  onSwitchToLogin?: () => void;
}

export default function SignUpForm({ onSignUpSuccess, onSwitchToLogin }: SignUpFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const validateForm = (): boolean => {
    if (!email || !password || !confirmPassword) {
      setError('Todos os campos são obrigatórios');
      return false;
    }

    if (!email.includes('@')) {
      setError('Email inválido');
      return false;
    }

    if (password.length < 6) {
      setError('Senha deve ter pelo menos 6 caracteres');
      return false;
    }

    if (password !== confirmPassword) {
      setError('As senhas não conferem');
      return false;
    }

    return true;
  };

  const handleRecaptcha = async (): Promise<string | null> => {
    return new Promise((resolve) => {
      if ((window as any).grecaptcha) {
        (window as any).grecaptcha.ready(function() {
          (window as any).grecaptcha.execute(import.meta.env.VITE_GOOGLE_RECAPTCHA_SITE_KEY, {action: 'submit'}).then(function(token: string) {
              return resolve(token);
          });
        });
      } else {
        return resolve(null);
      }
    });
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:1080/api';

    try {
        
      const recaptchaToken = await handleRecaptcha();

      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, recaptchaToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setError('Email já cadastrado. Tente fazer login.');
        } else {
          setError(data.error || 'Erro ao registrar');
        }
        return;
      }

      setSuccess(true);
      setEmail('');
      setPassword('');
      setConfirmPassword('');

      // Chamar callback se existir
      if (onSignUpSuccess) {
        onSignUpSuccess({
          id: data.userId,
          email: data.email,
        });
      }

      // Mostrar mensagem de sucesso por alguns segundos
      setTimeout(() => {
        setSuccess(false);
        if (onSwitchToLogin) {
          onSwitchToLogin();
        }
      }, 2000);
    } catch (err) {
      setError('Erro ao conectar com o servidor');
      console.error('SignUp error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
          <CheckCircle className="text-green-500 flex-shrink-0" size={20} />
          <p className="text-green-700 text-sm font-medium">Conta criada com sucesso! Redirecionando...</p>
        </div>
      )}

      <form onSubmit={handleSignUp} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Senha
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
            disabled={loading}
          />
          <p className="text-xs text-gray-500 mt-1">Deve ter pelo menos 6 caracteres</p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
            Confirmar Senha
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirme sua senha"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader size={18} className="animate-spin" />
              Criando conta...
            </>
          ) : (
            'Registrar'
          )}
        </button>
      </form>

      {onSwitchToLogin && (
        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            Já tem conta?{' '}
            <button
              onClick={onSwitchToLogin}
              className="text-green-600 hover:text-green-700 font-medium"
            >
              Entrar
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
