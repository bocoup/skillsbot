import heredoc from 'heredoc-tag';

// ==================
// FORMATTING HELPERS
// ==================

// Fancy "graphics"
export const CIRCLE_FILLED = '\u25CF';
export const CIRCLE_EMPTY = '\u25CB';

// Formating helper - formats a value into a small bar graph like this: ●●●○○ (3)
export function formatStatusBar(value) {
  return `${CIRCLE_FILLED.repeat(value)}${CIRCLE_EMPTY.repeat(5 - value)}`;
}

// Data-formatting helper.
export function formatByInterestAndExperience(rows, fn) {
  if (rows.length === 0) { return null; }
  return [
    `> *Interest*     |  *Experience*`,
    ...rows.map(row => {
      const {interest, experience} = row;
      return heredoc.oneline.trim`
        > ${formatStatusBar(interest)} (${interest}) | ${formatStatusBar(experience)}
        (${experience}): ${fn(row)}
      `;
    }),
  ];
}

// Data formatting for skill statistics
export function formatSkillStats({interest, experience}) {
  const graph = arr => {
    const total = arr.reduce((sum, [, count]) => sum + count, 0);
    return arr.map(([ranking, count]) => {
      const pct = Math.round(count / total * 100);
      const bar = CIRCLE_FILLED.repeat(count);
      const parts = [bar, `${pct}%`].filter(Boolean);
      return `> *${ranking}.* ${parts.join(' ')}`;
    });
  };
  return [
    '*Interest Distribution:*',
    graph(interest),
    '*Experience Distribution:*',
    graph(experience),
  ];
}
