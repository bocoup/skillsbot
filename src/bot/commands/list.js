import {createCommand} from 'chatter';
import {query} from '../../services/db';

export default createCommand({
  name: 'list',
  description: 'List all skills, grouped by category.',
}, (message, {token}) => {
  return query.skillsByCategory({token}).then(categories => {
    if (categories.length === 0) {
      return 'No skill categories have been defined for your team yet.';
    }
    return categories.map(({name, skills}) => {
      return `*${name}*\n> ${skills.join(', ')}`;
    });
  });
});
