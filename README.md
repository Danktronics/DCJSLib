# Danktronics Chat JS Library
The official module for interacting with the Danktronics Chat API

## Installation
`npm install dankchatjs`

## Example

### Creating a connection and sending a message
```js
const DC = require("dankchatjs");
const client = new DC("token");

client.on("ready", () => {
    console.log("Connected to Danktronics Chat.");
    client.createMessage("Hey my dudes.");
});

client.on("message", data => {
    console.log(data);
});

client.connect();
```