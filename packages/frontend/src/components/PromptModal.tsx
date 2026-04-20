import type { FormEvent } from 'react';
import { X } from 'lucide-react';

interface PromptModalProps {
  open: boolean;
  title: string;
  description?: string;
  placeholder?: string;
  initialValue?: string;
  submitLabel?: string;
  onSubmit: (value: string) => void;
  onClose: () => void;
}

export default function PromptModal({
  open,
  title,
  description,
  placeholder = '',
  initialValue = '',
  submitLabel = 'Confirmar',
  onSubmit,
  onClose,
}: PromptModalProps) {
  if (!open) return null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const value = (formData.get('promptValue') as string)?.trim();
    if (value) {
      onSubmit(value);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background-primary/60 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-200 rounded-lg bg-background-secondary border border-border-primary p-8 shadow-2xl animate-slide-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-display font-semibold text-text-primary">{title}</h2>
            {description && <p className="mt-2 text-base text-text-secondary font-sans">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl p-2 text-text-muted transition hover:bg-background-tertiary hover:text-text-primary"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <label className="block text-base font-medium text-text-secondary font-sans mb-3">Nome</label>
          <input
            name="promptValue"
            defaultValue={initialValue}
            placeholder={placeholder}
            className="w-full rounded-3xl border border-border-secondary bg-background-primary px-5 py-4 text-text-primary outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 font-sans text-base"
            autoFocus
          />
          <div className="mt-8 flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-3xl border border-border-secondary px-6 py-3 text-base font-medium text-text-secondary transition hover:bg-background-tertiary font-sans"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-3xl bg-primary-600 px-6 py-3 text-base font-medium text-white transition hover:bg-primary-700 hover:shadow-glow font-sans"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
