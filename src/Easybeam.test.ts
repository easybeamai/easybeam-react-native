// Easybeam.test.ts
import {
  Easybeam,
  EasyBeamConfig,
  PortalResponse,
  ChatMessage,
  FilledVariables,
} from "./Easybeam";
import EventSource from "react-native-sse";

jest.mock("react-native-sse", () => {
  const mEventSource = jest.fn().mockImplementation(() => ({
    addEventListener: jest.fn(),
    close: jest.fn(),
  }));
  return {
    __esModule: true,
    default: mEventSource,
  };
});

describe("Easybeam Class Tests", () => {
  let easybeam: Easybeam;
  const token = "test-token";
  const config: EasyBeamConfig = { token };
  const portalId = "test-portal-id";
  const workflowId = "test-workflow-id";
  const userId = "test-user-id";
  const filledVariables: FilledVariables = { key: "value" };
  const messages: ChatMessage[] = [
    {
      content: "Hello",
      role: "USER",
      createdAt: new Date().toISOString(),
      id: "message-id-1",
    },
  ];

  beforeEach(() => {
    easybeam = new Easybeam(config);
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getPortal", () => {
    it("should make a POST request and return PortalResponse", async () => {
      const mockResponse: PortalResponse = {
        newMessage: {
          content: "AI Response",
          role: "AI",
          createdAt: new Date().toISOString(),
          id: "message-id-2",
        },
        chatId: "chat-id-1",
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      const response = await easybeam.getPortal(
        portalId,
        userId,
        filledVariables,
        messages
      );

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/portal/${portalId}`),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          }),
          body: JSON.stringify({
            variables: filledVariables,
            messages,
            stream: "false",
            userId,
          }),
        })
      );

      expect(response).toEqual(mockResponse);
    });

    it("should throw an error when the response is not ok", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValueOnce({ error: "Bad Request" }),
      });

      await expect(
        easybeam.getPortal(portalId, userId, filledVariables, messages)
      ).rejects.toThrow(
        `Failed to process POST request to https://api.easybeam.ai/v1/portal/${portalId}`
      );
    });
  });

  describe("streamPortal", () => {
    it("should initiate an SSE connection and handle messages", async () => {
      const onNewResponse = jest.fn();
      const onClose = jest.fn();
      const onError = jest.fn();

      const mockEventSourceInstance = {
        addEventListener: jest.fn(),
        close: jest.fn(),
      };

      (EventSource as jest.Mock).mockImplementation(
        () => mockEventSourceInstance
      );

      await easybeam.streamPortal(
        portalId,
        userId,
        filledVariables,
        messages,
        onNewResponse,
        onClose,
        onError
      );

      expect(EventSource).toHaveBeenCalledWith(
        `${easybeam["baseUrl"]}/portal/${portalId}`,
        expect.objectContaining({
          headers: expect.any(Object),
          body: JSON.stringify({
            variables: filledVariables,
            messages,
            stream: "true",
            userId,
          }),
          method: "POST",
        })
      );

      expect(mockEventSourceInstance.addEventListener).toHaveBeenCalled();

      // Simulate receiving a message
      const messageHandler =
        mockEventSourceInstance.addEventListener.mock.calls.find(
          (call) => call[0] === "message"
        )[1];
      const testData = JSON.stringify({
        newMessage: {
          content: "Test response",
          role: "AI",
          createdAt: new Date().toISOString(),
          id: "message-id-2",
        },
        chatId: "chat-id-1",
      });

      messageHandler({ data: testData });

      expect(onNewResponse).toHaveBeenCalledWith(JSON.parse(testData));

      // Simulate error event
      const errorHandler =
        mockEventSourceInstance.addEventListener.mock.calls.find(
          (call) => call[0] === "error"
        )[1];
      errorHandler({ type: "error", message: "Test error" });

      expect(onError).toHaveBeenCalledWith(new Error("SSE error: Test error"));
      expect(mockEventSourceInstance.close).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();

      // Simulate close event
      const closeHandler =
        mockEventSourceInstance.addEventListener.mock.calls.find(
          (call) => call[0] === "close"
        )[1];
      closeHandler();

      expect(onClose).toHaveBeenCalled();
    });

    it("should handle invalid JSON in message data", async () => {
      const onNewResponse = jest.fn();
      const onClose = jest.fn();
      const onError = jest.fn();

      const mockEventSourceInstance = {
        addEventListener: jest.fn(),
        close: jest.fn(),
      };

      (EventSource as jest.Mock).mockImplementation(
        () => mockEventSourceInstance
      );

      await easybeam.streamPortal(
        portalId,
        userId,
        filledVariables,
        messages,
        onNewResponse,
        onClose,
        onError
      );

      // Simulate receiving an invalid JSON message
      const messageHandler =
        mockEventSourceInstance.addEventListener.mock.calls.find(
          (call) => call[0] === "message"
        )[1];
      const invalidData = "Invalid JSON string";

      messageHandler({ data: invalidData });

      expect(onNewResponse).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe("getWorkflow", () => {
    it("should make a POST request and return PortalResponse", async () => {
      const mockResponse: PortalResponse = {
        newMessage: {
          content: "Workflow response",
          role: "AI",
          createdAt: new Date().toISOString(),
          id: "message-id-3",
        },
        chatId: "chat-id-2",
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      const response = await easybeam.getWorkflow(
        workflowId,
        userId,
        filledVariables,
        messages
      );

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/workflow/${workflowId}`),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          }),
          body: JSON.stringify({
            variables: filledVariables,
            messages,
            stream: "false",
            userId,
          }),
        })
      );

      expect(response).toEqual(mockResponse);
    });

    it("should throw an error when the response is not ok", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValueOnce({ error: "Bad Request" }),
      });

      await expect(
        easybeam.getWorkflow(workflowId, userId, filledVariables, messages)
      ).rejects.toThrow(
        `Failed to process POST request to https://api.easybeam.ai/v1/workflow/${workflowId}`
      );
    });
  });

  describe("streamWorkflow", () => {
    it("should initiate an SSE connection and handle messages", async () => {
      const onNewResponse = jest.fn();
      const onClose = jest.fn();
      const onError = jest.fn();

      const mockEventSourceInstance = {
        addEventListener: jest.fn(),
        close: jest.fn(),
      };

      (EventSource as jest.Mock).mockImplementation(
        () => mockEventSourceInstance
      );

      await easybeam.streamWorkflow(
        workflowId,
        userId,
        filledVariables,
        messages,
        onNewResponse,
        onClose,
        onError
      );

      expect(EventSource).toHaveBeenCalledWith(
        `${easybeam["baseUrl"]}/workflow/${workflowId}`,
        expect.objectContaining({
          headers: expect.any(Object),
          body: JSON.stringify({
            variables: filledVariables,
            messages,
            stream: "true",
            userId,
          }),
          method: "POST",
        })
      );

      expect(mockEventSourceInstance.addEventListener).toHaveBeenCalled();
    });
  });

  describe("review", () => {
    it("should send a POST request for review", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      });

      await easybeam.review("chat-id-1", userId, 5, "Great service");

      expect(global.fetch).toHaveBeenCalledWith(
        `${easybeam["baseUrl"]}/review`,
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          }),
          body: JSON.stringify({
            chatId: "chat-id-1",
            userId,
            reviewScore: 5,
            reviewText: "Great service",
          }),
        })
      );
    });

    it("should throw an error if the review request fails", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      await expect(
        easybeam.review("chat-id-1", userId, 5, "Great service")
      ).rejects.toThrow(
        `Failed to process POST request to ${easybeam["baseUrl"]}/review`
      );
    });
  });

  //   describe("cancelCurrentStream", () => {
  //     it("should close the current stream if eventSource is defined", () => {
  //       const mockEventSourceInstance = {
  //         close: jest.fn(),
  //       };

  //       easybeam["eventSource"] = mockEventSourceInstance;

  //       easybeam.cancelCurrentStream();

  //       expect(mockEventSourceInstance.close).toHaveBeenCalled();
  //       expect(easybeam["eventSource"]).toBeUndefined();
  //     });

  //     it("should do nothing if eventSource is undefined", () => {
  //       easybeam["eventSource"] = undefined;

  //       easybeam.cancelCurrentStream();

  //       expect(easybeam["eventSource"]).toBeUndefined();
  //     });
  //   });
});
