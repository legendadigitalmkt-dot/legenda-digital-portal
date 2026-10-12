import {db} from '../services/supabase';
import {validateEditorialFile} from './editorial-file-formats.mjs';
export {imageAccept,fileAccept} from './editorial-file-formats.mjs';
export async function uploadEditorialFile(file:File, imagesOnly=false) {
  const {extension,mime,image} = await validateEditorialFile(file,imagesOnly);
  if (!db) throw new Error('O armazenamento não está configurado.');
  const {data:{user},error:authError} = await db.auth.getUser();
  if (authError || !user) throw new Error('Sua sessão expirou. Entre novamente antes de enviar o arquivo.');
  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
  const storage = db.storage.from(image ? 'content-images' : 'editorial-files');
  const {error} = await storage.upload(path,file,{upsert:false,contentType:mime,cacheControl:'3600'});
  if (error) throw new Error(/row-level|permission|unauthorized|403/i.test(error.message) ? 'Sua conta não tem permissão de envio de mídia.' : 'Não foi possível enviar. Confira sua conexão e tente novamente.');
  return {url:storage.getPublicUrl(path).data.publicUrl,name:file.name,size:file.size,mime};
}
