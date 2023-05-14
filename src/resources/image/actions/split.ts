import axios from 'axios';
import fs from 'fs/promises';

import { AppKoaContext, AppRouter } from 'types';

import cp from 'child_process';

type Request = {
  body: {
    image: string;
    fileName: string;
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const splitFile = async (fileName: string, fileBuffer: Buffer) => {
  await fs.writeFile(`./src/assets/images/${fileName}`, fileBuffer);

  const result = await new Promise((resolve, reject) => {
    cp.exec(`./src/assets/images/magick-slicer.sh ./src/assets/images/${fileName}`, (err, stdout, stderr) => {
      if (err) reject(err);
      if (stderr) reject(stderr);
      resolve(stdout);
    });
  });

  await sleep(2000);
};

const handler = async (ctx: AppKoaContext<never, Request>) => {
  const { image, fileName } = ctx.request.body;

  console.log(image, fileName)

  try {
    const imageResponse = await axios.get(image, {
      responseType: 'arraybuffer',
    });

    const imageBuffer = Buffer.from(imageResponse.data, 'binary');

    await splitFile(fileName, imageBuffer);
  } catch (err) {
    console.log(err);
  }

  ctx.body = { success: true };
};

export default (router: AppRouter) => {
  router.post('/split', handler);
};