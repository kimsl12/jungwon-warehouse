"use client";

import { Bot, ExternalLink, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { GroundingSource } from "@/lib/ai/gemini";
import { cn } from "@/lib/utils";

export type ChatMessageView = {
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
  sources?: GroundingSource[];
  imagesPreview?: { url: string; filename: string }[];
};

function hostnameOf(uri: string): string {
  try {
    return new URL(uri).hostname.replace(/^www\./, "");
  } catch {
    return uri;
  }
}

export function ChatMessageRow({ message }: { message: ChatMessageView }) {
  const isUser = message.role === "user";
  return (
    <div
      className={cn("flex gap-2.5", isUser ? "flex-row-reverse" : "flex-row")}
    >
      <div
        className={cn(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border",
          isUser
            ? "border-primary/30 bg-primary/10 text-primary"
            : "border-border bg-card text-muted-foreground",
        )}
      >
        {isUser ? (
          <User className="size-3.5" />
        ) : (
          <Bot className="size-3.5" />
        )}
      </div>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed",
          isUser
            ? "bg-primary/10 text-foreground"
            : "border border-border bg-card text-foreground",
        )}
      >
        {message.pending ? (
          <span className="inline-flex gap-0.5 text-muted-foreground">
            <span className="animate-pulse">●</span>
            <span className="animate-pulse [animation-delay:200ms]">●</span>
            <span className="animate-pulse [animation-delay:400ms]">●</span>
          </span>
        ) : isUser ? (
          <div className="space-y-1.5">
            {message.imagesPreview && message.imagesPreview.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {message.imagesPreview.map((img, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={`${img.url}-${i}`}
                    src={img.url}
                    alt={img.filename}
                    className="size-20 rounded border border-border object-cover"
                  />
                ))}
              </div>
            )}
            {message.content && (
              <div className="whitespace-pre-wrap break-words">
                {message.content}
              </div>
            )}
          </div>
        ) : (
          <>
            <MarkdownBody content={message.content} />
            {message.sources && message.sources.length > 0 && (
              <SourcesRow sources={message.sources} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MarkdownBody({ content }: { content: string }) {
  return (
    <div className="break-words [&_*]:text-sm [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[12px] [&_code]:font-medium [&_code]:text-foreground [&_h1]:mt-2 [&_h1]:text-base [&_h1]:font-bold [&_h2]:mt-2 [&_h2]:text-[15px] [&_h2]:font-bold [&_h3]:mt-2 [&_h3]:text-sm [&_h3]:font-bold [&_li]:my-0.5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-muted [&_pre]:p-2 [&_strong]:font-semibold [&_strong]:text-foreground [&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border [&_th]:bg-muted/40 [&_th]:px-2 [&_th]:py-1 [&_th]:font-semibold [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5">
      <div className="overflow-x-auto">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: (props) => (
              <a {...props} target="_blank" rel="noreferrer noopener" />
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}

function SourcesRow({ sources }: { sources: GroundingSource[] }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-border pt-2">
      <span className="text-[10.5px] uppercase tracking-widest text-muted-foreground">
        검증 자료
      </span>
      {sources.slice(0, 6).map((s, i) => (
        <a
          key={`${s.uri}-${i}`}
          href={s.uri}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex max-w-[200px] items-center gap-1 truncate rounded border border-border bg-muted/30 px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
          title={s.title}
        >
          <ExternalLink className="h-2.5 w-2.5 shrink-0" />
          <span className="truncate">{hostnameOf(s.uri)}</span>
        </a>
      ))}
    </div>
  );
}
