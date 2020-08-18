# Danktronics Chat JS Library
The official library for interacting with the Danktronics Chat API

## Installation
`npm install dcjs`

## Example

### Creating a connection and sending a message
```js
const DC = require("dcjs");
const client = new DC("token");

client.on("ready", () => {
    console.log("Connected to Danktronics Chat.");
});

client.on("messageCreate", message => {
    message.channel.createMessage("message received");
});

client.connect();
```