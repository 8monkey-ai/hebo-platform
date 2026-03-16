import type { MDXComponents } from "mdx/types";

import { CodeBlock, CodeGroupMdx } from "@hebo/shared-ui/components/Code";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    pre: CodeBlock,
    CodeGroup: CodeGroupMdx,
    ...components,
    wrapper: ({ children }) => (
      <div className="mx-auto flex w-full max-w-2xl min-w-0 flex-col gap-6">
        <div className="mdx">{children}</div>
      </div>
    ),
  };
}
