import { useState, useRef } from 'react';
import { X, Download, Upload, Database } from 'lucide-react';
import { toast } from 'sonner';

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
      a.download = `politiqui_backup_${new Date().toISOString().split('T')[0]}.json`;
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Backup de Dados</h2>
              <p className="text-xs text-gray-400">Exportar e restaurar via JSON</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800 font-medium mb-1">Exportar Base de Dados</p>
            <p className="text-xs text-blue-700 mb-3">
              Gera um arquivo .json com todos os eleitores, usuários e configurações salvas no dispositivo atual.
            </p>
            <button
              onClick={handleExport}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
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

        {/* Footer */}
        <div className="p-5 pt-0">
          <button onClick={onClose} className="w-full py-2.5 border border-gray-200 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
