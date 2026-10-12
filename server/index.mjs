import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {App} from '../src/App.tsx';
import {createPortalHandler, cleanBody, safeUrl, BACKEND} from './portal.mjs';

export {createPortalHandler, cleanBody, safeUrl, BACKEND};
export const renderArticle = post => renderToStaticMarkup(React.createElement(App,{path:'/conteudos/' + post.slug,server:true,initialPosts:[post]}));
export const renderCollection = (path,posts,category) => renderToStaticMarkup(React.createElement(App,{path,server:true,initialPosts:posts,initialCategory:category}));
export async function start(root, port = Number(process.env.PORT || 3000)) {
  if (typeof root !== 'string' || !root) throw new Error('Invalid application root');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid application port');
  const config = JSON.parse(await readFile(join(root,'portal-runtime.json'),'utf8'));
  const handler = await createPortalHandler({root,config,renderArticle,renderCollection});
  const server = createServer({maxHeaderSize:16384,requestTimeout:30000,headersTimeout:15000,keepAliveTimeout:5000},handler);
  await new Promise((resolve,reject) => {server.once('error',reject);server.listen(port,'0.0.0.0',resolve);});
  console.log('Legenda Digital portal Node runtime listening on port ' + port);
  const shutdown = () => {server.close();setTimeout(() => process.exit(0),5000).unref();};
  process.once('SIGTERM',shutdown);process.once('SIGINT',shutdown);
  return server;
}
