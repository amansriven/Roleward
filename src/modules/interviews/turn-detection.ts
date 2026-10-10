/**
 * How a voice interview decides the candidate has finished an answer. Shared by
 * the token route, which sets the starting mode, and the browser, which can
 * switch modes mid-session.
 */
export const TURN_MODES = ["auto", "push_to_talk"] as const;
export type TurnMode = (typeof TURN_MODES)[number];

export const TURN_MODE_LABELS: Record<TurnMode, string> = {
  auto: "Hands-free",
  push_to_talk: "Push to talk",
};

/**
 * Hands-free uses semantic VAD at low eagerness: the model judges whether the
 * thought is finished rather than timing silence. The default server VAD ended
 * a turn after 500ms of quiet, so every breath mid-answer split the answer and
 * let the interviewer cut in.
 *
 * Push to talk turns detection off entirely; the browser commits each answer
 * when the candidate says they are done.
 */
export function turnDetectionFor(mode: TurnMode) {
  if (mode === "push_to_talk") return null;
  return {
    type: "semantic_vad",
    eagerness: "low",
    create_response: true,
    interrupt_response: true,
  } as const;
}
