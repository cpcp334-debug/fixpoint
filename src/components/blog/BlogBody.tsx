import type { BlogBodyBlock } from "@/lib/blog/body-blocks";

export function BlogBody({ blocks }: { blocks: BlogBodyBlock[] }) {
  return blocks.map((block, i) => {
    if (block.kind === "h2") {
      return <h2 key={block.id} id={block.id} className="mt-8 scroll-mt-24 text-xl font-semibold text-navy">{block.text}</h2>;
    }
    if (block.kind === "h3") {
      return <h3 key={i} className="mt-6 text-lg font-semibold text-navy">{block.text}</h3>;
    }
    if (block.kind === "list") {
      return (
        <ul key={i} className="mt-3 list-disc space-y-1 ps-5 text-sm leading-relaxed text-muted sm:text-base">
          {block.items.map((item, j) => <li key={j}>{item}</li>)}
        </ul>
      );
    }
    return (
      <p key={i} className="mt-4 text-sm leading-relaxed text-muted whitespace-pre-line sm:text-base">
        {block.text.split(/(https:\/\/[^\s]+)/g).map((part, j) => part.startsWith("https://")
          ? <a key={j} href={part} className="break-all underline underline-offset-4" rel="noopener noreferrer" target="_blank">{part}</a>
          : part)}
      </p>
    );
  });
}
