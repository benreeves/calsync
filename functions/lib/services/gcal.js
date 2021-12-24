"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GCal = exports.GCalFactory = exports.ServiceAccountCreds = void 0;
const googleapis_1 = require("googleapis");
const moment = require("moment");
const memoize_1 = require("./memoize");
const logger_1 = require("../logger");
class ServiceAccountCreds {
}
exports.ServiceAccountCreds = ServiceAccountCreds;
class GCalFactory {
    constructor() {
        this._jwts = {};
    }
    async create(gcalId) {
        const jwt = await this.getJwt(gcalId);
        if (jwt.name && jwt.message) {
            logger_1.logger.error(`Issue authenticating. | ${jwt.message}\n stack trace - ${jwt.stack}`);
            throw jwt;
        }
        else {
            return new GCal(jwt, gcalId);
        }
    }
    getJwt(gcalId) {
        // TODO: does this actually protect concurrency? I think so since the promise is immediately
        // returned and not awaited so should still happen on the main node process
        if (!(gcalId in this._jwts)) {
            const jwtProm = this.getServiceAccountCreds(gcalId)
                .then((creds) => {
                const jwt = new googleapis_1.google.auth.JWT(creds.clientEmail, undefined, creds.privateKey, "https://www.googleapis.com/auth/calendar");
                return jwt;
            })
                .catch((e) => {
                logger_1.logger.error(`Issue retrieving jwt. | ${e.message}\n stack trace - ${e.stack}`);
                return e;
            });
            this._jwts[gcalId] = jwtProm;
        }
        return this._jwts[gcalId];
    }
    async getServiceAccountCreds(gcalId) {
        // right now this only supports the master service account
        const googleCreds = new ServiceAccountCreds();
        googleCreds.calendarId =
            "ab5hq91hf260porloh3efsmsi8@group.calendar.google.com";
        googleCreds.clientEmail =
            process.env["GOOGLE_CREDENTIALS_CLIENT_EMAIL"] || '';
        // Escape the private key as per
        // https://stackoverflow.com/questions/39492587/escaping-issue-with-firebase-privatekey-as-a-heroku-config-variable
        googleCreds.privateKey = (process.env["GOOGLE_CREDENTIALS_PRIVATE_KEY"] || '').replace(/\\n/g, "\n");
        return googleCreds;
    }
}
exports.GCalFactory = GCalFactory;
class GCal {
    /**
     *
     */
    constructor(auth, calendarId) {
        this.auth = auth;
        this.calendarId = calendarId;
        this.api = googleapis_1.google.calendar({ version: "v3", auth: this.auth });
    }
    async listEvents(minDate, maxDate) {
        await this.ensureAuth();
        const timeMin = minDate
            ? moment(minDate).toISOString()
            : moment().subtract(30, "days").toISOString();
        const timeMax = maxDate
            ? moment(maxDate).toISOString()
            : moment().add(60, "days").toISOString();
        let response;
        try {
            response = await this.api.events.list({
                calendarId: this.calendarId,
                singleEvents: true,
                timeMin: timeMin,
                timeMax: timeMax,
            });
        }
        catch (err) {
            logger_1.logger.error(`Issue listing events | ${err.message}\n stack trace - ${err.stack}`);
            throw err;
        }
        // Should extract info and throw here
        if (response.status !== 200) {
            console.log(response);
            this.handleError(response);
            throw new Error(`Error with gcal: ${response.status} ${response.data}`);
        }
        return this.extractEvents(response.data);
    }
    async ensureAuth() {
        try {
            await this.auth.authorize();
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    extractEvents(data) {
        if (data.items) {
            return data.items.map((item) => {
                var _a, _b;
                return {
                    name: item.summary || '',
                    externalId: item.id || '',
                    externalRecurringId: item.recurringEventId || '',
                    location: item.location || '',
                    description: item.description || '',
                    startDate: moment((_a = item.start) === null || _a === void 0 ? void 0 : _a.dateTime).toDate(),
                    endDate: moment((_b = item.end) === null || _b === void 0 ? void 0 : _b.dateTime).toDate(),
                    link: this.extractEventLinkFromDesccription(item.description || '') ||
                        item.htmlLink || '',
                };
            });
        }
        else {
            return [];
        }
    }
    async patchEvent(events) {
        if (Array.isArray(events)) {
            await Promise.all(events.map(this.patchEvent));
            return;
        }
        const evt = events;
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
    async createEvent(events) {
        if (Array.isArray(events)) {
            let x = await Promise.all(events.map(this.createEvent));
            return x;
        }
        const evt = events;
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
    async deleteEvent(calendarId, googleEventId) {
        await this.api.events.delete({
            calendarId: calendarId,
            eventId: googleEventId,
        });
    }
    handleError(response) {
        logger_1.logger.error(`Error in gaxios | ${response.status} | ${JSON.stringify(response.data)}`);
    }
    extractEventLinkFromDesccription(description) {
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
        }
        else {
            return null;
        }
    }
}
__decorate([
    (0, memoize_1.MemoizeExpiring)(1000 * 60 * 5) // 5 minutes
    ,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GCal.prototype, "listEvents", null);
exports.GCal = GCal;
//# sourceMappingURL=gcal.js.map