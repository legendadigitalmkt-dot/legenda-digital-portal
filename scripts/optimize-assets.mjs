import sharp from 'sharp';
for(const name of ['hero','team'])await sharp('src/assets/source/'+name+'.png').resize({width:1600,withoutEnlargement:true}).webp({quality:84}).toFile('public/images/'+name+'.webp');
await sharp('src/assets/source/hero.png').resize({width:1200,withoutEnlargement:true}).webp({quality:80}).toFile('public/images/social-cover.webp');
console.log('Assets otimizados para entrega, sem alterar a composição.');
