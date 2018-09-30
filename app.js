const builder = require('botbuilder');
const restify = require('restify');
require('dotenv').config();

// Setup Restify Server
const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, () => {
  console.log('Listen to', server.name, server.url);
});

// Create new ChatConnector object
const connector = new builder.ChatConnector({
  appId: "eed50719-f9ad-496d-8d37-ac4f35189e14",
  appPassword: "DBiFIlTlg@|kwo9R"
});

// Connect Restify and ChatConnector
server.post('/api/messages', connector.listen());

const bot = new builder.UniversalBot(connector);

// LUIS Credentials
const luisAPIHostName = "westus.api.cognitive.microsoft.com";
const luisAppId       = "27772d41-18cb-4ec4-a7a6-23107cfef680";
const luisAPIKey      = "0b62e6038ff14261b97c6618b8b8ee12";

const luisUrlModel = `https://${luisAPIHostName}/luis/v2.0/apps/${luisAppId}?subscription-key=${luisAPIKey}&timezoneOffset=-360&q=`;

const recognizer = new builder.LuisRecognizer(luisUrlModel);
const intents = new builder.IntentDialog({
  recognizers: [recognizer]
});

bot.dialog('/', intents);

// Handling greets
intents.matches('Greet', (session, args, next) => {
  session.send(`Hallo, ich bin Eva, die Ticket-Buchungsassistentin. Wie kann ich dir weiterhelfen?`);
});

// In production here comes the data from DB
const movies = [
  'Avengers',
  'Jurrasic World',
  'Rampage',
  'The Incredibles 2',
  'Mission Impossible 6'
];

intents.matches('ShowNowPlaying', (session, args, next) => {
  session.send(`Hier ist unser aktuelles Kinoprogramm:\n\n ${movies.join("\n")}`);
});


intents.matches('BookTicket', [(session, args, next) => {
  const movieEntity = args.entities.filter(e => e.type == 'Movies');
  const noOfTicketsEntity = args.entities.filter(e => e.type == 'builtin.number');

  if (movieEntity.length > 0) {
    session.userData.movie = movieEntity[0].resolution.values[0];
  } else {
    delete session.userData.movie;
  }

  if (noOfTicketsEntity.length > 0) {
    session.userData.noOfTickets = noOfTicketsEntity[0].resolution.value;
  } else {
    delete session.userData.noOfTickets;
  }

  if (!session.userData.movie) {
    session.beginDialog('askMovie');
  } else {
    next();
  }
}, (session, args, next) => {
  if (!session.userData.noOfTickets) {
    session.beginDialog('askNoOfTickets');
  } else {
    next();
  }
}, (session, args, next) => {
  session.send(`OK, ich habe für dich ${session.userData.noOfTickets} Tickets für ${session.userData.movie} reserviert. Viel Spaß!`);
}]);

bot.dialog('askMovie', [(session, args, next) => {
  builder.Prompts.choice(session, 'Welchen Film würdest du gerne sehen?', movies);
}, (session, results) => {
  session.userData.movie = results.response.entity;
  session.endDialogWithResult(results);
}]);

bot.dialog('askNoOfTickets', [(session, args, next) => {
  builder.Prompts.number(session, 'Super! Wie viele Tickets möchtest du reservieren?');
}, (session, results) => {
  session.userData.noOfTickets = results.response;
  session.endDialogWithResult(results);
}]);