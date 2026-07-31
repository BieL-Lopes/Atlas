import { ReactNode } from 'react';
import { X, Save, LucideIcon } from 'lucide-react';

interface ModalFooterAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: LucideIcon;
  disabled?: boolean;
}

interface ModalShellProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  onClose: () => void;
  children: ReactNode;
  /** Ações do footer. Se omitido, nenhum footer é renderizado. */
  footerActions?: ModalFooterAction[];
  /** Largura máxima do card. Default: 'max-w-lg' */
  maxWidth?: string;
}

/**
 * Componente reutilizável de Modal com overlay, header (ícone + título + close) e footer opcional.
 * Substitui o padrão duplicado em 8+ modais do projeto.
 */
export function ModalShell({
  title,
  subtitle,
  icon: Icon,
  onClose,
  children,
  footerActions,
  maxWidth = 'max-w-lg',
}: ModalShellProps) {
  const variantClasses: Record<string, string> = {
    primary:
      'bg-gold-deep hover:bg-gold-deep text-white',
    secondary:
      'border border-gray-200 text-gray-600 hover:bg-gray-50',
    danger:
      'bg-red-600 hover:bg-red-700 text-white',
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gold/10 rounded-xl flex items-center justify-center">
              <Icon className="w-5 h-5 text-gold-deep" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">{title}</h2>
              {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">{children}</div>

        {/* Footer (opcional) */}
        {footerActions && footerActions.length > 0 && (
          <div className="flex gap-3 p-5 pt-0">
            {footerActions.map((action, idx) => {
              const ActionIcon = action.icon;
              return (
                <button
                  key={idx}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={`flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${
                    variantClasses[action.variant || 'primary']
                  }`}
                >
                  {ActionIcon && <ActionIcon className="w-4 h-4" />}
                  {action.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
