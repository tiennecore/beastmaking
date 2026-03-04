import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  ClimbingSession,
  ClimbingType,
  EffortType,
  DifficultyLevel,
} from '@/types';
import {
  loadClimbingSessions,
  saveClimbingSession,
  deleteClimbingSession,
} from '@/lib/storage';

const CLIMBING_TYPES: { value: ClimbingType; label: string }[] = [
  { value: 'bloc', label: 'Bloc' },
  { value: 'voie', label: 'Voie' },
  { value: 'renfo', label: 'Renfo' },
];

const EFFORT_TYPES: { value: EffortType; label: string }[] = [
  { value: 'aerobic', label: 'Aérobie' },
  { value: 'force', label: 'Force' },
  { value: 'resistance', label: 'Résistance' },
  { value: 'power', label: 'Puissance' },
  { value: 'technique', label: 'Technique' },
];

const DIFFICULTY_LEVELS: { value: DifficultyLevel; label: string }[] = [
  { value: 'easy', label: 'Facile' },
  { value: 'medium', label: 'Moyen' },
  { value: 'hard', label: 'Dur' },
  { value: 'max', label: 'Max' },
];

const TYPE_COLORS: Record<ClimbingType, string> = {
  bloc: '#F97316',
  voie: '#2563EB',
  renfo: '#9333EA',
};

const EFFORT_LABELS: Record<EffortType, string> = {
  aerobic: 'Aérobie',
  force: 'Force',
  resistance: 'Résistance',
  power: 'Puissance',
  technique: 'Technique',
};

