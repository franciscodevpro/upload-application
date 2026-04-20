// App.tsx
import { Outlet } from 'react-router';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...classes: (string | undefined | null | false)[]) => twMerge(clsx(classes));

export default function App() {

  return (
    <div className={cn('content font-sans')}>
      <Outlet />
    </div>
  );
};