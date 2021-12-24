import { CommunityEvent } from "./webflow";

export interface EventSource {

    listEvents(): Promise<CommunityEvent[]>
    patchEvent(event: CommunityEvent): Promise<{ok: boolean, err: string}>
    deleteEvent(event: CommunityEvent): Promise<{ok: boolean, err: string}>
}