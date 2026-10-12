import {useEffect,useRef,useState} from 'react';
import {fileAccept,imageAccept,uploadEditorialFile} from '../../lib/editorial-media';
export default function MediaUpload({label,imagesOnly=true,multiple=false,onUploaded}:{label:string;imagesOnly?:boolean;multiple?:boolean;onUploaded:(files:{url:string;name:string;size:number;mime:string}[])=>void}) {
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const lock=useRef(false);
  const active=useRef(true);
  useEffect(()=>{active.current=true;return()=>{active.current=false}},[]);
  return <div className="media-upload" aria-busy={busy}>
    <label>{label}<input type="file" accept={imagesOnly?imageAccept:fileAccept} multiple={multiple} disabled={busy} onChange={async e=>{
      const files=Array.from(e.target.files||[]);e.target.value='';
      if(!files.length||lock.current)return;
      if(files.length>10){setMessage('Selecione até 10 arquivos por envio.');return;}
      lock.current=true;setBusy(true);const uploaded=[];
      try{for(const [i,file] of files.entries()){setMessage(`Enviando ${i+1} de ${files.length}: ${file.name}…`);uploaded.push(await uploadEditorialFile(file,imagesOnly));}setMessage(`${uploaded.length} arquivo(s) enviado(s). Salve o artigo para manter as alterações.`);}
      catch(error){setMessage((error instanceof Error?error.message:'Falha no envio.')+(uploaded.length?' Os arquivos anteriores foram enviados.':''));}
      finally{if(uploaded.length&&active.current)onUploaded(uploaded);lock.current=false;if(active.current)setBusy(false);}
    }}/></label>
    <p className="microcopy">{imagesOnly?'PNG, JPEG ou WebP · até 8 MB.':'Imagens (8 MB); PDF, TXT, CSV, DOCX, XLSX, PPTX, ZIP, MP3, M4A, WAV, MP4 e WebM (20 MB).'} Os arquivos enviados são públicos. Use apenas material autorizado para publicação.</p>
    <p className="microcopy" role="status">{message}</p>
  </div>;
}
