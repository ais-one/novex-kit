import OpenAI from 'openai';

const OPENAI_API_KEY = '';

const client = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const STREAM_FLAG = false;

try {
  const resp = await client.responses.create({
    model: 'gpt-4.1',
    tools: [
      {
        type: 'mcp',
        server_label: 'example-server',
        server_url: 'https://mcp.deepwiki.com/mcp',
        require_approval: 'never',
        headers: {
          authorization: 'Bearer TODO',
        },
      },
    ],
    // input: "What is my BMI if I weigh 65 kg and am 1.62 m tall?",
    input: 'today is 2025-08-25. my due date is 2025-08-31. How many days from today until then?',
    store: true,
    stream: STREAM_FLAG,
  });

  // if (STREAM_FLAG) {
  //   for await (const event of resp) console.log(event);
  // } else {
  //   console.log(resp);
  //   console.log(resp.output_text);
  //   console.log(resp.output[1].error);
  //   console.log(resp.output[2].content);
  // }
} catch (e) {
  // console.log('Error response: ', e);
}
