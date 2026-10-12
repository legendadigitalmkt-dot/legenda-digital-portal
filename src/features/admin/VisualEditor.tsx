import React, { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import {
  Extension,
  Node,
  mergeAttributes,
  type JSONContent,
} from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import DOMPurify from "dompurify";
import MediaUpload from "./MediaUpload";
import {editorialUrl} from "../../lib/article-extras.mjs";
const safeUrl = editorialUrl;
const IDs = Extension.create({
  name: "editorialIDs",
  addGlobalAttributes() {
    return [{ types: ["heading"], attributes: { id: { default: null } } }];
  },
});
const Caption = Node.create({
  name: "caption",
  group: "block",
  content: "inline*",
  parseHTML: () => [{ tag: "figcaption" }],
  renderHTML: ({ HTMLAttributes }) => ["figcaption", HTMLAttributes, 0],
});
const Summary = Node.create({
  name: "editorialSummary",
  content: "inline*",
  parseHTML: () => [{ tag: "summary" }],
  renderHTML: () => ["summary", 0],
});
const Details = Node.create({
  name: "editorialDetails",
  group: "block",
  content: "editorialSummary block+",
  parseHTML: () => [{ tag: "details" }],
  renderHTML: () => ["details", 0],
});
const FigureScroll = Node.create({
  name: "figureScroll",
  group: "block",
  content: "block+",
  parseHTML: () => [{ tag: "div.figure-scroll" }],
  renderHTML: () => ["div", { class: "figure-scroll", tabindex: "0" }, 0],
});
const Figure = Node.create({
  name: "figure",
  group: "block",
  content: "block+",
  draggable: true,
  parseHTML: () => [{ tag: "figure" }],
  renderHTML: ({ HTMLAttributes }) => ["figure", HTMLAttributes, 0],
});
const Group = Node.create({
  name: "editorialGroup",
  group: "block",
  content: "block+",
  draggable: true,
  addAttributes: () => ({
    tone: {default:"info",parseHTML:el=>el.getAttribute("data-tone")||"info",renderHTML:attrs=>({"data-tone":["info","insight","warning"].includes(attrs.tone)?attrs.tone:"info"})},
    kind: {
      default: "callout",
      parseHTML: (el) => el.getAttribute("data-block"),
      renderHTML: (attrs) => ({
        "data-block": attrs.kind,
        class: "editorial-block editorial-" + attrs.kind,
      }),
    },
  }),
  parseHTML: () => [
    { tag: "aside[data-block]" },
    { tag: "section[data-block]" },
    { tag: "div[data-block]" },
  ],
  renderHTML: ({ HTMLAttributes }) => [
    "aside",
    mergeAttributes(HTMLAttributes),
    0,
  ],
});
const Media = Node.create({
  name: "externalMedia",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes: () => ({
    url: { default: "", parseHTML: (el) => el.querySelector("a")?.href },
    label: {
      default: "Vídeo / recurso externo",
      parseHTML: (el) => el.querySelector("a")?.textContent,
    },
  }),
  parseHTML: () => [{ tag: 'aside[data-block="embed"]', priority: 100 }],
  renderHTML: ({ node }) => [
    "aside",
    { "data-block": "embed", class: "editorial-block editorial-embed" },
    [
      "a",
      {
        href: safeUrl(node.attrs.url) || "#",
        target: "_blank",
        rel: "noopener noreferrer",
      },
      node.attrs.label,
    ],
    [
      "p",
      {},
      "Abrir o recurso externo. O serviço de terceiros segue sua própria política.",
    ],
  ],
});
const Attachment = Node.create({
  name:"editorialAttachment",group:"block",atom:true,draggable:true,
  addAttributes:()=>({
    url:{default:"",parseHTML:el=>el.querySelector("a")?.getAttribute("href")},
    label:{default:"Arquivo",parseHTML:el=>el.querySelector("a")?.textContent},
    caption:{default:"",parseHTML:el=>el.querySelector("p")?.textContent},
  }),
  parseHTML:()=>[{tag:'aside[data-block="attachment"]',priority:100}],
  renderHTML:({node})=>["aside",{"data-block":"attachment",class:"editorial-block editorial-attachment"},
    ["a",{href:safeUrl(node.attrs.url)||"#",target:"_blank",rel:"noopener noreferrer",download:""},node.attrs.label],
    ["p",{},node.attrs.caption||"Arquivo público. Abrir ou baixar em nova aba."],
  ],
});
const ResponsiveImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: 1200 },
      height: { default: null },
      srcset: { default: null },
      sizes: { default: null },
      loading: { default: "lazy" },
      decoding: { default: "async" },
    };
  },
});
const text = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export default function VisualEditor({
  body,
  resetKey,
  onChange,
}: {
  body: string;
  resetKey: string;
  onChange: (html: string, doc: JSONContent) => void;
}) {
  const change = useRef(onChange);
  change.current = onChange;
  const [panel, setPanel] = useState("");
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [caption, setCaption] = useState("");
  const [feedback, setFeedback] = useState("");
  const [block, setBlock] = useState("");
  const [tone,setTone]=useState("info");
  const linkSelection=useRef<{from:number;to:number}|null>(null);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          protocols: ["http", "https"],
          HTMLAttributes: { rel: "noopener noreferrer" },
        },
      }),
      ResponsiveImage.configure({ allowBase64: false }),
      TableKit.configure({ table: { resizable: false } }),
      IDs,
      Caption,
      Summary,
      Details,
      FigureScroll,
      Figure,
      Group,
      Media,
      Attachment,
    ],
    content: DOMPurify.sanitize(body),
    immediatelyRender: false,
    onUpdate: ({ editor }) =>
      change.current(editor.getHTML(), editor.getJSON()),
    editorProps: {
      attributes: {
        "aria-label": "Corpo do artigo — editor visual",
        role: "textbox",
        "aria-multiline": "true",
        class: "article-body visual-editor-content",
      },
    },
  });
  useEffect(() => {
    if (editor)
      editor.commands.setContent(DOMPurify.sanitize(body), {
        emitUpdate: false,
      });
  }, [resetKey, editor]);
  if (!editor) return <p>Carregando editor visual…</p>;
  // Insert after the selection. Replacing a selected atom would silently remove a file/image.
  const insert = (content:string|JSONContent|JSONContent[]) => editor.chain().focus().insertContentAt(editor.state.selection.to,content).run();
  const insertBlock = (kind: string) => {
    setBlock("");
    if (
      [
        "image",
        "gallery",
        "diagram",
        "chart",
        "video",
        "embed",
        "source",
        "related",
        "cta",
        "attachment",
        "callout",
      ].includes(kind)
    ) {
      setPanel(kind);
      setUrl("");
      setLabel("");
      setCaption("");
      setFeedback("");
      setTone("info");
      return;
    }
    if (kind === "paragraph") editor.chain().focus().setParagraph().run();
    else if (kind === "h2" || kind === "h3")
      editor
        .chain()
        .focus()
        .toggleHeading({ level: kind === "h2" ? 2 : 3 })
        .run();
    else if (kind === "table")
      editor
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run();
    else if (kind === "quote") editor.chain().focus().toggleBlockquote().run();
    else if (kind === "list") editor.chain().focus().toggleBulletList().run();
    else if (kind === "code") editor.chain().focus().toggleCodeBlock().run();
    else if (kind === "divider")
      editor.chain().focus().setHorizontalRule().run();
    else if (kind === "faq")
      editor
        .chain()
        .focus()
        .insertContent(
          '<aside data-block="faq"><h2>Perguntas frequentes</h2><h3>Sua pergunta</h3><p>Resposta com contexto e fonte.</p></aside>',
        )
        .run();
    else
      editor
        .chain()
        .focus()
        .insertContent(
          '<aside data-block="callout"><p><strong>Ponto de atenção</strong></p><p>Adicione contexto, limite ou aplicação.</p></aside>',
        )
        .run();
  };
  const insertMedia = () => {
    const kind = panel;
    if(kind === "callout") {
      if(label.trim().length<2 || caption.trim().length<2){setFeedback("Preencha o título e o texto do destaque.");return;}
      const content='<aside data-block="callout" data-tone="'+tone+'"><p><strong>'+text(label)+'</strong></p>'+caption.split("\n").filter(Boolean).map(p=>'<p>'+text(p)+'</p>').join("")+'</aside>';
      insert(content);setPanel("");return;
    }
    if(kind === "link") {
      if(!safeUrl(url)){setFeedback("Informe um link https:// ou um caminho interno iniciado por /.");return;}
      const selection=linkSelection.current;
      if(selection&&selection.from!==selection.to)editor.chain().focus().setTextSelection(selection).setLink({href:url}).run();
      else if(label.trim().length>=2)editor.chain().focus().insertContent('<a href="'+text(url)+'">'+text(label)+'</a>').run();
      else {setFeedback("Selecione um texto no artigo ou preencha o texto do link.");return;}
      setPanel("");return;
    }
    const urls =
      ["gallery","attachment"].includes(kind)
        ? url
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
        : [url];
    const alts =
      ["gallery","attachment"].includes(kind)
        ? label
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
        : [label];
    if (
      !urls.length ||
      urls.some((u) => !safeUrl(u)) ||
      alts.some((a) => a.length < 2) ||
      urls.length !== alts.length
    ) {
      setFeedback(
        "Informe endereços válidos e um texto descritivo para cada imagem ou link.",
      );
      return;
    }
    if(kind === "attachment") {
      insert(urls.map((u,i)=>({type:"editorialAttachment",attrs:{url:u,label:alts[i],caption}})));setPanel("");return;
    }
    let html = "";
    if (["image", "gallery", "diagram", "chart"].includes(kind)) {
      html = urls
        .map(
          (u, i) =>
            `<figure><img src="${text(u)}" alt="${text(alts[i])}" loading="lazy" decoding="async"><figcaption>${text(caption)}</figcaption></figure>`,
        )
        .join("");
    } else if (["video", "embed"].includes(kind)) {
      insert({type:"externalMedia",attrs:{url,label}});
      setPanel("");
      return;
    } else
      html = `<aside data-block="${kind}"><p><a href="${text(url)}">${text(label)}</a></p>${caption ? "<p>" + text(caption) + "</p>" : ""}</aside>`;
    if (["gallery","attachment"].includes(kind))
      html = '<aside data-block="gallery">' + html + "</aside>";
    insert(html);
    setPanel("");
    setFeedback("Bloco inserido. Você pode editar o texto diretamente.");
  };
  const move = (direction: number) => {
    const { doc, selection } = editor.state;
    const positions: { from: number; to: number; node: JSONContent }[] = [];
    doc.forEach((node, offset) =>
      positions.push({
        from: offset,
        to: offset + node.nodeSize,
        node: node.toJSON(),
      }),
    );
    const index = positions.findIndex(
      (b) => selection.from >= b.from && selection.from <= b.to,
    );
    const next = index + direction;
    if (index < 0 || next < 0 || next >= positions.length) return;
    const json = editor.getJSON();
    [json.content![index], json.content![next]] = [
      json.content![next],
      json.content![index],
    ];
    editor.commands.setContent(json);
    editor.commands.focus();
    setFeedback("Bloco movido. Desfazer permanece disponível na sessão.");
  };
  return (
    <div className="visual-editor">
      <div
        className="editor-toolbar"
        role="toolbar"
        aria-label="Formatação do artigo"
      >
        {[
          ["Negrito", () => editor.chain().focus().toggleBold().run(), "bold"],
          [
            "Itálico",
            () => editor.chain().focus().toggleItalic().run(),
            "italic",
          ],
          [
            "H2",
            () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
            "heading",
          ],
          [
            "H3",
            () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
            "heading",
          ],
          [
            "Lista",
            () => editor.chain().focus().toggleBulletList().run(),
            "bulletList",
          ],
          ["Desfazer", () => editor.chain().focus().undo().run(), ""],
          ["Refazer", () => editor.chain().focus().redo().run(), ""],
        ].map(([title, action, active]) => (
          <button
            type="button"
            key={String(title)}
            aria-pressed={active ? editor.isActive(String(active)) : undefined}
            onClick={action as () => void}
          >
            {String(title)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            linkSelection.current={from:editor.state.selection.from,to:editor.state.selection.to};
            setPanel("link");
            setLabel(editor.state.doc.textBetween(editor.state.selection.from,editor.state.selection.to));
            setUrl(editor.getAttributes("link").href||"");
            setFeedback("");
          }}
        >
          Link
        </button>
        <button type="button" onClick={()=>insertBlock("image")}>Adicionar imagem</button>
        <button type="button" onClick={()=>insertBlock("attachment")}>Adicionar arquivo</button>
        <button type="button" onClick={()=>insertBlock("callout")}>Texto em destaque</button>
        <button type="button" onClick={()=>editor.chain().focus().unsetLink().run()}>Remover link</button>
        <label className="sr-only" htmlFor="editor-block">
          Adicionar bloco
        </label>
        <select
          id="editor-block"
          value={block}
          onChange={(e) => insertBlock(e.target.value)}
        >
          <option value="">+ Adicionar bloco</option>
          {[
            ["paragraph", "Parágrafo"],
            ["h2", "Título H2"],
            ["h3", "Título H3"],
            ["image", "Imagem"],
            ["gallery", "Galeria"],
            ["attachment", "Arquivo / áudio / vídeo"],
            ["quote", "Citação"],
            ["callout", "Destaque"],
            ["table", "Tabela"],
            ["list", "Lista"],
            ["code", "Código"],
            ["divider", "Divisor"],
            ["video", "Vídeo"],
            ["embed", "Embed externo"],
            ["diagram", "Diagrama"],
            ["chart", "Gráfico"],
            ["cta", "CTA"],
            ["faq", "FAQ"],
            ["source", "Fonte/referência"],
            ["related", "Artigo relacionado"],
          ].map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => move(-1)}>
          ↑ Mover bloco
        </button>
        <button type="button" onClick={() => move(1)}>
          ↓ Mover bloco
        </button>
      </div>
      {panel && (
        <div className="editor-insert">
          <h3>Adicionar {({callout:"texto em destaque",image:"imagem",gallery:"galeria",attachment:"arquivo",link:"link manual"} as Record<string,string>)[panel]||panel}</h3>
          {panel === "callout" && <label>Estilo do destaque<select value={tone} onChange={e=>setTone(e.target.value)}><option value="info">Informação · azul</option><option value="insight">Ideia prática · ciano</option><option value="warning">Atenção · âmbar</option></select></label>}
          {panel !== "callout" && <label>
            {["gallery","attachment"].includes(panel) ? "URLs (uma por linha)" : "URL"}
            {["gallery","attachment"].includes(panel) ? (
              <textarea
                rows={3}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Uma URL por linha"
              />
            ) : (
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://… ou /images/…"
              />
            )}
          </label>}
          <label>
            {panel === "callout" ? "Título do destaque" : ["image", "gallery", "diagram", "chart"].includes(panel)
              ? "Texto alternativo (alt)"
              : "Texto do link"}
            {["gallery","attachment"].includes(panel) ? (
              <textarea
                aria-label={panel === "attachment" ? "Texto do link" : "Texto alternativo (alt)"}
                rows={3}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={panel === "attachment" ? "Um nome por linha, na mesma ordem dos arquivos" : "Um alt por linha, na mesma ordem das imagens"}
              />
            ) : (
              <input value={label} onChange={(e) => setLabel(e.target.value)} />
            )}
          </label>
          <label>
            {panel === "callout" ? "Texto do destaque" : "Legenda / contexto"}
            <textarea aria-label={panel === "callout" ? "Texto do destaque" : "Legenda / contexto"} rows={panel === "callout" ? 4 : 2} value={caption} onChange={e=>setCaption(e.target.value)}/>
          </label>
          {["image","gallery","diagram","chart","attachment"].includes(panel) && <MediaUpload
            label={panel === "attachment" ? "Selecionar arquivos do computador" : "Selecionar imagens do computador"}
            imagesOnly={panel !== "attachment"} multiple={["gallery","attachment"].includes(panel)}
            onUploaded={files=>{
              const many=["gallery","attachment"].includes(panel);
              setUrl(current=>many?[current,...files.map(f=>f.url)].filter(Boolean).join("\n"):files[0].url);
              if(panel === "attachment")setLabel(current=>[current,...files.map(f=>f.name)].filter(Boolean).join("\n"));
              setFeedback(panel === "attachment" ? "Arquivos enviados. Revise os nomes e insira o bloco." : "Imagem enviada. Preencha o texto alternativo para inserir.");
            }}/> }
          <div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={insertMedia}
            >
              Inserir bloco
            </button>
            <button
              type="button"
              className="text-link"
              onClick={() => setPanel("")}
            >
              Cancelar
            </button>
          </div>
          <p className="microcopy">
            Vídeos e embeds externos abrem por escolha do leitor. Gráficos e
            diagramas recebem imagem e legenda, sem fabricar dados.
          </p>
        </div>
      )}
      <EditorContent editor={editor} />
      <p className="microcopy" role="status">
        {feedback ||
          "Edite visualmente. Use o menu de blocos e os botões de reordenação."}
      </p>
      {editor.isActive("editorialGroup",{kind:"callout"}) && <div className="editor-toolbar" role="group" aria-label="Estilo do destaque selecionado">{[["info","Informação"],["insight","Ideia prática"],["warning","Atenção"]].map(([value,label])=><button key={value} type="button" aria-pressed={editor.getAttributes("editorialGroup").tone === value} onClick={()=>editor.chain().focus().updateAttributes("editorialGroup",{tone:value}).run()}>{label}</button>)}</div>}
      <details className="editor-table-controls">
        <summary>Editar tabela selecionada</summary>
        <div className="editor-toolbar">
          {[
            ["+ Linha", () => editor.chain().focus().addRowAfter().run()],
            ["+ Coluna", () => editor.chain().focus().addColumnAfter().run()],
            ["− Linha", () => editor.chain().focus().deleteRow().run()],
            ["− Coluna", () => editor.chain().focus().deleteColumn().run()],
            [
              "Remover tabela",
              () => {
                if (confirm("Remover a tabela selecionada?"))
                  editor.chain().focus().deleteTable().run();
              },
            ],
          ].map(([l, f]) => (
            <button type="button" key={String(l)} onClick={f as () => void}>
              {String(l)}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
