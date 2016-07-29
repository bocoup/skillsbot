import Promise from 'bluebird';
import moment from 'moment';
import heredoc from 'heredoc-tag';
import {createCommand, createMatcher, createParser} from 'chatter';
import {one, oneOrNone, none, query} from '../../services/db';
import {getBestMatch} from '../lib/matching';
import {questions} from '../lib/dialog';

const intExpProps = ['interest', 'experience'];

function updateSkill({userId, skill, newValues}) {
  const {id: skillId} = skill;
  const {interest, experience, reason = ''} = newValues;
  return Promise.mapSeries([
    // Get current values. This has to be done before getting the new values!
    () => oneOrNone.currentSkillValues({userId, skillId}),
    // Update database with new values.
    () => none.updateSkill({userId, skillId, experience, interest, reason}),
  ], f => f())
  .spread(oldValues => {
    // Show a summary of the changes.
    const summary = intExpProps.map(prop => {
      const name = prop[0].toUpperCase() + prop.slice(1).toLowerCase();
      if (!oldValues) {
        return `${name} set to ${newValues[prop]}.`;
      }
      else if (String(newValues[prop]) === String(oldValues[prop])) {
        return `${name} unchanged at ${newValues[prop]}.`;
      }
      return `${name} changed from ${oldValues[prop]} to ${newValues[prop]}.`;
    });
    return [
      `Skill for *${skill.name}* updated:`,
      summary.map(s => `> ${s}`),
      Boolean(reason) && `> Reason set to "${reason}"`,
    ];
  });
}

// =================================
// update <skill name>
// =================================

function updateSkillQuestions(state, headers) {
  const {
    scales,
    oldValues,
    newValues,
    userId,
    skill,
    skillName,
    updateCommand,
    getCommand,
    skippable,
    done,
  } = state;

  const startOver = () => updateSkillQuestions(state, ['_Starting over._']);

  const hasInterestChanged = () => !oldValues || newValues.interest !== oldValues.interest;
  const hasExperienceChanged = () => !oldValues || newValues.experience !== oldValues.experience;

  function getInterestQuestion() {
    return {
      question: `Choose your interest level for ${skillName}:`,
      choices: scales.interest,
      onAnswer: answer => {
        newValues.interest = Number(answer);
        return `_You selected *${newValues.interest}* for interest, thanks!_`;
      },
    };
  }

  function getExperienceQuestion() {
    return {
      question: `Choose your experience level for ${skillName}:`,
      choices: scales.experience,
      onAnswer: answer => {
        newValues.experience = Number(answer);
        return `_You selected *${newValues.experience}* for experience, thanks!_`;
      },
    };
  }

  function getConfirmNoChangeQuestion() {
    return {
      question: heredoc.trim.unindent`
        Your interest and experience for ${skillName} haven't changed! Is this ok?
        > Interest: *${scales.interest[newValues.interest]}*
        > Experience: *${scales.experience[newValues.experience]}*

      `,
      choices: [
        `Continue without making changes.`,
        `No, re-choose interest and experience for ${skillName}.`,
      ],
      onAnswer(answer) {
        if (answer === 2) {
          return startOver();
        }
        return done(`_Skill data for *${skill.name}* unchanged._`);
      },
    };
  }

  function getReasonQuestion() {
    if (oldValues) {
      const parts = [];
      if (hasInterestChanged()) { parts.push('interest'); }
      if (hasExperienceChanged()) { parts.push('experience'); }
      const str1 = parts.length === 1 ? 'has' : 'have';
      const str2 = parts.join(' and ');
      return {
        question: `Why ${str1} your ${str2} changed for ${skillName}?`,
        onAnswer: answer => {
          newValues.reason = answer;
          return '_Noted!_';
        },
      };
    }
  }

  function getConfirmChangeQuestion() {
    const reason = 'reason' in newValues ? `> Reason: *${newValues.reason}*\n` : '';
    return {
      question: heredoc.trim.unindent`
        You've entered the following for ${skillName}. Is this ok?
        > Interest: *${scales.interest[newValues.interest]}*
        > Experience: *${scales.experience[newValues.experience]}*
        ${reason}
      `,
      choices: [
        `Save these changes.`,
        `No, re-choose interest and experience for ${skillName}.`,
      ],
      onAnswer(answer) {
        if (answer === 2) {
          return startOver();
        }
        return updateSkill({userId, skill, newValues}).then(done);
      },
    };
  }

  return questions({
    headers,
    questions: [
      () => getInterestQuestion(),
      () => getExperienceQuestion(),
      () => {
        if (!hasInterestChanged() && !hasExperienceChanged()) {
          return getConfirmNoChangeQuestion();
        }
        return [
          () => getReasonQuestion(),
          () => getConfirmChangeQuestion(),
        ];
      },
    ],
    strExit: skippable ? ['exit', 'skip'] : ['exit'],
    fmtPrompt([exit, skip]) {
      const str1 = skip ? `, type *${skip}* to skip, or` : ' or type';
      return `Please answer${str1} *${exit}* to cancel.`;
    },
    onExit(exit) {
      if (exit === 'skip') {
        return done(`_Skipping ${skillName} for now!_`, true);
      }
      return `Canceled, please type \`${getCommand(updateCommand)}\` to try again.`;
    },
  });
}

