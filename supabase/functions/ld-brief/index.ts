import {createHandler} from './handler.mjs';
// Public intake; capability tokens, verified user JWTs and signed webhooks are checked in handler.
Deno.serve(createHandler(Object.fromEntries(['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','NEWSLETTER_TOKEN_SECRET','RESEND_API_KEY','RESEND_WEBHOOK_SECRET','LD_BRIEF_FROM','LD_BRIEF_SENDING_ENABLED'].map(key=>[key,Deno.env.get(key)||'']))));
