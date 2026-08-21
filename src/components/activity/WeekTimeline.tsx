import ActivityTrainingCard from './ActivityTrainingCard';
import { formatDayHeader, formatDayLong, isSameLocalDay } from '../../utils/week';
import type { TrainingItem } from '../../types/training';

interface WeekTimelineProps {
  days: Date[];
  trainings: TrainingItem[];
}

function trainingsForDay(trainings: TrainingItem[], day: Date): TrainingItem[] {
  return trainings.filter((training) => isSameLocalDay(new Date(training.startAt), day));
}

// Timeline hebdomadaire sportive (§5) : une ligne continue plutôt qu'une
// rangée de cards indépendantes — horizontale sur desktop (7 colonnes reliées
// par un même trait), verticale sur mobile (même langage que GoalRoadmap).
// Aujourd'hui est le seul jour signalé en lime (§6), jamais toute la colonne.
function WeekTimeline({ days, trainings }: WeekTimelineProps) {
  return (
    <>
      <div className="hidden md:block">
        <div className="grid grid-cols-7 gap-4">
          {days.map((day) => {
            const isToday = isSameLocalDay(new Date(), day);
            return (
              <div key={day.toISOString()} className="flex flex-col gap-0.5">
                <p
                  className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${
                    isToday ? 'text-ekvara-black' : 'text-ekvara-muted'
                  }`}
                >
                  {isToday && (
                    <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-ekvara-lime" aria-hidden="true" />
                  )}
                  {formatDayHeader(day)}
                </p>
                {/* Le lime seul ne signale jamais "aujourd'hui" (§21) : le mot
                    reste écrit, même discrètement. */}
                {isToday && (
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-ekvara-black/40">
                    Aujourd'hui
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-3 border-t border-gray-200" aria-hidden="true" />

        <div className="mt-4 grid grid-cols-7 gap-4">
          {days.map((day) => (
            <div key={day.toISOString()} className="flex flex-col gap-3">
              {trainingsForDay(trainings, day).map((training) => (
                <ActivityTrainingCard key={training.id} training={training} />
              ))}
            </div>
          ))}
        </div>
      </div>

      <ul className="flex flex-col md:hidden">
        {days.map((day, index) => {
          const isToday = isSameLocalDay(new Date(), day);
          const dayTrainings = trainingsForDay(trainings, day);
          const isLast = index === days.length - 1;

          return (
            <li key={day.toISOString()} className="relative pb-6 pl-6 last:pb-0">
              {!isLast && (
                <span
                  className="absolute left-[5px] top-5 h-[calc(100%-1.25rem)] w-px bg-gray-200"
                  aria-hidden="true"
                />
              )}
              <span
                className={`absolute left-0 top-1 h-2.5 w-2.5 rounded-full ${
                  isToday ? 'bg-ekvara-lime' : 'border border-gray-300 bg-white'
                }`}
                aria-hidden="true"
              />

              <div className="flex items-center gap-2">
                <p className={`text-sm font-semibold ${isToday ? 'text-ekvara-black' : 'text-ekvara-black/80'}`}>
                  {formatDayLong(day)}
                </p>
                {isToday && (
                  <span className="text-xs font-semibold uppercase tracking-wide text-ekvara-muted">
                    Aujourd'hui
                  </span>
                )}
              </div>

              {dayTrainings.length === 0 ? (
                <p className="mt-1 text-sm text-ekvara-muted">Aucune activité</p>
              ) : (
                <div className="mt-2 flex flex-col gap-3">
                  {dayTrainings.map((training) => (
                    <ActivityTrainingCard key={training.id} training={training} />
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

export default WeekTimeline;
