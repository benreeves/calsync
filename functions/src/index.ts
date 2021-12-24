import * as functions from "firebase-functions";
import axios from "axios";
import { WfCollectionResponse } from "./dto/WebflowCollection";
import { Community } from "./dto/Community";
import { environment } from "./config";


// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

export const helloWorld = functions.https.onRequest(async (request, response) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});
