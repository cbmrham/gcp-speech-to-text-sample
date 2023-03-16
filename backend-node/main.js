const http = require('http');
const { Server } = require('ws');
const { SpeechClient } = require('@google-cloud/speech');

const speechClient = new SpeechClient();

const server = http.createServer();
const wss = new Server({ server });

wss.on('connection', (ws) => {
  let recognizeStream = null;

  ws.on('message', (message) => {
      if (message.toString() === 'start') {
        console.log('Received start message')
        recognizeStream = createRecognizeStream(ws);
      } else if (message === 'stop') {
        if (recognizeStream) {
          recognizeStream.end();
          recognizeStream = null;
        }
      // }
    } else if (recognizeStream && message instanceof Buffer) {
      // console.log('translation')
      recognizeStream.write(message);
    }
  });

  ws.on('close', () => {
    if (recognizeStream) {
      recognizeStream.end();
      recognizeStream = null;
    }
  });
});

function createRecognizeStream(ws) {
  const request = {
    config: {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode: 'ja-JP',
    },
    interimResults: true,
  };

  const recognizeStream = speechClient
    .streamingRecognize(request)
    .on('error', (error) => {
      console.error('Error in Google Speech-to-Text:', error);
    })
    .on('data', (response) => {
      const result = response.results[0];
      console.log(JSON.stringify(result))
      if (result && result.alternatives.length > 0) {
        const alternative = result.alternatives[0];
        if (alternative.confidence > 0.75) {
          console.log('Transcript:', alternative.transcript); // Add this line
          const message = { timestamp: new Date(), text: alternative.transcript };
          ws.send(JSON.stringify(message));
        }
      }
    });

  return recognizeStream;
}


const PORT = 8080;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
