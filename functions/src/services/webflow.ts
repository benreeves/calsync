import axios from "axios";
import { URL } from "url";

export interface WfCollectionResponse<T> {
    count: number,
    limit: number,
    offset: number,
    total: number
    items: T[]
}


export interface Community {
    name: string;
    slug: string;
    logo: any;
    website: string;
    position: number;
    color: string;
    kind: string;
    gcalId: string;
}

export interface CommunityEvent {
    id: string;
    name: string;
    slug: string;
    image: any;
    startDate: string;
    endDate: string;
    description: string;
    summary: string;
    link?: string;
    organizer: string;
    externalId: string;
    location: string;
    eventOpenGraphImage: any;
}

export interface WebflowApiConfig {
    token: string;
    endpoint: string;
    collections: {
        communities: string;
        events: string;
    }

}
export class WebflowApi {
    /**
     *
     */
    constructor(
        private config: WebflowApiConfig,
    ) {
            
    }

    public async getCommunities(): Promise<Community[]> {
        const url = new URL(`/collections/${this.config.collections.communities}/items`, this.config.endpoint);
        return this.send<Community>(url);
    }

    public async getEvents(): Promise<CommunityEvent[]> {
        const url = new URL(`/collections/${this.config.collections.events}/items`, this.config.endpoint);
        return this.send<any>(url);
    }

    private getHeaders() {
        const headers = {'Authorization': `Bearer ${this.config.token}`, 'accept-version': '1.0.0'};
        return headers;
    }

    private async send<T>(url: URL): Promise<T[]> {
        const headers = this.getHeaders();
        const resp = await axios.get<WfCollectionResponse<T>>(url.toString(), {'headers': headers});
        return resp.data.items;
    }
}