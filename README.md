# README.md

this is a simple project to test the google cloud speech to text api with websockets.
GCPのspeech to textを使用し、ブラウザからリアルタイムで音声をテキストに変換するサンプルプログラムです。
Chat GPTに聞きながら4-5時間程度で作ったので粗いです。お試し用。

- frontend

```bash
npm start
```

- backend

```bash
GOOGLE_APPLICATION_CREDENTIALS='path/to/credentials.json' node main.js
```
