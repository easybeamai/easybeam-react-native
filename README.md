# Easybeam SDK for React Native

[![Build and Test](https://github.com/easybeamai/easybeam-react-native/actions/workflows/ci.yml/badge.svg)](https://github.com/easybeamai/easybeam-react-native/actions)

## Overview

The Easybeam SDK for React Native provides a seamless integration with the Easybeam AI platform, allowing developers to easily incorporate AI-powered chat functionality into their React Native applications. This SDK supports both streaming and non-streaming interactions with Easybeam's prompts and agents, with built-in support for secure handling of sensitive credentials.

## Features

- Stream responses from Easybeam prompts and agents
- Make non-streaming requests to prompts and agents
- Handle user reviews for chat interactions
- TypeScript support for improved developer experience
- Built-in error handling and event management
- Secure handling of sensitive credentials for agents

## Installation

```bash
npm install easybeam-react-native-sdk
```

## Usage

### Initializing the SDK

```typescript
import { Easybeam, EasyBeamConfig } from "easybeam-react-native-sdk";

const config: EasyBeamConfig = {
  token: "your-api-token-here",
};

const easybeam = new Easybeam(config);
```

### Using Prompts

The SDK provides methods for both streaming and non-streaming interactions with Easybeam prompts.

#### Streaming a Prompt Response

```typescript
const promptId = "your-prompt-id";
const userId = "user-123";
const filledVariables = { key: "value" };
const messages = [
  {
    content: "Hello",
    role: "USER",
    createdAt: new Date().toISOString(),
    id: "1",
  },
];

easybeam.streamPrompt(
  promptId,
  userId,
  filledVariables,
  messages,
  (response) => {
    console.log("New message:", response.newMessage);
  },
  () => {
    console.log("Stream closed");
  },
  (error) => {
    console.error("Error:", error);
  }
);
```

#### Making a Non-Streaming Prompt Request

```typescript
const response = await easybeam.getPrompt(
  promptId,
  userId,
  filledVariables,
  messages
);
console.log("Prompt response:", response);
```

### Using Agents

The SDK supports interaction with Easybeam agents, including secure handling of sensitive credentials through the userSecrets parameter.

#### Streaming an Agent Response

```typescript
const agentId = "your-agent-id";
const userId = "user-123";
const filledVariables = { language: "english" };
const userSecrets = { apiKey: "sensitive-api-key" }; // Optional secrets for agent
const messages = [
  {
    content: "Can you analyze this data?",
    role: "USER",
    createdAt: new Date().toISOString(),
    id: "1",
  },
];

easybeam.streamAgent(
  agentId,
  userId,
  filledVariables,
  messages,
  (response) => {
    console.log("New message:", response.newMessage);
  },
  () => {
    console.log("Stream closed");
  },
  (error) => {
    console.error("Error:", error);
  },
  userSecrets // Optional parameter for secure credentials
);
```

#### Making a Non-Streaming Agent Request

```typescript
const response = await easybeam.getAgent(
  agentId,
  userId,
  filledVariables,
  messages,
  userSecrets // Optional parameter for secure credentials
);
console.log("Agent response:", response);
```

### Submitting a Review

```typescript
await easybeam.review("chat-123", "user-123", 5, "Great experience!");
```

## API Reference

### Easybeam Class

The main class for interacting with the Easybeam API.

#### Methods

- `streamPrompt`: Stream responses from an Easybeam prompt
- `getPrompt`: Make a non-streaming request to an Easybeam prompt
- `streamAgent`: Stream responses from an Easybeam agent
- `getAgent`: Make a non-streaming request to an Easybeam agent
- `review`: Submit a review for a chat interaction
- `cancelCurrentStream`: Cancel the current streaming request

### Type Interfaces

```typescript
interface UserSecrets {
  [key: string]: string;
}

interface FilledVariables {
  [key: string]: string;
}
```

## Error Handling

The SDK provides built-in error handling for network requests and SSE connections. Errors are passed to the `onError` callback in streaming methods and thrown as exceptions in non-streaming methods.

## Security Considerations

When using agents with sensitive credentials or API keys, use the `userSecrets` parameter to ensure secure transmission of sensitive information. The SDK implements appropriate security measures for handling these credentials.

## TypeScript Support

This SDK is written in TypeScript and provides type definitions for all exported interfaces and classes, ensuring type safety and improved developer experience.

## Contributing

We welcome contributions to the Easybeam SDK for React Native. Please feel free to submit issues, fork the repository and send pull requests!

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For any questions or support needs, please contact our support team at support@easybeam.ai or visit our [documentation](https://docs.easybeam.ai).
