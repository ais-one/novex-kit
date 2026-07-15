import express from 'express';
// const { authUser } = require('@common/node/auth')

// channel
// https://stackoverflow.com/questions/33858927/how-to-obtain-the-chat-id-of-a-private-telegram-channel
// login under your account at web version of Telegram : https://web.telegram.org
// Find your channel. See to your url, it should be like https://web.telegram.org/#/im?p=c1055587116_11052224402541910257
// Grab "1055587116" from it, and add "-100" as a prefix.
// https://api.telegram.org/botXXXXXXXXXX:XXXXxxxxxxxxxxXXXXXXXXXX_xxxxxxxxxx/sendMessage?chat_idx=-10012345678906&text=received

// on mobile
// https://stackoverflow.com/questions/33126743/how-do-i-add-my-bot-to-a-channel
// Open Channel info (in app title)
// Choose Administrators
// Add Administrator
// There will be no bots in contact list, so you need to search for it. Enter your bot's username
// Clicking on it you make it as administrator./33126743/how-do-i-add-my-bot-to-a-channel

export default express
  .Router()
  .get('/', (req, res) => res.send('Webhooks OK'))
  // body {
  //   msisdn: '6588888888',
  //   to: 'monumber',
  //   messageId: '170000028F5FBC1B',
  //   text: 'Hello\nWorld',
  //   type: 'text',
  //   keyword: 'HELLO\nWORLD',
  //   'api-key': '88888888',
  //   'message-timestamp': '2020-10-28 07:54:38'
  // }
  // TODO need to handle the Nexmo MO-SNS
  .post('/nexmo-mo-sms', async (req, res) => {
    const { body, query, params } = req;
    res.json({
      body,
      query,
      params,
    });
  });
