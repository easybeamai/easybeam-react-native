import EventSource, {
  MessageEvent,
  ErrorEvent,
  CloseEvent,
  ExceptionEvent,
  TimeoutEvent,
  EventSourceOptions,
  BuiltInEventType,
} from "react-native-sse";

export type NetworkMethod = "PUT" | "POST" | "DELETE" | "GET";

export interface EasyBeamConfig {
  token: string;
}

export interface FilledVariables {
  [key: string]: string;
}

export interface UserSecrets {
  [key: string]: string;
}

export interface ChatMessage {
  content: string;
  role: ChatRole;
  createdAt: string;
  providerId?: string;
  id: string;
  inputTokens?: number;
  outputTokens?: number;
}

export type ChatRole = "AI" | "USER";

export interface ChatResponse {
  newMessage: ChatMessage;
  chatId: string;
  streamFinished?: boolean;
}

export interface EasybeamService {
  streamPrompt(
    promptId: string,
    userId: string | undefined,
    filledVariables: FilledVariables,
    messages: ChatMessage[],
    onNewResponse: (newMessage: ChatResponse) => void,
    onClose: () => void,
    onError: (error: Error) => void
  ): Promise<void>;

  getPrompt(
    promptId: string,
    userId: string | undefined,
    filledVariables: FilledVariables,
    messages: ChatMessage[]
  ): Promise<ChatResponse>;

  streamAgent(
    agentId: string,
    userId: string | undefined,
    filledVariables: FilledVariables,
    messages: ChatMessage[],
    onNewResponse: (newMessage: ChatResponse) => void,
    onClose: () => void,
    onError: (error: Error) => void,
    userSecrets?: UserSecrets
  ): Promise<void>;

  getAgent(
    agentId: string,
    userId: string | undefined,
    filledVariables: FilledVariables,
    messages: ChatMessage[],
    userSecrets?: UserSecrets
  ): Promise<ChatResponse>;

  review(
    chatId: string,
    userId: string | undefined,
    reviewScore: number | undefined,
    reviewText: string | undefined
  ): Promise<void>;
}

export class Easybeam implements EasybeamService {
  private eventSource?: EventSource<BuiltInEventType>;
  private config: EasyBeamConfig;
  private readonly baseUrl = "https://api.easybeam.ai/v1";

  constructor(config: EasyBeamConfig) {
    this.config = config;
  }

  // Networking methods
  private async sendStream(
    url: string,
    method: NetworkMethod,
    body: any,
    onMessage: (message: string) => void,
    onClose: () => void,
    onError: (error: any) => void
  ): Promise<void> {
    try {
      const headers = {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        Authorization: `Bearer ${this.config.token}`,
      };

      const eventSourceOptions: EventSourceOptions = {
        headers,
        body: JSON.stringify(body),
        method,
      };

      this.eventSource = new EventSource(url, eventSourceOptions);

      this.eventSource.addEventListener("message", (event: MessageEvent) => {
        const message = event.data;
        if (message) {
          try {
            onMessage(message);
          } catch (error) {
            onError(error);
          }
        } else {
          console.warn("Received message event with null data");
        }
      });

      this.eventSource.addEventListener(
        "error",
        (event: ErrorEvent | TimeoutEvent | ExceptionEvent) => {
          console.error("SSE error:", event);

          let errorMessage = "Unknown error";

          if (event.type === "error" || event.type === "exception") {
            errorMessage = event.message;
          } else if (event.type === "timeout") {
            errorMessage = "Timeout occurred";
          }

          onError(new Error(`SSE error: ${errorMessage}`));
          this.eventSource?.close();
          onClose();
        }
      );

      this.eventSource.addEventListener("close", (event: CloseEvent) => {
        onClose();
      });
    } catch (error) {
      onError(error);
    }
  }

