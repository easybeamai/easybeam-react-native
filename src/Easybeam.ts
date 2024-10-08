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

export interface PortalResponse {
  newMessage: ChatMessage;
  chatId: string;
  streamFinished?: boolean;
}

export interface EasybeamService {
  streamPortal(
    portalId: string,
    userId: string | undefined,
    filledVariables: FilledVariables,
    messages: ChatMessage[],
    onNewResponse: (newMessage: PortalResponse) => void,
    onClose: () => void,
    onError: (error: Error) => void
  ): Promise<void>;

  getPortal(
    portalId: string,
    userId: string | undefined,
    filledVariables: FilledVariables,
    messages: ChatMessage[]
  ): Promise<PortalResponse>;

  streamWorkflow(
    workflowId: string,
    userId: string | undefined,
    filledVariables: FilledVariables,
    messages: ChatMessage[],
    onNewResponse: (newMessage: PortalResponse) => void,
    onClose: () => void,
    onError: (error: Error) => void
  ): Promise<void>;

  getWorkflow(
    workflowId: string,
    userId: string | undefined,
    filledVariables: FilledVariables,
    messages: ChatMessage[]
  ): Promise<PortalResponse>;

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
    onNewResponse: (newMessage: PortalResponse) => void,
    onClose: () => void,
    onError: (error: Error) => void
  ): Promise<void> {
    const params = {
      variables: filledVariables,
      messages,
      stream: "true",
      userId,
    };

    const handleError = (error: Error) => {
      onError(error);
    };

    const handleMessage = (jsonString: string) => {
      try {
        const message = JSON.parse(jsonString) as PortalResponse;
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
    messages: ChatMessage[]
  ): Promise<PortalResponse> {
    const params = {
      variables: filledVariables,
      messages,
      stream: "false",
      userId,
    };

    const url = `${this.baseUrl}/${endpoint}/${id}`;

    const response = await this.sendRequest(url, "POST", params);
    const data = await response.json();
    return data as PortalResponse;
  }

  // ChatService methods

  async streamPortal(
    portalId: string,
    userId: string | undefined,
    filledVariables: FilledVariables,
    messages: ChatMessage[],
    onNewResponse: (newMessage: PortalResponse) => void,
    onClose: () => void,
    onError: (error: Error) => void
  ): Promise<void> {
    await this.streamEndpoint(
      "portal",
      portalId,
      userId,
      filledVariables,
      messages,
      onNewResponse,
      onClose,
      onError
    );
  }

  async getPortal(
    portalId: string,
    userId: string | undefined,
    filledVariables: FilledVariables,
    messages: ChatMessage[]
  ): Promise<PortalResponse> {
    return await this.getEndpoint(
      "portal",
      portalId,
      userId,
      filledVariables,
      messages
    );
  }

  async streamWorkflow(
    workflowId: string,
    userId: string | undefined,
    filledVariables: FilledVariables,
    messages: ChatMessage[],
    onNewResponse: (newMessage: PortalResponse) => void,
    onClose: () => void,
    onError: (error: Error) => void
  ): Promise<void> {
    await this.streamEndpoint(
      "workflow",
      workflowId,
      userId,
      filledVariables,
      messages,
      onNewResponse,
      onClose,
      onError
    );
  }

  async getWorkflow(
    workflowId: string,
    userId: string | undefined,
    filledVariables: FilledVariables,
    messages: ChatMessage[]
  ): Promise<PortalResponse> {
    return await this.getEndpoint(
      "workflow",
      workflowId,
      userId,
      filledVariables,
      messages
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
