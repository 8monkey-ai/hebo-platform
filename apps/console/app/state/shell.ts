import { proxy } from "valtio";

export type Models = Record<
  string,
  {
    name: string;
    modality: string;
    providers: string[];
    monthlyFreeTokens: number;
  }
>;

export const shellStore = proxy<{ models: Models | undefined }>({
  models: undefined,
});
