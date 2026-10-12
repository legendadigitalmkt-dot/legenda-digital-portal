# Assets da marca — atualização de 12/10/2026

## Rodapé

`public/images/legenda-digital-logo-footer.svg` usa o desenho original incorporado ao SVG. O símbolo mantém as cores; uma matriz de cor torna somente o lettering branco, preservando sua geometria e transparência. Não depende de fontes instaladas nem de recursos externos. A versão de cabeçalho continua em `public/images/legenda-digital-logo.png`.

O componente `Logo` seleciona a variante do rodapé pelo parâmetro `light`. `.logo-light` não tem painel branco, padding ou cantos de cartão. A imagem respeita a largura disponível, até 216 px.

## Favicon

O símbolo ocupa uma área maior no canvas transparente. A área reservada pela aba do navegador é definida pelo próprio navegador; a atualização amplia o desenho dentro dela.

- Master: `public/images/legenda-digital-mark.png`.
- ICO: `public/favicon.ico`, com frames 16, 32, 48, 64, 128 e 256 px.
- PNG: `public/favicon-16x16.png`, `public/favicon-32x32.png` e `public/favicon-48x48.png`.
- Apple touch: `public/apple-touch-icon.png`, 180 px.
- HTML declara tamanhos e usa `?v=20261012` para renovar o cache dos favicons.

O master foi preparado com a ferramenta integrada de imagens, a partir da logo original. Os arquivos nos tamanhos finais foram codificados com Sharp, sem nova geração por resolução. O ICO contém PNG RGBA em cada frame, com diretório ICO de 32 bits. PNGs e ICO não contêm fundo sólido.

Prompt aplicado ao master: “Extract only the existing multicolor ribbon symbol from the Legenda Digital logo. Preserve its geometry, orientation, overlaps and gradients. Remove the wordmark. Center on a square transparent canvas; the symbol fills about 94 percent of width and height with modest optical margin. Transparent central hole; no backing, border, extra marks or shadow. Clean edges and readable silhouette at 16 and 32 px.”

## Validação e rollback

Conferir SVG branco sobre navy, transparência e leitura nas larguras do layout. Conferir todos os frames ICO e PNGs, os links de favicon no HTML, acesso HTTP aos assets públicos e bloqueio dos arquivos internos. Build, testes existentes e CI devem passar antes do merge. Depois do deploy, verificar a homepage e um artigo, a imagem do rodapé e os novos favicons no domínio.

Rollback por PR de revert desta atualização e rebuild da Hostinger. Não requer migrations, alterações em dados ou configurações do Growth OS.
