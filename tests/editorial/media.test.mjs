import test from 'node:test';
import assert from 'node:assert/strict';
import {validateEditorialFile} from '../../src/lib/editorial-file-formats.mjs';
import {normalizeExtras,editorialUrl} from '../../src/lib/article-extras.mjs';
test('Editorial uploads reject disguised files, executables, mismatched MIME and oversize payloads',async()=>{
  const pdf=new File(['%PDF-1.7\nfixture'], 'pesquisa.pdf',{type:'application/pdf'});
  assert.equal((await validateEditorialFile(pdf)).mime,'application/pdf');
  const png=new File([new Uint8Array([137,80,78,71,13,10,26,10])], 'capa.png',{type:'image/png'});
  assert.equal((await validateEditorialFile(png,true)).image,true);
  for(const file of [new File(['<script>boom</script>'],'fake.png',{type:'image/png'}),new File(['boom'],'app.exe'),new File(['%PDF-1.7'],'x.pdf',{type:'text/html'}),new File(['<html>boom</html>'],'x.txt')])await assert.rejects(validateEditorialFile(file));
  await assert.rejects(validateEditorialFile(pdf,true));
  await assert.rejects(validateEditorialFile(new File([new Uint8Array(20*1024*1024+1)],'large.pdf',{type:'application/pdf'})));
  assert.equal((await validateEditorialFile(new File(['a,b\n1,2'],'sheet.csv'))).mime,'text/csv');
  assert.equal((await validateEditorialFile(new File([new Uint8Array([80,75,3,4,0])],'document.docx'))).image,false);
});
test('Public banners and manual links constrain URLs, data shape and text without rendering HTML',()=>{
  for(const u of ['javascript:alert(1)','data:text/html,x','//evil.test','https://example.test/a\nb','/\\evil.test'])assert.equal(editorialUrl(u),'');
  const normalized=normalizeExtras({hideGrowthPromo:'yes',banners:[null,{title:'A',image:'javascript:boom',url:'data:x',placement:'invalid',newTab:1}],links:[{label:'Unsafe',url:'//evil.test'},{label:'Contato',url:'/contato',newTab:true}]});
  assert.equal(normalized.hideGrowthPromo,false);assert.equal(normalized.banners[0].image,'');assert.equal(normalized.banners[0].url,'');assert.equal(normalized.banners[0].placement,'sidebar');assert.equal(normalized.banners[0].newTab,false);
  assert.deepEqual(normalized.links,[{label:'Contato',url:'/contato',newTab:true}]);
  assert.equal(normalizeExtras({banners:Array(8).fill({title:'A'}),links:Array(20).fill({label:'A',url:'/a'})}).banners.length,4);
  assert.equal(normalizeExtras({banners:'bad',links:null}).links.length,0);
});
