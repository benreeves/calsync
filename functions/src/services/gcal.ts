import { calendar_v3, google, GoogleApis } from "googleapis";
import { JWT } from "google-auth-library";
import * as moment from "moment";
import { MemoizeExpiring } from "./memoize";
import { GaxiosResponse } from "gaxios";
import { EventSchema } from "../dto/EventSchema";
import { logger } from "../logger";

export interface ServiceAccountCreds {
    clientEmail: string;
    privateKey: string;
    calendarId: string;
    // keyId: string;
}

export class GCalFactory {

    constructor(
        private creds: ServiceAccountCreds
    ) {
        
    }


    public create(gcalId: string) {
        const jwt = new google.auth.JWT(
            this.creds.clientEmail,
            undefined,
            this.creds.privateKey,
            "https://www.googleapis.com/auth/calendar"
        ) as any;
        return new GCal(jwt as JWT, gcalId);

    }
}

export class GCal {
    api: calendar_v3.Calendar;
    calendarId: string;
    /**
     *
     */
    constructor(private auth: JWT, calendarId: string) {
        this.calendarId = calendarId;
        this.api = google.calendar({ version: "v3", auth: this.auth as any });
    }

    @MemoizeExpiring(1000 * 60 * 5) // 5 minutes
    public async listEvents(
        minDate?: moment.MomentInput,
        maxDate?: moment.MomentInput
    ) {
        await this.ensureAuth();
        const timeMin = minDate
            ? moment(minDate).toISOString()
            : moment().subtract(30, "days").toISOString();
        const timeMax = maxDate
            ? moment(maxDate).toISOString()
            : moment().add(60, "days").toISOString();
        let response: GaxiosResponse<calendar_v3.Schema$Event>;
        try {
            response = await this.api.events.list({
                calendarId: this.calendarId,
                singleEvents: true,
                timeMin: timeMin,
                timeMax: timeMax,
            });
        } catch (err: any) {
            logger.error(
                `Issue listing events | ${err.message}\n stack trace - ${err.stack}`
            );
            throw err;
        }

        // Should extract info and throw here
        if (response.status !== 200) {
            console.log(response);
            this.handleError(response);
            throw new Error(
                `Error with gcal: ${response.status} ${response.data}`
            );
        }
        return this.extractEvents(response.data);
    }

    private async ensureAuth(): Promise<void> {
        try {
            await this.auth.authorize();
        } catch (err) {
            console.log(err);
            throw err;
        }
    }

    extractEvents(data: calendar_v3.Schema$Events): EventSchema[] {
        if (data.items) {
            return data.items.map((item) => {
                return {
                    name: item.summary || '',
                    externalId: item.id || '',
                    location: item.location || '',
                    description: item.description || '',
                    organizer: item.organizer?.displayName || '',
                    startDate: moment(item.start?.dateTime).toDate(),
                    endDate: moment(item.end?.dateTime).toDate(),
                    link:
                        this.extractEventLinkFromDesccription(item.description || '') ||
                        item.htmlLink || '',
                };
            });
        }
        else {
            return []
        }
    }

    async patchEvent(events: EventSchema | EventSchema[]): Promise<void> {
        if (Array.isArray(events)) {
            await Promise.all(events.map(this.patchEvent));
            return;
        }

        const evt = events as EventSchema;
        await this.api.events.patch({
            calendarId: this.calendarId,
            eventId: evt.externalId,
            requestBody: {
                summary: evt.name,
                location: evt.location,
                description: evt.description,
                start: { dateTime: evt.startDate.toISOString() },
                end: { dateTime: evt.endDate.toISOString() },
            },
        });
    }

    async createEvent(
        events: EventSchema | EventSchema[]
    ): Promise<(calendar_v3.Schema$Event | calendar_v3.Schema$Event[])> {
        if (Array.isArray(events)) {
            let x: any = await Promise.all(events.map(this.createEvent));
            return x
        }

        const evt = events as EventSchema;
        const response = await this.api.events.insert({
            calendarId: this.calendarId,
            requestBody: {
                summary: evt.name,
                location: evt.location,
                description: evt.description,
                // TODO: dynamic timezone
                start: { dateTime: evt.startDate.toISOString() },
                end: { dateTime: evt.endDate.toISOString() },
            },
        });
        // TODO error handling, checking, etc
        return response.data;
    }

    async deleteEvent(calendarId: string, googleEventId: string) {
        await this.api.events.delete({
            calendarId: calendarId,
            eventId: googleEventId,
        });
    }

    private handleError(response: GaxiosResponse<calendar_v3.Schema$Events>) {
        logger.error(
            `Error in gaxios | ${response.status} | ${JSON.stringify(
                response.data
            )}`
        );
    }

    private extractEventLinkFromDesccription(description: string) {
        if (!description) {
            return null;
        }
        // Try to extract form a meetup link
        const regex = /(https?:\/\/([a-zA-Z\d-]+\.){0,}meetup\.com(\/.*)?)/;
        let result = description.match(regex);
        if (result) {
            return result[0];
        }

        // Try to match any url
        const backupRegex = /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
        result = description.match(backupRegex);
        if (result) {
            return result[0];
        } else {
            return null;
        }
    }
}