const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  easy: 'Facile',
  medium: 'Moyen',
  hard: 'Dur',
  max: 'Max',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function ToggleButton<T extends string>({
  value,
  selected,
  label,
  onPress,
}: {
  value: T;
  selected: boolean;
  label: string;
  onPress: (v: T) => void;
}) {
  return (
    <Pressable
      className={`px-3 py-2 rounded-lg border ${
        selected
          ? 'bg-orange-500 border-orange-500'
          : 'bg-stone-800 border-stone-700'
      }`}
      onPress={() => onPress(value)}
    >
      <Text
        className={`text-sm font-medium text-center ${
          selected ? 'text-white' : 'text-stone-300'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function DifficultyBadge({ level }: { level: DifficultyLevel }) {
  const filled =
    level === 'easy' ? 1 : level === 'medium' ? 2 : level === 'hard' ? 3 : 4;
  return (
    <View className="flex-row items-center gap-0.5">
      {[1, 2, 3, 4].map((i) => (
        <Text key={i} className={i <= filled ? 'text-red-500' : 'text-stone-600'}>
          ★
        </Text>
      ))}
      <Text className="text-stone-400 text-xs ml-1">
        {DIFFICULTY_LABELS[level]}
      </Text>
    </View>
  );
}

function SessionCard({
  session,
  onDelete,
}: {
  session: ClimbingSession;
  onDelete: (id: string) => void;
}) {
  const typeColor = TYPE_COLORS[session.type];
  const typeLabel = CLIMBING_TYPES.find((t) => t.value === session.type)?.label ?? session.type;
  const hasDetails =
    session.routeCount || session.grades || session.duration || session.notes;

  return (
    <Pressable
      className="bg-stone-800 rounded-2xl p-4 mb-3"
      onLongPress={() => {
        Alert.alert(
          'Supprimer la séance',
          `Supprimer la séance du ${formatDate(session.date)} ?`,
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Supprimer',
              style: 'destructive',
              onPress: () => onDelete(session.id),
            },
          ]
        );
      }}
    >
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-stone-400 text-sm">
          {formatDate(session.date)}
        </Text>
        <View
          className="px-2 py-0.5 rounded-full"
          style={{ backgroundColor: typeColor }}
        >
          <Text className="text-white text-xs font-bold">{typeLabel}</Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="text-white text-sm">
          {EFFORT_LABELS[session.effortType]}
        </Text>
        <DifficultyBadge level={session.difficulty} />
      </View>

      {hasDetails && (
        <View className="mt-3 pt-3 border-t border-stone-700">
          {session.routeCount != null && (
            <Text className="text-stone-400 text-sm">
              {session.type === 'voie' ? 'Voies' : 'Blocs'} : {session.routeCount}
            </Text>
          )}
          {session.grades != null && (
            <Text className="text-stone-400 text-sm">
              Cotations : {session.grades}
            </Text>
          )}
          {session.duration != null && (
            <Text className="text-stone-400 text-sm">
              Durée : {session.duration} min
            </Text>
          )}
          {session.notes != null && (
            <Text className="text-stone-300 text-sm mt-1 italic">
              {session.notes}
            </Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

export default function ClimbingScreen() {
  const [sessions, setSessions] = useState<ClimbingSession[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Form state
  const [type, setType] = useState<ClimbingType>('bloc');
  const [effortType, setEffortType] = useState<EffortType>('force');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
  const [routeCount, setRouteCount] = useState('');
  const [grades, setGrades] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const loadSessions = useCallback(async () => {
    const data = await loadClimbingSessions();
    setSessions(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [loadSessions])
  );

  function resetForm() {
    setType('bloc');
    setEffortType('force');
    setDifficulty('medium');
    setRouteCount('');
    setGrades('');
    setDuration('');
    setNotes('');
    setShowDetails(false);
  }

  async function handleSave() {
    const session: ClimbingSession = {
      id: Date.now().toString(),
      date: today,
      type,
      effortType,
      difficulty,
      ...(routeCount ? { routeCount: parseInt(routeCount, 10) } : {}),
      ...(grades.trim() ? { grades: grades.trim() } : {}),
      ...(duration ? { duration: parseInt(duration, 10) } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };

    await saveClimbingSession(session);
    resetForm();
    setShowForm(false);
    await loadSessions();
  }

  async function handleDelete(id: string) {
    await deleteClimbingSession(id);
    await loadSessions();
  }

  return (
    <ScrollView className="flex-1 bg-stone-950 px-4 pt-4">
      {/* Add session button / form */}
      {!showForm ? (
        <Pressable
          className="bg-orange-500 rounded-2xl p-4 mb-6 active:opacity-80"
          onPress={() => setShowForm(true)}
        >
          <Text className="text-white text-center font-bold text-lg">
            + Ajouter une séance
          </Text>
        </Pressable>
      ) : (
        <View className="bg-stone-800 rounded-2xl p-4 mb-6">
          <Text className="text-white text-lg font-bold mb-4">
            Nouvelle séance
          </Text>

          {/* Date */}
          <Text className="text-stone-400 text-sm mb-1">Date</Text>
          <View className="bg-stone-700 rounded-lg px-3 py-2 mb-4">
            <Text className="text-white">{formatDate(today)}</Text>
          </View>

          {/* Type */}
          <Text className="text-stone-400 text-sm mb-2">Type</Text>
          <View className="flex-row gap-2 mb-4">
            {CLIMBING_TYPES.map((t) => (
              <ToggleButton
                key={t.value}
                value={t.value}
                selected={type === t.value}
                label={t.label}
                onPress={setType}
              />
            ))}
          </View>

          {/* Effort type */}
          <Text className="text-stone-400 text-sm mb-2">Type d'effort</Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {EFFORT_TYPES.map((e) => (
              <ToggleButton
                key={e.value}
                value={e.value}
                selected={effortType === e.value}
                label={e.label}
                onPress={setEffortType}
              />
            ))}
          </View>

          {/* Difficulty */}
          <Text className="text-stone-400 text-sm mb-2">Difficulté</Text>
          <View className="flex-row gap-2 mb-4">
            {DIFFICULTY_LEVELS.map((d) => (
              <ToggleButton
                key={d.value}
                value={d.value}
                selected={difficulty === d.value}
                label={d.label}
                onPress={setDifficulty}
              />
            ))}
          </View>

          {/* Optional details */}
          <Pressable
            className="mb-4"
            onPress={() => setShowDetails(!showDetails)}
          >
            <Text className="text-red-400 text-sm font-medium">
              {showDetails ? '▾ Moins de détails' : '▸ Plus de détails'}
            </Text>
          </Pressable>

          {showDetails && (
            <View className="gap-3 mb-4">
              <View>
                <Text className="text-stone-400 text-sm mb-1">
                  Nombre de {type === 'voie' ? 'voies' : 'blocs'}
                </Text>
                <TextInput
                  className="bg-stone-700 text-white rounded-lg px-3 py-2"
                  placeholder="Ex: 15"
                  placeholderTextColor="#737373"
                  keyboardType="numeric"
                  value={routeCount}
                  onChangeText={setRouteCount}
                />
              </View>

              <View>
                <Text className="text-stone-400 text-sm mb-1">Cotations</Text>
                <TextInput
                  className="bg-stone-700 text-white rounded-lg px-3 py-2"
                  placeholder="Ex: 6a, 6b+, 7a"
                  placeholderTextColor="#737373"
                  value={grades}
                  onChangeText={setGrades}
                />
              </View>

              <View>
                <Text className="text-stone-400 text-sm mb-1">
                  Durée (minutes)
                </Text>
                <TextInput
                  className="bg-stone-700 text-white rounded-lg px-3 py-2"
                  placeholder="Ex: 90"
                  placeholderTextColor="#737373"
                  keyboardType="numeric"
                  value={duration}
                  onChangeText={setDuration}
                />
              </View>

              <View>
                <Text className="text-stone-400 text-sm mb-1">Notes</Text>
                <TextInput
                  className="bg-stone-700 text-white rounded-lg px-3 py-2"
                  placeholder="Ressenti, conditions..."
                  placeholderTextColor="#737373"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  value={notes}
                  onChangeText={setNotes}
                />
              </View>
            </View>
          )}

          {/* Actions */}
          <View className="flex-row gap-3">
            <Pressable
              className="flex-1 bg-stone-700 rounded-lg py-3 active:opacity-80"
              onPress={() => {
                resetForm();
                setShowForm(false);
              }}
            >
              <Text className="text-stone-300 text-center font-medium">
                Annuler
              </Text>
            </Pressable>
            <Pressable
              className="flex-1 bg-orange-500 rounded-lg py-3 active:opacity-80"
              onPress={handleSave}
            >
              <Text className="text-white text-center font-bold">
                Enregistrer
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Session list */}
      {sessions.length === 0 ? (
        <View className="items-center py-12">
          <Text className="text-4xl mb-3">🧗</Text>
          <Text className="text-stone-400 text-center">
            Aucune séance enregistrée.{'\n'}Ajoute ta première séance de grimpe !
          </Text>
        </View>
      ) : (
        <View>
          <Text className="text-stone-400 text-sm mb-3">
            {sessions.length} séance{sessions.length > 1 ? 's' : ''}
          </Text>
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onDelete={handleDelete}
            />
          ))}
        </View>
      )}

      <View className="h-8" />
    </ScrollView>
  );
}
