import { useCallback } from "react";

/**
 * useSummerQuestProgress — single seam both arms read/write through.
 *
 *   const { mode, done, save } = useSummerQuestProgress({
 *     profileId,        // Reznor's profile id (the kid)
 *     summerQuest,      // shared map  { [profileId]: { mode, done } }
 *     setSummerQuest,   // shared synced setter (composite-key upsert
 *                       //   to summer_quest_progress)
 *   });
 *
 *   <SummerQuest    initialMode={mode} initialDone={done} onSave={save} />
 *   <ParentCompanion mode={mode}        done={done}        onSave={save} />
 *
 * Per the v2 brief: both arms share one Supabase row. Marking a quest
 * done in Coach Mode shows the same gem in the kid app and vice versa;
 * flipping Home/Road in either flips both. This hook is the seam that
 * enforces that contract — there's no second copy of the data.
 *
 * The hook intentionally does NOT own state. summerQuest lives in
 * App.jsx (the canonical store) and syncs to Supabase via the existing
 * makeSyncedSetter pipeline (DataProvider's upsert path). The hook is
 * a thin selector + memoized save so consumers don't have to re-derive
 * the slot or re-bind the callback on every render.
 *
 * If profileId is null/undefined (no kid in the family yet), `mode`
 * and `done` fall back to defaults and `save` is a no-op — caller is
 * still safe to render.
 */
export function useSummerQuestProgress({ profileId, summerQuest, setSummerQuest }) {
  const slot = (profileId && summerQuest?.[profileId]) || { mode: "home", done: {} };
  const save = useCallback(
    ({ mode, done }) => {
      if (!profileId || !setSummerQuest) return;
      setSummerQuest((prev) => ({
        ...prev,
        [profileId]: { mode, done },
      }));
    },
    [profileId, setSummerQuest]
  );
  return { mode: slot.mode, done: slot.done, save };
}
