# Danktronics Chat JS Library
The official library for interacting with the Danktronics Chat API

## Installation
`npm install dcjslib`

## Example

### Creating a connection and sending a message
```js
const DC = require("dcjslib");
const client = new DC("token");

client.on("ready", () => {
    console.log("Connected to Danktronics Chat.");
});

client.on("message", message => {
    message.server.send("wow");
});

client.connect();
```