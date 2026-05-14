// App.tsx
import { Outlet } from 'react-router';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AuthProvider } from './contexts/AuthContext';

const cn = (...classes: (string | undefined | null | false)[]) => twMerge(clsx(classes));

export default function App() {

  return (
    <div className={cn('content font-sans')}>
      <AuthProvider>
          <Outlet />
      </AuthProvider>
    </div>
  );
};