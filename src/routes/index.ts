import mount from 'koa-mount';
import { AppKoa } from 'types';

import { imageRoutes } from 'resources/image';

export default (app: AppKoa) => {
  app.use(mount('/images', imageRoutes.routes));
}