import { useState, useEffect } from 'react';
import { Plus, Calendar, Clock, MapPin, Users, Trash2, Loader2, Bell } from 'lucide-react';
import { User } from '../lib/auth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { formatLongDate } from '../lib/dateUtils';
import {
  scheduleNotificationsForActivities,
  cancelAllScheduledNotifications
} from '../lib/notificationScheduler';

interface Activity {
  id: string;
  date: string;   // 'YYYY-MM-DD'
  time: string;
  title: string;
  location: string;
  type: 'reuniao' | 'visita';
  electorName?: string;
}

interface AgendaScreenProps {
  user: User;
}

export function AgendaScreen({ user }: AgendaScreenProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notificationPermissionDenied, setNotificationPermissionDenied] = useState(false);

  // Form state
  const [formType, setFormType] = useState<'reuniao' | 'visita'>('reuniao');
  const [formTitle, setFormTitle] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formTime, setFormTime] = useState('');

  useEffect(() => {
    fetchActivities();
  }, []);

  // Re-agenda notificações quando atividades mudam
  useEffect(() => {
    const scheduleNotifs = async () => {
      try {
        // Cancela notificações anteriores
        cancelAllScheduledNotifications();

        // Agenda novas para atividades de hoje
        await scheduleNotificationsForActivities(activities, 30);
      } catch (err) {
        console.warn('Erro ao agendar notificações:', err);
        setNotificationPermissionDenied(true);
      }
    };

    if (activities.length > 0) {
      scheduleNotifs();
    }

    return () => {
      // Limpa ao desmontar
      cancelAllScheduledNotifications();
    };
  }, [activities]);

  const fetchActivities = async () => {
    setLoading(true);
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase
        .from('agenda_itens')
        .select('*')
        .eq('criado_por', user.id)
        .order('data', { ascending: true });
      if (data) {
        setActivities(data.map((row: Record<string, unknown>) => ({
          id: row.id as string,
          date: row.data as string,
          time: row.horario as string,
          title: row.titulo as string,
          location: row.local as string,
          type: row.tipo as 'reuniao' | 'visita',
          electorName: (row.eleitor_nome as string) ?? undefined,
        })));
      }
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) { alert('Digite o título da atividade'); return; }
    if (!formDate) { alert('Selecione a data'); return; }
    setSaving(true);

    const newActivity: Activity = {
      id: `local-${Date.now()}`,
      date: formDate,
      time: formTime,
      title: formTitle.trim(),
      location: formLocation.trim(),
      type: formType,
    };

    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase
        .from('agenda_itens')
        .insert({
          titulo: formTitle.trim(),
          local: formLocation.trim(),
          data: formDate,
          horario: formTime,
          tipo: formType,
          criado_por: user.id,
        })
        .select()
        .single();
      if (data) newActivity.id = data.id as string;
    }

    setActivities(prev =>
      [...prev, newActivity].sort((a, b) => a.date.localeCompare(b.date))
    );
    setFormTitle('');
    setFormLocation('');
    setFormTime('');
    setFormType('reuniao');
    setFormDate(new Date().toISOString().split('T')[0]);
    setShowForm(false);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir esta atividade?')) return;
    if (isSupabaseConfigured && supabase) {
      await supabase.from('agenda_itens').delete().eq('id', id);
    }
    setActivities(prev => prev.filter(a => a.id !== id));
  };

  const grouped = activities.reduce((acc, a) => {
    if (!acc[a.date]) acc[a.date] = [];
    acc[a.date].push(a);
    return acc;
  }, {} as Record<string, Activity[]>);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gold-deep text-white p-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold">Minha Agenda</h1>
          <Bell className="w-5 h-5" />
        </div>
        <p className="text-sm text-gold-soft">
          {notificationPermissionDenied
            ? 'Notificações desativadas — verifique as permissões do navegador'
            : 'Você receberá alertas 30 minutos antes de cada atividade'}
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Botão Nova Atividade */}
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full bg-gold-deep hover:bg-gold-deep text-white py-4 px-6 rounded-xl font-semibold shadow-lg flex items-center justify-center transition-all"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nova Atividade
        </button>

        {/* Formulário */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-lg p-5 border-2 border-gold-deep">
            <h3 className="font-bold text-gray-900 mb-4">Criar Nova Atividade</h3>

            <div className="space-y-3">
              {/* Tipo */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormType('reuniao')}
                  className={`py-3 px-4 rounded-lg border-2 font-semibold transition-colors ${
                    formType === 'reuniao'
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  Reunião
                </button>
                <button
                  type="button"
                  onClick={() => setFormType('visita')}
                  className={`py-3 px-4 rounded-lg border-2 font-semibold transition-colors ${
                    formType === 'visita'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                      : 'border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  Visita
                </button>
              </div>

              <input
                type="text"
                placeholder="Título da atividade"
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-gold-deep focus:outline-none"
              />

              <input
                type="text"
                placeholder="Local"
                value={formLocation}
                onChange={e => setFormLocation(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-gold-deep focus:outline-none"
              />

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-gold-deep focus:outline-none"
                />
                <input
                  type="time"
                  value={formTime}
                  onChange={e => setFormTime(e.target.value)}
                  className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-gold-deep focus:outline-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-gold-deep hover:bg-gold-deep disabled:opacity-50 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Salvar
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gold-soft" />
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600">Nenhuma atividade agendada</p>
            <p className="text-sm text-gray-500 mt-1">Crie sua primeira visita ou reunião</p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, dayActivities]) => (
            <div key={date}>
              <h2 className="text-xl font-bold text-gray-900 capitalize mb-1">
                {formatLongDate(date)}
              </h2>

              <div className="space-y-3 mb-6">
                {dayActivities.map(activity => (
                  <div
                    key={activity.id}
                    className="bg-white rounded-xl shadow p-4 border-l-4 border-gold-deep"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-gold/10 rounded-lg flex items-center justify-center mr-3">
                          <Clock className="w-6 h-6 text-gold-deep" />
                        </div>
                        <div>
                          <p className="font-bold text-gold-deep">{activity.time || '--:--'}</p>
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                            activity.type === 'reuniao'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {activity.type === 'reuniao' ? 'Reunião' : 'Visita'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(activity.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    <p className="font-semibold text-gray-900 mb-2">{activity.title}</p>

                    <div className="space-y-1 text-sm text-gray-600">
                      {activity.location && (
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                          <span>{activity.location}</span>
                        </div>
                      )}
                      {activity.electorName && (
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-2 text-gray-500" />
                          <span>{activity.electorName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
