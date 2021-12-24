"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.helloWorld = void 0;
const functions = require("firebase-functions");
const axios_1 = require("axios");
const API_TOKEN = 'ee5d06bf425b2cd3c50b2775a8aee9078611840bb71d8e0f201e6475be65c2ca';
const COMMUNITIES_COLLECTION = '61894e5328f321e81b5e7ae9';
const EVENTS_COLLECTION = '61894e5328f321218a5e7aeb';
const API_ENDPOINT = 'https://api.webflow.com/';
// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript
exports.helloWorld = functions.https.onRequest(async (request, response) => {
    functions.logger.info("Hello logs!", { structuredData: true });
    response.send("Hello from Firebase!");
});
const headers = { 'Authorization': `Bearer ${API_TOKEN}`, 'accept-version': '1.0.0' };
// const communities = axios.get<WfCollectionResponse<Community>>(API_ENDPOINT + 'collections/' + COMMUNITIES_COLLECTION + '/items', {'headers': headers});
// communities.then(
//   resp=> {
//     const communities = resp.data;
//     console.log(communities);
//   }
// )
const events = axios_1.default.get(API_ENDPOINT + 'collections/' + EVENTS_COLLECTION + '/items', { 'headers': headers });
events.then(resp => {
    const communities = resp.data;
    console.log(communities);
});
//# sourceMappingURL=index.js.map