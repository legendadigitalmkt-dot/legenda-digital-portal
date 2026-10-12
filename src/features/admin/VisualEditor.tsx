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
import { db } from "../../services/supabase";
import { safeUrl } from "../../lib/validation";
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
      ].includes(kind)
    ) {
      setPanel(kind);
      setUrl("");
      setLabel("");
      setCaption("");
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
    const urls =
      kind === "gallery"
        ? url
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
        : [url];
    const alts =
      kind === "gallery"
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
    let html = "";
    if (["image", "gallery", "diagram", "chart"].includes(kind)) {
      html = urls
        .map(
          (u, i) =>
            `<figure><img src="${text(u)}" alt="${text(alts[i])}" loading="lazy" decoding="async"><figcaption>${text(caption)}</figcaption></figure>`,
        )
        .join("");
    } else if (["video", "embed"].includes(kind)) {
      editor
        .chain()
        .focus()
        .insertContent({ type: "externalMedia", attrs: { url, label } })
        .run();
      setPanel("");
      return;
    } else
      html = `<aside data-block="${kind}"><p><a href="${text(url)}">${text(label)}</a></p>${caption ? "<p>" + text(caption) + "</p>" : ""}</aside>`;
    if (kind === "gallery")
      html = '<aside data-block="gallery">' + html + "</aside>";
    editor.chain().focus().insertContent(html).run();
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
            setPanel("source");
            setLabel("");
            setUrl("");
          }}
        >
          Link
        </button>
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
          <h3>Adicionar {panel}</h3>
          <label>
            {panel === "gallery" ? "URLs das imagens (uma por linha)" : "URL"}
            {panel === "gallery" ? (
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
          </label>
          <label>
            {["image", "gallery", "diagram", "chart"].includes(panel)
              ? "Texto alternativo (alt)"
              : "Texto do link"}
            {panel === "gallery" ? (
              <textarea
                rows={3}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Um alt por linha, na mesma ordem das imagens"
              />
            ) : (
              <input value={label} onChange={(e) => setLabel(e.target.value)} />
            )}
          </label>
          <label>
            Legenda / contexto
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </label>
          {["image", "gallery", "diagram", "chart"].includes(panel) && (
            <label>
              Ou enviar imagem
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !db) return;
                  if (
                    file.size > 8388608 ||
                    !["image/png", "image/jpeg", "image/webp"].includes(
                      file.type,
                    )
                  ) {
                    setFeedback("Use PNG, JPEG ou WebP até 8 MB.");
                    return;
                  }
                  const {
                    data: { user },
                  } = await db.auth.getUser();
                  if (!user) return;
                  const path =
                    user.id +
                    "/" +
                    crypto.randomUUID() +
                    "." +
                    (file.type === "image/png"
                      ? "png"
                      : file.type === "image/jpeg"
                        ? "jpg"
                        : "webp");
                  const { error } = await db.storage
                    .from("content-images")
                    .upload(path, file, {
                      upsert: false,
                      contentType: file.type,
                    });
                  if (error) {
                    setFeedback(
                      "Upload não concluído. Confira sua permissão de mídia.",
                    );
                    return;
                  }
                  const publicUrl = db.storage
                    .from("content-images")
                    .getPublicUrl(path).data.publicUrl;
                  setUrl((current) =>
                    panel === "gallery" && current
                      ? current + "\n" + publicUrl
                      : publicUrl,
                  );
                  setFeedback("Imagem enviada. Preencha o alt para inserir.");
                }}
              />
            </label>
          )}
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
