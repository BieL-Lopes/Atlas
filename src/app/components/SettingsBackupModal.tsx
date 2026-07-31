import { useRef } from 'react';
import { Download, Upload, Database } from 'lucide-react';
import { toast } from 'sonner';
import { ModalShell } from './ModalShell';

interface Props {
  onClose: () => void;
}

export function SettingsBackupModal({ onClose }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    try {
      const data: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          data[key] = localStorage.getItem(key) || '';
        }
      }
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `atlas_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Backup exportado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao exportar backup');
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        if (window.confirm('Atenção: A restauração substituirá todos os dados atuais. Tem certeza?')) {
          localStorage.clear();
          for (const key in data) {
            localStorage.setItem(key, data[key]);
          }
          toast.success('Backup restaurado com sucesso! Recarregando...');
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      } catch (err) {
        console.error(err);
        toast.error('Erro ao ler arquivo de backup. Verifique se o formato está correto.');
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <ModalShell
      title="Backup de Dados"
      subtitle="Exportar e restaurar via JSON"
      icon={Database}
      onClose={onClose}
      footerActions={[
        { label: 'Fechar', onClick: onClose, variant: 'secondary' },
      ]}
    >
      <div className="space-y-6">
        <div className="bg-blue-50 border border-gold-deep rounded-xl p-4">
          <p className="text-sm text-gold-deep font-medium mb-1">Exportar Base de Dados</p>
          <p className="text-xs text-gold-deep mb-3">
            Gera um arquivo .json com todos os eleitores, usuários e configurações salvas no dispositivo atual.
          </p>
          <button
            onClick={handleExport}
            className="w-full py-2.5 bg-gold-deep hover:bg-gold-deep text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            Baixar Backup
          </button>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-800 font-medium mb-1">Restaurar Base de Dados</p>
          <p className="text-xs text-red-700 mb-3">
            Cuidado: Carregar um backup substituirá <strong>TODOS</strong> os dados atuais deste dispositivo.
          </p>
          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            onChange={handleImport}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Carregar Backup
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
