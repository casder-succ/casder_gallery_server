import { routeUtil } from 'utils';

import split from './actions/split';

const routes = routeUtil.getRoutes([
  split,
]);

export default {
  routes,
}