function updateSkillDialog({
  userId,
  skill,
  updateCommand,
  getCommand,
  oneTimeHeader = null,
  skippable = false,
  done,
}) {
  const {id: skillId} = skill;
  const skillName = `*${skill.name}*`;
  return Promise.all([
    one.scales(),
    oneOrNone.currentSkillValues({userId, skillId}),
  ])
  .spread((scales, oldValues) => {
    // Reformat scales object into a per-scale map of ranking-to-description.
    const rankingMap = scale => scale.reduce((memo, [ranking, description]) => {
      memo[ranking] = description;
      return memo;
    }, {});
    intExpProps.forEach(prop => scales[prop] = rankingMap(scales[prop]));

    let lastUpdated;
    if (oldValues) {
      const formatted = moment.duration(-oldValues.age, 'seconds').humanize(true);
      lastUpdated = `_You last updated this skill *${formatted}*._`;
    }

    const state = {
      scales,
      oldValues,
      newValues: {},
      userId,
      skill,
      skillName,
      updateCommand,
      getCommand,
      skippable,
      done,
    };

    return updateSkillQuestions(state, [
      [
        oneTimeHeader,
      ],
      [
        lastUpdated,
        '',
        `> ${skillName} / *${skill.category}*`,
        skill.description && `${skill.description.replace(/^/gm, '> ')}`,
      ],
    ]);
  });
}

// ========================
// update missing
// ========================

function updateMissing(userId, getCommand) {
  let i = 0;
  const skipped = [];
  const skillCount = n => `${n.length} skill${n.length === 1 ? '' : 's'}`;
  function next(header) {
    i++;
    return query.outstandingSkillsForUser({userId})
    .then(missing => {
      const notSkipped = missing.filter(({id}) => skipped.indexOf(id) === -1);
      if (notSkipped.length === 0) {
        const done = i > 1 ? 'Done. ' : '';
        return [
          header,
          missing.length === 0 ? `${done}You have no outstanding skill data.` :
            `${done}You still have outstanding skill data for ${skillCount(missing)}.`,
          `View your skill list with \`${getCommand('me')}\`.`,
        ];
      }
      const skill = notSkipped[0];
      const identifier = notSkipped.length === 1 ? 'it' : i === 1 ? 'the first' : 'the next';
      const now = i > 1 ? ' now' : '';
      const skipTxt = skipped.length > 0 ? ` (you've skipped ${skipped.length})` : '';
      return updateSkillDialog({
        userId,
        skill,
        updateCommand: 'update missing',
        getCommand,
        oneTimeHeader: [
          header && [header, ''],
          `I${now} need data for ${skillCount(notSkipped)}${skipTxt}. Let's update ${identifier}:`,
        ],
        skippable: true,
        done: (result, skip) => {
          if (skip) {
            skipped.push(skill.id);
          }
          return next(result);
        },
      });
    });
  }
  return next();
}

export default createCommand({
  name: 'update',
  description: 'Update your interest and experience for the given skill.',
  usage: '[missing | <skill name> [interest=<1-5> experience=<1-5>]]',
}, [
  createMatcher({match: 'missing'}, (_, {user, getCommand}) => updateMissing(user.id, getCommand)),
  createParser({
    parseOptions: {
      experience: Number,
      interest: Number,
    },
  }, ({args, options: newValues, errors}, {user, token, getCommand}) => {
    const userId = user.id;
    const search = args.join(' ');
    if (!search) {
      return query.outstandingSkillsForUser({userId})
      .then(outstandingData => {
        const outstanding = outstandingData.map(o => o.name).join(', ');
        return [
          heredoc.oneline.trim`
            Update your outstanding skills with \`${getCommand('update missing')}\`,
            or update a specific skill with \`${getCommand('update <skill name>')}\`.
          `,
          outstanding ?
            heredoc.oneline.trim`
              > *You have ${outstandingData.length} outstanding skills that need to be updated:* ${outstanding}
            ` :
            heredoc.oneline.trim`
              > You have no outstanding skills. Have your experience or interest levels changed for any skill
              lately? If so, update them!
            `,
        ];
      });
    }
    const buffer = [...errors];
    // Print all buffered output + final message + tag line.
    const done = message => [
      buffer,
      message,
      `View your skill list with \`${getCommand('me')}\`.`,
    ];
    return query.skillByName({token, search})
    .then(matches => {
      // Test if match is good, ambiguous, etc.
      const {match: skill, output} = getBestMatch(search, matches);
      // Add any output from the test to the buffer.
      buffer.push(output);
      // Exit now if match was ambiguous.
      if (!skill) {
        return buffer;
      }
      const numProps = intExpProps.reduce((n, p) => n + (p in newValues), 0);
      if (numProps === 1) {
        buffer.push(`_You must update both interest and experience at the same time._`);
        return buffer;
      }
      else if (numProps === 2) {
        return updateSkill({userId, skill, newValues}).then(done);
      }
      const updateCommand = `update ${search.toLowerCase()}`;
      return updateSkillDialog({
        userId,
        skill,
        updateCommand,
        getCommand,
        oneTimeHeader: buffer.splice(0, buffer.length),
        done,
      });
    });
  }),
]);
