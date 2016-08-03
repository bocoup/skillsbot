import {one} from '../../../services/db';
import {createCommand} from 'chatter';
import {pluralizeOn} from '../../../util/localization';

function formatCategory(header, arr) {
  const items = arr.length === 0 ? ['(none)'] : arr.map(([name, skillsCount]) => {
    const p = pluralizeOn(skillsCount);
    return `${name} (${p} skill${p()})`;
  });
  return [
    `*${header} categories*`,
    ...items.map(s => `> ${s}`),
  ];
}

export default createCommand({
  name: 'category list',
  description: 'List all skill categories.',
}, (message, {token}) => {
  return one.categoriesForTeam({token}).then(({active, inactive}) => {
    if (active.length === 0 && inactive.length === 0) {
      return 'No skill categories have been defined for your team yet.';
    }
    return [
      formatCategory('Active', active),
      formatCategory('Inactive', inactive),
    ];
  });
});
