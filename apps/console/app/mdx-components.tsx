import type { MDXComponents } from "mdx/types";

import { CodeBlock, CodeGroupMdx } from "@hebo/shared-ui/components/Code";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    pre: CodeBlock,
    CodeGroup: CodeGroupMdx,
    ...components,
    wrapper: ({ children }) => <div className="mdx">{children}</div>,
  };
}
