import type { Treaty } from "@elysiajs/eden";
import type { Api } from "~api";

type TracesRoute = ReturnType<ReturnType<Treaty.Create<Api>["v1"]["agents"]>["branches"]>["traces"];
type TraceDetailRoute = ReturnType<TracesRoute>;

type TraceListResponse = Treaty.Data<TracesRoute["get"]>;
type TraceMetadataResponse = Treaty.Data<TracesRoute["metadata"]["get"]>;

export type TraceListData = TraceListResponse["data"];
export type TraceListItem = TraceListData[number];
export type TraceDetailData = Treaty.Data<TraceDetailRoute["get"]>;
export type TraceMetadataTags = TraceMetadataResponse["tags"];
export type TraceStatus = TraceListItem["status"];
