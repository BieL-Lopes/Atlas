import { lazy, Suspense } from 'react';
import { User } from '../lib/auth';
const InviteShareModule = lazy(() => import('./InviteShareModule').then(m => ({ default: m.InviteShareModule })));
import { Users } from 'lucide-react';

interface InviteScreenProps {
  user: User;
}

export function InviteScreen({ user }: InviteScreenProps) {
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gold-deep text-white p-6 mb-6">
        <h1 className="text-2xl font-bold mb-2">Sua Rede</h1>
        <p className="text-sm opacity-90">
          Convide novos membros e acompanhe o crescimento da sua rede de indicações.
        </p>
      </div>

      <div className="px-4 space-y-6">
        {/* Módulo Principal de Indicação */}
        <Suspense fallback={<div className="animate-pulse bg-gray-200 h-16 rounded-xl"></div>}>
          <InviteShareModule user={user} />
        </Suspense>

        {/* Em Breve: Lista da Rede */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Membros Indicados</h3>
          <p className="text-sm text-gray-500">
            As pessoas que se cadastrarem pelo seu link aparecerão aqui em breve.
          </p>
        </div>
      </div>
    </div>
  );
}
