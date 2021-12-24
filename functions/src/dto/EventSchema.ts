export interface EventSchema {
    name: string;
    location: string;
    startDate: Date;
    endDate: Date;
    description?: string;
    link?: string;
    organizer: string;
    externalId: string;
}
