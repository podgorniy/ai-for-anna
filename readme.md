# Prerequisites

Nodejs and `npm` installed

# Running

Create read/write api key (no restrictions) https://platform.openai.com/api-keys and put it in the `.env` file into `OPENAI_API_KEY`.

Install dependencies 
`npm install`

Run the app
`make run`

Open http://localhost:1234

# Adjusting/iterating

`index.ts` contains system message for the conversation in the `instructions:` field. Adjusting those instructions will affect the behaviour of the system. 