  private cancelStream() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = undefined;
    }
  }

  private async sendRequest(
    url: string,
    method: NetworkMethod,
    body?: any
  ): Promise<Response> {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.config.token}`,
    };

    const response = await fetch(url, {
      method,
      headers,
      cache: "no-store",
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Failed to process ${method} request to ${url}`);
    }

    return response;
  }

  private async streamEndpoint(
    endpoint: string,
    id: string,
    userId: string | undefined,
    filledVariables: FilledVariables,
    messages: ChatMessage[],
    onNewResponse: (newMessage: ChatResponse) => void,
    onClose: () => void,
    onError: (error: Error) => void,
    userSecrets?: UserSecrets
  ): Promise<void> {
    const params = {
      variables: filledVariables,
      messages,
      stream: "true",
      userId,
      userSecrets,
    };

    const handleError = (error: Error) => {
      onError(error);
    };

    const handleMessage = (jsonString: string) => {
      try {
        const message = JSON.parse(jsonString) as ChatResponse;
        onNewResponse(message);
        if (message.streamFinished) {
          this.cancelStream();
        }
      } catch (error) {
        handleError(
          error instanceof Error
            ? error
            : new Error("Unknown JSON processing error")
        );
      }
    };

    const handleClose = () => {
      onClose();
    };

    const url = `${this.baseUrl}/${endpoint}/${id}`;

    await this.sendStream(
      url,
      "POST",
      params,
      handleMessage,
      handleClose,
      handleError
    );
  }

  private async getEndpoint(
    endpoint: string,
    id: string,
    userId: string | undefined,
    filledVariables: FilledVariables,
    messages: ChatMessage[],
    userSecrets?: UserSecrets
  ): Promise<ChatResponse> {
    const params = {
      variables: filledVariables,
      messages,
      stream: "false",
      userId,
      userSecrets,
    };

    const url = `${this.baseUrl}/${endpoint}/${id}`;

    const response = await this.sendRequest(url, "POST", params);
    const data = await response.json();
    return data as ChatResponse;
  }

  // EasybeamService methods
  async streamPrompt(
    promptId: string,
    userId: string | undefined,
    filledVariables: FilledVariables,
    messages: ChatMessage[],
    onNewResponse: (newMessage: ChatResponse) => void,
    onClose: () => void,
    onError: (error: Error) => void
  ): Promise<void> {
    await this.streamEndpoint(
      "prompt",
      promptId,
      userId,
      filledVariables,
      messages,
      onNewResponse,
      onClose,
      onError
    );
  }

  async getPrompt(
    promptId: string,
    userId: string | undefined,
    filledVariables: FilledVariables,
    messages: ChatMessage[]
  ): Promise<ChatResponse> {
    return await this.getEndpoint(
      "prompt",
      promptId,
      userId,
      filledVariables,
      messages
    );
  }

  async streamAgent(
    agentId: string,
    userId: string | undefined,
    filledVariables: FilledVariables,
    messages: ChatMessage[],
    onNewResponse: (newMessage: ChatResponse) => void,
    onClose: () => void,
    onError: (error: Error) => void,
    userSecrets?: UserSecrets
  ): Promise<void> {
    await this.streamEndpoint(
      "agent",
      agentId,
      userId,
      filledVariables,
      messages,
      onNewResponse,
      onClose,
      onError,
      userSecrets
    );
  }

  async getAgent(
    agentId: string,
    userId: string | undefined,
    filledVariables: FilledVariables,
    messages: ChatMessage[],
    userSecrets?: UserSecrets
  ): Promise<ChatResponse> {
    return await this.getEndpoint(
      "agent",
      agentId,
      userId,
      filledVariables,
      messages,
      userSecrets
    );
  }

  async review(
    chatId: string,
    userId: string | undefined,
    reviewScore: number | undefined,
    reviewText: string | undefined
  ): Promise<void> {
    const url = `${this.baseUrl}/review`;
    await this.sendRequest(url, "POST", {
      chatId,
      userId,
      reviewScore,
      reviewText,
    });
  }

  cancelCurrentStream() {
    this.cancelStream();
  }
}
