import {createCommand} from 'chatter';
import {query} from '../../services/db';

export default createCommand({
  name: 'list',
  description: 'List all skills, grouped by category.',
}, (message, {teamId}) => {
  return query.skillsByCategory({teamId}).then(categories => {
    return categories.map(({name, skills}) => {
      return `*${name}*\n> ${skills.join(', ')}`;
    });
  });
});
