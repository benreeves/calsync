import * as dotenv from 'dotenv'
dotenv.config()

const env = process.env.NODE_ENV

export const environment = {
    env: env,
    calendar: {
        id: 'nvirqhg80pp1qovnbr4e6rbv2nsdplk1@import.calendar.google.com',
        clientEmail: 'yycdata-calendar@yycdata.iam.gserviceaccount.com',
        // Escape the private key as per
        // https://stackoverflow.com/questions/39492587/escaping-issue-with-firebase-privatekey-as-a-heroku-config-variable
        privateKey: (process.env['GOOGLE_CREDENTIALS_PRIVATE_KEY'] || '').replace(/\\n/g, "\n"),

    },
    webflow: {
        token: process.env.WEBFLOW_API_TOKEN,
        endpoint: 'https://api.webflow.com/',
        collections: {
            communities: '61894e5328f321e81b5e7ae9',
            events: '61894e5328f321218a5e7aeb',
        }
    }
}