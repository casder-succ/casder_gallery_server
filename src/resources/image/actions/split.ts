import axios from 'axios';
import path from 'path';
import fs from 'fs/promises';

import { AppKoaContext, AppRouter } from 'types';
import { cloudStorageService } from 'services';

import cp from 'child_process';
import * as console from 'console';

type Request = {
  body: {
    image: string;
    fileName: string;
  }
}

const mimeTypes: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.jpeg': 'image/jpeg',
  '.dzi': 'application/xml',
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const splitFile = async (name: string, fileBuffer: Buffer) => {
  const fileName = name
    .replace(/\s+/g, '')
    .replace(/\\+/g, '')
    .replace(/[.,]+/g, '');

  await fs.writeFile(`./src/assets/images/${fileName}`, fileBuffer);

  const fileOriginalName = fileName.replace(path.extname(fileName), '');

  const result = await new Promise((resolve, reject) => {
    cp.exec(`./src/assets/images/magick-slicer.sh ./src/assets/images/${fileName}`, (err, stdout, stderr) => {
      if (err) reject(err);
      if (stderr) reject(stderr);
      resolve(stdout);
    });
  });

  const dirName = `${fileOriginalName}_files`;
  const dziFileName = `${fileOriginalName}.dzi`;
  const dirNames = await fs.readdir(`./${fileOriginalName}_files`);

  for (const dir of dirNames) {
    const files = await fs.readdir(`./${fileOriginalName}_files/${dir}`);

    for (const file of files) {
      const fileExt = path.extname(file);
      const fileType = mimeTypes[fileExt];

      const fileBuffer = await fs.readFile(`./${fileOriginalName}_files/${dir}/${file}`);

      await cloudStorageService.uploadPublicBuffer({
        fileName: `${fileOriginalName}_files/${dir}/${file}`,
        fileBuffer,
        fileType,
      });
    }
  }

  const dziFileBuffer = await fs.readFile(`./${dziFileName}`);

  const uploadData = await cloudStorageService.uploadPublicBuffer({
    fileName: dziFileName,
    fileBuffer: dziFileBuffer,
    fileType: mimeTypes['.dzi'],
  });

  await fs.rm(`./${fileOriginalName}_files`, {
    recursive: true,
    force: true,
  });

  return 'Location' in uploadData && uploadData.Location;
};

const handler = async (ctx: AppKoaContext<never, Request>) => {
  const { image, fileName } = ctx.request.body;

  const imageResponse = await axios.get(image, {
    responseType: 'arraybuffer',
  });

  const imageBuffer = Buffer.from(imageResponse.data, 'binary');

  const location = await splitFile(fileName, imageBuffer);
  // @ts-ignore
  const directoryLocation = location?.replace('.dzi', '_files');

  ctx.body = {
    tileSource: location,
    directory: directoryLocation,
  };
};

export default (router: AppRouter) => {
  router.post('/split', handler);
};