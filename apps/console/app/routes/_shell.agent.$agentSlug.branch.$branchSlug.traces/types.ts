import type { Treaty } from "@elysiajs/eden";
import type { Api } from "~api";

type TracesRoute = ReturnType<ReturnType<Treaty.Create<Api>["v1"]["agents"]>["branches"]>["traces"];
type TraceDetailRoute = ReturnType<TracesRoute>;

type TraceListResponse = Treaty.Data<TracesRoute["get"]>;

export type TraceListData = TraceListResponse["data"];
export type TraceListItem = TraceListData[number];
export type TraceDetailData = Treaty.Data<TraceDetailRoute["get"]>;
export type TraceStatus = TraceListItem["status"];

export type TraceMessage =
  | TraceDetailData["inputMessages"][number]
  | TraceDetailData["outputMessages"][number];

export type MessagePart = Extract<
  TraceDetailData["outputMessages"][number]["parts"][number],
  { type: "text" | "reasoning" | "tool_call" | "tool_call_response" }
>;
