import Link from "next/link";
import type { MDXComponents } from "mdx/types";
import { Clip, Note, Shot } from "@/components/app/docs/media";

const components: MDXComponents = {
  a: ({ href = "", ...props }) =>
    href.startsWith("/") ? <Link href={href} {...props} /> : <a href={href} target="_blank" rel="noreferrer" {...props} />,
  Shot,
  Clip,
  Note,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
