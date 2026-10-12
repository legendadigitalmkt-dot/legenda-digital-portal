import React from 'react';
import {StrictMode} from 'react';import {createRoot} from 'react-dom/client';import {App} from './App';import './styles.css';
let initialCategory;try{initialCategory=JSON.parse(document.getElementById('ld-initial-category')?.textContent||'null')}catch{}
let initialPosts;try{const data=JSON.parse(document.getElementById('ld-initial-content')?.textContent||'null');if(Array.isArray(data)&&data.every(p=>p?.status==='published'&&Date.parse(p.published_at)<=Date.now()))initialPosts=data}catch{}
createRoot(document.getElementById('root')!).render(<StrictMode><App path={location.pathname} initialPosts={initialPosts} initialCategory={initialCategory}/></StrictMode>);
