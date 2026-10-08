import {z} from 'zod';
export const emailSchema=z.string().trim().email('Informe um e-mail válido.').max(254);
export const leadSchema=z.object({email:emailSchema,name:z.string().trim().max(100).optional(),consent:z.literal(true,{error:'Autorize o envio para continuar.'}),website:z.string().max(0)});
export const contactSchema=z.object({name:z.string().trim().min(2,'Informe seu nome.').max(100),email:emailSchema,company:z.string().trim().max(100).optional(),subject:z.string().trim().min(3).max(150),message:z.string().trim().min(10,'Escreva uma mensagem com pelo menos 10 caracteres.').max(5000),consent:z.literal(true,{error:'Autorize o tratamento da mensagem.'}),website:z.string().max(0)});
export function csvEscape(value:unknown){const text=String(value??'');const safe=/^[\s]*[=+@\-]/.test(text)?"'"+text:text;return '"'+safe.replace(/"/g,'""')+'"';}
export function safeUrl(value:string){try{const u=new URL(value,'https://legendadigital.com.br');return u.protocol==='https:'||u.protocol==='http:'?value:''}catch{return ''}}
